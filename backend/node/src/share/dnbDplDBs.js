// *********************************************************************
//
// D&B Direct+ Data Blocks JavaScript object wrapper
// JavaScript code file: dnbDplDBs.js
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

import { 
    sDateIsoToYYYYMMDD,
    objEmpty,
    isNumber
} from "./utils.js";

import { regNumTypeIsVAT } from "./sharedRefTables.js";

import { constructElemLabel } from "./elemLabel.js";

//Application constants
const appConsts = {
    map121: { //label values 
        //inquiry detail
        inqDuns: 'inquiry DUNS',
        tradeUp: 'trade up',
        custRef: 'customer reference',

        //Common data-elements
        duns:        'DUNS',
        primaryName: 'name',
        countryISO:  'country ISO',

        //Company information data-elements
        opStatus:     'operating status',
        opStatusDate: 'operating status date',
        startDate:    'start date',
        SMB:          'entity size',
        defaultCurr:  'default currency',
    },
    blockIDs: { //Parts of the blockIDs attribute
        key: 0,
        level: 1,
        ver: 2
    },
    addr: { //Address parts
        type: {
            primary: {attr: 'primaryAddress', desc: 'Primary address'},
            registered: {attr: 'registeredAddress', desc: 'Registered address'},
            mailing: {attr: 'mailingAddress', desc: 'Mailing address'}
        },
        component: {
            //1-2-1 address object attribute mappings (max two levels deep!)
            //Structure (1) an array of attributes & (2) a component description 
            addrLine1: { attrs: [ 'streetAddress', 'line1'], desc: 'addr line 1' },
            addrLine2: { attrs: [ 'streetAddress', 'line2'], desc: 'addr line 2' },
            streetName: { attrs: ['streetName'], desc: 'street' },
            streetNumber: { attrs: [ 'streetNumber' ], desc: 'street nbr' },
            locality: { attrs: [ 'addressLocality', 'name' ], desc: 'city' },
            minorTownName: { attrs: [ 'minorTownName' ], desc: 'minor town name' },
            postalCode: { attrs: [ 'postalCode' ], desc: 'postalcode' },
            region: { attrs: [ 'addressRegion', 'name' ], desc: 'region' },
            regionAbbr: { attrs: [ 'addressRegion', 'abbreviatedName' ], desc: 'region abbr' },
            country: { attrs: [ 'addressCountry', 'name' ], desc: 'country' },
            countryISO: { attrs: [ 'addressCountry', 'isoAlpha2Code' ], desc: 'country ISO' },
            poBox: { attrs: [ 'postOfficeBox', 'postOfficeBoxNumber' ], desc: 'pobox' },
            latitude: { attrs: [ 'latitude' ], desc: 'latitude' },
            longitude: { attrs: [ 'longitude' ], desc: 'longitude' },
            isRegisteredAddress: { attrs: [ 'isRegisteredAddress' ], desc: 'registered addr' },
            isManufacturingLocation: { attrs: [ 'isManufacturingLocation' ], desc: 'mfg location' },
            
            //Custom, address component related, algorithms
            //Structure (1) algorithm ID & (2) custom component description 
            customLine1: { custom: 'line1', desc: 'addr line 1' }
        }
    },
    regNum: {
        component: {
            num: {attr: 'registrationNumber', desc: 'registration number'},
            type: {attr: 'typeDescription', desc: 'registration number type'},
            vat: {attr: 'vat', desc: 'is VAT'} //Custom attribute
        }
    },
    indCodes: {
        type: {
            dnbIndCode: {code: 3599, desc: 'D&B Industry Code', descShort: 'D&B'},
            naics: {code: 30832, desc: 'NAICS Code', descShort: 'NAICS'},
            sic87: {code: 399, desc: 'US 1987 SIC Code', descShort: 'SIC'},
            naceRev2: {code: 29104, desc: 'NACE Revision 2', descShort: 'NACE'},
            hooversIndCode: {code: 25838, desc: 'D&B Hoovers Industry Code', descShort: 'Hoovers'},
            majorIndCat: {code: 24657, desc: 'Major Industry Category', descShort: 'major'}
        },
        component: {
            code: {attr: 'code', desc: 'activity code'},
            desc: {attr: 'description', desc: 'act code description'}
        }
    },
    numEmpl: {
        scopeCodes: {
            individual: {code: 9066, prio: 1, desc: 'individual'},
            hq: {code: 9068, prio: 2, desc: 'HQ only'},
            consolidated: {code: 9067, prio: 3, desc: 'consolidated'}
        },
        component: {
            value: {attr: 'value', desc: 'number of employees'},
            scope: {attr: 'informationScopeDescription', desc: 'information scope (num empl)'},
            reliability: {attr: 'reliabilityDescription', desc: 'reliability (num empl)'}
        }
    },
    corpLinkage: {
        levels: [ //Linkage levels in Hierarchies & Connections level 1
            [{ attr: 'headQuarter', desc: 'HQ' }, {attr: 'parent', desc: 'parent' }],
            [{ attr: 'domesticUltimate', desc: 'dom ult' }],
            [{ attr: 'globalUltimate', desc: 'global ult' }]
        ],
        component: {
            duns: { attrs: [ 'duns' ], desc: 'DUNS' },
            primaryName: { attrs: [ 'primaryName' ], desc: 'name' },
            hq: { custom: 'hq', desc: 'HQ' },
        }        
    },
    b2bLinkLevels: {
        oneLevelUp: { idx: 0, desc: 'hq/parent' },
        hq: { idx: 0, idxAttr: 0, desc: 'HQ' },
        parent: { idx: 0, idxAttr: 1, desc: 'parent' },
        domUlt: { idx: 1, desc: 'dom ult' },
        gblUlt: { idx: 2, desc: 'global ult' },
    },
    reliability: {
        min: {code: 11078, desc: 'minimum value from range'},
        rounded: {code: 11147, desc: 'rounded'},
        derived: {code: 11176, desc: 'derived'},
        final: {code: 16970, desc: 'final'},
        projected: {code: 192, desc: 'projected'},
        average: {code: 25100, desc: 'average'},
        assigned: {code: 33392, desc: 'assigned'},
        actual: {code: 9092, desc: 'actual'},
        estimated: {code: 9093, desc: 'estimated'},
        modelled: {code: 9094, desc: 'modelled'}
    },
    infoScope: {
        group: {code: 13173, desc: 'group'},
        emplTotal: {code: 36429, desc: 'employees total'},
        emplHere: {code: 36430, desc: 'employees here'},
        individual: {code: 9066, desc: 'individual'},
        consolidated: {code: 9067, desc: 'consolidated'},
        hq: {code: 9068, desc: 'HQ only'}
    }
};

