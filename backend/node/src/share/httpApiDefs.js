// *********************************************************************
//
// B2B API definitions D&B, GLEIF, etc. for use with the https module
// JavaScript code file: httpApiDefs.js
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

import { getCreds } from './utils.js';

//Class for executing HTTPS requests
import * as https from 'https';

//Shared HTTP headers
const sharedHeaders = { 'Content-Type': 'application/json' };

//Base GLEIF API definitions
const httpAttrLei = {
    host: 'api.gleif.org',
    headers: { ...sharedHeaders, 'accept': 'application/vnd.api+json' }
};

//Base D&B Direct+ API definitions
const httpAttrDpl = {
    host: 'plus.dnb.com',
    headers: {
        ...sharedHeaders,
        Authorization: `Bearer ${process.env.DNB_DPL_TOKEN}`        
    }
};

//Execute HTTP(S) transactions based on the https module
class Https {
    constructor(httpAttr) {
        this.httpAttr = httpAttr
    }

    //Object method for executing HTTP(S) transactions
    execReq() {
        return new Promise((resolve, reject) => {
            const httpReq = https.request(this.httpAttr, resp => {
                const chunks = [];

                resp.on('error', err => reject(err));

                resp.on('data', chunk => chunks.push(chunk));

                resp.on('end', () => { //The data product is now available in full
                    const size = chunks.reduce((prev, curr) => prev + curr.length, 0);

                    resolve({
                        buffBody: Buffer.concat(chunks, size),
                        httpStatus: resp.statusCode
                    });
                });
            });

            if(this.httpAttr.method === 'POST' && this.httpAttr.body) {
                httpReq.write(this.httpAttr.body)
            }

            httpReq.end();
        })
    }
}

class LeiReq { //Get LEI record by ID 
    constructor(resource) {
        this.resource = resource;
    }

    def = { api: 'gleif', endpoint: 'leiRecs' };

    path = '/api/v1/lei-records/';

    execReq = function() {
        const http = new Https({
            ...httpAttrLei,
            path: `${this.path}${this.resource}`,
        });

        return http.execReq();
    };
}

class LeiFilter { //Get LEI record using filters
    constructor(qryParameters) {
        this.qryParameters = qryParameters;
    }

    def = { api: 'gleif', endpoint: 'leiRecs' };

    path = '/api/v1/lei-records';

    leiPageSizeNum = { 'page[size]': 10, 'page[number]': 1 };

    execReq = function() {
        const http = new Https({
            ...httpAttrLei,
            path: `${this.path}?${new URLSearchParams({ ...this.qryParameters, ...this.leiPageSizeNum })}`,
        });

        return http.execReq();
    };
}

class DnbDplAuth { //Get D&B D+ access token
    constructor() {
        //Really not for creating multiple instances
    }

    def = { api: 'dnbDpl', endpoint: 'auth' };

    path = '/v2/token';

    method = 'POST';

    execReq = function() {
        const httpsParameters = {
            ...httpAttrDpl,
            method: this.method,
            path: this.path,
            body: JSON.stringify({ 'grant_type': 'client_credentials' })
        };

        const creds = getCreds();
        
        httpsParameters.headers.Authorization = `Basic ${Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString('Base64')}`;

        return (new Https(httpsParameters)).execReq();
    };

    //Propagate the token acquired
    updToken = accessToken => {
        process.env.DNB_DPL_TOKEN = accessToken;

        httpAttrDpl.headers.Authorization = `Bearer ${process.env.DNB_DPL_TOKEN}`;
    }
}

class DnbDplDBs { //Get D&B D+ data blocks
    constructor(resource, qryParameters) {
        this.resource = resource;        
        this.qryParameters = qryParameters;
    }

    def = { api: 'dnbDpl', endpoint: 'dbs' };

    path = '/v1/data/duns/';

    execReq = function() {
        const httpsParameters = {
            ...httpAttrDpl,
            path: `${this.path}${this.resource}?${new URLSearchParams({ ...this.qryParameters })}`,
        };

        return ((new Https(httpsParameters)).execReq());
    }
}

export { LeiReq, LeiFilter, DnbDplAuth, DnbDplDBs };
