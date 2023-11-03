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

import { DplDBs } from '../share/dnbDplDBs.js';

import { ElemLabel } from '../share/elemLabel.js';

const nullUndefToEmptyStr = elem => elem === null || elem === undefined ? '' : elem;

//Process a collection of D&B Direct+ Data Blocks
function processDnbDplDB(jsonIn, bLabel) {
    let oDpl;

    try {
        oDpl = new DplDBs(jsonIn)
    }
    catch(err) {
        console.error(err.message);
        return;
    }

    let arrValues = [];

    //Timestamp dating the D&B Direct+ REST request
    //arrValues.push(bLabel ? new ElemLabel('date requested') : oDpl.transactionTimestamp(6) );

    //DUNS requested
    arrValues.push(bLabel ? new ElemLabel(oDpl.consts.map121.inqDuns) : oDpl.map121.inqDuns);

    //DUNS delivered
    arrValues.push(bLabel ? new ElemLabel(oDpl.consts.map121.duns) : oDpl.map121.duns);

    //Primary name
    arrValues.push(bLabel ? new ElemLabel(oDpl.consts.map121.primaryName) : oDpl.map121.primaryName);
/*
    //Tradestyle name
    arrValues.push(bLabel ? new ElemLabel('tradestyle name') : oDpl.getTradeStyleAtIdx(0));

    //Primary address
    arrValues = arrValues.concat( oDpl.addrToArray(
        oDpl.org?.primaryAddress,
        [
            oDpl.consts.addr.component.isRegisteredAddress,
            oDpl.consts.addr.component.customLine1,
            oDpl.consts.addr.component.addrLine2,
            oDpl.consts.addr.component.locality,
            oDpl.consts.addr.component.region,
            oDpl.consts.addr.component.country,
            oDpl.consts.addr.component.regionAbbr,
            oDpl.consts.addr.component.countryISO,
            oDpl.consts.addr.component.postalCode,
            oDpl.consts.addr.component.continent
        ],
        bLabel
    ));

    //Mail address
    arrValues = arrValues.concat( oDpl.addrToArray(
        oDpl.org?.mailingAddress,
        [
            oDpl.consts.addr.component.customLine1,
            oDpl.consts.addr.component.locality,
            oDpl.consts.addr.component.county,
            oDpl.consts.addr.component.region,
            oDpl.consts.addr.component.country,
            oDpl.consts.addr.component.regionAbbr,
            oDpl.consts.addr.component.countryISO,
            oDpl.consts.addr.component.postalCode,
            oDpl.consts.addr.component.continent
        ],
        bLabel && new ElemLabel(null, null, 'mail')
    ));

    //Get a specified number of registration numbers
    arrValues = arrValues.concat( oDpl.regNumsToArray(
        2,
        [ oDpl.consts.regNum.component.num, oDpl.consts.regNum.component.type, oDpl.consts.regNum.component.vat ],
        bLabel
    ));

    //Get the requested number of telephone numbers
    arrValues = arrValues.concat( oDpl.telsToArray(
        1,
        [ oDpl.consts.tel.component.customIntAccess, oDpl.consts.tel.component.num ],
        bLabel
    ));

    //Get the CEO name & title
    arrValues = arrValues.concat( oDpl.principalsContactsToArray(
        1,
        [ oDpl.consts.principal.component.fullName, oDpl.consts.principal.component.customJobTitle0 ],
        bLabel
    ));

    //Get description of the primary industry code (SIC v87)
    arrValues = arrValues.concat( oDpl.indCodesToArray(
        oDpl.consts.indCode.type.sic87,
        1,
        [ oDpl.consts.indCode.component.desc ],
        bLabel && new ElemLabel(null, null, null, `(${oDpl.consts.indCode.type.sic87.descShort})`)
    ));

    //Get SIC v87 industry codes
    arrValues = arrValues.concat( oDpl.indCodesToArray(
        oDpl.consts.indCode.type.sic87,
        6,
        [ oDpl.consts.indCode.component.code ],
        bLabel && new ElemLabel(null, null, null, `(${oDpl.consts.indCode.type.sic87.descShort})`)
    ));
    
    //Get primary NACE description and code
    arrValues = arrValues.concat( oDpl.indCodesToArray(
        oDpl.consts.indCode.type.naceRev2,
        1,
        [ oDpl.consts.indCode.component.desc, oDpl.consts.indCode.component.code ],
        bLabel && new ElemLabel(null, null, null, `(${oDpl.consts.indCode.type.naceRev2.descShort})`)
    ));

    //Start date
    arrValues.push(bLabel ? new ElemLabel(oDpl.consts.map121.startDate) : oDpl.map121.startDate);

    //Yearly revenue figures
    arrValues = arrValues.concat( oDpl.latestYearlyRevToArray(bLabel) );

    //Get employee counts from a specified set of scopes (i.e. individual, hq, ...)
    arrValues = arrValues.concat( oDpl.numEmplsToArray(
        [
            oDpl.consts.numEmpl.scopeCodes.individual.code,
            oDpl.consts.numEmpl.scopeCodes.hq.code
        ],
        1,
        [
            oDpl.consts.numEmpl.component.value,
            oDpl.consts.numEmpl.component.reliability,
            oDpl.consts.numEmpl.component.scope
        ],
        bLabel && new ElemLabel(null, null, null, '(indv/hq)')
    ));

    arrValues = arrValues.concat( oDpl.numEmplsToArray(
        [
            oDpl.consts.numEmpl.scopeCodes.consolidated.code,
        ],
        1,
        [
            oDpl.consts.numEmpl.component.value,
            oDpl.consts.numEmpl.component.reliability,
            oDpl.consts.numEmpl.component.scope
        ],
        bLabel && new ElemLabel(null, null, null, '(cons)')
    ));

    //Worldbase import/export indicator
    arrValues.push(bLabel ? new ElemLabel('imp/exp code') : oDpl.wbImpExpInd);

    //Business entity type (lowest resolution legal form)
    arrValues.push(bLabel ? new ElemLabel('legal form') : oDpl.org?.businessEntityType?.description);

    //Most prominent family tree role
    arrValues.push(bLabel ? new ElemLabel('Fam tree role') : oDpl.mostProminentFamTreeRole);
*/
    //Linkage information
    arrValues = arrValues.concat( oDpl.corpLinkageLevelsToArray(
        [
            oDpl.consts.b2bLinkLevel.oneLevelUp,
            oDpl.consts.b2bLinkLevel.domUlt,
            oDpl.consts.b2bLinkLevel.gblUlt,
        ],
        [
            oDpl.consts.corpLinkage.component.duns,
            oDpl.consts.corpLinkage.component.primaryName
        ],
        [
            oDpl.consts.addr.component.addrLine1,
            oDpl.consts.addr.component.addrLine2,
            oDpl.consts.addr.component.locality,
            oDpl.consts.addr.component.countryISO
        ],
        bLabel
    ));

    //Operating status
    arrValues.push(bLabel ? new ElemLabel(oDpl.consts.map121.opStatus) : oDpl.map121.opStatus);

    //Customer reference should be specified as a query parameter in the Direct+ request
    arrValues.push(bLabel ? new ElemLabel(oDpl.consts.map121.custRef) : oDpl.map121.custRef);

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
            .filter(fn => fn.indexOf('1025_') > -1)
            .forEach(fn => 
                readFileLimiter.removeTokens(1)
                    .then(() => fs.readFile(`../io/out/${fn}`))
                    .then(processDnbDplDB)
                    .catch(err => console.error(err.message))
            )
    })
    .catch(err => console.error(err.message))