//D&B Direct+ Data Blocks JavaScript object wrapper
class DplDBs {
    constructor(inp) {
        //Parse the JSON passed in as a string
        if((typeof inp === 'string' || Buffer.isBuffer(inp)) && inp.length) {
            try {
                this.dplDBs = JSON.parse(inp)
            }
            catch(err) {
                console.error(err.message);
                throw(err);
            }

            //The parsed object should have an organization node
            if(!this.dplDBs.organization) {
                throw('Constructor parameter is valid JSON but not a collection of D&B Direct+ data blocks')
            }

            //Create a shortcut to the organization attribute
            this.org = this.dplDBs.organization;
        }

        //A D&B Direct+ collection of data blocks can be passed in, as an object, to the constructor as well
        if(typeof inp === 'object' && !Buffer.isBuffer(inp)) {
            //The object passed in to the constructor should have an organization node
            if(inp.organization) {
                throw('The constructor parameter is an object but not a collection of D&B Direct+ data blocks')
            }

            //Store a reference to the object passed in to the constructor
            this.dplDBs = inp;

            //Create a shortcut to the organization attribute
            this.org = inp.organization;
        }

        if(this.org) {
            //One-to-one mappings
            this.map121 = { //The actual directly mapped values
                // inquiry detail
                inqDuns: this.dplDBs?.inquiryDetail?.duns,
                tradeUp: this.dplDBs?.inquiryDetail?.tradeUp,
                custRef: this.dplDBs?.inquiryDetail?.customerReference,

                // Common data-elements
                duns:        this.org?.duns,
                primaryName: this.org?.primaryName,
                countryISO:  this.org?.countryISOAlpha2Code,

                // Company information data-elements
                opStatus:     this.org?.dunsControlStatus?.operatingStatus?.description,
                opStatusDate: this.org?.dunsControlStatus?.operatingStatus?.startDate,
                startDate:    this.org?.startDate,
                SMB:          this.org?.organizationSizeCategory?.description,
                defaultCurr:  this.org?.defaultCurrency,
            };

            //Add, where applicable, the vat attribute 
            if(this.org?.registrationNumbers) {
                this.org.registrationNumbers.forEach(regNum => {
                    if(regNum.typeDnBCode && regNumTypeIsVAT.has(regNum.typeDnBCode)) {
                        regNum.vat = true
                    }
                })
            }
        }
    }

