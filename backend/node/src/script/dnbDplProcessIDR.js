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

import { DplIDR } from '../share/dnbDplMCs.js';

import { ElemLabel } from '../share/elemLabel.js';

const nullUndefToEmptyStr = elem => elem === null || elem === undefined ? '' : elem;

let inqComponents, primaryAddrComponents, mailAddrComponents;

//Process an D&B Direct+ IDentity Resolution response
function processDnbDplIDR(jsonIn, bLabel) {
    let oDpl;

    try {
        oDpl = new DplIDR(jsonIn)
    }
    catch(err) {
        console.error(err.message);
        return;
    }

    if(oDpl && !inqComponents) {
        inqComponents = [
            oDpl.consts.inq.component.name,
            oDpl.consts.inq.component.addrLine1,
            oDpl.consts.inq.component.addrLine2,
            oDpl.consts.inq.component.postalCode,
            oDpl.consts.inq.component.locality,
            oDpl.consts.inq.component.countryISO,
            oDpl.consts.inq.component.regNum
        ];
        
        primaryAddrComponents = [
            oDpl.consts.addr.component.addrLine1,
            oDpl.consts.addr.component.addrLine2,
            oDpl.consts.addr.component.locality,
            oDpl.consts.addr.component.postalCode,
            oDpl.consts.addr.component.regionAbbr,
            oDpl.consts.addr.component.countryISO
        ];
        
        mailAddrComponents = [
            oDpl.consts.addr.component.addrLine1,
            oDpl.consts.addr.component.locality
        ];
    }
    
    let arrValues = [];

    //Include the request reference(s) in the output
    arrValues = arrValues.concat( oDpl.custRefToArray(1, bLabel) );

    //Echo the specified search criteria (i.e. inquiry details)
    arrValues = arrValues.concat( oDpl.inqToArray( inqComponents, bLabel ));

    //Add the number a match candidates generated to the output
    arrValues.push(bLabel ? new ElemLabel('number candidates') : oDpl.map121.numCandidates);

    //Return the type of match that was executed (nat ID/name & addr/...)
    arrValues.push(bLabel ? new ElemLabel('match type') : oDpl.map121.matchType);

    arrValues.push(bLabel ? new ElemLabel('sequence num') : oDpl.mcs[0] ? oDpl.mcs[0].seqNum : null);

    arrValues.push(bLabel ? new ElemLabel('duns') : oDpl.mcs[0] ? oDpl.mcs[0].duns : null);

    arrValues.push(bLabel ? new ElemLabel('bus name') : oDpl.mcs[0] ? oDpl.mcs[0].name : null);

    arrValues.push(bLabel ? new ElemLabel('trade style') : oDpl.mcs[0] ? oDpl.mcs[0].tradeStyle : null);

    if(bLabel) {
        arrValues = arrValues.concat( oDpl.addrToArray( null, primaryAddrComponents,  new ElemLabel(null, null, 'addr') ));
    
        arrValues = arrValues.concat( oDpl.addrToArray( null, mailAddrComponents,  new ElemLabel(null, null, 'mail addr') ));
    }
    else if(oDpl.mcs?.[0]) {
        arrValues = arrValues.concat( oDpl.addrToArray( oDpl.mcs?.[0]?.org?.primaryAddress, primaryAddrComponents ));
    
        arrValues = arrValues.concat( oDpl.addrToArray( oDpl.mcs?.[0]?.org?.mailingAddress, mailAddrComponents ));
    }
    else {
        arrValues = arrValues.concat( new Array( primaryAddrComponents.length + mailAddrComponents.length ) )
    }

    arrValues.push(bLabel ? new ElemLabel('tel') : oDpl.mcs[0] ? oDpl.mcs[0].tel : null);

    arrValues.push(bLabel ? new ElemLabel('reg num') : oDpl.mcs[0] ? oDpl.mcs[0].regNum : null);

    arrValues.push(bLabel ? new ElemLabel('ceo') : oDpl.mcs[0] ? oDpl.mcs[0].ceo : null);

    arrValues.push(bLabel ? new ElemLabel('standalone') : oDpl.mcs[0] ? oDpl.mcs[0].isStandalone : null);

    arrValues.push(bLabel ? new ElemLabel('fam tree rol') : oDpl.mcs[0] ? oDpl.mcs[0].famTreeRole : null);

    arrValues.push(bLabel ? new ElemLabel('status') : oDpl.mcs[0] ? oDpl.mcs[0].status : null);

    arrValues.push(bLabel ? new ElemLabel('match grade') : oDpl.mcs[0] ? oDpl.mcs[0].matchGrade : null);

    arrValues.push(bLabel ? new ElemLabel('conf code') : oDpl.mcs[0] ? oDpl.mcs[0].confCode : null);

    arrValues.push(bLabel ? new ElemLabel('match data profile') : oDpl.mcs[0] ? oDpl.mcs[0].mdp : null);

    arrValues.push(bLabel ? new ElemLabel('name score') : oDpl.mcs[0] ? oDpl.mcs[0].nameScore : null);

    console.log( arrValues.map(nullUndefToEmptyStr).join('|') );
}

let listHeader = true;

//Read the D&B Direct+ IDentity Resolution JSON responses
fs.readdir('../io/out')
    .then(arrFiles => {
        //Produce an output header if requested
        if(arrFiles.length && listHeader) { processDnbDplIDR( '', listHeader ) }

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
