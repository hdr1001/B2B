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

//Throttle the database requests
import { pgDbLimiter } from '../../share/limiters.js';

import { getLeiMatchTryRegNum } from './utils.js';

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
const sqlUpdate = 'UPDATE project_idr SET key = $1, quality = $2, remark = $3, addtl_info = $4, tsz = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id;';

//Update the match quality information to the database
function persistRegAsQaInfo(arrQaInfo) {
    return Promise.allSettled(
        arrQaInfo.map(qaInfo => new Promise((resolve, reject) => { //For all rows in the chunck...
            pgDbLimiter.removeTokens(1)
                .then(() => pool.query(sqlUpdate, qaInfo)) //Update columns params & addtl_info 
                .then(dbQry => resolve(`Successfully updated QA info on project IDR record with ID ${dbQry.rows[0].id}`))
                .catch(err => reject(err.message))
        }))
    ) 
}

//Use the cursor to read the 1st 100 rows
let rows = await cursor.read(100);
let chunk = 0;

//Iterate over the available rows
while(rows.length) {
    console.log(`processing chunk ${++chunk}`);

    //QA only relevant if (1) not already resolved, (2) valid HTTP response and (3) one or more candidate(s) available
    const rowsCandidateAvailable = rows.filter(row => !row.key && row.http_status === 200 && row.resp?.data?.[0]);

    //Validate the submitted registration number against the one in the REST response
    const rowsRegAsMatch = rowsCandidateAvailable.filter(
        row => row.params['filter[entity.registeredAs]'] &&
            row.params['filter[entity.registeredAs]'] === row.resp.data[0].attributes?.entity?.registeredAs);

    console.log(`Num of resp w. candidates ${rowsCandidateAvailable.length}, validated reg num matches ${rowsRegAsMatch.length}`);

    if(rowsRegAsMatch.length) { //QA the registration number based match candidates
        const regAsMatches = rowsRegAsMatch.map(row => {
            let leiMatchTry;

            try {
                leiMatchTry = row.addtl_info.tries.filter(leiMatchTry => leiMatchTry.stage === projectStage.params.try)[0];

                if(!leiMatchTry) { throw new Error('Match try object could not be located in tries array') }
            }
            catch(err) {
                leiMatchTry = getLeiMatchTryRegNum(
                    projectStage.params.try || 0,
                    row.params['filter[entity.registeredAs]'],
                    row.addtl_info.input?.isoCtry
                );

                if(Array.isArray(row.addtl_info.tries)) {
                    row.addtl_info.tries.push(leiMatchTry)
                }
                else {
                    row.addtl_info.tries = [ leiMatchTry ]
                }
            }

            leiMatchTry.success = true;

            return [
                //The LEI is what we are looking for
                row.resp.data[0].attributes?.lei,

                //One hundred points for the ID match
                { id: 100 },

                //Just for the record ⬇️
                'LEI registration number match',

                //More information for the record ⬇️
                row.addtl_info,

                //The primary key of table project_idr
                row.id
            ];          
        })

        /* console.log( */ await persistRegAsQaInfo(regAsMatches) /* ) */;
    }

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