    //Expose the application constants through the class interface
    get consts() { return appConsts }

    //Method blockIDs combines Data Block property inquiryDetail.blockIDs
    //All data block responses contain a inquiryDetail.blockIDs & blockStatus array
    //
    //JSON example: "blockIDs": [
    //        "companyinfo_L1_v1",
    //        "principalscontacts_L2_v2"
    //    ],
    //
    //... and D+ Data Block property "blockStatus": [
    //    {
    //        "blockID": "companyinfo_L1_v1",
    //        "status": "ok",
    //        "reason": null
    //    },{
    //        "blockID": "principalscontacts_L2_v2",
    //        "status": "ok",
    //        "reason": null
    //    },{
    //        "blockID": "baseinfo_L1_v1",
    //        "status": "ok",
    //        "reason": null
    //    }]
    //
    //... into
    //  {
    //    companyinfo: {
    //      req: { level: 1, version: 1 },
    //      resp: { level: 1, version: 1, status: 'ok', reason: null }
    //    },
    //    principalscontacts: {
    //      req: { level: 2, version: 2 },
    //      resp: { level: 2, version: 2, status: 'ok', reason: null }
    //    },
    //    baseinfo: { resp: { level: 1, version: 1, status: 'ok', reason: null } }
    //  }
    get blockIDs() {
        const ret = this.dplDBs?.inquiryDetail.blockIDs.reduce((obj, blockID) => {
            const arrBlockID = blockID.split('_');

            obj[arrBlockID[appConsts.blockIDs.key]] = {
                req: {
                    level: parseInt(arrBlockID[appConsts.blockIDs.level].slice(1 - arrBlockID[appConsts.blockIDs.level].length)),
                    version: parseInt(arrBlockID[appConsts.blockIDs.ver].slice(1 - arrBlockID[appConsts.blockIDs.ver].length))
                }
            };

            return obj;
        }, {});

        this.dplDBs?.blockStatus.forEach(aBlockStatus => {
            const arrBlockID = aBlockStatus.blockID.split('_');

            if( !ret[arrBlockID[appConsts.blockIDs.key]] ) { ret[arrBlockID[appConsts.blockIDs.key]] = {} }

            ret[arrBlockID[appConsts.blockIDs.key]].resp = {
                level: parseInt(arrBlockID[appConsts.blockIDs.level].slice(1 - arrBlockID[appConsts.blockIDs.level].length)),
                version: parseInt(arrBlockID[appConsts.blockIDs.ver].slice(1 - arrBlockID[appConsts.blockIDs.ver].length)),
                status: aBlockStatus.status,
                reason: aBlockStatus.reason
            };
        });

        return ret;
    }

    //Method transactionTimestamp will get the transaction timestamp in the format YYYYMMDD
    //All data block responses contain a transactionDetail object
    transactionTimestamp(length) {
        const tts = this.dplDBs?.transactionDetail?.transactionTimestamp;

        if(tts) { return sDateIsoToYYYYMMDD(tts, length) }

        return '';
    }

