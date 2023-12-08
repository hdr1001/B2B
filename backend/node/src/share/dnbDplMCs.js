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

import { getObjAttrValue, addr, addressToArray } from '../share/dnbDplCommon.js';

import { ElemLabel } from './elemLabel.js';

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
    },
    addr: addr //Address related constants
};

//D&B Direct+ IDentity Resolution JavaScript object wrapper
class DplIDR {
    constructor(inp) {
        //Parse the JSON passed in as a string/buffer
        if((typeof inp === 'string' || Buffer.isBuffer(inp)) && inp.length) {
            try {
                this.idr = JSON.parse(inp)
            }
            catch(err) {
                console.error(err.message);
                throw(err);
            }

            //The parsed object should have a matchCandidates node
            if(!this?.idr?.matchCandidates) {
                throw new Error('Constructor parameter is valid JSON but not a D&B Direct+ IDR response')
            }
        }

        //A D&B Direct+ collection of data blocks can be passed in, as an object, to the constructor as well
        if(typeof inp === 'object' && !Buffer.isBuffer(inp)) {
            //The object passed in to the constructor should have an matchCandidates node
            if(!inp.matchCandidates) {
                throw new Error('The constructor parameter is an object but not a D&B Direct+ IDR response')
            }

            //Store a reference to the object passed in to the constructor
            this.idr = inp;
        }

        if(this.idr) {
            //One-to-one mappings
            this.map121 = { //The actual directly mapped values
                inq:           this.idr?.inquiryDetail,             // inquiry detail
                numCandidates: this.idr?.candidatesMatchedQuantity, // number of match candidates returned
                matchType:     this.idr?.matchDataCriteria,         // match algorithm used
            };

            if(this.idr.matchCandidates) {
                this.mcs = this.idr.matchCandidates
                    .sort((mc1, mc2) => mc1.displaySequence -  mc2.displaySequence)
                    .map(mc => {
                        const newObj = Object.create(dplMc);

                        newObj.mc = mc;
                        newObj.org = mc?.organization;
                        newObj.qlty = mc?.matchQualityInformation;

                        return newObj;
                    })
            }
            else {
                this.mcs = []
            }
        }
    }

    //Expose the application constants through the class interface
    get consts() { return appConsts }

    //It is possible to specify up to 5 request references. These references are passed back in the response
    custRefToArray(numCustRefs, bLabel) {
        const arrRet = new Array(numCustRefs);

        if(bLabel) { //Code for generating the array header
            for(let i = 0; i < numCustRefs; i++) {
                arrRet[i] = new ElemLabel('cust ref', numCustRefs > 1 ? i + 1 : null)
            }

            return arrRet;
        }

        //No references in the response, pass back the empty array
        if(!this.map121.inq?.customerReference || this.map121.inq.customerReference.length === 0) { return retArr }

        //Add the references to the return array
        for(let i = 0; i < numCustRefs; i++) {
            arrRet[i] = this.map121.inq.customerReference[i]
        }

        return arrRet;
    }

    //Echo the search criteria (i.e. inquiry details) specified
    inqToArray(arrInqComponents, bLabel) {
        const arrRet = new Array(arrInqComponents.length);

        if(bLabel) { //Code for generating the inquiry details header
            for(let i = 0; i < arrInqComponents.length; i++) {
                arrRet[i] = new ElemLabel(arrInqComponents[i].desc)
            }

            return arrRet;
        }

        //Add the inquiry details to the return array
        arrInqComponents.forEach((inqComponent, idxComponent) => {
            arrRet[idxComponent] = getObjAttrValue(this.map121.inq, inqComponent)
        });

        return arrRet;
    }

    addrToArray = addressToArray;
}

const dplMc = {
    get seqNum() { return this.mc.displaySequence },

    get duns() { return this.org?.duns },

    get name() { return this.org?.primaryName },

    get tradeStyle() { return this.org?.tradeStyleNames?.[0]?.name },

    get tel() { return this.org?.telephone?.[0]?.telephoneNumber },

    get regNum() { return this.org?.registrationNumbers?.[0]?.registrationNumber },

    get ceo() { return this.org?.mostSeniorPrincipals?.[0]?.fullName },

    get isStandalone() { return this.org?.isStandalone },

    get famTreeRole() { return this.org?.corporateLinkage?.familytreeRolesPlayed?.[0].description },

    get status() { return this.org?.dunsControlStatus?.operatingStatus?.description },

    get matchGrade() { return this.qlty?.matchGrade },

    get confCode() { return this.qlty?.confidenceCode },

    get mdp() { return this.qlty?.matchDataProfile },

    get nameScore() { return this.qlty?.nameMatchScore } 
}

export { DplIDR };
