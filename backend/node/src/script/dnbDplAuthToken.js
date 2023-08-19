// *********************************************************************
//
// D&B Direct+ utilities, API authentication token
// JavaScript code file: dnbDplAuthToken.js
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

//Secrets are stored in the environment
import 'dotenv/config';

import { promises as fs } from 'fs';

import { dcdr } from '../share/utils.js';

//Import the API definitions
import { DnbDplAuth } from '../share/apiDefs.js';

//Instantiate a D&B Direct+ authentication object
const dnbDplAuth = new DnbDplAuth; //Credentials in .env file

//Fetch a Direct+ access token
fetch(dnbDplAuth.getReq()) //No limiter, should be executed once every 24 hours 
    .then(resp => {
        if(resp.ok) {
            return resp.arrayBuffer();
        }
        else {
            throw new Error(`Fetch response not okay, HTTP status: ${resp.statusText}`);
        }
    })
    .then(arrBuff => {
        //fs.writeFile('./io/out/token.json', Buffer.from(arrBuff));

        console.log(dcdr.decode(arrBuff));
    })
    .catch(err => console.error('D&B Direct+ API data fetch error: ', err));
