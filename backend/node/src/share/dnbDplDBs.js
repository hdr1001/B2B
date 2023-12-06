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
} from './utils.js';

import { getObjAttrValue, addr, addressToArray } from './dnbDplCommon.js';

import { ElemLabel, constructElemLabel } from './elemLabel.js';

import { regNumTypeIsVAT } from './sharedRefTables.js';

//Application constants
const appConsts = {
    map121: { //label values 
        //inquiry detail
        inqDuns: 'inq DUNS',
        tradeUp: 'trade up',
        custRef: 'cust ref',

        //Common data-elements
        duns:        'DUNS',
        primaryName: 'bus nme',
        countryISO:  'country ISO',

        //Company information data-elements
        opStatus:     'operating status',
        opStatusDate: 'operating status date',
        startDate:    'start date',
        SMB:          'entity size',
        defaultCurr:  'default currency',
        marketable:   'marketable'
    },
    blockIDs: { //Parts of the blockIDs attribute
        key: 0,
        level: 1,
        ver: 2
    },
    addr: addr, //Address related constants
    regNum: {
        component: {
            num: {attr: 'registrationNumber', desc: 'value'},
            type: {attr: 'typeDescription', desc: 'type'},
            vat: {attr: 'vat', desc: 'is VAT'} //Custom attribute
        }
    },
    tel: {
        component: {
            num: {attr: 'telephoneNumber', desc: 'number'},
            intAccess: {attr: 'isdCode', desc: 'int access cd'},

            customIntAccess: { custom: 'intAccess', desc: 'int access cd'}
        }
    },
    indCode: {
        type: {
            dnbIndCode: {code: 3599, desc: 'D&B Industry Code', descShort: 'D&B'},
            naics: {code: 30832, desc: 'NAICS Code', descShort: 'NAICS'},
            sic87: {code: 399, desc: 'US 1987 SIC Code', descShort: 'SIC87'},
            naceRev2: {code: 29104, desc: 'NACE Revision 2', descShort: 'NACE'},
            hooversIndCode: {code: 25838, desc: 'D&B Hoovers Industry Code', descShort: 'Hoovers'},
            majorIndCat: {code: 24657, desc: 'Major Industry Category', descShort: 'major'}
        },
        component: {
            code: {attr: 'code', desc: 'act cd'},
            desc: {attr: 'description', desc: 'act cd desc'}
        }
    },
    numEmpl: {
        scopeCodes: {
            individual: {code: 9066, prio: 1, desc: 'individual'},
            hq: {code: 9068, prio: 2, desc: 'HQ only'},
            consolidated: {code: 9067, prio: 3, desc: 'consolidated'}
        },
        component: {
            value: {attr: 'value', desc: 'count'},
            date: {attr: 'employeeFiguresDate', desc: 'date reported'},
            scope: {attr: 'informationScopeDescription', desc: 'info scope'},
            reliability: {attr: 'reliabilityDescription', desc: 'reliability'}
        }
    },
    principal: {
        component: {
            givenName: { attrs: [ 'givenName' ], desc: 'given name'},
            middleName: { attrs: [ 'middleName' ], desc: 'middle name'},
            familyName: { attrs: [ 'familyName' ], desc: 'fam name'},
            fullName: { attrs: [ 'fullName' ], desc: 'full name'},
            namePrefix: { attrs: [ 'namePrefix' ], desc: 'name prefix'},
            nameSuffix: { attrs: [ 'nameSuffix' ], desc: 'name suffix'},
            type: { attrs: [ 'subjectType' ], desc: 'type'},
            nationality: { attrs: [ 'nationality', 'isoAlpha2Code' ], desc: 'nationality'},
            gender: {attrs: [ 'gender', 'description' ], desc: 'gender'},
            assnStartDate: { attrs: [ 'associationStartDate' ], desc: 'assn start date'},
            birthDate: { attrs: [ 'birthDate' ], desc: 'birthdate'},
            respAreas: { attrs: [ 'responsibleAreas', 'description' ], desc: 'resp area'},
            signingAuth: { attrs: [ 'isSigningAuthority' ], desc: 'signing auth'},
            bankruptcyHistory: { attrs: [ 'hasBankruptcyHistory' ], desc: 'has bankruptcy'},
            dsqDirector: { attrs: [ 'isDisqualifiedDirector' ], desc: 'disqualified'},

            //Custom, principal related, algorithms & attributes
            //Structure (1) algorithm ID & (2) custom component description 
            customMostSenior: { custom: 'isMostSenior', desc: 'most senior' },
            customTel0: { custom: 'tel0', desc: 'telephone' },
            customPosition0: { custom: 'position0', desc: 'position' },
            customJobTitle0: { custom: 'jobTitle0', desc: 'job title' },
            customMgmtResponsibility0: { custom: 'mgmtResponsibility0', desc: 'mgmt responsibility' },
            customRegNumDuns: { custom: 'regNumDuns', desc: 'DUNS' }
        }
    },
    fin: {
        //The latest constant primarily sources data from the latestFinancials attribute from
        //Company Financials L1+. In case no actuals are available method latestFinsToArray will
        //revert to figures captured in attribute financials available in Company Information L2+.
        //Attribute latestYearlyRevIdx provides a mapping to the latestYearlyRev components.
        latest: [
            { attrs: [ 'overview', 'salesRevenue' ], desc: 'sales rev', latestYearlyRevIdx: 0 },
            { attrs: [ 'overview', 'totalAssets' ], desc: 'total assets' },
            { attrs: [ 'currency' ], desc: 'currency', latestYearlyRevIdx: 1 },
            { attrs: [ 'units' ], desc: 'units', latestYearlyRevIdx: 3 },
            { attrs: [ 'reliability', 'description' ], desc: 'reliability (financials)', latestYearlyRevIdx: 4 },
            { attrs: [ 'informationScope', 'description' ], desc: 'info scope (financials)', latestYearlyRevIdx: 5 },
            { attrs: [ 'financialStatementFromDate' ], desc: 'stmt from date' },
            { attrs: [ 'financialStatementToDate' ], desc: 'stmt to date', latestYearlyRevIdx: 6 }
        ],
        //The latestYearlyRev constant retrieves yearly revenue figures from the financials
        //array. In the algorithm reliability priorities and an ordering on most recent 
        //statement dates is used to get to the most relevant data. The components of the 
        //array returned are then sourced from three distinct objects (1) the first element 
        //of the sorted financials array, (2) the revenue object with the revenue figure in
        //the default currrency and (3) the revenue object containing the USD figure.
        latestYearlyRev: {
            objs: [ 'fins0', 'yearlyRevLocal', 'yearlyRevUSD' ],
            components: [
                { obj: 'yearlyRevLocal', attr: 'value', desc: 'amt' },
                { obj: 'yearlyRevLocal', attr: 'currency', desc: 'curr cd' },
                { obj: 'yearlyRevUSD', attr: 'value', desc: 'USD' },
                { obj: 'fins0', attr: 'unitCode', desc: 'units' },
                { obj: 'fins0', attr: 'reliabilityDescription', desc: 'reliability' },
                { obj: 'fins0', attr: 'informationScopeDescription', desc: 'info scope' },
                { obj: 'fins0', attr: 'financialStatementToDate', desc: 'stmt to date' }
            ]
        }
    },
    corpLinkage: {
        famTreeRoles: [
            { key: 'gblUlt', code: 12775, desc: 'global ultimate' },
            { key: 'domUlt', code: 12774, desc: 'domestic ultimate' },
            { key: 'parent', code: 12773, desc: 'parent' },
            { key: 'parentHQ', code: 9141, desc: 'parent/HQ' },
            { key: 'subsidiary', code: 9159, desc: 'subsidiary' },
            { key: 'HQ', code: 12771, desc: 'headquarters' },
            { key: 'branch', code: 12769, desc: 'branch' },
            { key: 'branchDiv', code: 9140, desc: 'branch/division' },
            { key: 'division', code: 12770, desc: 'division' },
            { key: 'singleLoc', code: 9142, desc: 'single location' },
        ],
        levels: [ //Linkage levels in Hierarchies & Connections level 1
            [{ attr: 'headQuarter', desc: 'HQ' }, {attr: 'parent', desc: 'parent' }],
            [{ attr: 'domesticUltimate', desc: 'domestic ult' }],
            [{ attr: 'globalUltimate', desc: 'global ult' }]
        ],
        component: {
            duns: { attr: 'duns', desc: 'DUNS' },
            primaryName: { attr: 'primaryName', desc: 'nme' },
            hq: { custom: 'hq', desc: 'HQ' },
        }        
    },
    b2bLinkLevel: {
        oneLevelUp: { idx: 0, desc: 'hq prnt' },
        hq: { idx: 0, idxAttr: 0, desc: 'HQ' },
        parent: { idx: 0, idxAttr: 1, desc: 'parent' },
        domUlt: { idx: 1, desc: 'dom ult' },
        gblUlt: { idx: 2, desc: 'gbl ult' },
    },
    reliability: { 
        code: {
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
        }
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

//By default prefer actual over modelled and modelled over estimated
const defaultReliabilityPrios = [
    { ...appConsts.reliability.code.actual, prio: 1 },
    { ...appConsts.reliability.code.modelled, prio: 2 },
    { ...appConsts.reliability.code.estimated, prio: 3 }
];

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
                throw new Error('Constructor parameter is valid JSON but not a collection of D&B Direct+ data blocks')
            }

            //Create a shortcut to the organization attribute
            this.org = this.dplDBs.organization;
        }

        //A D&B Direct+ collection of data blocks can be passed in, as an object, to the constructor as well
        if(typeof inp === 'object' && !Buffer.isBuffer(inp)) {
            //The object passed in to the constructor should have an organization node
            if(!inp.organization) {
                throw new Error('The constructor parameter is an object but not a collection of D&B Direct+ data blocks')
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
                marketable:   this.org?.dunsControlStatus?.isMarketable
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

    //Method tradeStylesToArray returns an array containing tradestyle names of a predefined
    //length (numTradeStyles). tradeStyleNames objects are simple, they contain one component,
    //name, and are sorted by priority. Tradestyles are available in data block Company Info 
    //L1+.
    //
    //Two parameters
    //1. numTradeStyles, specify the number of tradestyles to return
    //2. bLabel, specify true for the element labels to be returned
    tradeStylesToArray(numTradeStyles, bLabel) {
        const arrRet = new Array(numTradeStyles);

        if(bLabel) {
            return arrRet.fill().map((elem, idx) => new ElemLabel('trdg style', numTradeStyles > 1 ? idx + 1 : null))
        }

        const arrTradeStyles = this.org.tradeStyleNames || [];

        arrTradeStyles.sort((ts1, ts2) => ts1.priority - ts2.priority);

        for(let idx = 0; idx < numTradeStyles && idx < arrTradeStyles.length; idx++) {
            arrRet[idx] = arrTradeStyles[idx].name
        }

        return arrRet;
    }

    //Method telsToArray returns an array containing telephone numbers of a predefined length
    //(numTels * arrTelComponents.length). The components of telephone objects are defined in
    //appConsts.tel.component. One custom component is available which adds a "+" to the int.
    //country dial-In code. Most prominent data block containing an array of telephone numbers
    //is Company Information L1+. 
    //
    //Three parameters
    //1. numTels, specify the number of telephone numbers to return
    //2. arrTelComponents, array of telephone number components (see appConsts.tel.component)
    //3. bLabel, specify true for the element labels to be returned
    telsToArray(numTels, arrTelComponents, bLabel) {
        function getAttrValue(oTel, telComponent) {
            if(typeof oTel !== 'object' || objEmpty(oTel)) { return null }

            if(telComponent.custom === 'intAccess') { //Custom algorithm named intAccess
                return oTel[appConsts.tel.component.intAccess.attr] ? '+' + oTel[appConsts.tel.component.intAccess.attr] : null
            }

            return oTel[telComponent.attr];
        }

        const arrRet = new Array(numTels * arrTelComponents.length);

        const arrTels = bLabel ? null : this.org.telephone;

        if(bLabel || (arrTels && arrTels.length)) {
            for(let idxObj = 0; idxObj < numTels; idxObj++) {
                arrTelComponents.forEach((telComponent, idxComponent) => {
                    if(bLabel) {
                        arrRet[idxObj * arrTelComponents.length + idxComponent] = new ElemLabel(telComponent.desc, numTels > 1 ? idxObj + 1 : null, 'tel')
                    }
                    else {
                        arrRet[idxObj * arrTelComponents.length + idxComponent] = getAttrValue(arrTels[idxObj], telComponent)
                    }
                }
            )}
        }

        return arrRet;
    }

    //Getter to mimic old-school D&B WorldBase Import/Export indicator
    get wbImpExpInd() {
        if(this.org.isImporter) {
            if(this.org.isExporter) {
                return 'B'
            }
            else {
                return 'C'
            }
        }

        if(this.org.isExporter) {
            return 'H'
        }

        return '';
    }

    //Method addrToArray will convert D&B Direct+ address objects (primary, registered, ...)
    //to an array of a specified length (= arrAddrComponents.length).
    addrToArray = addressToArray;

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
                    retArr[i * arrRegNumComponents.length + idx] = new ElemLabel(regNumComponent.desc, numRegNums > 1 ? i + 1 : null, 'reg num')
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
    //   options: oDpl.consts.indCode.type
    //2. Specify the number of activity codes to be returned
    //3. Multiple attributes from the D+ object can be returned, options: oDpl.consts.indCode.component
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
    //to an array of a specified length (= numNumEmpl * arrNumEmplComponents.length). The employee counts
    //returned are determined by the information scopes included in array arrNumEmplScope. This array
    //also influences the ordering of the return values but leading in this regard are the default
    //reliability priorities
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

        //First filter the objects in the information scopes specified
        retArr = this.org.numberOfEmployees
            //Only return the number of employee objects with the info scopes as specified in arrNumEmplScope
            .filter(numEmpl => arrNumEmplScope.includes(numEmpl.informationScopeDnBCode))
            
            //Add priority attribute based on parameter arrNumEmplScope and defaultReliabilityPrios
            .map(numEmpl => {
                //The information scope precedence is determined by parameter arrNumEmplScope
                const idxNumEmplScope = arrNumEmplScope.findIndex(elem => elem === numEmpl.informationScopeDnBCode);

                if(idxNumEmplScope > -1) { numEmpl.infoScopePrio = idxNumEmplScope + 1}

                //The reliability precedence is determined by defaultReliabilityPrios
                numEmpl.reliabilityPrio = defaultReliabilityPrios.find(elem => elem.code === numEmpl.reliabilityDnBCode)?.prio;

                return numEmpl;
            })
            .sort(doCompareInfoScope)   //1st sort on information scope as specified in parameter arrNumEmplScope
            .sort(doCompareReliability) //Next sort on reliability. If available, the 1st entry of defaultReliabilityPrios will bubble up
            .slice(0, numNumEmpl)       //Cut the entries which are not needed

            //Convert to an array
            .reduce((arr, numEmpl) => arr.concat(arrNumEmplComponents.map(component => numEmpl[component.attr])), []);

        //Fill out to the requested number of columns
        if(numNumEmpl * arrNumEmplComponents.length - retArr.length > 0) {
            retArr = retArr.concat(new Array((numNumEmpl * arrNumEmplComponents.length - retArr.length)));
        }
    
        return retArr;
    }

    get latestYearlyRevObjs() {
        //The financials attribute in Company Information L2+ is an array
        if(!this.org?.financials) { this.org.financials = [] }

        //The references to the yearly revenue objects were already calculated
        if(this.org.financials.latestYearlyRevObjs) {
            return this.org.financials.latestYearlyRevObjs
        }

        //Create the latestYearlyRevObjs array
        this.org.financials.latestYearlyRevObjs = new Array(appConsts.fin.latestYearlyRev.objs.length);

        if(this.org.financials.length === 0) { //No financials available in CI L2+
            return this.org.financials.latestYearlyRevObjs;
        }

        //Prefer recent statement dates and stick to the reliability priorities
        const finsSorted = this.org.financials
            .map(fin => {
                fin.reliabilityPrio = defaultReliabilityPrios.find(elem => elem.code === fin.reliabilityDnBCode)?.prio;

                return fin;
            })
            .sort((fin1, fin2) => {
                //Order based on reliability preference defined above
                if(!fin1.reliabilityPrio && fin2.reliabilityPrio) { return 1 }

                if(fin1.reliabilityPrio && !fin2.reliabilityPrio) { return -1 }

                if(fin1.reliabilityPrio && fin2.reliabilityPrio) {
                    if(fin1.reliabilityPrio - fin2.reliabilityPrio !== 0) {
                        return fin1.reliabilityPrio - fin2.reliabilityPrio
                    }
                }

                return 0;
            })
            .sort((fin1, fin2) => {
                //Ultimately prefer more recent financial statement years
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

                return 0;
            })

        //Store references to the relevant, identified objects
        this.org.financials.latestYearlyRevObjs[appConsts.fin.latestYearlyRev.objs.indexOf('fins0')] = finsSorted[0];

        //Get a reference to a local currency & a USD revenue figures
        const arrYearlyRev = finsSorted[0]?.yearlyRevenue || [];

        this.org.financials.latestYearlyRevObjs[appConsts.fin.latestYearlyRev.objs.indexOf('yearlyRevLocal')] =
            arrYearlyRev.filter(rev => rev.currency === this.org.defaultCurrency)[0];

        this.org.financials.latestYearlyRevObjs[appConsts.fin.latestYearlyRev.objs.indexOf('yearlyRevUSD')] =
            arrYearlyRev.filter(rev => rev.currency === 'USD')[0];

        return this.org.financials.latestYearlyRevObjs;
    }

    //Method latestYearlyRevToArray returns latest revenue figures in array format
    //Get information from attribute financials in Company Information L2+
    latestYearlyRevToArray(bLabel) {
        if(bLabel) {
            return appConsts.fin.latestYearlyRev.components.map(elem => new ElemLabel(elem.desc, null, 'yrly rev'));
        }

        const latestYearlyRevObjs = this.latestYearlyRevObjs;

        return appConsts.fin.latestYearlyRev.components
            .map(component => latestYearlyRevObjs[appConsts.fin.latestYearlyRev.objs.indexOf(component.obj)]?.[component.attr])
    }

    //Method latestFinsToArray returns latest financial figures in array format
    //Best results with Company Financials L1+, fall back implemented to Company Information L2+
    latestFinsToArray(bLabel) {
        if(bLabel) {
            return appConsts.fin.latest.map(elem => constructElemLabel(null, elem.desc));
        }

        //Financial data from Company Financials L1+
        const latestFins = this.org?.latestFinancials;

        let retArr;

        if(!objEmpty(latestFins)) {
            retArr = appConsts.fin.latest.map(elem => getObjAttrValue(latestFins, elem))

            if(latestFins.currency) { return retArr }
        }

        //No currency available, revert to modelled/estimated values from Company Information L2+
        let arrlatestYearlyRev = this.latestYearlyRevToArray(bLabel);

        return appConsts.fin.latest.map(elem => {
            if(elem.latestYearlyRevIdx || elem.latestYearlyRevIdx === 0) {
                return arrlatestYearlyRev[elem.latestYearlyRevIdx]
            }

            return null;
        });
    }

    get mostProminentFamTreeRole() {
        if(!this.org?.corporateLinkage || objEmpty(this.org?.corporateLinkage)) { return null }

        let famTreeRoles = this.org.corporateLinkage.familytreeRolesPlayed || [];

        famTreeRoles = famTreeRoles.map(role => {
                const idx = appConsts.corpLinkage.famTreeRoles.findIndex(constRole => constRole.code === role.dnbCode)

                return { prio: idx > -1 ? idx : appConsts.corpLinkage.famTreeRoles.length, ...role }
            })
            .sort((role1, role2) => role1.prio - role2.prio);

        return famTreeRoles[0].description;
    }

    hasFamTreeRole(dnbCode) {
        if(!this.org?.corporateLinkage || objEmpty(this.org?.corporateLinkage)) {
            return null
        }

        const famTreeRoles = this.org.corporateLinkage.familytreeRolesPlayed || [];

        if(famTreeRoles.find(role => role.dnbCode === dnbCode)) { return true }

        return false;
    }

    //Method isGlobalUlt will return true if the duns requested is the global ultimate duns, false 
    //if it is not the global ultimate and null if no linkage information is available
    //This method is applicable on data block collections which contain Hierachies & Connections L1
    get isGlobalUlt() {
        //dnbCode 12775 stands for global ultimate
        return this.hasFamTreeRole(appConsts.corpLinkage.famTreeRoles.find(role => role.key === 'gblUlt').code);

        //functional equivalents to role.dnbCode === 12775 are
        console.assert(this.map121.duns === this.org.corporateLinkage.globalUltimate.duns,
            '🤔 global ult, inquiryDetail.duns should equal globalUltimate.duns');

        console.assert(this.org.corporateLinkage.hierarchyLevel === 1,
            '🤔 global ult, corporateLinkage.hierarchyLevel should equal 1');
    }

    get isBranch() {
        //dnbCode 12769 stands for branch
        if(this.hasFamTreeRole(appConsts.corpLinkage.famTreeRoles.find(role => role.key === 'branch').code)) {
            return true
        }

        //dnbCode 9140 stands for branch/division
        return this.hasFamTreeRole(appConsts.corpLinkage.famTreeRoles.find(role => role.key === 'branchDiv').code);
    }

    get isSubsidiary() {
        //dnbCode 9159 stands for subsidiary
        return this.hasFamTreeRole(appConsts.corpLinkage.famTreeRoles.find(role => role.key === 'subsidiary').code)
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
                !b2bLinkLevels[appConsts.b2bLinkLevel.oneLevelUp.idx] &&
                b2bLinkLevels[appConsts.b2bLinkLevel.domUlt.idx] 
        ) {
            const constB2bLLs = appConsts.b2bLinkLevel;
            
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

    //Method corpLinkageLevelsToArray will convert D&B Direct+ corporate linkage objects 
    //(organization.corporateLinkage) to an array of a specified length (= arrLinkLevels.length * 
    //(arrLinkLevelComponents.length + arrLinkLevelAddrComponents.length)). Array b2bLinkLevels
    //plays a central part in the conversion (see ⬆️)
    //This method is applicable if Hierarchies & Connections level 1 data is available
    //
    //Four parameters
    //1. An array of linkage levels to fulfill (see oDpl.consts.b2bLinkLevels but only use oneLevelUp,
    //   domUlt & gblUlt)
    //2. An array of D+ object attributes to be returned, options: oDpl.consts.corpLinkage.component
    //3. An array of address attributes to be returned, options: oDpl.consts.addr.component
    //4. Specify the element labels associated with the values returned
    corpLinkageLevelsToArray(arrLinkLevels, arrLinkLevelComponents, arrLinkLevelAddrComponents, bLabel) {
        //See method getB2bLinkLevels
        let b2bLinkLevels = this.org?.corporateLinkage?.b2bLinkLevels;

        if(!b2bLinkLevels) { b2bLinkLevels = this.getB2bLinkLevels() }

        //In case no linkage available, just return an empty array
        if(!bLabel && b2bLinkLevels.reduce((bEmpty, level) => bEmpty ? !level : bEmpty, true)) {
            return new Array(arrLinkLevels.length * (arrLinkLevelComponents.length + arrLinkLevelAddrComponents.length))
        }

        //Process the linkage levels requested
        return arrLinkLevels.reduce((ret, linkLevel) => {
            const lLvl = b2bLinkLevels[linkLevel.idx];

            //Extract the attribute values requested from D+ object
            const getLinkLevelComponent = (retLLCs, linkLevelComponent) =>
                retLLCs.concat( bLabel
                    ? new ElemLabel(linkLevelComponent.desc, null, linkLevel.desc)
                    : linkLevelComponent.custom === 'hq'
                        ? (lLvl?.dplAttr === appConsts.corpLinkage.levels[0][0].attr ? linkLevelComponent.desc : null)
                        : lLvl?.[linkLevelComponent.attr]
                );

            return ret.concat(
                //Get the attribute values requested in arrLinkLevelComponents
                arrLinkLevelComponents.reduce( getLinkLevelComponent, [] ),

                //Get the address attribute values requested in arrLinkLevelAddrComponents
                this.addrToArray(
                    bLabel ? null : lLvl?.primaryAddress,
                    arrLinkLevelAddrComponents,
                    bLabel && new ElemLabel(null, null, linkLevel.desc + ' addr')
                )
            );
        }, []);
    }

    principalsContactsToArray(numPrincipals, arrPrincipalComponents, label) {
        function getAttrValue(oPrincipal, principalComponent) {
            if(typeof oPrincipal !== 'object' || objEmpty(oPrincipal)) {
                return null
            }

            //Custom address component algorithms
            if(principalComponent.custom === 'isMostSenior') { //Custom algorithm named isMostSenior
                return oPrincipal.isMostSenior;
            }

            if(principalComponent.custom === 'tel0') { //Custom algorithm named tel0
                return oPrincipal?.telephones?.[0]?.telephoneNumber;
            }

            if(principalComponent.custom === 'position0') { //Custom algorithm named position0
                return oPrincipal?.positions?.[0]?.description;
            }

            if(principalComponent.custom === 'jobTitle0') { //Custom algorithm named jobTitle0
                return oPrincipal?.jobTitles?.[0]?.title;
            }

            if(principalComponent.custom === 'mgmtResponsibility0') { //Custom algorithm named mgmtResponsibility0
                return oPrincipal?.managementResponsibilities?.[0]?.description;
            }

            if(principalComponent.custom === 'regNumDuns') { //Custom algoritm named regNumDuns
                let ret = null;

                if(oPrincipal.idNumbers && oPrincipal.idNumbers.length) {
                    const arrDuns = oPrincipal.idNumbers.filter(idNum => idNum.idType.dnbCode === 3575);

                    if(arrDuns && arrDuns.length) { return arrDuns[0].idNumber }
                }

                return ret;
            }

            //From here on out straight-up principal object attribute values are returned.
            //These values are mapped 1-2-1 but, at most, two levels deep.
            return getObjAttrValue(oPrincipal, principalComponent)
        }

        let retArr = [];

        //Return the column header labels if applicable
        if(label) {
            for(let i = 0; i < numPrincipals; i++) {
                retArr = retArr.concat(arrPrincipalComponents.map(principalComponent => 
                    new ElemLabel(principalComponent.desc, numPrincipals > 1 ? i + 1 : null, 'principal')
                ))
            }

            return retArr.flat();
        }

        //mostSeniorPrincipals is a v1 array, mostSeniorPrincipal is a v2 object
        let arrPrincipals = [];

        if(this.org.mostSeniorPrincipal && !objEmpty(this.org.mostSeniorPrincipal)) {
            //v2 code
            this.org.mostSeniorPrincipal.isMostSenior = true;
            arrPrincipals.push(this.org.mostSeniorPrincipal)
        }
        else if(this.org.mostSeniorPrincipals) {
            //v1 code
            arrPrincipals = mostSeniorPrincipals.map(principal => {
                principal.isMostSenior = true;
                return principal;
            })
        }

        //Add the other principals
        if(this.org.currentPrincipals && this.org.currentPrincipals.length) {
            arrPrincipals = arrPrincipals.concat(this.org.currentPrincipals)
        }

        //Return an empty array in case no principals available
        if(arrPrincipals.length === 0) {
            return new Array(numPrincipals * arrPrincipalComponents.length)
        }

        //Map the requested attribute values out of the principals array
        for(let i = 0; i < numPrincipals && i < arrPrincipals.length; i++) {
            retArr = retArr.concat(arrPrincipalComponents.map(principalComponent => getAttrValue(arrPrincipals[i], principalComponent)))
        }

        retArr = retArr.flat();

        //Fill out to the requested number of columns
        if(numPrincipals * arrPrincipalComponents.length - retArr.length > 0) {
            retArr = retArr.concat(new Array((numPrincipals * arrPrincipalComponents.length - retArr.length)));
        }
                
        return retArr;
    }
}

export { DplDBs };
