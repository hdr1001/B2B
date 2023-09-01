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

//Import the fs module for interacting with the file system
import { promises as fs } from 'fs';

//Decoder object for decoding utf-8 data in a binary format
import { dcdrUtf8 } from '../share/utils.js';

//Import the API definitions
import { DnbDplAuth } from '../share/apiDefs.js';

//Function to log, persist or propagate a Direct+ access token
function dplAuthToken(
        doLog = false,       //Log the response to the console
        doPersist,           //Write the response to a file
        doPropagate = false, //Update the environment, auth header & .env file
        version = 'v2'       //Endpoint version
    ) {

    //Token can only be generated if credentials are available
    if(!process.env.DNB_DPL_KEY || !process.env.DNB_DPL_SECRET) {
        let sErrMsg = 'Please set the Direct+ API credentials as environment variables\n';
        sErrMsg += 'When using a GitHub Codespace best paractice is to use Codespaces Secrets\n';
        sErrMsg += 'On your GitHub acct, go to Settings, Codespaces, Codespaces Secrets\n';
        sErrMsg += 'Otherwise just set the environment variables: DNB_DPL_TOKEN=abc1234...\n';
    
        console.error(sErrMsg);
        
        return -1;
    }

    //Instantiate a D&B Direct+ authentication object
    const dnbDplAuth = new DnbDplAuth(version); //Credentials in .env file

    //All systems go
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
            //Log to console
            if(doLog) { console.log(`Response to authentication request ${dcdrUtf8.decode(arrBuff)}`) }

            //Write to file
            if(doPersist) {
                fs.writeFile(
                    `../io/out/${doPersist}`,
                    dcdrUtf8.decode(arrBuff),
                    err => console.error(err)
                )
            }

            //Update the environment, HTTP authorization header & .env file
            if(doPropagate) {
                const dplAuth = JSON.parse(dcdrUtf8.decode(arrBuff));

                if(dplAuth.access_token) { dnbDplAuth.updToken(dplAuth.access_token) }
            }
        })
        .catch(err => console.error('D&B Direct+ API data fetch error: ', err));
}

export { dplAuthToken }
