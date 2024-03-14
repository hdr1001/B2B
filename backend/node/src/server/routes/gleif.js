// *********************************************************************
//
// Definition of the API Hub GLEIF routes
// JavaScript code file: gleif.js
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

import HubTransaction from '../transaction.js';
import { apiProvider } from '../../share/apiDefs.js';
import { ahReqPersistRespKey, ahReqPersistRespIDR } from '../core.js';
import handleApiHubErr from '../errCatch.js';

const router = express.Router();

const apiProviderLei = apiProvider.get('gleif');

const idrEndpoint = 'filter';
const keyEndpoint = 'key';

router.post(`/${idrEndpoint}`, (req, resp) => {
    let transaction;

    try {
        //Transaction parameters
        transaction = new HubTransaction( req, resp, apiProviderLei, idrEndpoint );

        //Let the API Hub do its thing
        ahReqPersistRespIDR( transaction )
            .then(msg => console.log(msg))
            .catch(err => handleApiHubErr( transaction, err ));
    }
    catch( err ) {
        handleApiHubErr( transaction, err )
    }
});

router.get(`/:${keyEndpoint}`, (req, resp) => {
    let transaction;

    try {
        //Transaction parameters
        transaction = new HubTransaction( req, resp, apiProviderLei, keyEndpoint );

        transaction.key = req.params.key;

        transaction.product = req.query?.product; //'00' is the default product key

        //Let the API Hub do its thing
        ahReqPersistRespKey(transaction)
            .then(msg => console.log(msg))
            .catch(err => handleApiHubErr( transaction, err ));
    }
    catch( err ) {
        handleApiHubErr( transaction, err )
    }
});
 
export default router;