    //Method addrToArray will convert D&B Direct+ address objects (primary, registered, ...)
    //to an array of a specified length (= arrAddrComponents.length).
    //This method is applicable to data blocks Company Information L1+ and Hierarchies & 
    //Connections L1
    //
    //Three parameters
    //1. A reference to a Direct+ address object
    //2. An array of address object attributes or the outcome of a custom algorithm can be 
    //   returned (options: oDpl.consts.addr.component)
    //3. Specify boolean value true for the element labels to be returned
    addrToArray(addr, arrAddrComponents, bLabel) {
        //Return the address attribute value for a specific address object attribute or
        //invoke a custom, address related, algorithm
        function getAttrValue(oAddr, addrComponent) {
            if(typeof oAddr !== 'object' || objEmpty(oAddr)) {
                return null
            }

            //Custom address component algorithms
            if(addrComponent.custom === 'line1') { //Custom algorithm named line1
                //This algorithm goes the extra mile to insure data for line 1
                if(oAddr?.streetAddress?.line1) { return oAddr.streetAddress.line1 }

                let ret;

                if(oAddr?.streetName) { ret = addr.streetName }

                if(oAddr?.streetNumber) {
                    if(ret) {
                        ret += ' ' + oAddr.streetNumber
                    }
                    else {
                        ret = oAddr.streetNumber
                    }
                }

                if(ret) { return ret }

                if(oAddr?.postOfficeBox && oAddr?.postOfficeBox?.postOfficeBoxNumber) {
                    if(oAddr?.postOfficeBox?.typeDescription) {
                        return `Pobox ${oAddr.postOfficeBox.postOfficeBoxNumber}`
                    }
                    else {
                        return oAddr.postOfficeBox.postOfficeBoxNumber
                    }
                }

                return null;
            }

            //From here on out straight-up address object attribute values are returned.
            //These values are mapped 1-2-1 but, at most, two levels deep.
            if(addrComponent.attrs.length === 1) {
                return oAddr?.[addrComponent.attrs[0]]
            }
            else if(addrComponent.attrs.length === 2) {
                return oAddr?.[addrComponent.attrs[0]]?.[addrComponent.attrs[1]]
            }
            else {
                console.error('Address object attributes should be defined as one or two levels deep');
                return null;
            }
        }

        //Use map to return a new array of labels or attribute values
        return arrAddrComponents.map(addrComponent => bLabel 
            ? constructElemLabel(null, addrComponent.desc)
            : getAttrValue(addr, addrComponent)
        )
    }

    //Method regNumsToArray will convert D&B Direct+ registration number objects (organization.registrationNumbers)
    //to an array of a specified length (= numRegNums * arrRegNumComponents.length).
    //This method is applicable on data block collections which contain Company Information L2+
    //
    //Three parameters
    //1. Specify the number of registration numbers to be returned
    //2. Multiple attributes from the D+ object can be returned, options: oDpl.consts.regNum.component
    //3. Specify the element labels associated with the values returned
    regNumsToArray(numRegNums, arrRegNumComponents, bLabel) {
        //Create an empty return array
        let retArr = new Array(numRegNums * arrRegNumComponents.length);

        //If header requsted, return the component descriptions
        if(bLabel) {
            for(let i = 0; i < numRegNums; i++) {
                arrRegNumComponents.forEach((regNumComponent, idx) => {
                    retArr[i * arrRegNumComponents.length + idx] = constructElemLabel(null, regNumComponent.desc, numRegNums > 1 ? i + 1 : null)
                })
            }

            return retArr;
        }

        //No content available
        if(!this.org.registrationNumbers || !this.org.registrationNumbers.length) { return retArr }

        //Prioritize the preferred registration number and VAT number
        retArr = this.org.registrationNumbers
            .sort((regNum1, regNum2) => regNum1.vat && !regNum2.vat ? -1 : 0)
            .sort((regNum1, regNum2) => regNum1.isPreferredRegistrationNumber && !regNum2.isPreferredRegistrationNumber ? -1 : 0)
            .slice(0, numRegNums)
            .reduce((arr, regNum) => arr.concat(arrRegNumComponents.map(component => regNum[component.attr])), []);

        //Fill out to the requested number of columns
        if(numRegNums * arrRegNumComponents.length - retArr.length > 0) {
            retArr = retArr.concat(new Array((numRegNums * arrRegNumComponents.length - retArr.length)));
        }
        
        return retArr;
    }

