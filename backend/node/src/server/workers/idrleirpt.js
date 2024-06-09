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

import { createWriteStream } from 'fs';
import { stringify } from 'csv-stringify';

import { WorkerSignOff } from './utils.js';

//The stage parameters are passed into the new Worker (i.e. this thread) as part of its instantiation
const { projectStage } = workerData;

//Setup a reusable pool of database clients
const { Pool } = pg;
const pool = new Pool({ ...pgConn, ssl: { require: true } });

//Acquire a database client from the pool
const pgClient = await pool.connect();

const cols = [
    'dnb duns', 'dnb bus nme', 'dnb line 1', 'dnb line 2', 'dnb post cd', 'dnb city nme', 'dnb state prov', 'dnb ctry ISO',

    'LEI', 'lei bus nme', 'lei line 1', 'lei line 2', 'lei post cd', 'lei city nme', 'lei state prov', 'lei ctry ISO', 'lei reg num',

    'try 1 reg num', 'try 1 success', 'try 2 reg num', 'try 2 success', 'try 3 name',

    'success try', 'qlty reg num match', 'qlty name match', 'qlty city match'
];

//SQL for requesting the data to process
const sqlSelect = `SELECT
	
   addtl_info->'product'->>'req_key' AS "${cols[0]}",
   inp_data->>'name' AS "${cols[1]}",
   inp_data->'addr'->'streetAddress'->>'line1' AS "${cols[2]}",
   inp_data->'addr'->'streetAddress'->>'line2' AS "${cols[3]}",
   inp_data->'addr'->>'postalCode' AS "${cols[4]}",
   inp_data->'addr'->'addressLocality'->>'name' AS "${cols[5]}",
   inp_data->'addr'->'addressRegion'->>'abbreviatedName' AS "${cols[6]}",
   inp_data->'addr'->'addressCountry'->>'isoAlpha2Code' AS "${cols[7]}",

   key AS "${cols[8]}",
   resp->'data'->0->'attributes'->'entity'->'legalName'->>'name' AS "${cols[9]}",
   resp->'data'->0->'attributes'->'entity'->'legalAddress'->'addressLines'->>0 AS "${cols[10]}",
   resp->'data'->0->'attributes'->'entity'->'legalAddress'->'addressLines'->>1 AS "${cols[11]}",
   resp->'data'->0->'attributes'->'entity'->'legalAddress'->>'postalCode' AS "${cols[12]}",
   resp->'data'->0->'attributes'->'entity'->'legalAddress'->>'city' AS "${cols[13]}",
   resp->'data'->0->'attributes'->'entity'->'legalAddress'->>'region' AS "${cols[14]}",
   resp->'data'->0->'attributes'->'entity'->'legalAddress'->>'country' AS "${cols[15]}",
   resp->'data'->0->'attributes'->'entity'->>'registeredAs' AS "${cols[16]}",

   jsonb_path_query(addtl_info->'tries', '$[*] ? (@.stage == 1)')->'in'->'regNum'->>'value' AS "${cols[17]}",
   (jsonb_path_query(addtl_info->'tries', '$[*] ? (@.stage == 1)')->>'success')::boolean AS "${cols[18]}",
   jsonb_path_query(addtl_info->'tries', '$[*] ? (@.stage == 2)')->'in'->'regNum'->>'value' AS "${cols[19]}",
   (jsonb_path_query(addtl_info->'tries', '$[*] ? (@.stage == 2)')->>'success')::boolean AS "${cols[20]}",
   jsonb_path_query(addtl_info->'tries', '$[*] ? (@.stage == 3)')->'in'->>'name' AS "${cols[21]}",

   (quality->>'stage')::int AS "${cols[22]}",
   (quality->'scores'->>'regNum')::int AS "${cols[23]}",
   (quality->'scores'->>'name')::int AS "${cols[24]}",
   (quality->'scores'->>'city')::int AS "${cols[25]}"

FROM project_idr

WHERE project_id = ${projectStage.params.idr.project_id} AND stage = ${projectStage.params.idr.stage}

ORDER BY id ASC;`;

//Instantiate a database cursor
const cursor = pgClient.query( new Cursor( sqlSelect ) );

//Write the data from the database query to a csv delimited file
const filename = projectStage.params.rptFilename || 'idrleirpt';
const stringifier = stringify({ header: true, columns: cols, quoted_string: true });
stringifier.pipe(createWriteStream(`../io/out/${filename}.csv`));

//The data read from the database is processed in chunks
const chunkSize = 100; let chunk = 0;

//Use a cursor to read the 1st chunk of rows
let rows = await cursor.read(chunkSize);

//Iterate over the rows in discrete chunks
while(rows.length) {
    console.log(`processing chunk ${++chunk}, number of rows ${rows.length}`);

    rows.forEach( row => stringifier.write(row) )

    rows = await cursor.read(chunkSize);
}

await WorkerSignOff(pool, parentPort, projectStage);
