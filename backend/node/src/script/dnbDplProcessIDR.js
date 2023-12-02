// *********************************************************************
//
// Process D&B Direct+ IDentiry Resolution data 
// JavaScript code file: dnbDplProcessMCs.js
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

import { promises as fs } from 'fs';

import { readFileLimiter } from '../share/limiters.js';

import { DplMCs } from '../share/dnbDplMCs.js';

import { ElemLabel } from '../share/elemLabel.js';

const nullUndefToEmptyStr = elem => elem === null || elem === undefined ? '' : elem;

//Process a collection of D&B Direct+ Data Blocks
function processDnbDplIDR(jsonIn, bLabel) {
    let oDpl;

    try {
        oDpl = new DplMCs(jsonIn)
    }
    catch(err) {
        console.error(err.message);
        return;
    }

    let arrValues = [];

    //Timestamp dating the D&B Direct+ REST request
    //arrValues.push(bLabel ? new ElemLabel('date requested') : oDpl.transactionTimestamp(6) );
    arrValues.push(bLabel ? new ElemLabel('cust ref') : oDpl.map121.inq?.customerReference[0]);

    arrValues = arrValues.concat( oDpl.inqToArray(
        [
            oDpl.consts.inq.component.name,
            oDpl.consts.inq.component.postalCode,
            oDpl.consts.inq.component.locality,
            oDpl.consts.inq.component.countryISO,
            oDpl.consts.inq.component.regNum
        ]
    ));

    //DUNS requested
    arrValues.push(bLabel ? new ElemLabel('number candidates') : oDpl.map121.numCandidates);

    //DUNS delivered
    arrValues.push(bLabel ? new ElemLabel('match type') : oDpl.map121.matchType);

    console.log(arrValues.map(nullUndefToEmptyStr).join('|'));
}

let listHeader = true;

//Read the D&B Direct+ JSON data
fs.readdir('../io/out')
    .then(arrFiles => {
        //Produce an output header if requested
        //if(arrFiles.length && listHeader) { processDnbDplDB('', listHeader) }

        //Process the files available in the specified directory
        arrFiles
            .filter(fn => fn.endsWith('.json'))
            .filter(fn => fn.indexOf('dnb_dpl_idr_1130_batch1') > -1)
            .forEach(fn => 
                readFileLimiter.removeTokens(1)
                    .then(() => fs.readFile(`../io/out/${fn}`))
                    .then(processDnbDplIDR)
                    .catch(err => console.error(err.message))
            )
    })
    .catch(err => console.error(err.message))
