// *********************************************************************
//
// The core code of the API Hub Express server
// JavaScript code file: core.js
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

import { dcdrUtf8 } from '../share/utils.js';
import { LeiReq, LeiFilter, DnbDplDBs, DnbDplIDR } from '../share/apiDefs.js';
import db from './pg.js';
import { ApiHubErr, httpStatus } from './err.js';

const errNonCritical = new Map([
    [ 'gleif', [ 404 ] ],
    [ 'dnb', [ 404 ] ]
]);

function ahReqPersistRespKey( transaction ) {
    let bForceNew, sSqlSelect, sSqlUpsert;

    const sSqlHttpErr = 'INSERT INTO errors_http (req, err, http_status) VALUES ($1, $2, $3)';

    if(transaction.provider === 'gleif') {
        if(transaction.api === 'lei') {
            sSqlSelect  = `SELECT lei, product_${transaction.product}, http_status_${transaction.product}, tsz_${transaction.product} FROM products_gleif WHERE lei = $1;`;

            sSqlUpsert  = `INSERT INTO products_gleif (lei, product_${transaction.product}, http_status_${transaction.product}, tsz_${transaction.product}) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) `;
            sSqlUpsert += `ON CONFLICT ( lei ) DO UPDATE SET product_${transaction.product} = $2, http_status_${transaction.product} = $3, tsz_${transaction.product} = CURRENT_TIMESTAMP;`;

            transaction.req = new LeiReq(transaction.key, transaction.reqParams.subSingleton);

            //Don't deliver from the database if forceNew query parameter is set to true
            bForceNew = transaction.expressReq.query?.forceNew && transaction.expressReq.query.forceNew.toLowerCase() === 'true';
        }
    }

    if(transaction.provider === 'dnb') {
        if(transaction.api === 'dpl') {
            sSqlSelect  = `SELECT duns, product_${transaction.product}, tsz_${transaction.product}, http_status_${transaction.product} FROM products_dnb WHERE duns = $1;`;

            sSqlUpsert  = `INSERT INTO products_dnb (duns, product_${transaction.product}, http_status_${transaction.product}, tsz_${transaction.product}) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) `;
            sSqlUpsert += `ON CONFLICT ( duns ) DO UPDATE SET product_${transaction.product} = $2, http_status_${transaction.product} = $3, tsz_${transaction.product} = CURRENT_TIMESTAMP;`;
    
            //Don't deliver from the database if forceNew query parameter is set to true
            bForceNew = transaction.expressReq.query?.forceNew && transaction.expressReq.query.forceNew.toLowerCase() === 'true';

            transaction.req = new DnbDplDBs(transaction.key, transaction.reqParams);
        }
    }

    //If not forceNew and data available from database, deliver from stock
    (bForceNew ? Promise.resolve(null) : db.query( sSqlSelect, [ transaction.key ]))
        .then(dbQry => {
            if(dbQry) { //bForceNew === false
                if(dbQry.rows.length && dbQry.rows[0]['product_' + transaction.product]) { //Requested transaction.product available on the database
                    transaction.expressResp
                        .header({
                            'X-B2BAH-Cache': true,
                            'X-B2BAH-Obtained-At': new Date(dbQry.rows[0]['tsz_' + transaction.product]).toISOString()
                        })
            
                        .json(dbQry.rows[0]['product_'+ transaction.product]);
        
                    throw new Error( //Skip the rest of the then chain
                        `Request for key ${transaction.key} delivered from the database`,
                        { cause: 'breakThenChain' }
                    );
                }
            }

            transaction.tsReq = Date.now(); //Timestamp the HTTP request

            return fetch(transaction.req.getReq()) //Request date from external API
        })
        .then(apiResp => {
            transaction.tsResp = Date.now(); //Timestamp the receipt of the HTTP response

            transaction.resp = apiResp;

            return apiResp.arrayBuffer();
        })
        .then(buff => {
            //A bit of reporting about the external API transaction
            let msg = `Request for key ${transaction.key} returned with HTTP status code ${transaction.resp?.status}`;

            if(transaction?.tsResp && transaction?.tsReq) {
                msg += ` (${transaction.tsResp - transaction.tsReq} ms)`
            }
        
            console.log(msg);

            //Decode the array buffer returned to a string
            transaction.strBody = buff ? dcdrUtf8.decode(buff) : null;

            //Happy flow
            if(transaction.resp?.ok || transaction.nonCriticalErrs.includes(transaction.resp?.status)) {
                transaction.expressResp
                    .header({
                        'X-B2BAH-Cache': false,
                        'X-B2BAH-API-HTTP-Status': transaction.resp?.status,
                        'X-B2BAH-Obtained-At': new Date(transaction.tsResp).toISOString()
                    })

                    .type('json')
        
                    .status(httpStatus.okay.code)
        
                    .send(transaction.strBody);
            }
            else { //transaction.resp.ok evaluates to false, start error handling
                //Log the HTTP error to the database
                db.query( sSqlHttpErr, [
                    JSON.stringify(
                        {
                            provider: transaction.provider,
                            api: transaction.api,
                            key: transaction.key
                        }
                    ),
                    transaction.strBody,
                    transaction.resp?.status
                ])
                    .then(dbQry => {} /* console.log(`Log ${dbQry && dbQry.rowCount > 0 ? '✅' : '❌'}`) */)
                    .catch(err => console.error(err));

                //Handle the error in the catch clause
                throw new ApiHubErr(
                    'httpErrReturn',
                    msg,
                    transaction.resp?.status,
                    transaction.strBody
                );
            }

            return db.query( sSqlUpsert, [ transaction.key, transaction.strBody, transaction.resp?.status ]);
        })
        .then(dbQry => {
            if(dbQry && dbQry.rowCount === 1) {
                console.log(`Success executing ${dbQry.command} for key ${transaction.key}`)
            }
            else {
                console.error(`Something went wrong upserting key ${transaction.key}`)
            }

            //Done 🙂✅
        })
        .catch(err => {
            if(err.cause === 'breakThenChain') {
                console.log(err.message) //Early escape, not an actual error
            }
            else {
                throw( err )
            }
        })
}

