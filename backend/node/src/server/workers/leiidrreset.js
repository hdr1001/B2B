// *********************************************************************
//
// Worker code to clean-up no match LEI filter request data after
// the execution of a match stage.
//
// JavaScript code file: leiidrreset.js
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

import { leiMatchStage, getLeiMatchTryRegNum } from './utils.js';

//The stage parameters are passed into the new Worker (i.e. this thread) as part of its instantiation
const { projectStage } = workerData;

//Setup a reusable pool of database clients
const { Pool } = pg;
const pool = new Pool({ ...pgConn, ssl: { require: true } });

//Acquire a database client from the pool
const pgClient = await pool.connect();

//Use a cursor to read the project stage's raw identification data
const sqlIdrReset = `SELECT 
                    id,
                    resp,
                    addtl_info
                FROM project_idr
                WHERE
                    project_id = ${projectStage.params.idr.project_id}
                    AND stage = ${projectStage.params.idr.stage}
                    AND key IS NULL
                    AND params IS NOT NULL;`;

const cursor = pgClient.query( new Cursor( sqlIdrReset ) );

//SQL update statement for persisting IDR requests
const sqlUpdate = `UPDATE project_idr
    SET params = NULL,
        resp = NULL,
        http_status = NULL,
        quality = NULL,
        remark = NULL,
        addtl_info = $1,
        tsz = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id;`;

//Initial creation of records in table project_idr based on D&B data block information
function resetNoMatches(rows) {
    return Promise.allSettled(
        rows.map(row => new Promise((resolve, reject) => { //For all rows in the chunck...
            pgDbLimiter.removeTokens(1)
                .then(() => pool.query(sqlUpdate, row)) //Update columns addtl_info 
                .then(dbQry => resolve(`Successfully updated IDR try data with ID ${dbQry.rows[0].id}`))
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

    const recsReset = rows.map(row => {
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

        leiMatchTry.out = {
            numCandidates: row.resp?.data ? row.resp.data.length : 0,
            http_status: row.http_status,
        };

        if(row.resp?.data?.[0]) { leiMatchTry.out.candidate0 = row.resp.data[0]}

        return [
            row.addtl_info,

            row.id
        ];
    });

    /* console.log( */ await resetNoMatches(recsReset) /* ) */;

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