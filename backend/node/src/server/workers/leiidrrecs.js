// *********************************************************************
//
// Worker code to create database records used in the process of 
// DUNS to GLEIF conversions. In this step the records in table 
// project_idr will be created based on data as available in D&B
// data blocks.
//
// JavaScript code file: leiidrrecs.js
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

//The stage parameters are passed into the new Worker (i.e. this thread) as part of its instantiation
const { projectStage } = workerData;

//Setup a reusable pool of database clients
const { Pool } = pg;
const pool = new Pool({ ...pgConn, ssl: { require: true } });

//Acquire a database client from the pool
const pgClient = await pool.connect();

//Use a cursor to read the D&B data blocks which are the source of match data
const sqlSelect =
    `SELECT 
        req_key,
        product->'organization' AS org
    FROM project_products
    WHERE
        project_id = ${projectStage.params.product.project_id}
        AND stage = ${projectStage.params.product.stage};`;

const cursor = pgClient.query( new Cursor( sqlSelect ) );

//SQL insert statement for persisting the API responses
const sqlPersist = 
    `INSERT INTO project_idr (
        project_id, stage, addtl_info
    )
    VALUES (
        ${projectStage.project_id}, ${projectStage.stage}, $1
    )
    RETURNING id;`;

//The data read from the database is processed in chunks
const chunkSize = 100; let chunk = 0;

//Use the cursor to read the 1st 100 rows
let rows = await cursor.read(chunkSize);

//Iterate over the available rows
while(rows.length) {
    console.log(`processing chunk ${++chunk}, number of rows ${rows.length}`);

    //Synchronous data processing
    const arrSqlParams =
        rows.map(row => [
            {
                product: {
                    project_id: projectStage.params.product.project_id,
                    stage: projectStage.params.product.stage,
                    req_key: row.req_key
                },
                input: {
                    duns: row.org?.duns,
                    name: row.org?.primaryName,
                    isoCtry: row.org?.countryISOAlpha2Code,
                    addr: row.org?.primaryAddress,
                    regNums: row.org?.registrationNumbers
                },
                tries: []
            }
        ]);

    /* console.log( */ await processDbTransactions(pool, sqlPersist, arrSqlParams) /* ) */;

    rows = await cursor.read(chunkSize);
}

await WorkerSignOff(pool, parentPort, projectStage);

//SQL record in table project_stages for LEI to DUNS conversion, stage record creation
/*
INSERT INTO project_stages
    ( project_id, stage, api, script, params )
VALUES
    ( 8, 1, 'lei', 'leiidrrecs', '{ "product": { "project_id": 1, "stage": 1 } }'::JSONB );

Example stage parameters:
    8,                  ➡️ Project identifier (foreign key referencing table projects)
    1,                  ➡️ The stage at which this script is going to be executed
    'lei',              ➡️ The identification API to be used (foreign key referencing table apis)
    'leiidrrecs'        ➡️ Reference to this script
    params JSON object
    "product"           ➡️ Details on where to find the D&B data blocks
        "project_id"    ➡️ Select a specific project_id from table project_products
        "stage"         ➡️ Select a specific stage from table project_products
*/
