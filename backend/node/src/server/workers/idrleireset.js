// *********************************************************************
//
// Worker code to clean-up rejected LEI filter responses after
// performing QA on a match stage.
//
// JavaScript code file: idrleireset.js
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

import { processDbTransactions, WorkerSignOff } from './utils.js';

import { leiMatchStage, getMatchTry, addMatchTry } from './utils.js';

//The stage parameters are passed into the new Worker (i.e. this thread) as part of its instantiation
const { projectStage } = workerData;

//Setup a reusable pool of database clients
const { Pool } = pg;
const pool = new Pool({ ...pgConn, ssl: { require: true } });

//Acquire a database client from the pool
const pgClient = await pool.connect();

//Use a cursor to read the project stage's raw identification data
const sqlSelect = `SELECT 
                    id,
                    params,
                    resp,
                    http_status,
                    addtl_info
                FROM project_idr
                WHERE
                    project_id = ${projectStage.params.idr.project_id}
                    AND stage = ${projectStage.params.idr.stage}
                    AND key IS NULL
                    AND params IS NOT NULL;`;

const cursor = pgClient.query( new Cursor( sqlSelect ) );

//SQL update statement for persisting IDR requests
const sqlPersist = `UPDATE project_idr
    SET params = NULL,
        resp = NULL,
        http_status = NULL,
        quality = NULL,
        remark = NULL,
        addtl_info = $1,
        tsz = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id;`;

//The data read from the database is processed in chunks
const chunkSize = 100; let chunk = 0;

//Use the cursor to read the 1st 100 rows
let rows = await cursor.read(chunkSize);

//Iterate over the available rows
while(rows.length) {
    console.log(`processing chunk ${++chunk}, number of rows ${rows.length}`);

    const arrSqlParams = rows.map(row => {
        let matchTry = getMatchTry(row.addtl_info, projectStage.params.try);

        if(!matchTry) {
            const req = { isoCtry: row.params['filter[entity.legalAddress.country]'] };

            if(projectStage.params.try === leiMatchStage.nameCtry) {
                req.name = row.params['filter[entity.legalName]']
            }
            else {
                req.regNum = { value: row.params['filter[entity.registeredAs]'] }       
            }
    
            matchTry = addMatchTry( row.addtl_info, projectStage.params.try, req )
        }

        matchTry.out = {
            numCandidates: row.resp?.data ? row.resp.data.length : 0,
            http_status: row.http_status,
        };

        if(row.resp?.data?.[0]) { matchTry.out.candidate0 = row.resp.data[0]}

        return [
            row.addtl_info,

            row.id
        ];
    });

    /* console.log( */ await processDbTransactions(pool, sqlPersist, arrSqlParams) /* ) */;

    rows = await cursor.read(chunkSize);
}

await WorkerSignOff(pool, parentPort, projectStage);

//SQL record in table project_stages for LEI to DUNS conversion, stage match data reset
/*
INSERT INTO project_stages
    ( project_id, stage, api, script, params )
VALUES
    ( 8, 5, 'lei', 'idrleireset', '{ "idr": { "project_id": 8, "stage": 1 }, "try": 1 }'::JSONB );

Example stage parameters:
    8,                  ➡️ Project identifier (foreign key referencing table projects)
    5,                  ➡️ The stage at which this script is going to be executed
    'lei',              ➡️ The identification API to be used (foreign key referencing table apis)
    'idrleireset'       ➡️ Reference to this script
    params JSON object
    "idr"               ➡️ Details on the initial IDentity Resolution project stage
        "project_id"    ➡️ A project_id referencing data in table project_idr
        "stage"         ➡️ A specific stage referencing data in table project_idr
    "try"               ➡️ One of the predefined LEI match (aka filter) stages
*/
