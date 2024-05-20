// *********************************************************************
//
// Template code for API Hub worker
//
// JavaScript code file: template.js
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

//SQL for requesting the data to process
const sqlSelect = `SELECT ... FROM ... WHERE project_id = ${projectStage.params.project_id};`;

//Instantiate a database cursor
const cursor = pgClient.query( new Cursor( sqlSelect ) );

//SQL for updating/inserting the processed data
const sqlPersist = 'UPDATE INSERT ...';

//The data read from the database is processed in chunks
const chunkSize = 100; let chunk = 0;

//Use a cursor to read the 1st chunk of rows
let rows = await cursor.read(chunkSize);

//Iterate over the rows in discrete chunks
while(rows.length) {
    console.log(`processing chunk ${++chunk}, number of rows ${rows.length}`);

    //Synchronous data processing
    const arrSqlParams =
        rows.filter(row => row.attr === row.otherAttr)
            .map(row => [ row.rad * 3.14, row.id]);

    await processDbTransactions(pool, sqlPersist, arrSqlParams);

    rows = await cursor.read(chunkSize);
}

await WorkerSignOff(pool, parentPort, projectStage);
