// *********************************************************************
//
// B2B test code, fetch data from multiple REST APIs 
// JavaScript code file: fetch.js
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
import { LeiFilter, LeiReq, LeiUltParentRelation,
    DnbDplAuth, DnbDplDBs, DnbDplIDR } from '../../share/apiDefs.js';

//Import rate limiter
import { gleifLimiter } from '../../share/limiters.js';

//Specify test requests against the GLEIF API
const leiReqs = [];

leiReqs.push(new LeiReq('529900F4SNCR9BEWFZ60'));

leiReqs.push(new LeiUltParentRelation('5493004SYPRAVRVNK561'));

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
        .then(() => fetch(req.getReq()))
        .then(resp => {
            if (resp.ok) {
                return resp.json();
            }
            else {
                throw new Error(`Fetch response not okay, HTTP status: ${resp.statusText}`);
            }
        })
        .then(leiRec => evaluateLeiRec(req, leiRec))
        .catch(err => console.error('GLEIF API data fetch error: ', err))
);

//Instantiate a D&B Direct+ authentication object
const dnbDplAuth = new DnbDplAuth; //Credentials in .env file
//const dnbDplAuth = new DnbDplAuth('v2');
//const dnbDplAuth = new DnbDplAuth('v3');
//const dnbDplAuth = new DnbDplAuth('vx'); //Will generate an error

//Get a Direct+ access token
fetch(dnbDplAuth.getReq())
    .then(resp => {
        if (resp.ok) {
            return resp.json();
        }
        else {
            throw new Error(`Fetch response not okay, HTTP status: ${resp.statusText}`);
        }
    })
    .then(dplAuth => {
        if(dplAuth?.access_token) {
            console.log('✅ D&B Direct+ authorization request');

            dnbDplAuth.updToken(dplAuth.access_token); //Propagate the new token

            const dplReqs = [
                new DnbDplDBs('407809623', { blockIDs: 'companyinfo_L2_v1' })
            ];

            dplReqs.forEach(dplReq => 
                fetch(dplReq.getReq())
                    .then(resp => {
                        if (resp.ok) {
                            return resp.json();
                        }
                        else {
                            throw new Error(`Fetch response not okay, HTTP status: ${resp.statusText}`);
                        }
                    })
                    .then(dnbRec => evaluateDplRec(dplReq, dnbRec))
                    .catch(err => console.error('D&B Direct+ API data fetch error: ', err))
            );

            const dplIdrReqs = [
                new DnbDplIDR( { name: 'de librije', addressLocality: 'Zwolle', countryISOAlpha2Code: 'NL' } )
            ]

            dplIdrReqs.forEach(dplIdrReq => 
                fetch(dplIdrReq.getReq())
                    .then(resp => {
                        if (resp.ok) {
                            return resp.json();
                        }
                        else {
                            throw new Error(`Fetch response not okay, HTTP status: ${resp.statusText}`);
                        }
                    })
                    .then(dnbIdrRslt => evaluateDplRec(dplIdrReq, dnbIdrRslt))
                    .catch(err => console.error('D&B Direct+ API data fetch error: ', err))
            );
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

    if(leiReq.def?.relation && leiRec?.data?.attributes?.relationship?.endNode?.id) {
        console.log(`✅ LEI ult parent request, retrieved ➡️ ${leiRec?.data?.attributes?.relationship?.endNode?.id}`);
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

    if(dnbReq.def.endpoint === 'idr') {
        const numCandidates = dnbRec?.candidatesMatchedQuantity;

        if(numCandidates > 0) {
            console.log(`✅ D+ IDentity Resolution request, retrieved ➡️ ${numCandidates} match candidates`);
            return;
        }
    }

    //🤔
    console.log('❌ Direct+ request');
}
