// *********************************************************************
//
// D&B Direct+ IDR match candidates JavaScript object wrapper
// JavaScript code file: dnbDplMCs.js
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

import { getObjAttrValue } from '../share/dnbDplCommon.js';

//Application constants
const appConsts = {
    inq: {
        component: {
            duns: { attrs: ['duns'], desc: 'DUNS' },
            regNum: { attrs: ['registrationNumber'], desc: 'reg number' },
            name: { attrs: ['name'], desc: 'bus nme' },
            addrLine1: { attrs: ['address', 'streetAddressLine', 'line1'], desc: 'line 1' },
            addrLine2: { attrs: ['address', 'streetAddressLine', 'line2'], desc: 'line 2' },
            postalCode: { attrs: ['address', 'postalCode'], desc: 'post cd' },
            locality: { attrs: ['address', 'addressLocality'], desc: 'city nme' },
            region: { attrs: ['address', 'addressRegion'], desc: 'region' },
            countryISO: { attrs: ['address', 'countryISOAlpha2Code'], desc: 'ctry ISO' },
            telNum: { attrs: ['telephoneNumber'], desc: 'tel num' },
            url: { attrs: ['url'], desc: 'URL' },
            email: { attrs: ['email'], desc: 'email' },
            candidateMaxQty: { attrs: ['candidateMaximumQuantity'], desc: 'cand max qty' },
            custBillEndt: { attrs: ['customerBillingEndorsement'], desc: 'cust bill endt' },
            inLanguage: { attrs: ['inLanguage'], desc: 'language' }
        }
    }
};

//D&B Direct+ Data Blocks JavaScript object wrapper
class DplMCs {
    constructor(inp) {
        //Parse the JSON passed in as a string
        if((typeof inp === 'string' || Buffer.isBuffer(inp)) && inp.length) {
            try {
                this.dplMCs = JSON.parse(inp)
            }
            catch(err) {
                console.error(err.message);
                throw(err);
            }

            //The parsed object should have a matchCandidates node
            if(!this?.dplMCs?.matchCandidates) {
                throw new Error('Constructor parameter is valid JSON but not a D&B Direct+ IDR response')
            }

            //Create a shortcut to the organization attribute
            this.mcs = this.dplMCs.matchCandidates;
        }

        //A D&B Direct+ collection of data blocks can be passed in, as an object, to the constructor as well
        if(typeof inp === 'object' && !Buffer.isBuffer(inp)) {
            //The object passed in to the constructor should have an matchCandidates node
            if(!inp.matchCandidates) {
                throw new Error('The constructor parameter is an object but not a D&B Direct+ IDR response')
            }

            //Store a reference to the object passed in to the constructor
            this.dplMCs = inp;

            //Create a shortcut to the organization attribute
            this.mcs = inp.matchCandidates;
        }

        if(this.dplMCs) {
            //One-to-one mappings
            this.map121 = { //The actual directly mapped values
                inq:           this.dplMCs?.inquiryDetail,             // inquiry detail
                numCandidates: this.dplMCs?.candidatesMatchedQuantity, // number of match candidates returned
                matchType:     this.dplMCs?.matchDataCriteria,         // match algorithm used
            };
        }
    }

    //Expose the application constants through the class interface
    get consts() { return appConsts }

    inqToArray(arrInqComponents, bLabel) {
        const arrRet = new Array(arrInqComponents.length);

        arrInqComponents.forEach((inqComponent, idxComponent) => {
            arrRet[idxComponent] = getObjAttrValue(this.map121.inq, inqComponent)
        });

        return arrRet;
    }
}

export { DplMCs };
