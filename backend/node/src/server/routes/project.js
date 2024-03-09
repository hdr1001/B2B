// *********************************************************************
//
// Definition of the API Hub multi-stage project routes
// JavaScript code file: project.js
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

import express from 'express';
import {  Worker } from 'worker_threads';
import { httpStatus } from '../err.js';
import db from '../pg.js';

const router = express.Router();

function runProjectStage(dbStage) {
    return new Promise((resolve, reject) => {
        const worker = new Worker('./src/server/workers/product.js', { workerData: { stage: dbStage }});

        worker.on('message', ret => resolve(ret));

        worker.on('error', err => reject(err));

        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        })
    })
}

router.post('/', (req, resp) => {
    const project = { id: req.body.id }

    if(project.id) {
        let sSql = "SELECT projects.descr, project_stages.stage, project_stages.finished, project_stages.params ";
        sSql    += "FROM projects, project_stages ";
        sSql    += "WHERE projects.id = $1 AND projects.id = project_stages.project_id ";
        sSql    += "ORDER BY project_stages.stage ASC;";

        db.query( sSql, [ project.id ] )
            .then(dbQry => {
                console.log(`located project ${dbQry.rows[0].descr} first script is ${dbQry.rows[0].params.script}`);

                return runProjectStage(dbQry.rows[0]);
            })
            .then(msg => console.log(`Worker message received: ${msg}`))
    }
    else {

    }
/*
    const worker = new Worker('./src/server/workers/product.js');

    worker.on("message", msg => {
        console.log(`Worker message received: ${msg}`);
    });

    worker.on("error", err => console.error(err));

    worker.on("exit", code => console.log(`Worker exited with code ${code}.`));
*/
    resp.status(httpStatus.accepted.code).json({ status: 'running' });
});

/*
    function runProjectStage(workerData) {
        return new Promise((resolve, reject) => {
            const worker = new Worker('./src/server/workers/product.js', { workerData });

            worker.on('message', resolve);
            worker.on('error', reject);

            worker.on('exit', code => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`))
                }
            });
        })
    }

    console.log('Invoking runProjectStage')
    runProjectStage('hello ')
        .then(data => console.log(data))
        .catch(err => console.error(err));



router.get('/duns/:key', (req, resp) => {
    let transaction;

    try {
        //Transaction parameters
        transaction = new HubTransaction( req, resp, 'dnb', 'dpl' );

        transaction.key = req.params.key;

        transaction.product = req.query?.product; //'00' is the default product key

        //Let the API Hub do its thing
        ahReqPersistRespKey( transaction )
            .then(msg => console.log(msg))
            .catch(err => handleApiHubErr( transaction, err ));
    }
    catch( err ) {
        handleApiHubErr( transaction, err )
    }
});
*/ 
export default router;
