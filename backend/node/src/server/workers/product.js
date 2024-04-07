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
import { gleifLimiter, dnbDplLimiter } from '../../share/limiters.js';
import { DnbDplDBs } from '../../share/apiDefs.js';
import { HubProjectTransaction } from '../transaction.js';
import { ApiHubErr } from '../err.js';
import handleApiHubErr from '../errCatch.js';

//The stage parameters are passed into the new Worker (i.e. this thread) as part of its instantiation
const { hubAPI, projectStage } = workerData;

//Setup a reusable pool of database clients
const { Pool } = pg;
const pool = new Pool({ ...pgConn, ssl: { require: true } });

//Acquire a database client from the pool
const pgClient = await pool.connect()

//Use a cursor to read the keys included in the project in chunks
const sqlKeys = `SELECT req_key FROM project_keys WHERE project_id = ${projectStage.id}`;
const cursor = pgClient.query( new Cursor( sqlKeys ) );

//SQL insert statement for persisting the API responses
const sqlInsert = 
    `INSERT INTO project_products (
        project_id, stage, req_key, product, http_status
    )
    VALUES (
        ${projectStage.id}, ${projectStage.stage}, $1, $2, $3
    );`

//Instantiate a new project level HubProjectTransaction object
const project_hpt = new HubProjectTransaction(hubAPI, projectStage.script, projectStage);

//Make sure we stay within the set API TPS limitations
const limiter = hubAPI.api === 'dpl' ? dnbDplLimiter : gleifLimiter;

//Process a chunk of keys read using a database cursor
function process(rows) {
    return Promise.allSettled(
        rows.map(row => new Promise((resolve, reject) => {
            //Instantiate hub project transaction for processing an individual key
            const hpt = Object.create(project_hpt);

            limiter.removeTokens(1) //Respect the API rate limits
                .then(() => {
                    //Now set the appropriate key
                    hpt.key = row.req_key;

                    //Execute fetch and return the promise
                    return fetch(new DnbDplDBs( hpt.key, hpt.reqParams ).getReq())
                })
                .then(apiResp => {
                    hpt.resp = apiResp;

                    return apiResp.arrayBuffer();
                })
                .then(buff => {
                    if(hpt.resp?.ok || hpt.nonCriticalErrs.includes(hpt.resp?.status)) {
                        return pool.query(sqlInsert, [ hpt.key, dcdrUtf8.decode(buff), hpt.resp?.status ])
                    }
                    else {
                        throw new ApiHubErr(
                            'httpErrReturn',
                            { project: {id: hpt.projectStage.id, stage: hpt.projectStage.stage, key: row.req_key} },
                            hpt.resp?.status,
                            dcdrUtf8.decode(buff)
                        )
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

                    resolve({ key: row.req_key, status: hpt.resp?.status} );
                })
                .catch(err => {
                    if(err instanceof ApiHubErr) { //Persist the API Hub error
                        handleApiHubErr(hpt, err, pool)
                    }

                    reject(err.addtlMessage || err.message);
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

parentPort.postMessage(`Return upon completion of script ${projectStage.script}`) 