    //Method indCodesToArray will convert D&B Direct+ industry code objects (organization.industryCodes)
    //to an array of a specified length (= numIndCodes * arrIndCodeComponents.length)
    //This method is applicable on data block collections which contain Company Information L2+
    //
    //Four parameters
    //1. Only one type of activity code (SIC, NACE, ...) will be returned,
    //   options: oDpl.consts.indCodes.type
    //2. Specify the number of activity codes to be returned
    //3. Multiple attributes from the D+ object can be returned, options: oDpl.consts.indCodes.component
    //4. Specify the element labels associated with the values returned
    indCodesToArray(indTypeCode, numIndCodes, arrIndCodeComponents, label) {
        let retArr = new Array(numIndCodes * arrIndCodeComponents.length);

        //Create the labels associated with the different parts of the array (if applicable)
        if(label) {
            for(let i = 0; i < numIndCodes; i++) {
                arrIndCodeComponents.forEach((component, idx) => {
                    retArr[i * arrIndCodeComponents.length + idx] = constructElemLabel(label, component.desc, numIndCodes > 1 ? i + 1 : null)
                })
            }

            return retArr;
        }

        //Return an array of empty values if no industry codes available
        if(!this.org.industryCodes || !this.org.industryCodes.length) { return retArr }

        //The actual transformation, (1) filter the spcified type, (2) sort in order of
        //priority, (3) selct the number of act codes specified and (4) flatten out the
        //objects just containing the attributes specified
        retArr = this.org.industryCodes
            .filter(indCode => indCode.typeDnBCode === indTypeCode.code)
            .sort((indCode1, indCode2) => indCode1.priority - indCode2.priority)
            .slice(0, numIndCodes)
            .reduce((arr, indCode) => arr.concat(arrIndCodeComponents.map(component => indCode[component.attr])), []);

        //Add, if needed, some empty elements to the return array
        if(numIndCodes * arrIndCodeComponents.length - retArr.length > 0) {
            retArr = retArr.concat(new Array((numIndCodes * arrIndCodeComponents.length - retArr.length)));
        }

        return retArr;
    }

