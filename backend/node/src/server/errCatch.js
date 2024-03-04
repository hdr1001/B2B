// *********************************************************************
//
// Function to handle API Hub server error 
// JavaScript code file: errCatch.js
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

import { isNumber } from '../share/utils.js';
import { ApiHubErr, httpStatus } from './err.js';
import db from './pg.js';

function handleApiHubErr(transaction, err) {
    const sSqlHttpErr = 'INSERT INTO errors_http (req, err, http_status) VALUES ($1, $2, $3) RETURNING id';

    const oReq = {
        provider: transaction.provider,
        api: transaction.api,
        idr: transaction.idr
    };

    if(oReq.idr) {
        if(transaction.expressReq?.body) {
            oReq.body = transaction.expressReq.body
        }    
    }
    else {
        oReq.forceNew = transaction.forceNew;
        oReq.key = transaction.key;
        oReq.product = transaction.product;
    }

    const errMsg = transaction.strBody || `{ "msg": "${err.addtlMessage || err.message}" }`;
    const status = transaction.resp?.status || err.httpStatus?.code || httpStatus.genericErr.code;

    //Log the HTTP error to the database
    db.query( sSqlHttpErr, [ JSON.stringify(oReq), errMsg, status] )
        .then(dbQry => {
            let dbRowID;

            if(dbQry && dbQry.rowCount === 1) {
                dbRowID = dbQry.rows[0].id;

                console.log(`Persisted error with id ${dbRowID}${err.addtlMessage ? `: ${err.addtlMessage}` : ''}`);
            }
            else {
                console.log(`Something went wrong persisting an API Hub error`);
            }

            const ts = transaction.tsResp ? new Date(transaction.tsResp) : new Date();

            const oHeader = {
                'X-B2BAH-API-HTTP-Status': status,
                'X-B2BAH-Obtained-At': ts.toISOString(),
                'X-B2BAH-Error-ID': dbRowID
            };

            if(!isNumber(err.hubErrorCode)) { //Error of class other than ApiHubErr was thrown
                err = new ApiHubErr( 'generic', err.message, status, transaction.strBody )
            }

            transaction.expressResp.header( oHeader ).status( status ).json( err );
        })
        .catch(err => console.error(err));
}

export default handleApiHubErr;
