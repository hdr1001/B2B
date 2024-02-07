// *********************************************************************
//
// B2B API definitions as implemented in the API Hub server
// JavaScript code file: apiDefsHub.js
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

//API Hub URI components
const url = {
    scheme: 'http',
    apiHubDomain: [ 'localhost' ],
    port: process.env.API_SERVER_PORT
}

//Construct the base URL for an API
const baseURL = () => `${url.scheme}://${url.apiHubDomain.join('.')}${url.port ? ':' + url.port : ''}/`;

const basePath = 'hub/';

//Shared HTTP headers
const sharedHeaders = { 'Content-Type': 'application/json' };

//Supported endpoints for APIs listed above
const apiEndpoint = {
    gleif: {
        lei: {
            getReq: function() {
                let uri = `${baseURL()}${basePath}${this.path}`;
                if(this.resource) { uri += this.resource }

                const opts = { headers: sharedHeaders };

                if(this.def.filter) {
                    opts.method = 'POST';
                    opts.body = JSON.stringify(this.params);
                }
                else {
                    if(this.params) { uri += `?${new URLSearchParams({ ...this.params })}` } 
                }

                return new Request( uri, opts );
            }
        }
    },

    dpl: {
        dbs: { //D&B Direct+ data blocks
            getReq: function() {
                let uri = `${baseURL()}${basePath}${this.path}`;
                if(this.resource) { uri += this.resource }
                if(this.params) { uri += `?${new URLSearchParams({ ...this.params })}` } 

                return new Request( uri );
            }
        },

        famTree: { //D&B Direct+ family tree
            getReq: function() {
                return new Request(
                    `${apiEndpoint.dpl.baseURL}${this.path}${this.resource}?${new URLSearchParams({ ...this.qryParameters })}`,
                    {
                        headers: api.dpl.headers,
                    }
                )
            }
        },

        benOwner: { //D&B Direct+ beneficial owner
            getReq: function() {
                return new Request(
                    `${apiEndpoint.dpl.baseURL}${this.path}?${new URLSearchParams({ duns: this.duns, ...this.qryParameters })}`,
                    {
                        headers: api.dpl.headers,
                    }
                )
            }
        },

        idr: { //D&B Direct+ IDentity Resolution
            getReq: function() {
                return new Request(
                    `${apiEndpoint.dpl.baseURL}${this.path}?${new URLSearchParams({ ...this.qryParameters })}`,
                    {
                        headers: api.dpl.headers,
                    }
                )
            }
        }
    }
};

class LeiReqHub { //Get LEI record by ID 
    constructor(resource, qryParams) {
        this.resource = resource;
        this.params = qryParams;
    }

    def = { api: 'hub', endpoint: 'lei' };

    path = 'gleif/lei/';

    getReq = apiEndpoint.gleif.lei.getReq;
}

class LeiFilterHub { //Get LEI record using filters
    constructor(bodyParams) {
        this.params = bodyParams
    }

    def = { api: 'hub', endpoint: 'lei', filter: true };

    path = 'gleif/lei/filter';

    getReq = apiEndpoint.gleif.lei.getReq;
}

class DnbDplDBsHub { //Get D&B D+ data blocks
    constructor(resource, qryParameters) {
        this.resource = resource;        
        this.params = qryParameters;
    }

    def = { api: 'dpl', endpoint: 'dbs' };

    path = 'dnb/dpl/duns/';

    getReq = apiEndpoint.dpl.dbs.getReq;
}

class DnbDplFamTree { //Get a D&B D+ corporate structure
    constructor(resource, qryParameters) {
        this.resource = resource;        
        this.qryParameters = qryParameters;
    }

    def = { api: 'dpl', endpoint: 'famTree' };

    path = 'v1/familyTree/';

    getReq = apiEndpoint.dpl.famTree.getReq;
}

class DnbDplBenOwner { //Get a D&B D+ beneficial owner
    constructor(duns, qryParameters) {
        this.duns = duns;        
        this.qryParameters = qryParameters;
    }

    def = { api: 'dpl', endpoint: 'benOwner' };

    path = 'v1/beneficialowner';

    getReq = apiEndpoint.dpl.benOwner.getReq;
}

class DnbDplIDR {
    constructor(qryParameters) {
        this.qryParameters = qryParameters;
    }

    def = { api: 'dpl', endpoint: 'idr' };

    path = 'v1/match/cleanseMatch';

    getReq = apiEndpoint.dpl.idr.getReq;
}

export {
    LeiReqHub,
    LeiFilterHub,
    DnbDplDBsHub,
    DnbDplFamTree,
    DnbDplBenOwner,
    DnbDplIDR
};