    //Method numEmplsToArray will convert D&B D+ employee count objects (organization.numberOfEmployees)
    //to an array of a specified length (= numNumEmpl * arrNumEmplComponents.length). The order of the
    //employee counts included in the array will be influenced by the order of array arrNumEmplScope and
    //arrReliabilityPrio
    //This method is applicable on data block collections which contain Company Information L2+
    //
    //Four parameters
    //1. Only number of employee counts of a predefined set of information scopes (hq, consolidated, ...)
    //   will be returned, options: oDpl.consts.numEmpl.scopeCodes. This array will influence the ordering
    //   of the return values as well
    //2. Specify the number of employee counts to be returned
    //3. Multiple attributes from the D+ object can be returned, options: oDpl.consts.numEmpl.component
    //4. Specify the element labels associated with the values returned
    numEmplsToArray(arrNumEmplScope, numNumEmpl, arrNumEmplComponents, label) {
        //Comparison function used for sorting based on infoScope
        function doCompareInfoScope(elem1, elem2) {
            //Leave or move non-numerical values at/to the end
            if(!isNumber(elem2.infoScopePrio)) { return 0 }
            if(!isNumber(elem1.infoScopePrio)) { return 1 }

            //Sort higher prio (is smaller number) before lower prio (higher number)
            return elem1.infoScopePrio - elem2.infoScopePrio;
        }

        //Comparison function used for sorting based on reliability
        function doCompareReliability(elem1, elem2) {
            //Leave or move non-numerical values at/to the end
            if(!isNumber(elem2.reliabilityPrio)) { return 0 }
            if(!isNumber(elem1.reliabilityPrio)) { return 1 }

            //Sort higher prio (is smaller number) before lower prio (higher number)
            return elem1.reliabilityPrio - elem2.reliabilityPrio;
        }

        let retArr = new Array(numNumEmpl * arrNumEmplComponents.length);

        //Create the labels associated with the different parts of the array (if applicable)
        if(label) {
            for(let i = 0; i < numNumEmpl; i++) {
                arrNumEmplComponents.forEach((component, idx) => {
                    retArr[i * arrNumEmplComponents.length + idx] = constructElemLabel(label, component.desc, numNumEmpl > 1 ? i + 1 : null )
                })
            }

            return retArr;
        }

        //Return an array of empty values if no employee counts are available
        if(!this.org.numberOfEmployees || !this.org.numberOfEmployees.length) { return retArr }

        //Configure the reliability priorities 
        const arrReliabilityPrio = [
            { ...appConsts.reliability.actual, prio: 1 },
            { ...appConsts.reliability.modelled, prio: 2 },
            { ...appConsts.reliability.estimated, prio: 3 }
        ];

        //First filter the objects in the information scopes specified
        retArr = this.org.numberOfEmployees
            //Only return the number of employee objects with the info scopes as specified in arrNumEmplScope
            .filter(numEmpl => arrNumEmplScope.includes(numEmpl.informationScopeDnBCode))
            
            //Add priority attribute based on parameter arrNumEmplScope and arrReliabilityPrio
            .map(numEmpl => {
                //The information scope precedence is determined by parameter arrNumEmplScope
                const idxNumEmplScope = arrNumEmplScope.findIndex(elem => elem === numEmpl.informationScopeDnBCode);

                if(idxNumEmplScope > -1) { numEmpl.infoScopePrio = idxNumEmplScope + 1}

                //The reliability precedence is determined by arrReliabilityPrio
                numEmpl.reliabilityPrio = arrReliabilityPrio.find(elem => elem.code === numEmpl.reliabilityDnBCode)?.prio;

                return numEmpl;
            })
            .sort(doCompareInfoScope)   //1st sort on information scope as specified in parameter arrNumEmplScope
            .sort(doCompareReliability) //Next sort on reliability. If available, the 1st entry of arrReliabilityPrio will bubble up
            .slice(0, numNumEmpl)       //Cut the entries which are not needed

            //Convert to an array
            .reduce((arr, numEmpl) => arr.concat(arrNumEmplComponents.map(component => numEmpl[component.attr])), []);

        //Fill out to the requested number of columns
        if(numNumEmpl * arrNumEmplComponents.length - retArr.length > 0) {
            retArr = retArr.concat(new Array((numNumEmpl * arrNumEmplComponents.length - retArr.length)));
        }
    
        return retArr;
    }

