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
        leiRecs: { //LEI records (https://bit.ly/45mRwbt)
            path: baseURL(api.gleif.url) + 'api/v1/lei-records',
            getReq: function(leiReq) {
                const qryString = leiReq.qryParameters
                    ? new URLSearchParams({ ...leiReq.qryParameters, ...api.gleif.leiPageSizeNum })
                    : '';

                return new Request(
                    `${this.path}${leiReq.resource ? `/${leiReq.resource}` : '?'}${qryString}`,
                    {
                        headers: api.gleif.headers
                    }
                );
            }
        }
    },

    dnbDpl: {
        auth: { //D&B Direct+ generate auth token
            path: baseURL(api.dnbDpl.url) + 'v2/token',
            getReq: function() {
                return new Request (
                    this.path,
                    {
                        method: 'POST',
                        headers: {
                            ...api.dnbDpl.headers,
                            Authorization: `Basic ${Buffer.from(`${process.env.DNB_DPL_KEY}:${process.env.DNB_DPL_SECRET}`).toString('Base64')}`
                        },
                        body: JSON.stringify({ 'grant_type': 'client_credentials' })
                    }
                )
            },
            updToken: function(accessToken) {
                process.env.DNB_DPL_TOKEN = accessToken;

                api.dnbDpl.headers.Authorization = `Bearer ${process.env.DNB_DPL_TOKEN}`;
            }
        }
    }
};

export { apiEndpoint };
