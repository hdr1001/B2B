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
import { LeiReq, DnbDplDBs, DnbDplFamTree, DnbDplBenOwner } from '../../share/apiDefs.js';
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

                    let apiReq;

                    //Create the relevant API request objects
                    if(hubAPI.api === 'dpl') {
                        if(hpt.reqParams.endpoint === 'dbs' || !hpt.reqParams.endpoint) {
                            apiReq = new DnbDplDBs( hpt.key, hpt.reqParams?.qryParameters )
                        }

                        if(hpt.reqParams.endpoint === 'famTree') {
                            apiReq = new DnbDplFamTree( hpt.key, hpt.reqParams?.qryParameters )
                        }

                        if(hpt.reqParams.endpoint === 'benOwner') {
                            apiReq = new DnbDplBenOwner( hpt.key, hpt.reqParams?.qryParameters )
                        }
                    }

                    if(hubAPI.api === 'lei') {
                        if(hpt.reqParams?.subSingleton) {
                            apiReq = new LeiReq( hpt.key, hpt.reqParams?.qryParameters || {}, hpt.reqParams.subSingleton )
                        }
                        else {
                            apiReq = new LeiReq( hpt.key )
                        }
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
                        return pool.query(sqlInsert, [ hpt.key, dcdrUtf8.decode(buff), hpt.resp?.status ])
                    }
                    else { //HTTP status API response deemed not okay
                        throw new ApiHubErr(
                            'httpErrReturn',
                            `Request for key ${hpt.key} returned with HTTP status code ${hpt.resp?.status}`,
                            hpt.resp?.status,
                            dcdrUtf8.decode(buff)
                        )
                    }
                })
                .then(dbQry => { //Database insert query promise now resolved
                    resolve(
                        {
                            key: hpt.key,
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

pool.query(`UPDATE project_stages SET finished = TRUE WHERE project_id = ${projectStage.id} AND stage = ${projectStage.stage} RETURNING *`)
    .then(dbQry => {
        if(dbQry.rowCount === 1) {
            parentPort.postMessage(`Return upon completion of script ${projectStage.script}`);
        }
        else {
            throw new Error('UPDATE database table project_stages somehow failed 🤔');
        }
    })
    .catch(err => console.error(err.message))

//SQL script fo parameterizing product projects
/*
➡️ Create an entry in table projects & describe the project in field descr
➡️ A unique project identifier will be created & assigned to variable p_id
INSERT INTO projects ( descr ) VALUES ('Test project D&B') RETURNING id INTO p_id;

➡️ The product script is intended to be a stage in a sequence of stages
INSERT INTO project_stages
   ( project_id, stage, api, script, params )
VALUES
   (
      p_id,      ➡️ Project identifier
      1,         ➡️ Stage
      'dpl',     ➡️ The API to be used (foreign key referencing table apis)
      'product', ➡️ Parameter identifying this script
      ➡️ Miscellaneous project parameters
      ➡️ endpoint, for specifying dbs (data blocks, optional), benOwner (beneficial ownership) & famTree (full family tree)
      '{ "endpoint": "benOwner", "qryParameters": { "productId": "cmpbol", "versionId": "v1", "ownershipPercentage": 2.5 } }'
      ➡️ qryParameters, API request query parameters
      '{ "qryParameters": { "blockIDs": "companyinfo_L2_v1,hierarchyconnections_L1_v1", "orderReason": 6332 } }'
      ➡️ subSingleton, to add to a API REST request
      '{ "subSingleton": "ultimate-parent-relationship" }'
   );

INSERT INTO project_keys
   ( project_id, req_key )
VALUES
   ( p_id, '407809623' ), ( p_id, '372428847' ), ( p_id, '373230036' );
*/
