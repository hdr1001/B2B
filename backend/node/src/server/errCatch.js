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

//List the request parameters
function getReq(transaction) {
    const oReq = {
        provider: transaction.hubAPI,
        endpoint: transaction.endpoint
    };

    //Product transaction parameters
    if(transaction.key) { oReq.key = transaction.key }

    if(typeof transaction.forceNew === 'boolean') {
        oReq.forceNew = transaction.forceNew
    }

    if(transaction.product) { oReq.product = transaction.product }

    //Project parameters
    if(transaction.projectStage) {
        oReq.projectStage = transaction.projectStage
    }

    //IDentity Resolution / filter transaction parameters
    if(oReq.endpoint === 'idr' || oReq.endpoint === 'filter') {
        if(transaction.expressReq?.body) {
            oReq.body = transaction.expressReq.body
        }    
    }

    return oReq;
}

//Get the HTTP status code associated with the error
const getStatus = (transaction, err) => transaction.resp?.status || err.httpStatus?.code || httpStatus.genericErr.code;

function handleApiHubErr(transaction, err, db) {
    const status = getStatus(transaction, err);

    //Log the HTTP error to the database
    db.query( 
                'INSERT INTO hub_errors (req, err, http_status) VALUES ($1, $2, $3) RETURNING id',
                [
                    JSON.stringify(getReq(transaction)),
                    transaction.strBody || `{ "msg": "${err.addtlMessage || err.message}" }`,
                    status
                ]
        )
        .then(dbQry => {
            let dbRowID;

            if(dbQry && dbQry.rowCount === 1) {
                dbRowID = dbQry.rows[0].id;

                console.log(`Persisted error with id ${dbRowID}${err.addtlMessage ? `: ${err.addtlMessage}` : ''}`);
            }
            else {
                console.log(`Something went wrong persisting an API Hub error`);
            }

            if(transaction.expressResp) {
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
            }
        })
        .catch(err => console.error(err));
}

export default handleApiHubErr;
