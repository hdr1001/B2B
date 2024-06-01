// *********************************************************************
//
// Worker code to automatically perform quality assurance on GLEIF
// filter request responses generated in multi-stage projects
//
// JavaScript code file: idrleiautoqa.js
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
import { jaroWrinker } from '../../share/jaroWrinker.js';

//The stage parameters are passed into the new Worker (i.e. this thread) as part of its instantiation
const { projectStage } = workerData;

//Setup a reusable pool of database clients
const { Pool } = pg;
const pool = new Pool({ ...pgConn, ssl: { require: true } });

//Acquire a database client from the pool
const pgClient = await pool.connect();

//Use a cursor to read the keys included in the project in chunks
const sqlSelect =
    `SELECT
        id,
        params,
        resp,
        http_status,
        key,
        addtl_info
    FROM project_idr
    WHERE
        project_id = ${projectStage.params.idr.project_id}
    AND stage = ${projectStage.params.idr.stage};`;

const cursor = pgClient.query( new Cursor( sqlSelect ) );

//SQL update statement for persisting the API responses
const sqlPersist =
    `UPDATE project_idr
    SET
        key = $1,
        quality = $2,
        remark = $3,
        addtl_info = $4,
        tsz = CURRENT_TIMESTAMP
    WHERE
        id = $5
    RETURNING id;`;

//The data read from the database is processed in chunks
const chunkSize = 100; let chunk = 0;

//Use the cursor to read the 1st 100 rows
let rows = await cursor.read(chunkSize);

//Iterate over the available rows
while(rows.length) {
    console.log(`processing chunk ${++chunk}, number of rows ${rows.length}`);

    //QA only relevant if (1) not already resolved, (2) valid HTTP response and (3) at least one candidate available
    const rowsCandidateAvailable = rows.filter(row => !row.key && row.http_status === 200 && row.resp?.data?.[0]);

    let rowsQaApprove = [], regNumMatch = false;

    if(projectStage.params.try === leiMatchStage.prefRegNum || projectStage.params.try === leiMatchStage.custRegNum) {
        //Validate the submitted registration number against the one in the REST response
        rowsQaApprove = rowsCandidateAvailable.filter(
            row => row.params['filter[entity.registeredAs]'] &&
                row.params['filter[entity.registeredAs]'] === row.resp.data[0].attributes?.entity?.registeredAs);

        regNumMatch = true;
    }

    console.log(`Num of resp w. candidates ${rowsCandidateAvailable.length}, validated reg num matches ${rowsQaApprove.length}`);

    if(rowsQaApprove.length) { //QA the registration number based match candidates
        const arrSqlParams = rowsQaApprove.map(row => {
            let matchTry = getMatchTry(row.addtl_info, projectStage.params.try);

            if(!matchTry) {
                matchTry = addMatchTry(row.addtl_info, projectStage.params.try, row.params['filter[entity.registeredAs]'], row.params['filter[entity.legalAddress.country]'])
            }

            matchTry.success = true;

            const qlt = {
                stage: projectStage.params.try,
                scores: {
                    name: Math.floor(
                        jaroWrinker(row.addtl_info?.input?.name, row.resp?.data?.[0]?.attributes?.entity?.legalName?.name) * 100
                    ),
                    city: Math.floor(
                        jaroWrinker(row.addtl_info?.input?.addr?.addressLocality?.name, row.resp?.data?.[0]?.attributes?.entity?.legalAddress?.city) * 100
                    )
                }
            };

            if(regNumMatch) { qlt.scores.regNum = 100 }

            return [
                //The LEI is what we are looking for
                row.resp.data[0].attributes?.lei,

                //One hundred points for the ID match
                qlt,

                //Just for the record ⬇️
                'LEI registration number match',

                //More information for the record ⬇️
                row.addtl_info,

                //The primary key of table project_idr
                row.id
            ];          
        })

        /* console.log( */ await processDbTransactions(pool, sqlPersist, arrSqlParams) /* ) */;
    }

    rows = await cursor.read(chunkSize);
}

await WorkerSignOff(pool, parentPort, projectStage);

//SQL record in table project_stages for LEI to DUNS conversion, stage quality assurance
/*
INSERT INTO project_stages
    ( project_id, stage, api, script, params )
VALUES
    ( 8, 4, 'lei', 'idrleiautoqa', '{ "idr": { "project_id": 8, "stage": 1 }, "try": 1 }'::JSONB );

Example stage parameters:
    8,                  ➡️ Project identifier (foreign key referencing table projects)
    4,                  ➡️ The stage at which this script is going to be executed
    'lei',              ➡️ The identification API to be used (foreign key referencing table apis)
    'idrleiautoqa'      ➡️ Reference to this script
    params JSON object
    "idr"               ➡️ Details on the initial IDentity Resolution project stage
        "project_id"    ➡️ A project_id referencing data in table project_idr
        "stage"         ➡️ A specific stage referencing data in table project_idr
    "try"               ➡️ One of the predefined LEI match (aka filter) stages
*/
