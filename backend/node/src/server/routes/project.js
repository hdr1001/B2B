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
import { Worker } from 'worker_threads';
import { httpStatus } from '../err.js';

const router = express.Router();

router.post('/', (req, resp) => {
    const worker = new Worker('./src/server/workers/product.js');

    worker.postMessage('Hello from the main thread');

    worker.on('msg', msg => {
        console.log(msg)
    });

    resp.status(httpStatus.accepted.code).json({ status: 'running' });
});
/*
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
