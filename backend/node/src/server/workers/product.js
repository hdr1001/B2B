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

import { parentPort, workerData } from 'worker_threads';
import pg from 'pg';
import Cursor from 'pg-cursor';

pg.defaults.parseInt8 = true;

import { pgConn } from '../globs.js';

const { stage } = workerData;

const { Pool } = pg;

const pool = new Pool({ ...pgConn, ssl: { require: true } });

pool.query('SELECT NOW() as now')
    .then(sqlRslt => console.log(`Database connection at ${sqlRslt.rows[0].now}`))
    .catch(err => console.log(err));

const client = await pool.connect();
const cursor = client.query(new Cursor(`SELECT req_key FROM project_keys WHERE project_id = ${stage.id}`));

let rows = await cursor.read(100);

while(rows.length) {
    rows.forEach(row => console.log(row.req_key))

    rows = await cursor.read(100);
}

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
// https://node-postgres.com/features/pooling
pool.on('error', (err, client) => {
    console.log(`Unexpected error on idle client ${err.toString()}`);
    process.exit(-1);
})

setTimeout(() => { 
    parentPort.postMessage(`Return upon completion of script ${stage.params.script}`) 
}, 10000);
