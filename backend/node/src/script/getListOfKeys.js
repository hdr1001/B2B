// *********************************************************************
//
// Enrich a list of keys (DUNS/LEI/...) using an API
// JavaScript code file: getListOfKeys.js
//
// Copyright 2023 Hans de Rooij
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
// either express or implied. See the License for the specific
// language governing permissions and limitations under the
// License.
//
// *********************************************************************

//Functionality to read DUNS, LEIs, etc. from a file
import { readInputFile } from "../share/readInputFileKeys.js";

//Import the GLEIF API and D&B Direct+ rate limiters
import { gleifLimiter, dnbDplLimiter } from '../share/limiters.js';

//Emply the respective API definitions
import { LeiReq, DnbDplDBs, DnbDplFamTree, DnbDplBenOwner } from "../share/apiDefs.js";

//Decoder object for decoding utf-8 data in a binary format
import { dcdrUtf8, sDateIsoToYYYYMMDD } from '../share/utils.js';

//Import the file system for persisting API responses
import { promises as fs } from 'fs';

//Import a Postgres connection pool
import { pgPool } from "../share/postgres.js";

//Data Blocks, specify which blocks (@ which levels) to request
const dnbDplDBs = { //Set level to 0 ⬇️ to not include the block
    dbs: [
        {db: 'companyinfo',               level: 2, dbShort: 'ci', version: '1'},
        {db: 'principalscontacts',        level: 1, dbShort: 'pc', version: '2'},
        {db: 'hierarchyconnections',      level: 1, dbShort: 'hc', version: '1'},
        {db: 'financialstrengthinsight',  level: 0, dbShort: 'fs', version: '1'},
        {db: 'paymentinsight',            level: 0, dbShort: 'pi', version: '1'},
        {db: 'eventfilings',              level: 0, dbShort: 'ef', version: '1'},
        {db: 'companyfinancials',         level: 1, dbShort: 'cf', version: '2'},
        {db: 'globalfinancials',          level: 0, dbShort: 'gf', version: '1'},
        {db: 'esginsight',                level: 0, dbShort: 'ei', version: '1'},
        {db: 'ownershipinsight',          level: 0, dbShort: 'oi', version: '1'},
        {db: 'globalbusinessranking',     level: 0, dbShort: 'br', version: '1'},
        {db: 'businessactivityinsight',   level: 0, dbShort: 'ba', version: '1'},
        {db: 'diversityinsight',          level: 0, dbShort: 'di', version: '1'},
        {db: 'dtri',                      level: 0, dbShort: 'dt', version: '1'},
        {db: 'externaldisruptioninsight', level: 0, dbShort: 'ed', version: '1'},
        {db: 'inquiryinsight',            level: 0, dbShort: 'ii', version: '1'},
        {db: 'salesmarketinginsight',     level: 0, dbShort: 'sm', version: '2'},
        {db: 'shippinginsight',           level: 0, dbShort: 'si', version: '1'}
    ],

    getBlockIDs: function() {
        return this.dbs
            .filter(elem => elem.level > 0)
            .map(oDB => `${oDB.db}_L${oDB.level}_v${oDB.version}`)
            .join(',')
    },

    getFileName: function() {
        return this.dbs
            .filter(elem => elem.level > 0)
            .map(oDB => `${oDB.dbShort}_L${oDB.level}`)
            .join('_')
    }
};

