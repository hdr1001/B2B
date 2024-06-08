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
const sqlSelect = `SELECT
	
   addtl_info->'product'->>'req_key' AS "dnb duns",
   inp_data->>'name' AS "dnb bus nme",
   inp_data->'addr'->'streetAddress'->>'line1' AS "dnb line 1",
   inp_data->'addr'->'streetAddress'->>'line2' AS "dnb line 2",
   inp_data->'addr'->>'postalCode' AS "dnb post cd",
   inp_data->'addr'->'addressLocality'->>'name' AS "dnb city nme",
   inp_data->'addr'->'addressRegion'->>'abbreviatedName' AS "dnb state prov",
   inp_data->'addr'->'addressCountry'->>'isoAlpha2Code' AS "dnb ctry ISO",

   key AS "LEI",
   resp->'data'->0->'attributes'->'entity'->'legalName'->>'name' AS "lei bus nme",
   resp->'data'->0->'attributes'->'entity'->'legalAddress'->'addressLines'->>0 AS "lei line 1",
   resp->'data'->0->'attributes'->'entity'->'legalAddress'->'addressLines'->>1 AS "lei line 2",
   resp->'data'->0->'attributes'->'entity'->'legalAddress'->>'postalCode' AS "lei post cd",
   resp->'data'->0->'attributes'->'entity'->'legalAddress'->>'city' AS "lei city nme",
   resp->'data'->0->'attributes'->'entity'->'legalAddress'->>'region' AS "lei state prov",
   resp->'data'->0->'attributes'->'entity'->'legalAddress'->>'country' AS "lei ctry ISO",
   resp->'data'->0->'attributes'->'entity'->>'registeredAs' AS "lei reg num",

   jsonb_path_query(addtl_info->'tries', '$[*] ? (@.stage == 1)')->'in'->'regNum'->>'value' AS "try 1 reg num",
   jsonb_path_query(addtl_info->'tries', '$[*] ? (@.stage == 1)')->>'success' AS "try 1 success",
   jsonb_path_query(addtl_info->'tries', '$[*] ? (@.stage == 2)')->'in'->'regNum'->>'value' AS "try 2 reg num",
   jsonb_path_query(addtl_info->'tries', '$[*] ? (@.stage == 2)')->>'success' AS "try 2 success",
   jsonb_path_query(addtl_info->'tries', '$[*] ? (@.stage == 3)')->'in'->>'name' AS "try 3 name",

   quality->>'stage' AS "success try",
   quality->'scores'->>'regNum' AS "qlty reg num match",
   quality->'scores'->>'name' AS "qlty name match",
   quality->'scores'->>'city' AS "qlty city match"

FROM project_idr

WHERE project_id = ${projectStage.params.idr.project_id} AND stage = ${projectStage.params.idr.stage}

ORDER BY id ASC;`;

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
/*
    //Synchronous data processing
    const arrSqlParams =
        rows.filter(row => row.attr === row.otherAttr)
            .map(row => [ row.rad * 3.14, row.id]);

    await processDbTransactions(pool, sqlPersist, arrSqlParams);
*/
    rows.forEach( row => console.log(row['dnb duns']) )

    rows = await cursor.read(chunkSize);
}

await WorkerSignOff(pool, parentPort, projectStage);
