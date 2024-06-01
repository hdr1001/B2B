// *********************************************************************
//
// Collection of shared utilities for the worker code
// JavaScript code file: utils.js
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

//Throttle the database requests
import { pgDbLimiter } from '../../share/limiters.js';

//Process a set database transactions asynchronously
function processDbTransactions(pool, sqlStatement, arrSqlParams) {
    return Promise.allSettled(
        arrSqlParams.map(sqlParams => new Promise((resolve, reject) => { //For all SQL parameters ...
            //Throttle the requests to the database
            pgDbLimiter.removeTokens(1)
                .then(() => pool.query(sqlStatement, sqlParams)) //Execute the database transaction
                .then(dbQry => resolve('Successfully executed database transaction' + (dbQry.rows?.[0]?.id ? ' (ID: ' + dbQry.rows[0].id + ').' : '.')))
                .catch(err => reject(err.message))
        }))
    )
}

//When the worker is done, update the stage's finished flag and post a message to the parent process
function WorkerSignOff(pool, parentPort, projectStage) {
    return pool.query(`UPDATE project_stages SET finished = TRUE WHERE project_id = ${projectStage.id} AND stage = ${projectStage.stage}`)
        .then(dbQry => {
            if(dbQry.rowCount === 1) {
                parentPort.postMessage(`Return upon completion of script ${projectStage.script}`);
            }
            else {
                throw new Error('UPDATE database table project_stages somehow failed 🤔');
            }
        })
        .catch(err => console.error(err.message))
}

const leiMatchStage = {
    prefRegNum: 1,
    custRegNum: 2,
    nameCtry: 3
};

class MatchTry {
    constructor(stage, params) {
        this.stage = stage;

        this.in = {
            isoCtry: params.isoCtry
        }

        if(params.name) {
            this.in.name = params.name;
        }

        if(params.regNum) {
            this.in.regNum = { value: params.regNum }

            if(params.isPrefRegNum) {
                this.in.regNum.preferred = true
            }
        }
    }
}

function getMatchTry(addtlInfo, stage) {
    let matchTry = null;

    if(Array.isArray(addtlInfo?.tries) && addtlInfo?.tries.length) {
        const arrMatchTryStage = addtlInfo.tries.filter(mt => mt.stage === stage);

        if(arrMatchTryStage.length) { matchTry = arrMatchTryStage[0] }
    }

    return matchTry;
}

function addMatchTry(addtlInfo, stage, params) {
    if(!addtlInfo) { throw new Error('Function addMatchTry, parameter addtlInfo contains a falsy value') }

    if(!addtlInfo.tries) { addtlInfo.tries = [] }

    if(!Array.isArray(addtlInfo.tries)) { throw new Error('Function addMatchTry, addtlInfo.tries is not of type array') }

    const matchTry = new MatchTry( stage || 0, params );

    addtlInfo.tries.push(matchTry);

    return matchTry;
}

export {
    processDbTransactions,
    WorkerSignOff,
    leiMatchStage,
    getMatchTry,
    addMatchTry
}
