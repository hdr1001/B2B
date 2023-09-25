// *********************************************************************
//
// Process D&B Direct+ JSON data 
// JavaScript code file: dnbDplProcessData.js
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

import { dplDBsConsts, dplDBs } from '../share/dnbDplDBs.js';

import { ElemLabel } from '../share/elemLabel.js';

const nullUndefToEmptyStr = elem => elem === null || elem === undefined ? '' : elem;

//Process a collection of D&B Direct+ Data Blocks
function processDnbDplDB(jsonIn, bLabel) {
        let oDpl, org;

        if(!bLabel) {
            try {
                oDpl = new dplDBs(jsonIn)
            }
            catch(err) {
                console.error(err.message);
                return;
            }

            org = oDpl.org;
        }

        const arrValues = [];

        //Customer reference should be specified as a query parameter in the Direct+ request
        arrValues.push(bLabel ? new ElemLabel(dplDBsConsts.map121.custRef) : oDpl.map121.custRef);

        //Timestamp dating the D&B Direct+ REST request
        arrValues.push(bLabel ? new ElemLabel('date requested') : oDpl.transactionTimestamp(6) );

        //DUNS requested
        arrValues.push(bLabel ? new ElemLabel(dplDBsConsts.map121.inqDuns) : oDpl.map121.inqDuns);

        //DUNS delivered
        arrValues.push(bLabel ? new ElemLabel(dplDBsConsts.map121.duns) : oDpl.map121.duns);

        //Primary name
        arrValues.push(bLabel ? new ElemLabel(dplDBsConsts.map121.primaryName) : oDpl.map121.primaryName);


        arrValues.push(bLabel ? new ElemLabel('Global ult') : oDpl.isGlobalUlt() );


        console.log(arrValues.map(nullUndefToEmptyStr).join('|'));
}

let listHeader = true;

//Read the D&B Direct+ JSON data
fs.readdir('../io/out')
    .then(arrFiles => {
        //Produce an output header if requested
        if(arrFiles.length && listHeader) { processDnbDplDB('', listHeader) }

        //Process the files available in the specified directory
        arrFiles
            .filter(fn => fn.endsWith('.json'))
            .forEach(fn => 
                readFileLimiter.removeTokens(1)
                    .then(() => fs.readFile(`../io/out/${fn}`))
                    .then(processDnbDplDB)
                    .catch(err => console.error(err.message))
            )
    })
    .catch(err => console.error(err.message))