const persistence = {
    file: {
        name: '',

        writeFile: function( key, httpStatus, arrBuff ) {
            const fn = `../io/out/${this.name}_${key}_${httpStatus}.json`;

            fs.writeFile( fn, dcdrUtf8.decode(arrBuff) )
                .then( /* console.log(`Wrote file ${fn} successfully`) */ )
                .catch(err => console.error(err.message));
        }
    },

    db: {
        sqlProduct: function(api, keyType) {
            let ret  = `INSERT INTO products_${api === 'dnbDpl' ? 'dnb' : api} (${keyType}, product, http_status, tsz) `;
            ret     += 'VALUES ($1, $2, $3, \'NOW\'::timestamptz) ';
            ret     += `ON CONFLICT (${keyType}) DO `;
            ret     += 'UPDATE SET product = $2, http_status = $3, tsz = \'NOW\'::timestamptz';
        
            return ret;
        },

        sqlProjectKey: function() {
            let ret  = 'INSERT INTO project_keys (id, rec_key, http_status, note, tsz) ';
            ret     += 'VALUES ($1, $2, $3, $4, \'NOW\'::timestamptz) ';
            ret     += 'ON CONFLICT (id, rec_key) DO ';
            ret     += 'UPDATE SET http_status = $3, note = $4, tsz = \'NOW\'::timestamptz';

            return ret;
        }
    }
};

//Script variables
let limiter;   //Rate limiter (see imports)
let inpFile;   //Input file containing the keys
let qryParams; //Request query parameters
let keyType;   //Type of key (duns, lei)

//Current month day is made part of the file name
const monthDay = sDateIsoToYYYYMMDD(new Date().toISOString(), 4);

// ➡️ Main application configuration settings

// First specify the API to call
const api = 'dnbDpl';       //Available options are gleif & dnbDpl

// Choose an endpoint in case the API selected is D&B Direct+
// If Data Blocks (i.e. dbs) configure object dnbDplDBs above
const endpoint = 'dbs';    //dnbDpl options: dbs, famTree, benOwner

// Configure a product if endpoint is beneficial owner (i.e. benOwner)
const boProduct = 'cmpbol'; //Possible values 'cmpbol', 'cmpbos', 'cmpcol' or 'cmpcos'

// Specify persistence options
const persistFile = true;   //Persist the response json as a file
const persistDB = false;     //Persist the reponse json to a Postgres database

// Project ID (please keep it short)
const projectID = '';

// ➡️ Application configuration for GLEIF download
if(api === 'gleif') { //Enrich LEI numbers
    keyType = 'lei';

    limiter = gleifLimiter;

    inpFile = 'LEI.txt';

    persistence.file.name = `lei_${monthDay}${projectID ? '_' + projectID : ''}`;
}

// ➡️ Application configuration for D&B Direct+ download
if(api === 'dnbDpl') { //Enrich DUNS numbers
    keyType = 'duns';

    limiter = dnbDplLimiter;

    inpFile = 'DUNS.txt';

    persistence.file.name = `dnb_dpl_${monthDay}_${projectID ? projectID + '_' : ''}`;

    if(endpoint === 'dbs') {
        qryParams = {
            blockIDs: dnbDplDBs.getBlockIDs(), //Configure data blocks above
            tradeUp: '',                     //Possible values '', 'hq' or 'domhq'
            orderReason: '6332',
            customerReference: 'footyNL'
        }

        persistence.file.name += dnbDplDBs.getFileName();
    }

    if(endpoint === 'famTree') {
        qryParams = {
            //exclusionCriteria: 'Branches', //Do not include branches in the tree
            customerReference: 'Request generated by Hans de Rooij\'s getListOfKeys'
        }

        persistence.file.name += 'fam_tree';
    }

    if(endpoint === 'benOwner') {
        qryParams = {
            productId: boProduct,
            versionId: 'v1',
            tradeUp: 'hq',
            ownershipPercentage: 2.5,
            customerReference: 'Request generated by Hans de Rooij\'s getListOfKeys'
        }

        persistence.file.name += boProduct;
    }
}

//Read key data from a file into a two-dimensional array
const arrInp = readInputFile(inpFile, keyType);

