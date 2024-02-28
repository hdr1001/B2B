// *********************************************************************
//
// Definition of the API Hub GLEIF routes
// JavaScript code file: gleif.js
//
// Copyright 2023 Hans de Rooij
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

import HubTransaction from '../transaction.js';
import { ahReqPersistRespKey, ahReqPersistRespIDR } from '../core.js';

const router = express.Router();

router.post('/filter', (req, resp) => {
    //Transaction parameters
    const transaction = new HubTransaction( req, resp, 'gleif', 'lei', true );

    //Let the API Hub do its thing
    ahReqPersistRespIDR( transaction );
});

router.get('/:key', (req, resp) => {
    //Transaction parameters
    const transaction = new HubTransaction( req, resp, 'gleif', 'lei' );

    transaction.key = req.params.key;

    if(!transaction.key) { return }

    transaction.product = req.query?.product; //'00' is the default product key

    if(!transaction.reqParams) { return }

    //Let the API Hub do its thing
    ahReqPersistRespKey(transaction)
});
 
export default router;
