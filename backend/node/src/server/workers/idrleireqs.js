// *********************************************************************
//
// Worker code to create the LEI filter requests in order to facilitate
// DUNS to GLEIF conversions based on data sourced from D&B Direct+ data
// blocks.
//
// JavaScript code file: idrleireqs.js
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

import { 
    processDbTransactions,
    WorkerSignOff,
    leiMatchStage,
    getMatchTry,
    addMatchTry
} from './utils.js';

//The stage parameters are passed into the new Worker (i.e. this thread) as part of its instantiation
const { projectStage } = workerData;

//Setup a reusable pool of database clients
const { Pool } = pg;
const pool = new Pool({ ...pgConn, ssl: { require: true } });

//Acquire a database client from the pool
const pgClient = await pool.connect();

//Use a cursor to read the project stage's raw identification data
const sqlSelect =
    `SELECT 
        id,
        key,
        addtl_info
    FROM project_idr
    WHERE
        project_id = ${projectStage.params.idr.project_id}
        AND stage = ${projectStage.params.idr.stage};`;

const cursor = pgClient.query( new Cursor( sqlSelect ) );

//SQL update statement for persisting the LEI filter requests
const sqlPersist = 'UPDATE project_idr SET params = $1, addtl_info = $2, tsz = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id;';

//The data read from the database is processed in chunks
const chunkSize = 100; let chunk = 0;

//Use a cursor to read the 1st chunk of rows
let rows = await cursor.read(chunkSize);

//Get D&B preferred registration number
function getPrefRegNum(regNums) {
    let prefRegNum = null;

    if(Array.isArray(regNums) && regNums.length) {
        try {
            prefRegNum = regNums.filter(regNum => regNum.isPreferredRegistrationNumber)[0];
    
            if(!prefRegNum) { throw new Error('Unable to locate a preferred registration number') }
        }
        catch(err) {
            prefRegNum = regNums[0]
        }
    }

    return prefRegNum;
}

//Iterate over the available rows
while(rows.length) {
    console.log(`processing chunk ${++chunk}, number of rows ${rows.length}`);

    let arrSqlParams = [];

    //1st try, based on the preferred registration number as available in the D&B data block
    if(projectStage.params.try === leiMatchStage.prefRegNum) {
        arrSqlParams = 
            rows.map(row => {
                const prefRegNum = getPrefRegNum(row.addtl_info?.input?.regNums);

                return {
                    id: row.id,
                    key: row.key,
                    addtlInfo: row.addtl_info,
                    regNum: prefRegNum?.registrationNumber,
                    isPrefRegNum: prefRegNum?.isPreferredRegistrationNumber,
                    isoCtry: row.addtl_info?.input?.isoCtry
                };
            })
            .filter(row => !row.key && row.regNum && row.isoCtry)
            .map(row => {
                let matchTry = getMatchTry(row.addtlInfo, leiMatchStage.prefRegNum);

                if(!matchTry) {
                    matchTry = addMatchTry(row.addtlInfo, leiMatchStage.prefRegNum, row.regNum, row.isoCtry, row.isPrefRegNum)
                }

                return [
                    {
                        'filter[entity.registeredAs]': row.regNum,
                        'filter[entity.legalAddress.country]': row.isoCtry
                    },

                    row.addtlInfo,

                    row.id
                ];
            })
    };

    /* console.log( */ await processDbTransactions( pool, sqlPersist, arrSqlParams ) /* ) */;

    rows = await cursor.read(chunkSize);
}

await WorkerSignOff(pool, parentPort, projectStage);

//SQL record in table project_stages for LEI to DUNS conversion, stage request creation
/*
INSERT INTO project_stages
    ( project_id, stage, api, script, params )
VALUES
    ( 8, 2, 'lei', 'idrleireqs', '{ "idr": { "project_id": 8, "stage": 1 }, "try": 1 }'::JSONB );

Example stage parameters:
    8,                  ➡️ Project identifier (foreign key referencing table projects)
    2,                  ➡️ The stage at which this script is going to be executed
    'lei',              ➡️ The identification API to be used (foreign key referencing table apis)
    'idrleireqs'        ➡️ Reference to this script
    params JSON object
    "idr"               ➡️ Details on the initial IDentity Resolution project stage
        "project_id"    ➡️ A project_id referencing data in table project_idr
        "stage"         ➡️ A specific stage referencing data in table project_idr
    "try"               ➡️ One of the predefined LEI match (aka filter) stages
*/
