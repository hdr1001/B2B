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

import { sDateIsoToYYYYMMDD, objEmpty } from "./utils.js";

import { regNumTypeIsVAT } from "./sharedRefTables.js";

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
    corpLinkage: {
        levels: [ //Linkage levels in Hierarchies & Connections level 1
            {attrs: ['headQuarter', 'parent'], label: 'parent'},
            {attrs: ['domesticUltimate'], label: 'dom ult'},
            {attrs: ['globalUltimate'], label: 'global ult'}
        ]
    }
};

//D&B Direct+ Data Blocks JavaScript object wrapper
class dplDBs {
    constructor(inp) {
        //Parse the JSON oassed in as a string
        try {
            this.dplDB = JSON.parse(inp)
        }
        catch(err) {
            console.error(err.message);
            throw(err);
        }

        //Create a shortcut to the organization attribute
        this.org = this.dplDB.organization;

        if(!this.org) {
            const msg = 'Parsed JSON does not contain the organization attribute';

            console.error(msg);
            throw(new Error(msg));
        }

        //One-to-one mappings
        this.map121 = { //The actual directly mapped values
            // inquiry detail
            inqDuns: this.dplDB?.inquiryDetail?.duns,
            tradeUp: this.dplDB?.inquiryDetail?.tradeUp,
            custRef: this.dplDB?.inquiryDetail?.customerReference,

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

    //Expose the application constants through the class interface
    get consts() { return appConsts }

    //Method blockIDs combines Data Block property inquiryDetail.blockIDs
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
    blockIDs() {
        const ret = this.dplDB.inquiryDetail.blockIDs.reduce((obj, blockID) => {
            const arrBlockID = blockID.split('_');

            obj[arrBlockID[appConsts.blockIDs.key]] = {
                req: {
                    level: parseInt(arrBlockID[appConsts.blockIDs.level].slice(1 - arrBlockID[appConsts.blockIDs.level].length)),
                    version: parseInt(arrBlockID[appConsts.blockIDs.ver].slice(1 - arrBlockID[appConsts.blockIDs.ver].length))
                }
            };

            return obj;
        }, {});

        this.dplDB.blockStatus.forEach(aBlockStatus => {
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
    transactionTimestamp(length) {
        const tts = this.dplDB?.transactionDetail?.transactionTimestamp;

        if(tts) { return sDateIsoToYYYYMMDD(tts, length) }

        return '';
    }

    //Method isGlobalUlt will return true if the duns requested is the global ultimate duns, false 
    //if it is not the global ultimate and null if no linkage information is available
    isGlobalUlt() {
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
    corpLinkageLevels() {
        const corpLinkage = this.org?.corporateLinkage;

        const ret = [ null, null, null ]; 

        if(objEmpty(corpLinkage)) { return ret }

        //Set the corporate linkage level references
        appConsts.corpLinkage.levels.forEach((level, idx) => {
            level.attrs.forEach(attr => {
                if(!objEmpty(corpLinkage[attr])) {
                    corpLinkage[attr].dplAttr = attr;
                    corpLinkage[attr].label = appConsts.corpLinkage.levels[idx].label;

                    ret[idx] = corpLinkage[attr];
                }
            })
        });

        return ret;
    }
}

export { appConsts as dplDBsConsts, dplDBs };