    //Method latestFinsToArray returns latest financial figures in array format
    //Best results with Company Financials L1+, fall back implemented to Company Information L2+
    latestFinsToArray(bLabel) {
        const sales_rev      = 0;
        const total_assets   = 1;
        const currency       = 2;
        const units          = 3;
        const reliability    = 4;
        const info_scope     = 5;
        const stmt_from_date = 6;
        const stmt_to_date   = 7;

        let retArr = new Array(stmt_to_date + 1);

        if(bLabel) {
            retArr[sales_rev] = constructElemLabel(null, 'sales rev');
            retArr[total_assets] = constructElemLabel(null, 'total assets');
            retArr[currency] = constructElemLabel(null, 'currency');
            retArr[units] = constructElemLabel(null, 'units');
            retArr[reliability] = constructElemLabel(null, 'reliability (financials)');
            retArr[info_scope] = constructElemLabel(null, 'info scope (financials)');
            retArr[stmt_from_date] = constructElemLabel(null, 'stmt from date');
            retArr[stmt_to_date] = constructElemLabel(null, 'stmt to date');

            return retArr;
        }

        //Financial data from Company Financials L1+
        const latestFins = this.org?.latestFinancials;

        if(!objEmpty(latestFins)) {
            retArr[sales_rev]      = latestFins?.overview?.salesRevenue;
            retArr[total_assets]   = latestFins?.overview?.totalAssets;
            retArr[currency]       = latestFins?.currency;
            retArr[units]          = latestFins?.units;
            retArr[reliability]    = latestFins?.reliability?.description;
            retArr[info_scope]     = latestFins?.informationScope?.description;
            retArr[stmt_from_date] = latestFins?.financialStatementFromDate;
            retArr[stmt_to_date]   = latestFins?.financialStatementToDate;
    
            if(retArr[currency]) { return retArr }
        }

        //No currency available, revert to modelled/estimated values from Company Information L2+
        let ciFinancials = this.org?.financials || [];

        if(ciFinancials.length === 0) { return retArr } //No luck in CI L2+ either :-(

        //Assign priority to the modelled/estimated values
        const arrReliabilityPrio = [ 
            { ...appConsts.reliability.modelled, prio: 1 },
            { ...appConsts.reliability.estimated, prio: 2 }
        ];

        //Prefer recent statement dates and stick to the reliability priorities
        ciFinancials = ciFinancials
            .map(fin => {
                fin.reliabilityPrio = arrReliabilityPrio.find(elem => elem.code === fin.reliabilityDnBCode)?.prio;

                return fin;
            })
            .sort((fin1, fin2) => {
                function getFinStatementDateYear(finStatementDate) {
                    if(!finStatementDate) { return 0 }

                    const year = parseInt(finStatementDate.slice(0, 4));

                    if(isNaN(year)) { return 0 }

                    return year;             
                }

                //Bubble the high years to the top of the array
                const year1 = getFinStatementDateYear(fin1.financialStatementToDate);
                const year2 = getFinStatementDateYear(fin2.financialStatementToDate);

                if(year1 && !year2) { return -1 }

                if(!year1 && year2) { return 1 }

                if(year1 && year2) {
                    if(year1 - year2 !== 0) { return year2 - year1 }
                }

                //Both years not a number or equal then prefer modelled
                if(!fin1.reliabilityPrio && fin2.reliabilityPrio) { return 1 }

                if(fin1.reliabilityPrio && !fin2.reliabilityPrio) { return -1 }

                if(fin1.reliabilityPrio && fin2.reliabilityPrio) {
                    if(fin1.reliabilityPrio - fin2.reliabilityPrio !== 0) {
                        return fin1.reliabilityPrio - fin2.reliabilityPrio
                    }
                }

                return 0;
            })

        let arrYearlyRev = ciFinancials[0]?.yearlyRevenue || [], yearlyRev = null;

        if(arrYearlyRev.length === 1) {
            yearlyRev = arrYearlyRev[0];
        }
        else if(arrYearlyRev.length > 1) {
            arrYearlyRev = arrYearlyRev.filter(rev => rev.currency !== 'USD'); //Preference for local currency

            if(arrYearlyRev.length) { yearlyRev = arrYearlyRev[0] }
        }

        retArr[sales_rev]      = yearlyRev && yearlyRev.value;
        retArr[total_assets]   = null;
        retArr[currency]       = yearlyRev && yearlyRev.currency;
        retArr[units]          = ciFinancials[0]?.unitCode;
        retArr[reliability]    = ciFinancials[0]?.reliabilityDescription;
        retArr[info_scope]     = ciFinancials[0]?.informationScopeDescription;
        retArr[stmt_from_date] = null;
        retArr[stmt_to_date]   = ciFinancials[0]?.financialStatementToDate;

        return retArr;
    }

    //Method isGlobalUlt will return true if the duns requested is the global ultimate duns, false 
    //if it is not the global ultimate and null if no linkage information is available
    //This method is applicable on data block collections which contain Hierachies & Connections L1
    get isGlobalUlt() {
        if(objEmpty(this.org?.corporateLinkage)) { return null }

        if(this.org.corporateLinkage.familytreeRolesPlayed.find(role => role.dnbCode === 12775)) {
            //functional equivalents to role.dnbCode === 12775 are
            console.assert(this.map121.duns === this.org.corporateLinkage.globalUltimate.duns,
                '🤔 global ult, inquiryDetail.duns should equal globalUltimate.duns');

            console.assert(this.org.corporateLinkage.hierarchyLevel === 1,
                '🤔 global ult, corporateLinkage.hierarchyLevel should equal 1');

            return true;
        }

        return false;
    }

