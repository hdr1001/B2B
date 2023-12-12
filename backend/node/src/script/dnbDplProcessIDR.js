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

const listNumCand = 3;

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

    //List the candidates
    for(let i = 0; (bLabel || i < oDpl?.mcs?.length) && i < listNumCand; i++) {
        //Candidate sequence number
        arrValues.push(bLabel ? new ElemLabel('sequence num', i + 1) : oDpl.mcs[i].seqNum );

        //Candidate DUNS
        arrValues.push(bLabel ? new ElemLabel('duns', i + 1) : oDpl.mcs[i].duns );

        //Primary name of the candidate
        arrValues.push(bLabel ? new ElemLabel('bus name', i + 1) : oDpl.mcs[i].name );
    
        //Tradestyle name of the candidate
        arrValues.push(bLabel ? new ElemLabel('trade style', i + 1) : oDpl.mcs[i].tradeStyle );

        //Address information
        if(bLabel) {
            //Candidate primary address labels
            arrValues = arrValues.concat( oDpl.addrToArray( null, primaryAddrComponents,  new ElemLabel(null, i + 1, 'addr') ));
        
            //Candidate mail address labels
            arrValues = arrValues.concat( oDpl.addrToArray( null, mailAddrComponents,  new ElemLabel(null, i + 1, 'mail addr') ));
        }
        else if(oDpl.mcs[i]) {
            //Candidate primary address components
            arrValues = arrValues.concat( oDpl.addrToArray( oDpl.mcs[i]?.org?.primaryAddress, primaryAddrComponents ));
        
            //Candidate mail address components
            arrValues = arrValues.concat( oDpl.addrToArray( oDpl.mcs[i]?.org?.mailingAddress, mailAddrComponents ));
        }
        else {
            //Fill in the blanks
            arrValues = arrValues.concat( new Array( primaryAddrComponents.length + mailAddrComponents.length ) )
        }
    
        //Candidate telephone number
        arrValues.push(bLabel ? new ElemLabel('tel', i + 1) : oDpl.mcs[i].tel );
    
        //Candidate registration number
        arrValues.push(bLabel ? new ElemLabel('reg num', i + 1) : oDpl.mcs[i].regNum );
    
        //Candidate chief exec
        arrValues.push(bLabel ? new ElemLabel('ceo', i + 1) : oDpl.mcs[i].ceo );
    
        //Is the candidate standalone
        arrValues.push(bLabel ? new ElemLabel('standalone', i + 1) : oDpl.mcs[i].isStandalone );
    
        //The candidate's family tree role
        arrValues.push(bLabel ? new ElemLabel('fam tree rol', i + 1) : oDpl.mcs[i].famTreeRole );
    
        //The candidate's operating status
        arrValues.push(bLabel ? new ElemLabel('status', i + 1) : oDpl.mcs[i].status );
    
        //Match quality information, MatchGrade
        arrValues.push(bLabel ? new ElemLabel('match grade', i + 1) : oDpl.mcs[i].matchGrade );
    
        //Match quality information, confidence code
        arrValues.push(bLabel ? new ElemLabel('conf code', i + 1) : oDpl.mcs[i].confCode );
    
        //Match quality information, match data profile
        arrValues.push(bLabel ? new ElemLabel('match data profile', i + 1) : oDpl.mcs[i].mdp );
    
        //Match quality information, match name score
        arrValues.push(bLabel ? new ElemLabel('name score', i + 1) : oDpl.mcs[i].nameScore );
    }

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
            .filter(fn => fn.indexOf('dnb_dpl_idr_1130_batch3') > -1)
            .forEach(fn => 
                readFileLimiter.removeTokens(1)
                    .then(() => fs.readFile(`../io/out/${fn}`))
                    .then(processDnbDplIDR)
                    .catch(err => console.error(err.message))
            )
    })
    .catch(err => console.error(err.message))
