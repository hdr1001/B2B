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

import { cleanDUNS } from '../../share/utils.js';
import ahReqPersistResp from '../core.js';
import { ApiHubErr } from '../err.js';

const router = express.Router();

router.post('/idr', (req, resp) => {
    resp.json( { endpoint: 'idr' } )
});

router.get('/duns/:key', (req, resp) => {
    if(!cleanDUNS(req.params.key)) {
        const err = new ApiHubErr('invalidParameter', `DUNS ${req.params.key} is not valid`);

        resp.status(err.httpStatus.code).json( err );

        return;
    }

    //Transaction parameters
    const transaction = { provider: 'dnb', api: 'dpl' };

    //Let the API Hub do its thing
    ahReqPersistResp(req, resp, transaction)
});
 
export default router;
