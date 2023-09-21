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

class dplDBs {
    constructor(inp) {
        try {
            this.dplDB = JSON.parse(inp)
        }
        catch(err) {
            console.error(err.message);
            throw(err);
        }

        this.org = this.dplDB.organization;

        if(!this.org) {
            const msg = 'Parsed JSON does not contain the organization attribute';

            console.error(msg);
            throw(new Error(msg));
        }
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
        const dbKey   = 0;
        const dbLevel = 1;
        const dbVer   = 2;

        const ret = this.dplDB.inquiryDetail.blockIDs.reduce((obj, blockID) => {
            const arrBlockID = blockID.split('_');

            obj[arrBlockID[dbKey]] = {
                req: {
                    level: parseInt(arrBlockID[dbLevel].slice(1 - arrBlockID[dbLevel].length)),
                    version: parseInt(arrBlockID[dbVer].slice(1 - arrBlockID[dbVer].length))
                }
            };

            return obj;
        }, {});

        this.dplDB.blockStatus.forEach(aBlockStatus => {
            const arrBlockID = aBlockStatus.blockID.split('_');

            if( !ret[arrBlockID[dbKey]] ) { ret[arrBlockID[dbKey]] = {} }

            ret[arrBlockID[dbKey]].resp = {
                level: parseInt(arrBlockID[dbLevel].slice(1 - arrBlockID[dbLevel].length)),
                version: parseInt(arrBlockID[dbVer].slice(1 - arrBlockID[dbVer].length)),
                status: aBlockStatus.status,
                reason: aBlockStatus.reason
            };
        });

        return ret;
    }
}

export { dplDBs };
