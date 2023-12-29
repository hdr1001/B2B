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
import { ApiHubErr, httpStatus } from './err.js';

export default function ahReqPersistResp(req, resp, apiTransaction, arrBuff) {
    //A bit of reporting about the external API transaction
    let msg = `Request for key ${req.params?.key} returned with HTTP status code ${apiTransaction?.resp?.status}`;

    if(apiTransaction?.tsResp && apiTransaction?.tsReq) {
        msg += ` (${apiTransaction.tsResp - apiTransaction.tsReq} ms)`
    }

    console.log(msg);

    //Happy flow
    if(apiTransaction?.resp.ok) {
        resp
            .setHeader('X-B2BAH-Cache', false)
            .setHeader('X-B2BAH-API-HTTP-Status', apiTransaction.resp.status)
            .setHeader('X-B2BAH-Obtained-At', new Date(apiTransaction.tsResp).toISOString())

            .set('Content-Type', 'application/json')

            .status(httpStatus.okay.code)

            .send(dcdrUtf8.decode(arrBuff));

        return; //end of the happy flow
    }

    //apiTransaction.resp.ok evaluates to false, start error handling
    const err = new ApiHubErr(
        'httpErrReturn',
        msg,
        apiTransaction?.resp?.status,
        arrBuff ? dcdrUtf8.decode(arrBuff) : null
    );

    resp.status(err.httpStatus.code).json( err );
}