//Asynchronous function for processing the API requests
async function process(arr) {
    return Promise.allSettled(arr.map(key => {
        let apiReq;

        //Instantiate a new LEI API request
        if(api === 'gleif') { apiReq = new LeiReq(key) }

        //Instantiate a new D&B Direct+ API request
        if(api === 'dnbDpl') {
            if(endpoint === 'dbs') {
                apiReq = new DnbDplDBs(key, qryParams)
            }

            if(endpoint === 'famTree') {
                apiReq = new DnbDplFamTree(key, qryParams)
            }

            if(endpoint === 'benOwner') {
                apiReq = new DnbDplBenOwner(key, qryParams)
            }
        }

        const ret = { key }; //Start building the return object

        return new Promise((resolve, reject) => {
            limiter.removeTokens(1) //Respect the API rate limits
                .then(() => fetch(apiReq.getReq())) //The actual API call
                .then(resp => {
                    ret.httpStatus = resp.status; //Return the HTTP status code

                    if (resp.ok) { ret.ok = true }

                    return resp.arrayBuffer();
                })
                .then(arrBuff => {
                    ret.arrBuff = arrBuff; //Return the JSON (as an array of buffers)

                    if(ret.ok) { //The happy flow return right here
                        resolve(ret);
                        return;
                    }

                    ret.note = `Fetch response not okay, HTTP status: ${ret.httpStatus}`;

                    let apiErr;
                    
                    try {
                        apiErr = JSON.parse(dcdrUtf8.decode(arrBuff));
                    }
                    catch(err) {
                        reject(ret);
                        return;
                    }

                    if(apiErr?.errors?.[0]?.detail) { //Gleif error
                        ret.note = apiErr.errors[0].detail
                    }

                    if(apiErr?.error?.errorMessage) { //D&B Direct+ error
                        ret.note = apiErr?.error?.errorMessage
                    }

                    reject(ret);
                })
                .catch(err => reject(err))
        });
    }))
}

//Process the array of arrays one array at a time
for(const [idx0, arrChunk] of arrInp.entries()) {
    const arrSettled = await process(arrChunk); //One array at a time

    //console.log(`Iteration ${idx0}\n`);

    //Logging errors on the rejected keys
    arrSettled
        .filter(elem => elem.status === 'rejected')
        .map(elem => console.error(`Error retrieving ${elem.reason.key} from API ➡️  ${elem.reason.note}`));

    //Write, for each key, the API response body to a file
    if(persistFile) {
        arrSettled.forEach(elem => {
            const { key, httpStatus, arrBuff } = elem.status === 'fulfilled' ? elem.value : elem.reason;

            persistence.file.writeFile( key, httpStatus, arrBuff )
        })
    }

    //Write the results of the API calls to the database
    if(persistDB) {
        //Update table products_gleif/dnb with the fulfilled data
        pgPool.connect()
            .then(pgClient => {
                const qry = {
                    name: 'ins-upd-product',
                    text: persistence.db.sqlProduct(api, keyType)
                };

                Promise.allSettled(arrSettled
                    .filter(elem => elem.status === 'fulfilled')
                    .map(elem => {
                        const { key, arrBuff, httpStatus } = elem.value;

                        return pgClient.query({ ...qry, values: [key, dcdrUtf8.decode(arrBuff), httpStatus] })
                    })
                ).then(() => pgClient.end());
            })
            .catch(err => console.error(err.message))

        //If variable projectID is specified, update table project_keys with the fulfilled data
        if(projectID) {
            pgPool.connect()
                .then(pgClient => {
                    const qry = {
                        name: 'ins-upd-project-key',
                        text: persistence.db.sqlProjectKey()
                    };

                    Promise.allSettled(arrSettled
                        .map(elem => {
                            let key, httpStatus, note;

                            ({ key, httpStatus, note } = elem.status === 'fulfilled' ? elem.value : elem.reason);

                            return pgClient.query({ ...qry, values: [projectID, key, httpStatus, note] });
                        })
                    ).then(() => pgClient.end());
                })
                .catch(err => console.error(err.message))
        }
    }
}
