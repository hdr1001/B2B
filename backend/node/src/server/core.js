// *********************************************************************
//
// The core code of the API Hub Express server
// JavaScript code file: core.js
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
import { apiProvider, LeiReq } from "../share/apiDefs.js";
import db from './pg.js';
import { ApiHubErr, httpStatus } from './err.js';

//Encapsulation of the HTTP transaction
function httpReqResp(req, resp, apiTransaction) {
    apiTransaction.tsReq = Date.now();

    fetch(apiTransaction.req.getReq())
        .then(leiResp => {
            apiTransaction.resp = leiResp;
            apiTransaction.tsResp = Date.now();

            return leiResp.arrayBuffer()
        } )
        .then(buff => {
            //A bit of reporting about the external API transaction
            let msg = `Request for key ${apiTransaction.key} returned with HTTP status code ${apiTransaction?.resp?.status}`;

            if(apiTransaction?.tsResp && apiTransaction?.tsReq) {
                msg += ` (${apiTransaction.tsResp - apiTransaction.tsReq} ms)`
            }
        
            console.log(msg);

            //Decode the array buffer returned to a string
            apiTransaction.strBody = buff ? dcdrUtf8.decode(buff) : null;
        
            //Happy flow
            if(apiTransaction?.resp.ok) {
                resp
                    .setHeader('X-B2BAH-Cache', false)
                    .setHeader('X-B2BAH-API-HTTP-Status', apiTransaction.resp.status)
                    .setHeader('X-B2BAH-Obtained-At', new Date(apiTransaction.tsResp).toISOString())
        
                    .set('Content-Type', 'application/json')
        
                    .status(httpStatus.okay.code)
        
                    .send(apiTransaction.strBody);
        
                return; //end of the happy flow
            }
        
            //apiTransaction.resp.ok evaluates to false, start error handling
            const err = new ApiHubErr(
                'httpErrReturn',
                msg,
                apiTransaction?.resp?.status,
                apiTransaction?.strBody
            );
        
            resp.status(err.httpStatus.code).json( err );
        })
        .catch(err => {
            const ahErr = new ApiHubErr(
                'generic',
                err.message,
                apiTransaction?.resp?.status,
                apiTransaction?.strBody
            );

            resp.status(ahErr.httpStatus.code).json( ahErr );    
        });
}

export default function ahReqPersistResp(req, resp) {
    const apiTransaction = apiProvider.baseUrlProviderApi(req.baseUrl);

    if(req.params.key) { apiTransaction.key = req.params.key }

    let sSql;

    if(apiTransaction.provider === 'gleif') {
        if(apiTransaction.api === 'lei') {
            sSql = 'SELECT lei AS key, product, tsz, http_status FROM products_gleif WHERE lei = $1;'

            apiTransaction.req = new LeiReq(apiTransaction.key);
        }
    }
   
    db.query( sSql, [ apiTransaction.key ])
        .then(dbResp => { if(dbResp.rows.length && dbResp.rows[0].product) {console.log(dbResp.rows[0].product)} })

    //Fire off the HTTP request
    httpReqResp(req, resp, apiTransaction);
}
