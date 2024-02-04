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
                if(this.resource) { uri += `/${this.resource}` } 

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
/*
    dpl: {
        baseURL: baseURL(api.dpl.url),

        auth: { //D&B Direct+ generate auth token
            getReq: function() {
                let sBody = '', httpHeaders;

                if(this.path.slice(0, 2) === 'v2') {
                    sBody = JSON.stringify({ 'grant_type': 'client_credentials' });

                    httpHeaders = sharedHeaders;
                }

                if(this.path.slice(0, 2) === 'v3') {
                    sBody = (new URLSearchParams({ grant_type: 'client_credentials' })).toString();

                    httpHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' }
                }

                if(!sBody) { throw new Error(`Invalid version specified (${this.path.slice(0, 2)}) for D&B Direct+ authentication token`)}

                return new Request (
                    `${apiEndpoint.dpl.baseURL}${this.path}`,
                    {
                        method: 'POST',
                        headers: {
                            ...httpHeaders,
                            Authorization: `Basic ${Buffer.from(`${process.env.DNB_DPL_KEY}:${process.env.DNB_DPL_SECRET}`).toString('Base64')}`
                        },
                        body: sBody
                    }
                )
            }
        },

        dbs: { //D&B Direct+ data blocks
            getReq: function() {
                return new Request(
                    `${apiEndpoint.dpl.baseURL}${this.path}${this.resource}?${new URLSearchParams({ ...this.qryParameters })}`,
                    {
                        headers: api.dpl.headers,
                    }
                )
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
    } */
};

class LeiReqHub { //Get LEI record by ID 
    constructor(resource, qryParams) {
        this.resource = resource;
        this.params = qryParams;
    }

    def = { api: 'hub', endpoint: 'lei' };

    path = 'gleif/lei';

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
/*
class DnbDplAuth { //Get D&B D+ access token
    constructor(version = 'v2') {
        this.path = `${version}/token`;
    }

    def = { api: 'dpl', endpoint: 'auth' };

    getReq = apiEndpoint.dpl.auth.getReq;

    //Propagate the token acquired
    updToken = accessToken => {
        process.env.DNB_DPL_TOKEN = accessToken; //Propagate to the environment

        //Update the HTTP authorization header
        api.dpl.headers.Authorization = `Bearer ${process.env.DNB_DPL_TOKEN}`;

        //Write the new token to the .env file
        setEnvValue('DNB_DPL_TOKEN', '\"' + accessToken + '\"');
    }
}

class DnbDplDBs { //Get D&B D+ data blocks
    constructor(resource, qryParameters) {
        this.resource = resource;        
        this.qryParameters = qryParameters;
    }

    def = { api: 'dpl', endpoint: 'dbs' };

    path = 'v1/data/duns/';

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
*/
export {
    LeiReqHub,
    LeiFilterHub,
/*    DnbDplAuth,
    DnbDplDBs,
    DnbDplFamTree,
    DnbDplBenOwner,
    DnbDplIDR */
};
