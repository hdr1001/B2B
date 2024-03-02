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
import { ApiHubErr } from './err.js';

function handleApiHubErr(transaction, err) {
     //Error of class ApiHubErr was thrown
    if(isNumber(err.hubErrorCode)) {
        transaction.expressResp.status( err.httpStatus.code ).json( err );
    }
    else {
        const ahErr = new ApiHubErr(
            'generic',
            err.message,
            transaction.resp?.status,
            transaction.strBody
        );

        transaction.expressResp.status( ahErr.httpStatus.code ).json( ahErr );
    }
}

export default handleApiHubErr;
