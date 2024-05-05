// *********************************************************************
//
// Worker code to automatically perform quality assurance on GLEIF
// filter request responses generated in multi-stage projects
//
// JavaScript code file: idrautoqalei.js
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

//The stage parameters are passed into the new Worker (i.e. this thread) as part of its instantiation
const { projectStage } = workerData;

//Setup a reusable pool of database clients
const { Pool } = pg;
const pool = new Pool({ ...pgConn, ssl: { require: true } });

//Acquire a database client from the pool
const pgClient = await pool.connect();

//Use a cursor to read the keys included in the project in chunks
const sqlReqs = `SELECT id, params, resp, http_status, addtl_info FROM project_idr
    WHERE project_id = ${projectStage.params?.idr?.project_id}
    AND stage = ${projectStage.params?.idr?.stage};`;

const cursor = pgClient.query( new Cursor( sqlReqs ) );

//SQL update statement for persisting the API responses
const sqlUpdate = 'UPDATE project_idr SET key = $1, quality = $2, remark = $3, tsz = CURRENT_TIMESTAMP WHERE id = $4;';

//Use the cursor to read the 1st 100 rows
let rows = await cursor.read(100);

//Iterate over the available rows
while(rows.length) {
    rows.forEach(row => {
        if(row.http_status === 200) {
            if(row.params['filter[entity.registeredAs]']) {
                if(row.resp.data?.[0]) {
                    const leiMatch = row.resp.data[0];

                    if(row.params['filter[entity.registeredAs]'] === leiMatch.attributes?.entity?.registeredAs) {
                        pool.query(sqlUpdate, [ 
                            leiMatch.attributes?.lei,
                            JSON.stringify({ id: 100 }),
                            'LEI registration number match',
                            row.id
                        ])
                    }
                    else {
                        console.log(`No match on registration number ${row.params['filter[entity.registeredAs]']}`)
                    }    
                }
            }
        }
    });

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
