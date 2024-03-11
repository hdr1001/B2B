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

function runProjectStage(projectStage) {
    console.log(`Initiating execution of project stage ${projectStage.stage} using script ${projectStage.params?.script}`);

    return new Promise((resolve, reject) => {
        const worker = new Worker(`./src/server/workers/${projectStage.params?.script}.js`, { workerData: { stage: projectStage }});

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
        let sSql = "SELECT projects.id, projects.descr, project_stages.stage, project_stages.finished, project_stages.params ";
        sSql    += "FROM projects, project_stages ";
        sSql    += "WHERE projects.id = $1 AND projects.id = project_stages.project_id ";
        sSql    += "ORDER BY project_stages.stage ASC;";

        db.query( sSql, [ project.id ] )
            .then(dbQry => {
                if(dbQry.rows?.length) {
                    console.log(`Located project ${dbQry.rows[0]?.id} (${dbQry.rows[0]?.descr})`);

                    for(let i = 0, p = Promise.resolve(); i < dbQry.rows?.length; i++) {
                        p.then(() => runProjectStage(dbQry.rows[i])).then(msg => console.log(`Worker message received: ${msg}`));
                    }                    
                }
            })
    }
    else {

    }

    resp.status(httpStatus.accepted.code).json({ status: 'running' });
});

export default router;