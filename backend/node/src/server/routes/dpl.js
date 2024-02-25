// *********************************************************************
//
// Definition of the API Hub D&B Direct+ routes
// JavaScript code file: dpl.js
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

import { ahReqPersistRespKey, ahReqPersistRespIDR } from '../core.js';
import HubTransaction from '../transaction.js';
import { ApiHubErr } from '../err.js';

const router = express.Router();

router.post('/idr', (req, resp) => {
    //Transaction parameters
    const transaction = { provider: 'dnb', api: 'dpl', idr: true };

    if(!req.body || req.body.constructor !== Object || Object.keys(req.body).length === 0) {
        const err = new ApiHubErr('invalidParameter', 'No search criteria specified in the body of the POST transaction');

        resp.status(err.httpStatus.code).json( err );

        return;
    }

    if(!req.body.countryISOAlpha2Code) {
        const err = new ApiHubErr('invalidParameter', 'No country code specified in the body of the POST transaction');

        resp.status(err.httpStatus.code).json( err );

        return;
    }

    //Let the API Hub do its thing
    ahReqPersistRespIDR(req, resp, transaction)
});

router.get('/duns/:key', (req, resp) => {
    //Transaction parameters
    const transaction = new HubTransaction( req, resp, 'dnb', 'dpl' );

    transaction.key = req.params.key;

    if(!transaction.key) { return }

    transaction.product = req.query?.product; //'00' is the default product key

    if(!transaction.reqParams) { return }

    //Let the API Hub do its thing
    ahReqPersistRespKey(transaction)
});
 
export default router;
