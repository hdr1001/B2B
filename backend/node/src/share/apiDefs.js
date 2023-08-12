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
import * as dotenv from 'dotenv';
dotenv.config();

//Construct the base URL for an API
const baseURL = url => `${url.scheme}://${url.domainSub}.${url.domain}.${url.domainTop}${url.port ? ':' + url.port : ''}/`;

//Shared HTTP headers
const sharedHeaders = { 'Content-Type': 'application/json' };

//Supported APIs
const api = {
    gleif: {
        url: {
            scheme: 'https',
            domainSub: 'api',
            domain: 'gleif',
            domainTop: 'org',
            port: '',
        },
        headers: sharedHeaders,
        leiPageSizeNum: { 'page[size]': 10, 'page[number]': 1 }
    },

    dnbDpl: ({
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
    gleif: {
        baseURL: baseURL(api.gleif.url),

        leiRecs: { //LEI records (https://bit.ly/45mRwbt)
            getReq: function(leiReq) {
                const qryString = leiReq.qryParameters
                    ? new URLSearchParams({ ...leiReq.qryParameters, ...api.gleif.leiPageSizeNum })
                    : '';

                return new Request(
                    `${apiEndpoint.gleif.baseURL}${this.path}${leiReq.resource ? `/${leiReq.resource}` : '?'}${qryString}`,
                    {
                        headers: api.gleif.headers
                    }
                );
            }
        }
    },

    dnbDpl: {
        baseURL: baseURL(api.dnbDpl.url),

        auth: { //D&B Direct+ generate auth token
            getReq: function() {
                return new Request (
                    `${apiEndpoint.dnbDpl.baseURL}${this.path}`,
                    {
                        method: 'POST',
                        headers: {
                            ...api.dnbDpl.headers,
                            Authorization: `Basic ${Buffer.from(`${process.env.DNB_DPL_KEY}:${process.env.DNB_DPL_SECRET}`).toString('Base64')}`
                        },
                        body: JSON.stringify({ 'grant_type': 'client_credentials' })
                    }
                )
            }
        },

        dbs: { //D&B Direct+ data blocks
            getReq: function() {
                return new Request(
                    `${apiEndpoint.dnbDpl.baseURL}${this.path}${this.resource}?${new URLSearchParams({ ...this.qryParameters })}`,
                    {
                        headers: api.dnbDpl.headers,
                    }
                )
            }
        }
    }
};

class LeiReq { //Get LEI record by ID 
    constructor(resource) {
        this.def = { api: 'gleif', endpoint: 'leiRecs'};

        this.resource = resource;        
    }

    path = 'api/v1/lei-records';

    getReq = apiEndpoint.gleif.leiRecs.getReq;
}

class LeiFilter { //Get LEI record using filters
    constructor(qryParameters) {
        this.def = { api: 'gleif', endpoint: 'leiRecs'};

        this.qryParameters = qryParameters;
    }

    path = 'api/v1/lei-records';

    getReq = apiEndpoint.gleif.leiRecs.getReq;
}

class DnbDplAuth { //Get D&B D+ access token
    constructor() {
        this.def = { api: 'dnbDpl', endpoint: 'auth'};
    }

    path = 'v2/token';

    getReq = apiEndpoint.dnbDpl.auth.getReq;

    updToken = accessToken => {
        process.env.DNB_DPL_TOKEN = accessToken;

        api.dnbDpl.headers.Authorization = `Bearer ${process.env.DNB_DPL_TOKEN}`;
    }
}

class DnbDplDBs { //Get D&B D+ data blocks
    constructor(resource, qryParameters) {
        this.def = { api: 'dnbDpl', endpoint: 'dbs'};

        this.resource = resource;        
        this.qryParameters = qryParameters;
    }

    path = 'v1/data/duns/';

    getReq = apiEndpoint.dnbDpl.dbs.getReq;
}

export { LeiReq, LeiFilter, DnbDplAuth, DnbDplDBs };
