// *********************************************************************
//
// API Hub Express server utilities
// JavaScript code file: utils.js
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

import { dcdrUtf8 } from '../share/utils.js';
import { httpStatus } from './err.js';

export default function ahReqPersistResp(req, resp, apiTransaction, buff) {
    console.log(`Request for key ${req.params.key} returned with HTTP status code ${apiTransaction.resp.status} (${apiTransaction.tsResp - apiTransaction.tsReq} ms)`);

    if(apiTransaction.resp.ok) {
        resp
            .setHeader('X-B2BAH-Cache', false)
            .setHeader('X-B2BAH-API-HTTP-Status', apiTransaction.resp.status)
            .setHeader('X-B2BAH-Obtained-At', new Date(apiTransaction.tsResp).toISOString())

            .set('Content-Type', 'application/json')

            .status(httpStatus.okay.code)

            .send(dcdrUtf8.decode(buff));

        return;
    }
}
