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
const { projectStage } = workerData;

//Setup a reusable pool of database clients
const { Pool } = pg;
const pool = new Pool({ ...pgConn, ssl: { require: true } });

//D&B confidence code based match candidate auto accept
const ccAutoAcceptIDs = {
    sql: `UPDATE project_idr
        SET
            key = resp->'matchCandidates'->0->'organization'->>'duns',
            quality = CONCAT(
                '{ "cc": ', (resp->'matchCandidates'->0->'matchQualityInformation'->>'confidenceCode')::int * 10,
                ', "id": 100 }'
            )::jsonb,
            remark = 'Confidence code auto accept'
        WHERE
            project_id = ${projectStage.id}
            AND stage = ${projectStage.params.idrStage}
            AND http_status = 200
            AND resp->>'matchDataCriteria' = 'National ID Lookup'
            AND (resp->'matchCandidates'->0->'matchQualityInformation'->>'confidenceCode')::int >= ${projectStage.params.ccAutoAccept};`,

    consoleMsg: 'Number of confidence code based ID matches '
};

const ccAutoAccept = {
    sql: `UPDATE project_idr
        SET
            key = resp->'matchCandidates'->0->'organization'->>'duns',
            quality = CONCAT(
                '{ "mg": "', resp->'matchCandidates'->0->'matchQualityInformation'->>'matchGrade',
                '", "cc": ', (resp->'matchCandidates'->0->'matchQualityInformation'->>'confidenceCode')::int * 10,
                ', "name": ', (resp->'matchCandidates'->0->'matchQualityInformation'->>'nameMatchScore')::numeric::int,
            ' }')::jsonb,
            remark = 'Confidence code auto accept'
        WHERE
            project_id = ${projectStage.id}
            AND stage = ${projectStage.params.idrStage}
            AND http_status = 200
            AND resp->>'matchDataCriteria' != 'National ID Lookup'
            AND (resp->'matchCandidates'->0->'matchQualityInformation'->>'confidenceCode')::int >= ${projectStage.params.ccAutoAccept};`,

    consoleMsg: 'Number of confidence code based auto accepted IDR transactions '
};

//If available, replicate the error message out of a JSON response returned with a HTTP error status
const httpErrRemark = {
    sql: `UPDATE project_idr
        SET
            key = NULL,
            quality = NULL,
            remark = resp->'error'->>'errorMessage'
        WHERE
            project_id = ${projectStage.id}
            AND stage = ${projectStage.params.idrStage}
            AND http_status != 200;`,

    consoleMsg: 'Number of API responses with a HTTP error status '
};

const optionalSteps = new Map([
    [
        //Reject auto accepted out-of-business candidates
        'rejectOobCandidates',
        {
            sql: `UPDATE project_idr
                SET
                    key = NULL,
                    quality = NULL,
                    remark = 'Auto accepted candidate is out-of-business'
                WHERE
                    project_id = ${projectStage.id}
                    AND stage = ${projectStage.params.idrStage}
                    AND http_status = 200
                    AND key IS NOT NULL
                    AND (resp->'matchCandidates'->0->'organization'->'dunsControlStatus'->'operatingStatus'->>'dnbCode')::int = 403;`,
        
            consoleMsg: 'Number of auto accepted candidates rejected because OOB '
        }
    ],
    [
        //Reject auto accepted tie-breakers
        'rejectTiebreakers',
        {
            sql: `UPDATE project_idr
                SET
                    key = NULL,
                    quality = NULL,
                    remark = 'Auto accepted candidate is a tie-breaker'
                WHERE
                    project_id = ${projectStage.id}
                    AND stage = ${projectStage.params.idrStage}
                    AND http_status = 200
                    AND key IS NOT NULL
                    AND resp->'matchCandidates'->0->'matchQualityInformation'->>'confidenceCode' = resp->'matchCandidates'->1->'matchQualityInformation'->>'confidenceCode'
                    AND (resp->'matchCandidates'->1->'organization'->'dunsControlStatus'->'operatingStatus'->>'dnbCode')::int = 9074;`,
        
            consoleMsg: 'Number of auto accepted candidates rejected because tie-breaker '
        }
    ]
]);

//Always execute these steps
const autoAcceptSteps = [ccAutoAcceptIDs, ccAutoAccept, httpErrRemark];

//Configure optional steps
projectStage.params.optionalSteps.forEach(step => autoAcceptSteps.push(optionalSteps.get(step)));

//Execute the auto accept steps configured
for(let i = 0; i < autoAcceptSteps.length; i++) {
    await pool.query(autoAcceptSteps[i].sql).then(qry => console.log(autoAcceptSteps[i].consoleMsg + qry.rowCount))
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
