// *********************************************************************
//
// D&B Direct+ Authorization object wrapper
// JavaScript code file: dnbDplAuth.js
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

import { DnbDplAuth } from "./apiDefs.js";

export default class DplAuthToken {
    constructor(version = 'v2', updEnvFile = true) {
        //Token can only be generated if credentials are available
        if(!process.env.DNB_DPL_KEY || !process.env.DNB_DPL_SECRET) {
            let sErrMsg = 'Please set the Direct+ API credentials as environment variables\n';
            sErrMsg += 'Relevant variables are DNB_DPL_KEY and DNB_DPL_SECRET\n';

            throw new Error(sErrMsg);
        }

        this.dnbDplAuth = new DnbDplAuth(version, updEnvFile);

        this.reqNewDplAuthToken(); //Get a new token on object instantiation

        //Check every 30 minutes if the token needs to be refreshed
        this.chkInterval = setInterval(this.reqNewDplAuthTokenIfAdvised.bind(this), 1800000);
    }

    get expiresInMins() { //Return the number of minutes until the token expires
        if(!this.expiresIn || !this.obtainedAt) {
            return 0;
        }

        return (this.obtainedAt + (this.expiresIn * 1000) - Date.now()) / 60000;
    }

    get renewAdvised() { //Answer the question; should this authorization token be renewed?
        if(this.expiresInMins < 76) {
            return true;
        }

        return false;
    }

    reqNewDplAuthTokenIfAdvised() {
        if(this.renewAdvised) { 
            console.log('D&B Direct+ token invalid or (nearly) expired, get new token online');

            this.reqNewDplAuthToken();
        }
        else {
            console.log(`D&B Direct+ token validated okay (${this.expiresInMins.toFixed(1)} minutes remaining)`)
        }
    }
  
    reqNewDplAuthToken = () => {
        fetch(this.dnbDplAuth.getReq())
            .then(resp => {
                if(resp.ok) {
                    return resp.json()
                }
                else {
                    let sErrMsg = 'Fetch return of D&B Direct+ authorization request not okay\n';
                    sErrMsg += `HTTP status: ${resp.status}\n`;

                    throw new Error(sErrMsg);
                }
            })
            .then(dplAuth => {
                this.dnbDplAuth.updToken(dplAuth.access_token);

                this.expiresIn = dplAuth.expiresIn;
                this.obtainedAt = Date.now();
            }
        )
    }
}
