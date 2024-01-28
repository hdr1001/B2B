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

import { isValidLei } from '../../share/utils.js';
import { ahReqPersistRespKey, ahReqPersistRespIDR } from '../core.js';
import { ApiHubErr } from '../err.js';

const router = express.Router();

router.post('/filter', (req, resp) => {
    resp.json( { endpoint: 'filter' } )
});

router.get('/:key', (req, resp) => {
    if(!isValidLei(req.params.key)) {
        const err = new ApiHubErr('invalidParameter', `LEI ${req.params.key} is not valid`);

        resp.status(err.httpStatus.code).json( err );

        return;
    }

    //Transaction parameters
    const transaction = { provider: 'gleif', api: 'lei' };

    transaction.product = req.query?.product || '00'; //'00' is the default product key

    if(transaction.product !== '00') {
        const err = new ApiHubErr('invalidParameter', `Query parameter product ${transaction.product} is not valid`);

        resp.status(err.httpStatus.code).json( err );

        return;
    }

    //Let the API Hub do its thing
    ahReqPersistRespKey(req, resp, transaction)
});
 
export default router;
