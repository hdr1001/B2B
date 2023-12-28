// *********************************************************************
//
// Definition of the API Hub main routes
// JavaScript code file: hub.js
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

import express from 'express';

import { apiProvider } from '../../share/apiDefs.js';

import gleif from './gleif.js';

const router = express.Router();

//Add about endpoint
router.get('/about', (req, resp) => 
    resp.json({
        description: 'API Hub for requesting, persisting & passing on 3rd party API data (v5)',
        gitRepository: 'https://github.com/hdr1001/B2B',
        license: 'Apache license, v2.0',
        licenseDetails: 'http://www.apache.org/licenses/LICENSE-2.0',
        copyright: 'Hans de Rooij, 2023'
    })
);

//Add provider endpoints
Object.keys(apiProvider).forEach(key => {
    router.get(`/${key}`, (req, resp) => resp.json( apiProvider[key] ));

    apiProvider[key].apis.forEach(api => {
        if(api === 'lei') {
            router.use(`/${key}/lei`, gleif);
        }
    
        if(key === 'dpl') {
    
        }
    })
});

export default router;