    //Method corpLinkageLevels will give access to the three levels of linkage available
    //in Hierarchies & Connections level 1
    //➡️ There are only three levels because only an HQ or a parent will be available ⬅️
    getB2bLinkLevels(bForceParentOnGblUlt) {
        //Does the collection of data blocks contain linkage info?
        let corpLinkage = this.org?.corporateLinkage;

        //If so, and attribute b2bLinkLevels exists, just return the existing attribute
        if(corpLinkage) {
            if(corpLinkage.b2bLinkLevels) { return corpLinkage.b2bLinkLevels }
        }
        else { //Make sure this.org.corporateLinkage refers to an empty object
            corpLinkage = {}
        }

        //Default value of attribute b2bLinkLevels
        const b2bLinkLevels = [ null, null, null ]; 

        //In case no linkage is available set and return the default b2bLinkLevels  
        if(objEmpty(corpLinkage)) {
            corpLinkage.b2bLinkLevels = b2bLinkLevels;

            return b2bLinkLevels;
        }

        //Set the references to the appropriate linkage levels
        appConsts.corpLinkage.levels.forEach((level, idx) => {
            level.forEach(oAttr => {
                if(!objEmpty(corpLinkage[oAttr.attr])) {
                    //Persist the D+ attribute name in the object
                    corpLinkage[oAttr.attr].dplAttr = oAttr.attr;

                    //Assign a linkage level description
                    corpLinkage[oAttr.attr].desc = oAttr.desc;

                    //Store an object reference
                    b2bLinkLevels[idx] = corpLinkage[oAttr.attr];
                }
            })
        });

        //If bForceParentOnGblUlt evaluates to true set the oneLevel up attribute to the domestic
        //ultimate in case the DUNS is a global ultimate (this is non-standard behaviour)
        if(bForceParentOnGblUlt && this.isGlobalUlt &&
                !b2bLinkLevels[appConsts.b2bLinkLevels.oneLevelUp.idx] &&
                b2bLinkLevels[appConsts.b2bLinkLevels.domUlt.idx] 
        ) {
            const constB2bLLs = appConsts.b2bLinkLevels;
            
            //Copy the domestic ultimate reference to one level up in b2bLinkLevels
            b2bLinkLevels[constB2bLLs.oneLevelUp.idx] = 
                Object.create(b2bLinkLevels[constB2bLLs.domUlt.idx]);

            //Create one level up overwrites for attributes dplAttr & desc
            b2bLinkLevels[constB2bLLs.oneLevelUp.idx].dplAttr = 
                appConsts.corpLinkage.levels[constB2bLLs.parent.idx][constB2bLLs.parent.idxAttr].attr;

            b2bLinkLevels[constB2bLLs.oneLevelUp.idx].desc = 
                appConsts.corpLinkage.levels[constB2bLLs.parent.idx][constB2bLLs.parent.idxAttr].desc;
        }

        return b2bLinkLevels;
    }

    corpLinkageLevelsToArray(arrLinkLevels, arrLinkLevelComponents, arrLinkLevelAddrComponents, bLabel) {
        let b2bLinkLevels = this?.org?.corporateLinkage?.b2bLinkLevels;

        if(!b2bLinkLevels) { b2bLinkLevels = this.getB2bLinkLevels() }

        if(!bLabel && b2bLinkLevels.reduce((bEmpty, level) => bEmpty ? bEmpty : !level , false)) {
            return new Array(arrLinkLevels.length * (arrLinkLevelComponents.length + arrLinkLevelAddrComponents.length))
        }

        let ret = [];

        //Return the non-address attributes
        arrLinkLevels.forEach(linkLevel => {
            const lLvl = b2bLinkLevels[linkLevel.idx];

            if(arrLinkLevelComponents && arrLinkLevelComponents.length) {
                ret = ret.concat(arrLinkLevelComponents.map(linkLevelComponent => bLabel
                    ? constructElemLabel(null, linkLevelComponent.desc)
                    : linkLevelComponent.custom === 'hq'
                        ? (lLvl?.dplAttr === 'headQuarter' ? 'HQ' : null)
                        : lLvl?.[linkLevelComponent.attrs[0]]
                ))
            };

            //Add, if applicable, the address related attributes
            if(arrLinkLevelAddrComponents && arrLinkLevelAddrComponents.length) {
                ret = ret.concat(this.addrToArray(
                    bLabel ? null : lLvl.primaryAddress,
                    arrLinkLevelAddrComponents,
                    bLabel
                ))
            }
        });

        return ret;
    }
}

export { DplDBs };
