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

    //Tradestyle name
    arrValues.push(bLabel ? new ElemLabel('trdg style') : oDpl.getTradeStyleAtIdx(0));

    //Primary address
    arrValues = arrValues.concat( oDpl.addrToArray(
        oDpl.org?.primaryAddress,
        [
            oDpl.consts.addr.component.isRegisteredAddress,
            oDpl.consts.addr.component.customLine1,
            oDpl.consts.addr.component.addrLine2,
            oDpl.consts.addr.component.locality,
            oDpl.consts.addr.component.region,
            oDpl.consts.addr.component.regionAbbr,
            oDpl.consts.addr.component.country,
            oDpl.consts.addr.component.countryISO,
            oDpl.consts.addr.component.postalCode,
            oDpl.consts.addr.component.continent
        ],
        bLabel && new ElemLabel(null, null, 'addr')
    ));

    //Mail address
    arrValues = arrValues.concat( oDpl.addrToArray(
        oDpl.org?.mailingAddress,
        [
            oDpl.consts.addr.component.customLine1,
            oDpl.consts.addr.component.locality,
            oDpl.consts.addr.component.county,
            oDpl.consts.addr.component.region,
            oDpl.consts.addr.component.regionAbbr,
            oDpl.consts.addr.component.country,
            oDpl.consts.addr.component.countryISO,
            oDpl.consts.addr.component.postalCode,
            oDpl.consts.addr.component.continent
        ],
        bLabel && new ElemLabel(null, null, 'mail addr')
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
        bLabel && new ElemLabel(null, null, 'num empl', '(indv/hq)')
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
        bLabel && new ElemLabel(null, null, 'num empl', '(cons)')
    ));

    //Worldbase import/export indicator
    arrValues.push(bLabel ? new ElemLabel('imp exp cd') : oDpl.wbImpExpInd);

    //Business entity type (lowest resolution legal form)
    arrValues.push(bLabel ? new ElemLabel('legal form') : oDpl.org?.businessEntityType?.description);

    //The date the DUNS was last investigated by D&B
    arrValues.push(bLabel ? new ElemLabel('report date') : oDpl.org?.investigationDate);

    //Most prominent family tree role
    arrValues.push(bLabel ? new ElemLabel('fam tree role') : oDpl.mostProminentFamTreeRole);

    //Is subsidiary or not
    arrValues.push(bLabel ? new ElemLabel('is subsidiary') : oDpl.isSubsidiary);

    //Is global ultimate or not
    arrValues.push(bLabel ? new ElemLabel('is gbl ult') : oDpl.isGlobalUlt);

    //Number of entities in the corporate hierarchy
    arrValues.push(bLabel ? new ElemLabel('num fam members') : oDpl.org?.corporateLinkage?.globalUltimateFamilyTreeMembersCount);

    //Corporate hierarchy info concerning the HQ or parent location
    arrValues = arrValues.concat( oDpl.corpLinkageLevelsToArray(
        [
            oDpl.consts.b2bLinkLevel.oneLevelUp
        ],
        [
            oDpl.consts.corpLinkage.component.duns,
            oDpl.consts.corpLinkage.component.primaryName,
            oDpl.consts.corpLinkage.component.hq
        ],
        [
            oDpl.consts.addr.component.addrLine1,
            oDpl.consts.addr.component.addrLine2,
            oDpl.consts.addr.component.locality,
            oDpl.consts.addr.component.region,
            oDpl.consts.addr.component.regionAbbr,
            oDpl.consts.addr.component.country,
            oDpl.consts.addr.component.countryISO,
            oDpl.consts.addr.component.postalCode,
            oDpl.consts.addr.component.continent
        ],
        bLabel
    ));

    //Linkage information
    arrValues = arrValues.concat( oDpl.corpLinkageLevelsToArray(
        [
            oDpl.consts.b2bLinkLevel.domUlt,
            oDpl.consts.b2bLinkLevel.gblUlt
        ],
        [
            oDpl.consts.corpLinkage.component.duns,
            oDpl.consts.corpLinkage.component.primaryName,
        ],
        [
            oDpl.consts.addr.component.addrLine1,
            oDpl.consts.addr.component.addrLine2,
            oDpl.consts.addr.component.locality,
            oDpl.consts.addr.component.region,
            oDpl.consts.addr.component.regionAbbr,
            oDpl.consts.addr.component.country,
            oDpl.consts.addr.component.countryISO,
            oDpl.consts.addr.component.postalCode,
            oDpl.consts.addr.component.continent
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

/* Mapping from the old fixed width layout to the new delimited layout (incl positions)
const mapOldToNew = [
    { tag1784: "filler1", pos1784: 1, remark: "No longer relevant" },
    { headerDplDBs: "inq DUNS", posDplDBs: 1, remark: "New" },
    { tag1784: "duns", pos1784: 2, headerDplDBs: "DUNS", posDplDBs: 2 },
    { tag1784: "bus nme", pos1784: 3, headerDplDBs: "bus nme", posDplDBs: 3 },
    { tag1784: "trdg style", pos1784: 4, headerDplDBs: "trdg style", posDplDBs: 4 },
    { tag1784: "addr reg ind", pos1784: 5, headerDplDBs: "addr reg ind", posDplDBs: 5 },
    { tag1784: "addr line 1", pos1784: 6, headerDplDBs: "addr line 1", posDplDBs: 6 },
    { tag1784: "addr line 2", pos1784: 7, headerDplDBs: "addr line 2", posDplDBs: 7 },
    { tag1784: "addr city nme", pos1784: 8, headerDplDBs: "addr city nme", posDplDBs: 8 },
    { tag1784: "addr state prov nme", pos1784: 9, headerDplDBs: "addr state prov nme", posDplDBs: 9 },
    { tag1784: "addr ctry nme", pos1784: 10, headerDplDBs: "addr ctry nme", posDplDBs: 11 },
    { tag1784: "addr city cd", pos1784: 11, remark: "No longer relevant (proprietary code)" },
    { tag1784: "addr cnty cd", pos1784: 12, remark: "No longer relevant (proprietary code)" },
    { tag1784: "addr state prov cd", pos1784: 13, remark: "No longer relevant (proprietary code)" },
    { tag1784: "addr state prov abbr", pos1784: 14, headerDplDBs: "addr state prov abbr", posDplDBs: 10 },
    { tag1784: "addr ctry cd", pos1784: 15, headerDplDBs: "addr ctry ISO", posDplDBs: 12, remark: "ISO code" },
    { tag1784: "addr post cd", pos1784: 16, headerDplDBs: "addr post cd", posDplDBs: 13 },
    { tag1784: "addr cont cd", pos1784: 17, headerDplDBs: "addr cont", posDplDBs: 14, remark: "Continent name" },
    { tag1784: "mail addr line 1", pos1784: 18, headerDplDBs: "mail addr line 1", posDplDBs: 15 },
    { tag1784: "mail addr city nme", pos1784: 19, headerDplDBs: "mail addr city nme", posDplDBs: 16 },
    { tag1784: "mail addr cnty nme", pos1784: 20, headerDplDBs: "mail addr cnty nme", posDplDBs: 17 },
    { tag1784: "mail addr state prov nme", pos1784: 21, headerDplDBs: "mail addr state prov nme", posDplDBs: 18 },
    { tag1784: "mail addr ctry nme", pos1784: 22, headerDplDBs: "mail addr ctry nme", posDplDBs: 20 },
    { tag1784: "mail addr city cd", pos1784: 23, remark: "No longer relevant (proprietary code)" },
    { tag1784: "mail addr cnty cd", pos1784: 24, remark: "No longer relevant (proprietary code)" },
    { tag1784: "mail addr state prov cd", pos1784: 25, remark: "No longer relevant (proprietary code)" },
    { tag1784: "mail addr state prov abbr", pos1784: 26, headerDplDBs: "mail addr state prov abbr", posDplDBs: 19 },
    { tag1784: "mail addr ctry cd", pos1784: 27, headerDplDBs: "mail addr ctry ISO", posDplDBs: 21, remark: "ISO code" },
    { tag1784: "mail addr post cd", pos1784: 28, headerDplDBs: "mail addr post cd", posDplDBs: 22 },
    { tag1784: "mail addr cont cd", pos1784: 29, headerDplDBs: "mail addr cont", posDplDBs: 23, remark: "Continent name" },
    { tag1784: "nat id num", pos1784: 30, headerDplDBs: "reg num value 1", posDplDBs: 24 },
    { tag1784: "nat id cd", pos1784: 31, headerDplDBs: "reg num type 1", posDplDBs: 25 },
    { headerDplDBs: "reg num is VAT 1", posDplDBs: 26, remark: "New" },
    { headerDplDBs: "reg num value 2", posDplDBs: 27, remark: "New" },
    { headerDplDBs: "reg num type 2", posDplDBs: 28, remark: "New" },
    { headerDplDBs: "reg num is VAT 2", posDplDBs: 29, remark: "New" },
    { tag1784: "tel ctry access cd", pos1784: 32, headerDplDBs: "tel int access cd", posDplDBs: 30 },
    { tag1784: "tel num", pos1784: 33, headerDplDBs: "tel number", posDplDBs: 31 },
    { tag1784: "cable telx", pos1784: 34, remark: "No longer relevant" },
    { tag1784: "fax", pos1784: 35, remark: "No longer relevant" },
    { tag1784: "ceo nme", pos1784: 36, headerDplDBs: "principal full name", posDplDBs: 32 },
    { tag1784: "ceo title", pos1784: 37, headerDplDBs: "principal job title", posDplDBs: 33 },
    { tag1784: "act code descr", pos1784: 38, headerDplDBs: "act cd desc (SIC87)", posDplDBs: 34 },
    { tag1784: "act code sic1 (87)", pos1784: 39, headerDplDBs: "act cd (SIC87) 1", posDplDBs: 35 },
    { tag1784: "act code sic2 (87)", pos1784: 40, headerDplDBs: "act cd (SIC87) 2", posDplDBs: 36 },
    { tag1784: "act code sic3 (87)", pos1784: 41, headerDplDBs: "act cd (SIC87) 3", posDplDBs: 37 },
    { tag1784: "act code sic4 (87)", pos1784: 42, headerDplDBs: "act cd (SIC87) 4", posDplDBs: 38 },
    { tag1784: "act code sic5 (87)", pos1784: 43, headerDplDBs: "act cd (SIC87) 5", posDplDBs: 39 },
    { tag1784: "act code sic6 (87)", pos1784: 44, headerDplDBs: "act cd (SIC87) 6", posDplDBs: 40 },
    { tag1784: "act code loc", pos1784: 45, headerDplDBs: "act cd desc (NACE)", posDplDBs: 41, remark: "Mapped to NACE" },
    { tag1784: "act code loc scheme", pos1784: 46, headerDplDBs: "act cd (NACE)", posDplDBs: 42, remark: "Mapped to NACE" },
    { tag1784: "yr strt", pos1784: 47, headerDplDBs: "start date", posDplDBs: 43 },
    { tag1784: "ann sales amt", pos1784: 48, headerDplDBs: "yrly rev amt", posDplDBs: 44 },
    { tag1784: "ann sales ind", pos1784: 49, headerDplDBs: "yrly rev reliability", posDplDBs: 48 },
    { tag1784: "ann sales usd", pos1784: 50, headerDplDBs: "yrly rev USD", posDplDBs: 46 },
    { tag1784: "ann sales crcy cd", pos1784: 51, headerDplDBs: "yrly rev curr cd", posDplDBs: 45 },
    { headerDplDBs: "yrly rev units", posDplDBs: 47, remark: "New" },
    { headerDplDBs: "yrly rev info scope", posDplDBs: 49, remark: "New" },
    { headerDplDBs: "yrly rev stmt to date", posDplDBs: 50, remark: "New" },
    { tag1784: "num empl here", pos1784: 52, headerDplDBs: "num empl count (indv/hq)", posDplDBs: 51 },
    { tag1784: "num empl here ind", pos1784: 53, headerDplDBs: "num empl reliability (indv/hq)", posDplDBs: 52 },
    { headerDplDBs: "num empl info scope (indv/hq)", posDplDBs: 53, remark: "New" },
    { tag1784: "num empl tot", pos1784: 54, headerDplDBs: "num empl count (cons)", posDplDBs: 54 },
    { tag1784: "num empl tot ind", pos1784: 55, headerDplDBs: "num empl reliability (cons)", posDplDBs: 55 },
    { headerDplDBs: "num empl info scope (cons)", posDplDBs: 56, remark: "New" },
    { tag1784: "num empl prin incl ind", pos1784: 56, remark: "Could be implemented" },
    { tag1784: "imp exp cd", pos1784: 57, headerDplDBs: "imp exp cd", posDplDBs: 57 },
    { tag1784: "lgl stat", pos1784: 58, headerDplDBs: "legal form", posDplDBs: 58 },
    { tag1784: "control ind", pos1784: 59, remark: "No longer relevant" },
    { tag1784: "stat cd", pos1784: 60, headerDplDBs: "fam tree role", posDplDBs: 60 },
    { tag1784: "subs cd", pos1784: 61, headerDplDBs: "is subsidiary", posDplDBs: 61 },
    { tag1784: "filler2", pos1784: 62, remark: "No longer relevant" },
    { tag1784: "prev duns", pos1784: 63, remark: "New DUNS could be implemented" },
    { tag1784: "rep date", pos1784: 64, headerDplDBs: "report date", posDplDBs: 59, remark: "Mapped to date last investigation D&B" },
    { tag1784: "hq prnt filler3", pos1784: 65, remark: "No longer relevant" },
    { tag1784: "hq prnt duns", pos1784: 66, headerDplDBs: "hq prnt DUNS", posDplDBs: 64 },
    { tag1784: "hq prnt nme", pos1784: 67, headerDplDBs: "hq prnt nme", posDplDBs: 65 },
    { headerDplDBs: "hq prnt HQ", posDplDBs: 66, remark: "New" },
    { tag1784: "hq prnt addr line1", pos1784: 68, headerDplDBs: "hq prnt addr line 1", posDplDBs: 67 },
    { headerDplDBs: "hq prnt addr line 2", posDplDBs: 68, remark: "New" },
    { tag1784: "hq prnt addr city nme", pos1784: 69, headerDplDBs: "hq prnt addr city nme", posDplDBs: 69 },
    { tag1784: "hq prnt addr state prov nme", pos1784: 70, headerDplDBs: "hq prnt addr state prov nme", posDplDBs: 70 },
    { tag1784: "hq prnt addr ctry nme", pos1784: 71, headerDplDBs: "hq prnt addr ctry nme", posDplDBs: 72 },
    { tag1784: "hq prnt addr city cd", pos1784: 72, remark: "No longer relevant (proprietary code)" },
    { tag1784: "hq prnt addr cnty cd", pos1784: 73, remark: "No longer relevant (proprietary code)" },
    { tag1784: "hq prnt addr state prov abbr", pos1784: 74, headerDplDBs: "hq prnt addr state prov abbr", posDplDBs: 71 },
    { tag1784: "hq prnt addr ctry cd", pos1784: 75, headerDplDBs: "hq prnt addr ctry ISO", posDplDBs: 73, remark: "ISO code" },
    { tag1784: "hq prnt addr post cd", pos1784: 76, headerDplDBs: "hq prnt addr post cd", posDplDBs: 74 },
    { tag1784: "hq prnt addr cont cd", pos1784: 77, headerDplDBs: "hq prnt addr cont", posDplDBs: 75, remark: "Continent name" },
    { tag1784: "dom ult filler4", pos1784: 78, remark: "No longer relevant" },
    { tag1784: "dom ult duns", pos1784: 79, headerDplDBs: "dom ult DUNS", posDplDBs: 76 },
    { tag1784: "dom ult nme", pos1784: 80, headerDplDBs: "dom ult nme", posDplDBs: 77 },
    { tag1784: "dom ult addr line1", pos1784: 81, headerDplDBs: "dom ult addr line 1", posDplDBs: 78 },
    { headerDplDBs: "dom ult addr line 2", posDplDBs: 79, remark: "New" },
    { tag1784: "dom ult addr city nme", pos1784: 82, headerDplDBs: "dom ult addr city nme", posDplDBs: 80 },
    { tag1784: "dom ult addr state prov nme", pos1784: 83, headerDplDBs: "dom ult addr state prov nme", posDplDBs: 81 },
    { tag1784: "dom ult addr city cd", pos1784: 84, remark: "No longer relevant (proprietary code)" },
    { headerDplDBs: "dom ult addr ctry nme", posDplDBs: 83, remark: "New" },
    { tag1784: "dom ult addr ctry cd", pos1784: 85, headerDplDBs: "dom ult addr ctry ISO", posDplDBs: 84, remark: "ISO code" },
    { tag1784: "dom ult addr state prov abbr", pos1784: 86, headerDplDBs: "dom ult addr state prov abbr", posDplDBs: 82 },
    { tag1784: "dom ult addr post cd", pos1784: 87, headerDplDBs: "dom ult addr post cd", posDplDBs: 85 },
    { headerDplDBs: "dom ult addr cont", posDplDBs: 86, remark: "New" },
    { tag1784: "gbl ult ind", pos1784: 88, headerDplDBs: "is gbl ult", posDplDBs: 62 },
    { tag1784: "gbl ult filler5", pos1784: 89, remark: "No longer relevant" },
    { tag1784: "gbl ult duns", pos1784: 90, headerDplDBs: "gbl ult DUNS", posDplDBs: 87 },
    { tag1784: "gbl ult nme", pos1784: 91, headerDplDBs: "gbl ult nme", posDplDBs: 88 },
    { tag1784: "gbl ult addr line1", pos1784: 92, headerDplDBs: "gbl ult addr line 1", posDplDBs: 89 },
    { headerDplDBs: "gbl ult addr line 2", posDplDBs: 90, remark: "New" },
    { tag1784: "gbl ult addr city nme", pos1784: 93, headerDplDBs: "gbl ult addr city nme", posDplDBs: 91 },
    { tag1784: "gbl ult addr state prov nme", pos1784: 94, headerDplDBs: "gbl ult addr state prov nme", posDplDBs: 92 },
    { tag1784: "gbl ult addr ctry nme", pos1784: 95, headerDplDBs: "gbl ult addr ctry nme", posDplDBs: 94 },
    { tag1784: "gbl ult addr city cd", pos1784: 96, remark: "No longer relevant (proprietary code)" },
    { tag1784: "gbl ult addr cnty cd", pos1784: 97, remark: "No longer relevant (proprietary code)" },
    { tag1784: "gbl ult addr state prov abbr", pos1784: 98, headerDplDBs: "gbl ult addr state prov abbr", posDplDBs: 93 },
    { tag1784: "gbl ult addr ctry cd", pos1784: 99, headerDplDBs: "gbl ult addr ctry ISO", posDplDBs: 95, remark: "ISO code" },
    { tag1784: "gbl ult addr post cd", pos1784: 100, headerDplDBs: "gbl ult addr post cd", posDplDBs: 96 },
    { tag1784: "gbl ult addr cont cd", pos1784: 101, headerDplDBs: "gbl ult addr cont", posDplDBs: 97, remark: "Continent name" },
    { tag1784: "fam memb gbl", pos1784: 102, headerDplDBs: "num fam members", posDplDBs: 63 },
    { tag1784: "gbl dias cd", pos1784: 103, remark: "No longer available" },
    { tag1784: "gbl hier cd", pos1784: 104, remark: "Could be implemented" },
    { tag1784: "fam upd date", pos1784: 105, remark: "No longer available" },
    { tag1784: "oob ind", pos1784: 106, headerDplDBs: "operating status", posDplDBs: 98 },
    { headerDplDBs: "customer reference", posDplDBs: 99, remark: "New" }
]
*/