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
 
//Error specifics
const ahErrors = [
    { errDesc: 'Error occurred in API HUB', httpStatus: httpStatus.genericErr },
    { errDesc: 'Unable to locate the requested resource', httpStatus: httpStatus.notFound },
    { errDesc: 'Invalid parameter', httpStatus: httpStatus.notFound },
    { errDesc: 'External API returned an error', httpStatus: httpStatus.genericErr },
    { errDesc: 'External API returned an HTTP error status', httpStatus: httpStatus.genericErr },
    { errDesc: 'Semantically erroneous request', httpStatus: httpStatus.unprocessableEntity },
    { errDesc: 'Server error', httpStatus: httpStatus.genericErr }
];

//API Hub errors
const ahErrCode = {
    generic: 0,
    unableToLocate: 1,
    invalidParameter: 2,
    extnlApiErr: 3,
    httpErrReturn: 4,
    semanticError: 5,
    serverError: 6
};

//API Hub custom error class
class ApiHubErr extends Error {
    constructor(errCode, addtlErrMsg) {
        super();

        this.hubErrorCode = errCode;
        this.message = ahErrors[errCode].errDesc

        if(addtlErrMsg) {
            this.addtlMessage = addtlErrMsg
        }

        this.httpStatus = ahErrors[errCode].httpStatus;
    }
}

export {
    ahErrCode,
    ApiHubErr
}
