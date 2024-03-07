// *********************************************************************
//
// API Hub Express server transaction class
// JavaScript code file: transaction.js
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

import { cleanDUNS, isValidLei } from '../share/utils.js';
import { ApiHubErr } from './err.js';
import { dplReqParams, leiReqParams } from './globs.js'

class HubTransaction {
    constructor(expressReq, expressResp, provider, api, idr = false) {
        this.expressReq = expressReq;
        this.expressResp = expressResp;
        this.provider = provider;
        this.api = api;
        this.idr = idr;

        this.nonCriticalErrs = [];

        if(api === 'dpl' && idr) {
            this.nonCriticalErrs = [ 404 ];
        }

        if(api === 'lei' && !idr) {
            this.nonCriticalErrs = [ 404 ];
        }

        if(expressReq.query?.forceNew && expressReq.query.forceNew.toLowerCase() === 'true') {
            this.forceNew = true
        }
    }

    set key(keyIn) {
        if(this.provider === 'dnb') {
            this.sKey = cleanDUNS(keyIn)
        }

        if(this.api === 'lei') {
            if(isValidLei(keyIn)) { this.sKey = keyIn }
        }

        if(!this.sKey) {
            this.sKey = keyIn; //Just for logging purposes, throw of error coming up ⬇️

            throw new ApiHubErr('unprocessableEntity', `Provided key ${keyIn} is not valid`);
        }
    }

    get key() { return this.sKey }

    set product(productIn) {
        if(productIn) {
            this.sProduct = productIn
        }
        else {
            this.sProduct = '00'
        }
    }

    get product() {
        return this.sProduct
    }

    set project(projectIn) {
        this.iProject = projectIn || 0;
    }

    get project() { return this.iProject }

    get reqParams() {
        if(!this.oReqParams) {
            if(this.idr) {
                if(this.api === 'dpl') {
                    if(!this.expressReq.body || this.expressReq.body.constructor !== Object || Object.keys(this.expressReq.body).length === 0) {
                        throw new ApiHubErr('unprocessableEntity', 'No search criteria specified in the body of the POST transaction');
                    }
    
                    if(!this.expressReq.body.countryISOAlpha2Code) {
                        throw new ApiHubErr('unprocessableEntity', 'No country code specified in the body of the POST transaction');
                    }
                }

                if(this.api === 'lei') {
                    if(!this.expressReq.body || this.expressReq.body.constructor !== Object) {
                        throw new ApiHubErr('unprocessableEntity', 'No search criteria specified in the body of the POST transaction');
                    }
                }

                this.oReqParams = this.expressReq.body;
            }
            else {
                if(this.api === 'dpl') {
                    this.oReqParams = dplReqParams.get(this.sProduct);
                }
    
                if(this.api === 'lei') {
                    this.oReqParams = leiReqParams.get(this.sProduct);
                }

                if(this.project) {

                }
            }
        }
    
        if(!this.oReqParams) {
            if(this.idr) {
                throw new ApiHubErr('unprocessableEntity', 'No valid search criteria in transaction POST body');
            }
            else {
                throw new ApiHubErr('unprocessableEntity', `Query parameter product ${this.sProduct} is not valid`);
            }
        }

        return this.oReqParams;
    }
}

export default HubTransaction;
