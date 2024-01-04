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

import { dcdrUtf8, isNumber } from '../share/utils.js';
import { LeiReq } from '../share/apiDefs.js';
import db from './pg.js';
import { ApiHubErr, httpStatus } from './err.js';

export default function ahReqPersistResp(req, resp, transaction) {
    let sSqlSelect, sSqlUpsert;

    if(transaction.provider === 'gleif') {
        if(transaction.api === 'lei') {
            sSqlSelect  = 'SELECT lei AS key, product, tsz, http_status FROM products_gleif WHERE lei = $1;'

            sSqlUpsert  = 'INSERT INTO products_gleif (lei, product, http_status) VALUES ($1, $2, $3) '
            sSqlUpsert += 'ON CONFLICT ( lei ) DO UPDATE SET product = $2, http_status = $3, tsz = CURRENT_TIMESTAMP;';

            transaction.req = new LeiReq(req.params.key);
        }
    }

    //Don't deliver from the database if forceNew query parameter is set to true
    const bForceNew = req.query?.forceNew && req.query.forceNew.toLowerCase() === 'true';

    //If not forceNew and data available from database, deliver from stock
    (bForceNew ? Promise.resolve(null) : db.query( sSqlSelect, [ req.params.key ]))
        .then(dbQry => {
            if(dbQry) { //bForceNew === false
                if(dbQry.rows.length && dbQry.rows[0].product) { //Requested key available on the database
                    resp
                        .setHeader('X-B2BAH-Cache', true)
                        .setHeader('X-B2BAH-Obtained-At', new Date(dbQry.rows[0].tsz).toISOString())
            
                        .json(dbQry.rows[0].product);
        
                    throw new Error( //Skip the rest of the then chain
                        `Request for key ${req.params.key} delivered from the database`,
                        { cause: 'breakThenChain' }
                    );
                }
            }

            transaction.tsReq = Date.now(); //Timestamp the HTTP request

            return fetch(transaction.req.getReq()) //Request date from external API
        })
        .then(leiResp => {
            transaction.tsResp = Date.now(); //Timestamp the receipt of the HTTP response

            transaction.resp = leiResp;

            return leiResp.arrayBuffer();
        })
        .then(buff => {
            //A bit of reporting about the external API transaction
            let msg = `Request for key ${req.params.key} returned with HTTP status code ${transaction?.resp?.status}`;

            if(transaction?.tsResp && transaction?.tsReq) {
                msg += ` (${transaction.tsResp - transaction.tsReq} ms)`
            }
        
            console.log(msg);

            //Decode the array buffer returned to a string
            transaction.strBody = buff ? dcdrUtf8.decode(buff) : null;
        
            //Happy flow
            if(transaction?.resp.ok) {
                resp
                    .setHeader('X-B2BAH-Cache', false)
                    .setHeader('X-B2BAH-API-HTTP-Status', transaction.resp.status)
                    .setHeader('X-B2BAH-Obtained-At', new Date(transaction.tsResp).toISOString())
        
                    .set('Content-Type', 'application/json')
        
                    .status(httpStatus.okay.code)
        
                    .send(transaction.strBody);
            }
            else { //transaction.resp.ok evaluates to false, start error handling
                throw new ApiHubErr(
                    'httpErrReturn',
                    msg,
                    transaction.resp?.status,
                    transaction.strBody
                )
            }

            return db.query( sSqlUpsert, [ req.params.key, transaction.strBody, transaction.resp.status ]);
        })
        .then(dbQry => {
            if(dbQry && dbQry.rowCount === 1) {
                console.log(`Success executing ${dbQry.command} for lei ${req.params.key}`)
            }
            else {
                console.error(`Something went wrong upserting lei ${req.params.key}`)
            }

            //Done 🙂✅
        })
        .catch(err => {
            if(err.cause === 'breakThenChain') {
                console.log(err.message) //Early escape, not an actual error
            }
            else {
                if(isNumber(err.hubErrorCode)) { //Error of class ApiHubErr was thrown
                    resp.status(err.httpStatus.code).json( err );
                }
                else {
                    const ahErr = new ApiHubErr(
                        'generic',
                        err.message,
                        transaction.resp?.status,
                        transaction.strBody
                    );
        
                    resp.status(ahErr.httpStatus.code).json( ahErr );
                }
            }
        })
}
