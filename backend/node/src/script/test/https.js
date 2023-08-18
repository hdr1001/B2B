// *********************************************************************
//
// B2B test code, request data from REST APIs using module https
// JavaScript code file: https.js
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

//Import the API definitions
import { LeiReq, LeiFilter, DnbDplAuth, DnbDplDBs } from '../../share/httpApiDefs.js';

//Import rate limiters
import { gleifLimiter } from '../../share/limiters.js';

//Specify test requests against the GLEIF API
const leiReqs = [];

leiReqs.push(new LeiReq('529900F4SNCR9BEWFZ60'));

leiReqs.push(new LeiFilter({
    'filter[entity.registeredAs]': '33302453',
    'filter[entity.legalAddress.country]': 'NL'
}));

leiReqs.push(new LeiFilter({
    'filter[entity.legalName]': 'Feyenoord',
    'filter[entity.legalAddress.country]': 'NL'
}));

//Execute the GLEIF test requests
leiReqs.forEach(req => 
    gleifLimiter.removeTokens(1) //Respect the API rate limits
        .then(() => req.execReq())
        .then(resp => {
            if (resp.httpStatus < 200 || resp.httpStatus > 299) {
                throw new Error(`Fetch response not okay, HTTP status: ${resp.httpStatus}`)
            }
            else {
                return JSON.parse(resp.buffBody)
            }
        })
        .then(leiRec => evaluateLeiRec(req, leiRec))
        .catch(err => console.error('GLEIF API data fetch error: ', err))
);

//Instantiate a D&B Direct+ authentication object
const dnbDplAuth = new DnbDplAuth; //Credentials in .env file

//Get a Direct+ access token
dnbDplAuth.execReq()
    .then(resp => {
        if (resp.httpStatus < 200 || resp.httpStatus > 299) {
            throw new Error(`Fetch response not okay, HTTP status: ${resp.httpStatus}`)
        }
        else {
            return JSON.parse(resp.buffBody)
        }
    })
    .then(dplAuth => {
        if(86400 === dplAuth?.expiresIn) {
            console.log('✅ D&B Direct+ authorization request');

            dnbDplAuth.updToken(dplAuth.access_token); //Propagate the new token

            const dplReqs = [
                new DnbDplDBs('407809623', { blockIDs: 'companyinfo_L2_v1' })
            ];

            dplReqs.forEach(dplReq => 
                dplReq.execReq()
                    .then(resp => {
                        if (resp.httpStatus < 200 || resp.httpStatus > 299) {
                            throw new Error(`Fetch response not okay, HTTP status: ${resp.httpStatus}`)
                        }
                        else {
                            return JSON.parse(resp.buffBody)
                        }
                    })
                    .then(dnbRec => evaluateDplRec(dplReq, dnbRec))
                    .catch(err => console.error('D&B Direct+ API data fetch error: ', err))
            )
        }
        else {
            console.log('❌ D&B Direct+ authorization request')
        }
    })
    .catch(err => console.error('D&B Direct+ API data fetch error: ', err));

//Evaluate if the API return matches the expectation
function evaluateLeiRec(leiReq, leiRec) {
    //Just echo the name associated with the LEI requested
    if(leiReq.resource && leiRec?.data?.attributes?.entity?.legalName?.name) {
        console.log(`✅ LEI request, retrieved ➡️ ${leiRec.data.attributes.entity.legalName.name}`);
        return;
    }

    if(leiReq.qryParameters) {
        //Check id the registration number in matches the one out
        if(leiReq.qryParameters['filter[entity.registeredAs]'] === leiRec?.data?.[0]?.attributes?.entity?.registeredAs) {
            console.log(`✅ LEI request, filtered ➡️ ${leiRec?.data?.[0]?.attributes?.entity?.legalName?.name}`);
            return;
        }

        //Check if the name submitted is part of the name returned
        if(leiReq.qryParameters['filter[entity.legalName]']) {
            if(leiRec?.data?.[0]?.attributes?.entity?.legalName?.name) {
                if(leiRec.data[0]?.attributes.entity.legalName.name.toLowerCase().indexOf(leiReq.qryParameters['filter[entity.legalName]'].toLowerCase()) > -1) {
                    console.log(`✅ LEI request, filtered ➡️ ${leiRec.data[0].attributes.entity.legalName.name}`);
                    return;
                }
            }
        }
    }

    //🤔
    console.log('❌ LEI request');
}

//Evaluate if the D&B Direct+ return matches the expectation
function evaluateDplRec(dnbReq, dnbRec) {
    if(dnbReq.def.endpoint === 'dbs' && dnbRec?.organization?.duns) {
        if(dnbReq.resource === dnbRec?.organization?.duns) {
            console.log(`✅ D+ data blocks request, retrieved ➡️ ${dnbRec?.organization?.primaryName}`);
            return;
        }

    }

    //🤔
    console.log('❌ Direct+ request');
}
