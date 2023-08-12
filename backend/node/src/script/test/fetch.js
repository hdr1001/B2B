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
import { apiEndpoint } from "../../share/apiDefs.js";

//Import rate limiters
import { gleifLimiter } from "../../share/limiters.js";

//Example LEI request parameters
let apiKey = 'gleif', apiEndpointKey = 'leiRecs';

//Specify test requests against the GLEIF API
const leiReqs = [];

leiReqs.push({ resource: '529900W18LQJJN6SJ336' });

leiReqs.push({ qryParameters: {
        'filter[entity.registeredAs]': '33302453',
        'filter[entity.legalAddress.country]': 'NL'
    }
});

leiReqs.push({ qryParameters: {
        'filter[entity.legalName]': 'Feyenoord',
        'filter[entity.legalAddress.country]': 'NL'
    }
});

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

//Execute the GLEIF test requests
/* leiReqs.forEach(element => 
    gleifLimiter.removeTokens(1) //Respect the API rate limits
        .then(() => fetch(apiEndpoint[apiKey][apiEndpointKey].getReq(element)))
        .then(resp => {
            if (resp.ok) {
                return resp.json();
            }
            else {
                throw new Error(`Fetch response not okay, HTTP status: ${resp.statusText}`);
            }
        })
        .then(leiRec => evaluateLeiRec(element, leiRec))
        .catch(err => console.error("GLEIF API data fetch error: ", err))
);
*/
//Example D&B D+ request parameters
apiKey = 'dnbDpl';
apiEndpointKey = 'auth';

fetch(apiEndpoint[apiKey][apiEndpointKey].getReq())
    .then(resp => {
        if (resp.ok) {
            return resp.json();
        }
        else {
            throw new Error(`Fetch response not okay, HTTP status: ${resp.statusText}`);
        }
    })
    .then(dplAuth => {
        if(86400 === dplAuth?.expiresIn) {
            console.log('✅ D&B Direct+ authorization request');

            apiEndpoint.dnbDpl.auth.updToken(dplAuth.access_token);
        }
        else {
            console.log('❌ D&B Direct+ authorization request')
        }
    })
    .catch(err => console.error("D&B Direct+ API data fetch error: ", err));

