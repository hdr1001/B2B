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
import { LeiReq } from "../../share/apiDefs.js";
import ahReqPersistResp from '../utils.js';
import { ahErrCode, ApiHubErr } from '../err.js';

const router = express.Router();

router.get('/filter', (req, resp) => {
    resp.json( { endpoint: 'filter' } )
});

router.get('/:key', (req, resp) => {
    if(!isValidLei(req.params.key)) {
        const err = new ApiHubErr(ahErrCode.get('invalidParameter'), `LEI ${req.params.key} is not valid' `);

        resp.status(err.httpStatus.code).json( err );

        return;
    }

    const leiTransaction = { 
        req: new LeiReq(req.params.key),
        tsReq: Date.now()
    };

    fetch(leiTransaction.req.getReq())
        .then( leiResp => {
            leiTransaction.resp = leiResp;
            leiTransaction.tsResp = Date.now();

            return leiResp.arrayBuffer()
        } )
        .then( buff => ahReqPersistResp(req, resp, leiTransaction, buff) )
        .catch( err => console.log(err) );
});
 
export default router;
