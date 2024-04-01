// *********************************************************************
//
// Worker code to retrieve mult products in multi-stage projects
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
import { gleifLimiter, dnbDplLimiter } from '../../share/limiters.js';
import { DnbDplDBs } from '../../share/apiDefs.js';

//The stage parameters are passed into the new Worker (i.e. this thread) as part of its instantiation
const { hpt } = workerData;

//Setup a reusable pool of database clients
const { Pool } = pg;
const pool = new Pool({ ...pgConn, ssl: { require: true } });

//Acquire a database client from the pool
const pgClient = await pool.connect()

//Use a cursor to read the keys included in the project in chunks
const sqlKeys = `SELECT req_key FROM project_keys WHERE project_id = ${hpt.projectStage.id}`;
const cursor = pgClient.query( new Cursor( sqlKeys ) );

//SQL insert statement for persisting the API responses
const sqlInsert = 
    `INSERT INTO project_products (
        project_id, stage, req_key, product, http_status
    )
    VALUES (
        ${hpt.projectStage.id}, ${hpt.projectStage.stage}, $1, $2, $3
    );`

//Make sure we stay within the set API TPS limitations
const limiter = hpt.hubAPI.api === 'dpl' ? dnbDplLimiter : gleifLimiter;

//Process a chunk of keys read using a database cursor
function process(rows) {
    return Promise.allSettled(
        rows.map(row => new Promise((resolve, reject) => {
            const transaction = { req: new DnbDplDBs( row.req_key, hpt.projectStage.params.reqParams ) };

            limiter.removeTokens(1) //Respect the API rate limits
                .then(() => fetch(transaction.req.getReq()))
                .then(apiResp => {
                    transaction.resp = apiResp;

                    return apiResp.arrayBuffer();
                })
                .then(buff => {
                    if(transaction.resp?.ok || transaction.nonCriticalErrs.includes(transaction.resp?.status)) {
                        return pool.query(sqlInsert, [ row.req_key, dcdrUtf8.decode(buff), transaction.resp?.status ])
                    }
                    else {

                    }
                })
                .then(dbQry => {
                    let ret;

                    if(dbQry && dbQry.rowCount === 1) {
                        ret = `Success executing ${dbQry.command}`
                    }
                    else {
                        ret = `Something went wrong upserting key ${row.req_key}`
                    }

                    resolve({ key: row.req_key, status: transaction.resp?.status} );
                })
        })
    ))
}

//Use the cursor to read the 1st 100 rows
let rows = await cursor.read(100);

//Iterate over the available rows
while(rows.length) {
    const arrSettled = await process(rows);

    console.log(arrSettled);

    rows = await cursor.read(100);
}

parentPort.postMessage(`Return upon completion of script ${hpt.projectStage.script}`) 
