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

import { cleanDUNS } from '../share/utils.js';
import { isValidLei } from '../share/utilsGleif.js';
import { ApiHubErr } from './err.js';
import { config } from './globs.js'

class Transaction {
    constructor(hubAPI, endpoint) {
        this.hubAPI = hubAPI;
        this.endpoint = endpoint === 'filter' ? 'idr' : endpoint;

        this.nonCriticalErrs = [];

        if(hubAPI.api === 'dpl' && endpoint === 'idr') {
            this.nonCriticalErrs = [ 404 ]
        }

        if(hubAPI.api === 'lei' && endpoint !== 'idr') {
            this.nonCriticalErrs = [ 404 ]
        }
    }

    set key(keyIn) {
        if(this.hubAPI.api_key === 'duns') {
            this._key = cleanDUNS(keyIn)
        }

        if(this.hubAPI.api_key === 'lei') {
            if(isValidLei(keyIn)) { this._key = keyIn }
        }

        if(!this._key) {
            this._key = keyIn; //Just for logging purposes, throw of error coming up ⬇️

            throw new ApiHubErr('unprocessableEntity', `Provided key ${keyIn} is not valid`);
        }
    }

    get key() { return this._key }
}

class HubTransaction extends Transaction {
    constructor(expressReq, expressResp, hubAPI, endpoint) {
        super(hubAPI, endpoint);

        this.expressReq = expressReq;
        this.expressResp = expressResp;

        if(expressReq.query?.forceNew && expressReq.query.forceNew.toLowerCase() === 'true') {
            this.forceNew = true
        }
    }

    set product(productIn) {
        if(productIn) {
            this._product = productIn
        }
        else {
            this._product = '00'
        }
    }

    get product() {
        return this._product
    }

    get reqParams() {
        if(!this._reqParams) {
            if(this.endpoint === 'idr') {
                if(this.hubAPI.api === 'dpl') {
                    if(!this.expressReq.body || this.expressReq.body.constructor !== Object || Object.keys(this.expressReq.body).length === 0) {
                        throw new ApiHubErr('unprocessableEntity', 'No search criteria specified in the body of the POST transaction');
                    }
    
                    if(!this.expressReq.body.countryISOAlpha2Code) {
                        throw new ApiHubErr('unprocessableEntity', 'No country code specified in the body of the POST transaction');
                    }
                }

                if(this.hubAPI.api === 'lei') {
                    if(!this.expressReq.body || this.expressReq.body.constructor !== Object) {
                        throw new ApiHubErr('unprocessableEntity', 'No search criteria specified in the body of the POST transaction');
                    }
                }

                this._reqParams = this.expressReq.body;
            }
            else {
                if(this.hubAPI.api === 'dpl') {
                    this._reqParams = config.reqParams.dpl.get(this._product);
                }

                if(this.hubAPI.api === 'lei') {
                    this._reqParams = config.reqParams.lei.get(this._product);
                }
            }
        }
    
        if(!this._reqParams) {
            if(this.idr) {
                throw new ApiHubErr('unprocessableEntity', 'No valid search criteria in transaction POST body');
            }
            else {
                throw new ApiHubErr('unprocessableEntity', `Query parameter product ${this._product} is not valid`);
            }
        }

        return this._reqParams;
    }
}

class HubProjectTransaction extends Transaction {
    constructor(hubAPI, endpoint, projectStage) {
        super(hubAPI, endpoint);

        this.projectStage = projectStage;
    }

    get reqParams() {
        return this.projectStage.params;
    }
}

export {
    HubTransaction,
    HubProjectTransaction
};
