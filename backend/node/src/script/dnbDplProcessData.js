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

import { dplDBs } from '../share/dnbDplDBs.js';

const nullUndefToEmptyStr = elem => elem === null || elem === undefined ? '' : elem;

//Process a collection of D&B Direct+ Data Blocks
function processDnbDplDB(jsonIn) {
        let oDpl;

        try {
            oDpl = new dplDBs(jsonIn)
        }
        catch(err) {
            console.error(err.message);
            return;
        }

        const org = oDpl.org;

        const arrValues = [];

        arrValues.push(org.duns);

        console.log(arrValues.map(nullUndefToEmptyStr).join('|'));
}

//Read the D&B Direct+ JSON data
fs.readdir('../io/out')
    .then(arrFiles =>
        arrFiles
            .filter(fn => fn.endsWith('.json'))
            .forEach(fn => 
                readFileLimiter.removeTokens(1)
                    .then(() => fs.readFile(`../io/out/${fn}`))
                    .then(processDnbDplDB)
                    .catch(err => console.error(err.message))
            )
    )
    .catch(err => console.error(err.message))
