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

import db from './pg.js';

const config = {
    hubProviders: null, //Read from database table api_providers

    hubAPIs: null, //Read from database table apis

    reqParams: {
        dpl: new Map([
            [
                '00',
                {
                    blockIDs: 'companyinfo_L2_v1,principalscontacts_L1_v2,hierarchyconnections_L1_v1',
                    orderReason: 6332
                }
            ],
            [
                '01',
                {
                    blockIDs: 'financialstrengthinsight_L2_v1,paymentinsight_L1_v1',
                    tradeUp: 'hq',
                    orderReason: 6332
                }
            ]
        ]),

        lei: new Map([
            ['00', {} ],
            ['01', { qryParams: {}, subSingleton: 'ultimate-parent-relationship' }]
        ])
    }
};

async function initConfig() {
    const sql = [ 
        'SELECT provider, full_name, acronym, url FROM api_providers',
        'SELECT api, provider, api_key, full_name, acronym, url FROM apis'
    ];

    return Promise.all([ db.query(sql[0]), db.query(sql[1]) ])
        .then(arr => {
            config.hubProviders = new Map(arr[0].rows.map(row => [
                    row.provider,
                    { 
                        provider: row.provider,
                        full_name: row.full_name,
                        acronym: row.acronym,
                        url: row.url
                    }
                ]
            ));
    
            config.hubAPIs = new Map(arr[1].rows.map(row => [
                    row.api,
                    { 
                        api: row.api,
                        provider: row.provider,
                        api_key: row.api_key,
                        full_name: row.full_name,
                        acronym: row.acronym,
                        url: row.url
                    }
                ]
            ));
        });
}

export {
    config,
    initConfig
};
