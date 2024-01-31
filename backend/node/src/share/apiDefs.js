// *********************************************************************
//
// B2B API definitions D&B, GLEIF, etc.
// JavaScript code file: apiDefs.js
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

//.env configuration
import 'dotenv/config';

//Persist updated key values in the .env file
import { setEnvValue } from './utils.js';

//Construct the base URL for an API
const baseURL = url => `${url.scheme}://${url.domainSub}.${url.domain}.${url.domainTop}${url.port ? ':' + url.port : ''}/`;

//Shared HTTP headers
const sharedHeaders = { 'Content-Type': 'application/json' };

//API providers
const apiProvider = new Map([
    ['gleif', { fullName: 'Global Legal Entity Identifier Foundation', acronym: 'GLEIF', url: 'https://www.gleif.org', key: 'lei', apis: ['lei'] }],
    ['dnb', { fullName: 'Dun & Bradstreet', acronym: 'D&B', url: 'https://www.dnb.com', key: 'duns', apis: ['dpl'] }]
]);

//Parse the API & its provider out of an Express request object baseUrl
apiProvider.baseUrlProviderApi = function(baseUrl) {
    const providers = this.keys();

    let ret = {}, idxProvider, idxApi;

    for(let provider of providers) {
        idxProvider = baseUrl.indexOf(provider);

        if(idxProvider > -1) {
            ret.provider = provider; 
            break;
        }
    }

    if(idxProvider === -1) { return null }

    const apis = this.get(ret.provider).apis;

    for(let api of apis) {
        idxApi = baseUrl.indexOf(api, idxProvider + ret.provider.length);

        if(idxApi > -1) {
            ret.api = api; 
            break;
        }
    }

    if(idxApi === -1) { return null }

    return ret;
}

//Supported APIs
const api = {
    lei: {
        url: {
            scheme: 'https',
            domainSub: 'api',
            domain: 'gleif',
            domainTop: 'org',
            port: '',
        },
        headers: {
            ...sharedHeaders,
            Accept: 'application/vnd.api+json'
        },
        leiPageSizeNum: { 'page[size]': 10, 'page[number]': 1 }
    },

    dpl: ({
        url: ({
            scheme: 'https',
            domainSub: 'plus',
            domain: 'dnb',
            domainTop: 'com',
            port: '',
        }),
        headers: {
            ...sharedHeaders,
            Authorization: `Bearer ${process.env.DNB_DPL_TOKEN}`
        }
    })
};

//Supported endpoints for APIs listed above
const apiEndpoint = {
    lei: {
        baseURL: baseURL(api.lei.url),

        leiRecs: { //LEI records (https://bit.ly/45mRwbt)
            getReq: function() {
                let qryString = '';

                if(this.qryParameters) {
                    qryString = new URLSearchParams({ ...this.qryParameters, ...api.lei.leiPageSizeNum })
                }

                let uri = `${apiEndpoint.lei.baseURL}${this.path}`;
                if(this.resource) { uri += `/${this.resource}` } 
                if(this.subSingleton) { uri += `/${this.subSingleton}` } 
                if(qryString) { uri += `?${qryString}` } 

                return new Request(
                    uri,
                    {
                        headers: api.lei.headers
                    }
                );
            }
        }
    },

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
    }
};

class LeiReq { //Get LEI record by ID 
    constructor(resource) {
        this.resource = resource;
    }

    def = { api: 'lei', endpoint: 'leiRecs' };

    path = 'api/v1/lei-records';

    getReq = apiEndpoint.lei.leiRecs.getReq;
}

class LeiUltParentRelation extends LeiReq {
    constructor(resource) { super(resource) }

    subSingleton = 'ultimate-parent-relationship';

    def = { ...this.def, relation: 'ultParent' };
}

class LeiFilter { //Get LEI record using filters
    constructor(qryParameters) {
        this.qryParameters = qryParameters;
    }

    def = { api: 'lei', endpoint: 'leiRecs', filter: true };

    path = 'api/v1/lei-records';

    getReq = apiEndpoint.lei.leiRecs.getReq;
}

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

export {
    apiProvider,
    LeiReq,
    LeiUltParentRelation,
    LeiFilter,
    DnbDplAuth,
    DnbDplDBs,
    DnbDplFamTree,
    DnbDplBenOwner,
    DnbDplIDR
};
