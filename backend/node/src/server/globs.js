// *********************************************************************
//
// API Hub Express server global variables
// JavaScript code file: globs.js
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

//Import the fs module for interacting with the file system
import { readFileSync } from 'fs';

const { PG_HOST, PG_DATABASE, PG_USER, PG_PASSWORD } = process.env;

let pg_pwd = '';

if(!PG_PASSWORD) {
    try {
        pg_pwd = readFileSync('/run/secrets/pg_password', 'utf8').trim()
    }
    catch(err) {
        console.error(err)
    }
}

const pgConn = {
    host: PG_HOST,
    database: PG_DATABASE,
    user: PG_USER,
    password: PG_PASSWORD || pg_pwd,
    port: 5432,
    max: 10, //set pool max size to 10
    idleTimeoutMillis: 1000, //close idle clients after 1 second
    connectionTimeoutMillis: 9999, //return an error after 10 seconds if connection could not be established
    maxUses: 7500, //close (and replace) a connection after it has been used 7500 times
}

const dplReqParams = new Map([
    ['00', {
        blockIDs: 'companyinfo_L2_v1,principalscontacts_L1_v2,hierarchyconnections_L1_v1',
        orderReason: 6332
    }],
    ['01', {
        blockIDs: 'financialstrengthinsight_L2_v1,paymentinsight_L1_v1',
        tradeUp: 'hq',
        orderReason: 6332
    }]
]);

const leiReqParams = new Map([
    ['00', { subSingleton: null }],
    ['01', { subSingleton: 'ultimate-parent-relationship' }]
]);

export {
    pgConn,
    dplReqParams,
    leiReqParams
};
