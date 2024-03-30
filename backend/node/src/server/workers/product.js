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

import { gleifLimiter, dnbDplLimiter } from '../../share/limiters.js';

pg.defaults.parseInt8 = true;

//The stage parameters are passed into the new Worker (i.e. this thread) as part of its instantiation
const { hpt } = workerData;

const limiter = hpt.hubAPI.api === 'dpl' ? dnbDplLimiter : gleifLimiter;

//Create a new database client, connect & instantiate a new cursor
const client = new pg.Client( { ...pgConn, ssl: { require: true }} );
await client.connect();
const cursor = client.query( new Cursor(`SELECT req_key FROM project_keys WHERE project_id = ${hpt.projectStage.id}`) );

//Use the cursor to read the 1st 100 rows
let rows = await cursor.read(100);

function process(rows) {
    return Promise.allSettled(rows.map(row => {
        return new Promise((resolve, reject) => {
            limiter.removeTokens(1) //Respect the API rate limits
                .then(() => {
                    hpt.key = row.req_key;

                    resolve(`Request key = ${JSON.stringify(hpt)}`);
                    
                    return;
                })
        })
    }))
}

//Iterate over the available rows
while(rows.length) {
    const arrSettled = await process(rows);

    console.log(arrSettled);

    rows = await cursor.read(100);
}

parentPort.postMessage(`Return upon completion of script ${hpt.projectStage.script}`) 
