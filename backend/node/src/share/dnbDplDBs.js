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

const classConst = {
    blockIDs: {
        key: 0,
        level: 1,
        ver: 2
    },
    corpLinkage: {
        levels: [
            {attrs: ['headQuarter', 'parent'], label: 'parent'},
            {attrs: ['domesticUltimate'], label: 'dom ult'},
            {attrs: ['globalUltimate'], label: 'global ult'}
        ]
    }
};

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

        //Make the class constants available on the object instance
        this.const = classConst;
    }

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
        const bIDs = this.const.blockIDs; 

        const ret = this.dplDB.inquiryDetail.blockIDs.reduce((obj, blockID) => {
            const arrBlockID = blockID.split('_');

            obj[arrBlockID[bIDs.key]] = {
                req: {
                    level: parseInt(arrBlockID[bIDs.level].slice(1 - arrBlockID[bIDs.level].length)),
                    version: parseInt(arrBlockID[bIDs.ver].slice(1 - arrBlockID[bIDs.ver].length))
                }
            };

            return obj;
        }, {});

        this.dplDB.blockStatus.forEach(aBlockStatus => {
            const arrBlockID = aBlockStatus.blockID.split('_');

            if( !ret[arrBlockID[bIDs.key]] ) { ret[arrBlockID[bIDs.key]] = {} }

            ret[arrBlockID[bIDs.key]].resp = {
                level: parseInt(arrBlockID[bIDs.level].slice(1 - arrBlockID[bIDs.level].length)),
                version: parseInt(arrBlockID[bIDs.ver].slice(1 - arrBlockID[bIDs.ver].length)),
                status: aBlockStatus.status,
                reason: aBlockStatus.reason
            };
        });

        return ret;
    }

    //Method transactionTimestamp will get the transaction timestamp in the format YYYYMMDD
    transactionTimestamp() {
        const tts = this.dplDB?.transactionDetail?.transactionTimestamp;

        if(tts) { return sDateIsoToYYYYMMDD(tts) }

        return '';
    }

    //This function will return true if the duns requested is the global ultimate duns, false if it
    //is not the global ultimate and undefined if no linkage information is available
    isGlobalUlt() {
        if(objEmpty(this.org?.corporateLinkage)) { return null }

        if(this.org.corporateLinkage.familytreeRolesPlayed.find(role => role.dnbCode === 12775)) {
            //functional equivalents to role.dnbCode === 12775 are
            console.assert(this.dplDB.inquiryDetail.duns === this.org.corporateLinkage.globalUltimate.duns,
                '🤔 global ult, inquiryDetail.duns should equal globalUltimate.duns');

            console.assert(this.org.corporateLinkage.hierarchyLevel === 1,
                '🤔 global ult, corporateLinkage.hierarchyLevel should equal 1');

            return true;
        }

        return false;
    }

    // This function will give access to the three levels of linkage available in hierarchies & connections level 1
    // Because only an HQ or a parent is included there are three levels, see corpLinkage constants above
    corpLinkageLevels() {
        const corpLinkage = this.org?.corporateLinkage;

        const ret = [ null, null, null ]; 

        if(objEmpty(corpLinkage)) { return ret }

        //Set the corporate linkage level references
        this.const.corpLinkage.levels.forEach((level, idx) => {
            level.attrs.forEach(attr => {
                if(!objEmpty(corpLinkage[attr])) {
                    corpLinkage[attr].dplAttr = attr;
                    corpLinkage[attr].label = this.const.corpLinkage.levels[idx].label;

                    ret[idx] = corpLinkage[attr];
                }
            })
        });

        return ret;
    }
}

export { dplDBs };
