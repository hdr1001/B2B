// *********************************************************************
//
// Custom error class for the API Hub server
// JavaScript code file: err.js
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

//HTTP status codes
const httpStatus = {
    okay: { description: 'Request succeeded', code: 200 },
    notFound: { description: 'Unable to locate', code: 404 },
    unprocessableEntity: { description: 'Unprocessable entity', code: 422 },
    genericErr: { description: 'Server Error', code: 500 }
};
 
//API Hub errors
const ahErrCode = new Map([
    [ 'generic', { code: 0, desc: 'Error occurred in API HUB', httpStatus: httpStatus.genericErr } ],
    [ 'unableToLocate', { code: 1, desc: 'Unable to locate the requested resource', httpStatus: httpStatus.notFound } ],
    [ 'invalidParameter', { code: 2, desc: 'Invalid parameter', httpStatus: httpStatus.notFound } ],
    [ 'extnlApiErr', { code: 3, desc: 'External API returned an error', httpStatus: httpStatus.genericErr } ],
    [ 'httpErrReturn', { code: 4, desc: 'External API returned an HTTP error status', httpStatus: httpStatus.genericErr } ],
    [ 'semanticError', { code: 5, desc: 'Semantically erroneous request', httpStatus: httpStatus.unprocessableEntity } ],
    [ 'serverError', { code: 6, desc: 'Server error', httpStatus: httpStatus.genericErr } ]
]);

//API Hub custom error class
class ApiHubErr extends Error {
    constructor(errCode, addtlErrMsg) {
        super();

        this.hubErrorCode = errCode.code;
        this.message = errCode.desc

        if(addtlErrMsg) {
            this.addtlMessage = addtlErrMsg
        }

        this.httpStatus = errCode.httpStatus;
    }
}

export {
    httpStatus,
    ahErrCode,
    ApiHubErr
}
