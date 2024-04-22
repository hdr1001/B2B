// *********************************************************************
//
// Worker code to automatically perform quality assurance on the D&B
// IDentity Resolution responses generated in multi-stage projects
//
// JavaScript code file: idrautoqa.js
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
import pgConn from '../pgGlobs.js';

import { ApiHubErr } from '../err.js';
import handleApiHubErr from '../errCatch.js';

//The stage parameters are passed into the new Worker (i.e. this thread) as part of its instantiation
const { hubAPI, projectStage } = workerData;

//Setup a reusable pool of database clients
const { Pool } = pg;
const pool = new Pool({ ...pgConn, ssl: { require: true } });

//Confidence code auto accept
let sql = `UPDATE project_idr
    SET
        key = resp->'matchCandidates'->0->'organization'->>'duns',
        quality = (resp->'matchCandidates'->0->'matchQualityInformation'->>'confidenceCode')::int * 10,
        remark = 'Confidence code auto accept'
    WHERE
        project_id = ${projectStage.id}
        AND stage = ${projectStage.params.idrStage}
        AND http_status = 200
        AND (resp->'matchCandidates'->0->'matchQualityInformation'->>'confidenceCode')::int > ${projectStage.params.ccAutoAccept.cc};`;

await pool
    .query(sql)
    .then(qry => console.log(`Number of confidence code based auto accepted IDR transactions ${qry.rowCount}`));

//Reject out-of-business candidates
sql = `UPDATE project_idr
    SET
        key = NULL,
        quality = NULL,
        remark = 'Top candidate is out-of-business'
    WHERE
        project_id = ${projectStage.id}
        AND stage = ${projectStage.params.idrStage}
        AND http_status = 200
        AND (resp->'matchCandidates'->0->'organization'->'dunsControlStatus'->'operatingStatus'->>'dnbCode')::int = 403;`;

await pool
    .query(sql)
    .then(qry => console.log(`Number of top candidates rejected because OOB ${qry.rowCount}`));

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
