// *********************************************************************
//
// Worker code to retrieve IDentity Resolution (aka match) responses
// from APIs in multi-stage projects
//
// JavaScript code file: idr.js
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
import { LeiFilter, DnbDplIDR } from '../../share/apiDefs.js';
import { HubProjectTransaction } from '../transaction.js';
import { ApiHubErr } from '../err.js';
import handleApiHubErr from '../errCatch.js';

//The stage parameters are passed into the new Worker (i.e. this thread) as part of its instantiation
const { hubAPI, projectStage } = workerData;

//Setup a reusable pool of database clients
const { Pool } = pg;
const pool = new Pool({ ...pgConn, ssl: { require: true } });

//Acquire a database client from the pool
const pgClient = await pool.connect();

//Use a cursor to read the keys included in the project in chunks
const sqlReqs = `SELECT id, params FROM project_idr WHERE project_id = ${projectStage.id} AND stage = ${projectStage.stage};`;
const cursor = pgClient.query( new Cursor( sqlReqs ) );

//SQL insert statement for persisting the API responses
const sqlUpdate = 'UPDATE project_idr SET resp = $1, http_status = $2, tsz = CURRENT_TIMESTAMP WHERE id = $3;';

//Instantiate a new project level HubProjectTransaction object
const project_hpt = new HubProjectTransaction(hubAPI, projectStage.script, projectStage);

//Make sure we stay within the set API TPS limitations
const limiter = hubAPI.api === 'dpl' ? dnbDplLimiter : gleifLimiter;

//Process a chunk of keys read using a database cursor
function process(rows) {
    return Promise.allSettled(
        rows.map(row => new Promise((resolve, reject) => {
            //Instantiate hub project transaction for processing an individual IDR request
            const hpt = Object.create(project_hpt);

            limiter.removeTokens(1) //Respect the API rate limits
                .then(() => {
                    let apiReq;

                    //Create the relevant API request objects
                    if(hubAPI.api === 'dpl') {
                        apiReq = new DnbDplIDR( row.params )
                    }

                    if(hubAPI.api === 'lei') {
                        apiReq = new LeiFilter( row.params )
                    }

                    if(!apiReq) { 
                        throw new ApiHubErr(
                            'invalidParameter',
                            `Unable to create an request object for API ${hubAPI.api}`
                        )
                    }

                    //Execute fetch and return the promise
                    return fetch(apiReq.getReq())
                })
                .then(apiResp => {
                    hpt.resp = apiResp; //Store a reference to the API response

                    //Read the fetch response stream to completion
                    return apiResp.arrayBuffer();
                })
                .then(buff => {
                    //If okay, persist the JSON API response in database table project_products
                    if(hpt.resp?.ok || hpt.nonCriticalErrs.includes(hpt.resp?.status)) {
                        return pool.query(sqlUpdate, [ dcdrUtf8.decode(buff), hpt.resp?.status, row.id ])
                    }
                    else { //HTTP status API response deemed not okay
                        throw new ApiHubErr(
                            'httpErrReturn',
                            `IDentity Resolution request for id ${row.id} returned with HTTP status code ${hpt.resp?.status}`,
                            hpt.resp?.status,
                            dcdrUtf8.decode(buff)
                        )
                    }
                })
                .then(dbQry => { //Database insert query promise now resolved
                    resolve(
                        {
                            id: row.id,
                            status: hpt.resp?.status,
                            rowCount: dbQry.rowCount //In case row count is equal to 1 ➡️ success
                        }
                    )
                })
                .catch(err => {
                    if(err instanceof ApiHubErr) { //Persist the API Hub error
                        handleApiHubErr(hpt, err, pool)
                    }
                    else {
                        handleApiHubErr(hpt, new ApiHubErr('generic', err.message), pool)
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

pool.query(`UPDATE project_stages SET finished = TRUE WHERE project_id = ${projectStage.id} AND stage = ${projectStage.stage}`)
    .then(dbQry => {
        if(dbQry.rowCount === 1) {
            parentPort.postMessage(`Return upon completion of script ${projectStage.script}`);
        }
        else {
            throw new Error('UPDATE database table project_stages somehow failed 🤔');
        }
    })
    .catch(err => console.error(err.message))
