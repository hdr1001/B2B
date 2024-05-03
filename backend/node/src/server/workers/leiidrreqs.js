// *********************************************************************
//
// Worker code to retrieve data products in multi-stage projects
// JavaScript code file: product.js
//
// Copyright 2024 Hans de Rooij
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

import 'dotenv/config'; //.env configuration
import { parentPort, workerData } from 'worker_threads';

//Postgres modules & connection parameters
import pg from 'pg';
import Cursor from 'pg-cursor';
import pgConn from '../pgGlobs.js';

import { dcdrUtf8 } from '../../share/utils.js';
import { pgDbLimiter } from '../../share/limiters.js';
import { LeiReq, DnbDplDBs, DnbDplFamTree, DnbDplBenOwner } from '../../share/apiDefs.js';
import { HubProjectTransaction } from '../transaction.js';
import { ApiHubErr } from '../err.js';
import handleApiHubErr from '../errCatch.js';

const stagePreferredRegNum = 1;
const stageOptimizedRegNum = 2;

//The stage parameters are passed into the new Worker (i.e. this thread) as part of its instantiation
const { hubAPI, projectStage } = workerData;

//Setup a reusable pool of database clients
const { Pool } = pg;
const pool = new Pool({ ...pgConn, ssl: { require: true } });

//Acquire a database client from the pool
const pgClient = await pool.connect();

//Use a cursor to read the keys included in the project in chunks
const sqlKeys = `SELECT 
                    req_key,
                    product->'organization'->'registrationNumbers' AS reg_nums,
                    product->'organization'->>'countryISOAlpha2Code' AS iso_ctry
                FROM project_products
                WHERE
                    project_id = ${projectStage.params.product.project_id}
                    AND stage = ${projectStage.params.product.stage};`;

const cursor = pgClient.query( new Cursor( sqlKeys ) );

//SQL insert statement for persisting the API responses
const sqlInsert = 
    `INSERT INTO project_idr (
        project_id, stage, params, addtl_info
    )
    VALUES (
        ${projectStage.id}, ${projectStage.stage}, $1, $2
    )
    RETURNING id;`;
/*
const regNumCtry = new Map(
    ['at', (regNums, regNum, stage) => {
        if(stage !== 1) { return null }

        const regNum1336 = regNums.filter(atRegNum => atRegNum.typeDnBCode === 1336);

        if(regNum1336.length && regNum1336[0].registrationNumber.slice(0, 2) === 'FN') {
            regNum.value = regNum1336[0].registrationNumber.slice(2);
            regNum.typeCode = regNum1336[0].typeDnBCode;
        }

        return regNum;
    }],

    ['be', (regNums, regNum, stage) => {
        if(stage === 1) {
            const regNum800 = regNums.filter(beRegNum => beRegNum.typeDnBCode === 800);
            
            if(regNum800.length && regNum800[0].registrationNumber.length === 10) {
                regNum.value  = regNum800[0].registrationNumber.slice(0, 4);
                regNum.value += '.' + regNum800[0].registrationNumber.slice(4, 7);
                regNum.value += '.' + regNum800[0].registrationNumber.slice(-3);

                regNum.typeCode = regNum800[0].typeDnBCode;
            }
    
            return regNum;    
        }

        if(stage === 2) {
            const regNum800 = regNums.filter(beRegNum => beRegNum.typeDnBCode === 800);
            
            if(regNum800.length) {
                regNum.value  = regNum800[0].registrationNumber;

                regNum.typeCode = regNum800[0].typeDnBCode;
            }
    
            return regNum;    
        }

        return null
    }],
);

//Pre-process registration numbers
function preProcessRegNum(regNums, regNum, stage) {

}
*/
//Process a chunk of keys read using a database cursor
function prepareReqs(reqs) {
    return Promise.allSettled(
        reqs.map(req => new Promise((resolve, reject) => {
            pgDbLimiter.removeTokens(1) //Throttle the number of SQL statements
                .then(() => {
                    return pool.query(sqlInsert, [ req.leiFilterReq, req.addtlInfo ])
                })
                .then(dbQry => {
                    resolve({ ...req.leiFilterReq, duns: req.addtlInfo.duns })
                })
        }))
    )
}

//Use the cursor to read the 1st 100 rows
let rows = await cursor.read(100);

//Iterate over the available rows
while(rows.length) {
    const reqs = rows.map(row => {
        let regNum = { value: '' };

        if(row.reg_nums.length) {
            if(projectStage.params.idrStage === stagePreferredRegNum) {
                const preferredRegNum = row.reg_nums.filter(reg_num => reg_num.isPreferredRegistrationNumber);

                if(preferredRegNum.length) {
                    regNum.value = preferredRegNum[0].registrationNumber;
                    regNum.preferred = true;
                }
                else { //No preferred registration number assigned
                    regNum.value = row.reg_nums[0].registrationNumber;
                }    
            }
        }

        return {
            leiFilterReq: {
                'filter[entity.registeredAs]': regNum.value,
                'filter[entity.legalAddress.country]': row.iso_ctry
            },
            addtlInfo: {
                duns: row.req_key
            }
        };
    }).filter(req => req.leiFilterReq['filter[entity.registeredAs]']);

    const arrSettled = await prepareReqs(reqs);

    console.log(arrSettled);

    rows = await cursor.read(100);
}

pool.query(`UPDATE project_stages SET finished = TRUE WHERE project_id = ${projectStage.id} AND stage = ${projectStage.stage} RETURNING *`)
    .then(dbQry => {
        if(dbQry.rowCount === 1) {
            parentPort.postMessage(`Return upon completion of script ${projectStage.script}`);
        }
        else {
            throw new Error('UPDATE database table project_stages somehow failed 🤔');
        }
    })
    .catch(err => console.error(err.message))

//SQL script fo parameterizing product projects
/*
➡️ Create an entry in table projects & describe the project in field descr
➡️ A unique project identifier will be created & assigned to variable p_id
INSERT INTO projects ( descr ) VALUES ('Test project D&B') RETURNING id INTO p_id;

➡️ The product script is intended to be a stage in a sequence of stages
INSERT INTO project_stages
   ( project_id, stage, api, script, params )
VALUES
   (
      p_id,      ➡️ Project identifier
      1,         ➡️ Stage
      'dpl',     ➡️ The API to be used (foreign key referencing table apis)
      'product', ➡️ Parameter identifying this script
      ➡️ Miscellaneous project parameters
      ➡️ endpoint, for specifying dbs (data blocks, optional), benOwner (beneficial ownership) & famTree (full family tree)
      '{ "endpoint": "benOwner", "qryParameters": { "productId": "cmpbol", "versionId": "v1", "ownershipPercentage": 2.5 } }'
      ➡️ qryParameters, API request query parameters
      '{ "qryParameters": { "blockIDs": "companyinfo_L2_v1,hierarchyconnections_L1_v1", "orderReason": 6332 } }'
      ➡️ subSingleton, to add to a API REST request
      '{ "subSingleton": "ultimate-parent-relationship" }'
   );

INSERT INTO project_keys
   ( project_id, req_key )
VALUES
   ( p_id, '407809623' ), ( p_id, '372428847' ), ( p_id, '373230036' );
*/