export default function ahReqPersistRespIDR( transaction ) {
    let sSqlInsert;

    const sSqlHttpErr = 'INSERT INTO errors_http (req, err, http_status) VALUES ($1, $2, $3)';

    if(transaction.api === 'lei') {
        sSqlInsert = 'INSERT INTO idr_lei (req_params, resp_idr, http_status, tsz) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id';

        transaction.req = new LeiFilter(transaction.expressReq.body);
    }

    if(transaction.api === 'dpl') {
        sSqlInsert = 'INSERT INTO idr_dnb_dpl (req_params, resp_idr, http_status, tsz) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id';

        transaction.req = new DnbDplIDR(transaction.expressReq.body);
    }

    transaction.tsReq = Date.now(); //Timestamp the HTTP request

    fetch(transaction.req.getReq()) //Request date from external API
        .then(apiResp => {
            transaction.tsResp = Date.now(); //Timestamp the receipt of the HTTP response

            transaction.resp = apiResp;

            return apiResp.arrayBuffer();
        })
        .then(buff => {
            //A bit of reporting about the external API transaction
            let msg;

            msg = `IDR request returned with HTTP status code ${transaction.resp?.status}`;

            if(transaction?.tsResp && transaction?.tsReq) {
                msg += ` (${transaction.tsResp - transaction.tsReq} ms)`
            }
        
            console.log(msg);

            //Decode the array buffer returned to a string
            transaction.strBody = buff ? dcdrUtf8.decode(buff) : null;
        
            //Not all errors should be considered as such
            if(!(transaction.resp?.ok || transaction.nonCriticalErrs.includes(transaction.resp?.status))) {
                //Log the HTTP error to the database
                db.query( sSqlHttpErr, [
                    JSON.stringify(
                        {
                            provider: transaction.provider,
                            api: transaction.api,
                            idr: true
                        }
                    ),
                    transaction.strBody,
                    transaction.resp?.status
                ])
                    .then(dbQry => {} /* console.log(`Log ${dbQry && dbQry.rowCount > 0 ? '✅' : '❌'}`) */)
                    .catch(err => console.error(err));

                //Handle the error in the catch clause
                throw new ApiHubErr(
                    'httpErrReturn',
                    msg,
                    transaction.resp?.status,
                    transaction.strBody
                );
            }

            return db.query( sSqlInsert, [ JSON.stringify(transaction.expressReq.body), transaction.strBody, transaction.resp?.status ]);
        })
        .then(dbQry => {
            let dbRowID = 0;

            if(dbQry && dbQry.rowCount === 1) {
                console.log(`Success executing ${dbQry.command}, IDentity Resolution row ${dbQry.rows[0].id} returned`);

                dbRowID = dbQry.rows[0].id;
            }
            else {
                console.error(`Something went wrong persisting IDR request with criteria ${JSON.stringify(transaction.expressReq.body)}`)
            }

            transaction.expressResp
                .header({
                    'X-B2BAH-API-HTTP-Status': transaction.resp?.status,
                    'X-B2BAH-Obtained-At': new Date(transaction.tsResp).toISOString(),
                    'X-B2BAH-IDR-ID': dbRowID
                })

                .type('json')

                .status(httpStatus.okay.code)

                .send(transaction.strBody);

            //Done 🙂✅
        })
        .catch(err => {
            if(isNumber(err.hubErrorCode)) { //Error of class ApiHubErr was thrown
                transaction.expressResp.status(err.httpStatus.code).json( err );
            }
            else {
                const ahErr = new ApiHubErr(
                    'generic',
                    err.message,
                    transaction.resp?.status,
                    transaction.strBody
                );
    
                transaction.expressResp.status(ahErr.httpStatus.code).json( ahErr );
            }
        })
}

export {
    ahReqPersistRespKey,
    ahReqPersistRespIDR
};
