// *********************************************************************
//
// Process D&B Direct+ JSON data in order to make a LEI match
// JavaScript code file: leiMatchInBulk.js
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

import { LeiFilter } from '../share/httpApiDefs.js';

//Import rate limiters
import { readFileLimiter } from '../share/limiters.js';
import { gleifLimiter } from '../share/limiters.js';

//Decoder object for decoding utf-8 data in a binary format
import { dcdrUtf8, sDateIsoToYYYYMMDD } from '../share/utils.js';

import { jaroWrinker } from '../share/jaroWrinker.js';

import { DplDBs } from '../share/dnbDplDBs.js';

const nullUndefToEmptyStr = elem => elem === null || elem === undefined ? '' : elem;

//Persist API responses
const persistFile = false;   //Persist the response json as a file
const outPath = '../io/out/';
const sDate4 = sDateIsoToYYYYMMDD(new Date().toISOString(), 4)

const writeFile = (fn, data) => 
    fs.writeFile( `${outPath}lei_${sDate4}_${fn}.json`, data )
        .then( /* console.log(`Wrote file ${fn} successfully`) */ )
        .catch( err => console.error(err.message) );

//Match stages
const idMatch1  = 0;
const idMatch2  = 1;
const nameMatch = 2;

//Get the registration number to use in the LEi match
function getMatchRegNum(oDpl, stage) {
    //Return an object
    const ret = { dnbRegNum: '', dnbRegNumToMatch: '' };

    const arrDplRegNums = oDpl.org.registrationNumbers;

    //Just return the default values if no registration number is available
    if(!(arrDplRegNums && arrDplRegNums.length)) { return ret }

    const ctry = oDpl.map121.countryISO.toLowerCase();

    //Stage 2 is only applicable for a limited number of countries
    if(stage === idMatch2 && !['be', 'ch', 'no'].includes(ctry)) { return ret }

    //By default try to match the preferred registration number
    const arrPreferredRegNums = arrDplRegNums.filter(oRegNum => oRegNum.isPreferredRegistrationNumber);

    if(arrPreferredRegNums.length) {
        ret.dnbRegNum = arrPreferredRegNums[0].registrationNumber
    }
    else {
        ret.dnbRegNum = arrDplRegNums[0].registrationNumber
    }

    switch(ctry) {
        case 'at':
            const atRegNums = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 1336);

            if(atRegNums.length && atRegNums[0].registrationNumber.slice(0, 2) === 'FN') {
                ret.dnbRegNumToMatch = atRegNums[0].registrationNumber.slice(2)
            }

            break;

        case 'au':
            const auRegNums = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 1335);

            if(auRegNums.length) {
                if(auRegNums[0].registrationNumber.length === 9) {
                    ret.dnbRegNumToMatch = auRegNums[0].registrationNumber.slice(0, 3);
                    ret.dnbRegNumToMatch += ' ' + auRegNums[0].registrationNumber.slice(3, 6);
                    ret.dnbRegNumToMatch += ' ' + auRegNums[0].registrationNumber.slice(-3);
                }
                else {
                    ret.dnbRegNumToMatch = auRegNums[0].registrationNumber
                }
            }

            break;

        case 'be':
            const beRegNums = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 800);
         
            if(stage === idMatch2) {
                if(beRegNums.length) { ret.dnbRegNumToMatch = beRegNums[0].registrationNumber }
            }
            else {
                if(beRegNums.length && beRegNums[0].registrationNumber.length === 10) {
                    ret.dnbRegNumToMatch = beRegNums[0].registrationNumber.slice(0, 4);
                    ret.dnbRegNumToMatch += '.' + beRegNums[0].registrationNumber.slice(4, 7);
                    ret.dnbRegNumToMatch += '.' + beRegNums[0].registrationNumber.slice(-3);
                }
            }

            break;

        case 'ch':
            if(stage === idMatch2) {
                ret.dnbRegNumToMatch = ret.dnbRegNum.replace(/[^a-z0-9]/gi, '')
            }

            break;

        case 'it':
            if(ret.dnbRegNum.slice(0, 2).toLowerCase() === 'it') { ret.dnbRegNumToMatch = ret.dnbRegNum.slice(2) }
            
            break;

        case 'fi':
            const fiRegNums = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 553);

            if(fiRegNums.length) { ret.dnbRegNumToMatch = fiRegNums[0].registrationNumber.replace(/(.)(?=.$)/, '$1-'); }
            
            break;

        case 'fr':
            const frRegNums = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 2078); //Siren

            if(frRegNums.length) { ret.dnbRegNumToMatch = frRegNums[0].registrationNumber }
            
            break;

        case 'gr':
            const grRegNums = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 14246);

            if(grRegNums.length) {
                if(grRegNums[0].registrationNumber.length === 12) {
                    ret.dnbRegNumToMatch = grRegNums[0].registrationNumber
                }
                else {
                    ret.dnbRegNumToMatch = '000000000000'.slice(0, 12 - grRegNums[0].registrationNumber.length) + grRegNums[0].registrationNumber
                }
            }
            
            break;

        case 'hu':
            const huRegNums = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 1359);

            if(huRegNums.length) {
                if(huRegNums[0].registrationNumber.length > 4) {
                    ret.dnbRegNumToMatch = huRegNums[0].registrationNumber.slice(0, 2);
                    ret.dnbRegNumToMatch += "-" + huRegNums[0].registrationNumber.slice(2, 4);
                    ret.dnbRegNumToMatch += "-" + huRegNums[0].registrationNumber.slice(4);
                }
            }
            
            break;
    
        case 'no': //this is just 50/50 when executing a gleif search
            const noRegNums = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 1699);

            if(noRegNums.length) {
                if(stage === idMatch2) {
                    ret.dnbRegNumToMatch = noRegNums[0].registrationNumber
                }
                else {
                    if(noRegNums[0].registrationNumber.length === 9) {
                        ret.dnbRegNumToMatch = noRegNums[0].registrationNumber.slice(0, 3);
                        ret.dnbRegNumToMatch += ' ' + noRegNums[0].registrationNumber.slice(3, 6);
                        ret.dnbRegNumToMatch += ' ' + noRegNums[0].registrationNumber.slice(-3);
                    }
                }
            }

            break;
        
        case 'pl':
            const plRegNums = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 18519);

            if(plRegNums.length) { ret.dnbRegNumToMatch = plRegNums[0].registrationNumber }
            
            break;

        case 'ro': //this is just 50/50 when executing a gleif search
            const roRegNums = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 1436);

            if(roRegNums.length) { ret.dnbRegNumToMatch = roRegNums[0].registrationNumber }
            
            break;

        case 'se':
            if(ret.dnbRegNum.length === 10) {
                ret.dnbRegNumToMatch = ret.dnbRegNum.slice(0, 6) + '-' + ret.dnbRegNum.slice(-4)
            }

            break;

        case 'si':
            const siRegNums = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 9409);

            if(siRegNums.length) { ret.dnbRegNumToMatch = siRegNums[0].registrationNumber + '000' }
            
            break;
    }

    if(ret.dnbRegNum && !ret.dnbRegNumToMatch) { ret.dnbRegNumToMatch = ret.dnbRegNum }

    return ret;
}

//Read the D&B Direct+ JSON data
fs.readdir('../io/out')
    .then(arrFiles => {
        //Process the files available in the specified directory
        arrFiles
            .filter(fn => fn.endsWith('.json'))
            .filter(fn => fn.indexOf('dnb_dpl_1118_ci_L') > -1)
            .forEach(fn => { //Process the identified D&B data block files

                //Function for compiling the output of the procedure
                function generateOutput() {
                    let arrValues = [];

                    //D&B values
                    arrValues.push(leiMatch.inqDuns);
                    arrValues.push(leiMatch.dplDBs.map121.duns);
                    arrValues.push(leiMatch.dplDBs.map121.primaryName);
                    arrValues = arrValues.concat(
                        leiMatch.dplDBs.addrToArray(
                            leiMatch.dplDBs.org?.primaryAddress,
                            [
                                leiMatch.dplDBs.consts.addr.component.customLine1,
                                leiMatch.dplDBs.consts.addr.component.addrLine2,
                                leiMatch.dplDBs.consts.addr.component.postalCode,
                                leiMatch.dplDBs.consts.addr.component.locality,
                                leiMatch.dplDBs.consts.addr.component.regionAbbr,
                                leiMatch.dplDBs.consts.addr.component.countryISO
                            ]
                        ),
                    );
                    arrValues.push(leiMatch.dplDBs.org?.registeredDetails?.legalForm?.dnbCode);

                    //Gleif values
                    let data0 = null;

                    if(Number.isInteger(leiMatch?.resolved)) {
                        data0 = leiMatch.stages[leiMatch.resolved]?.resp?.leiResp?.data?.[0];
                    }

                    arrValues.push(leiMatch.lei);
                    arrValues.push(data0?.attributes?.entity?.legalName?.name);
                    arrValues.push(data0?.attributes?.entity?.legalAddress?.addressLines?.[0]);
                    arrValues.push(data0?.attributes?.entity?.legalAddress?.addressLines?.[1]);
                    arrValues.push(data0?.attributes?.entity?.legalAddress?.postalCode);
                    arrValues.push(data0?.attributes?.entity?.legalAddress?.city);
                    arrValues.push(data0?.attributes?.entity?.legalAddress?.region);
                    arrValues.push(data0?.attributes?.entity?.legalAddress?.country);
                    arrValues.push(data0?.attributes?.entity?.registeredAs);
                    arrValues.push(data0?.attributes?.entity?.category);
                    arrValues.push(data0?.attributes?.entity?.legalForm?.id);
                
                    //The inputs & results of the different match stages
                    arrValues.push(leiMatch.stages[idMatch1]?.dnbRegNum);
                    arrValues.push(leiMatch.stages[idMatch1]?.dnbRegNumToMatch);
                    arrValues.push(leiMatch.stages[idMatch1]?.resp?.httpStatus);
                    arrValues.push(leiMatch.stages[idMatch2]?.dnbRegNum);
                    arrValues.push(leiMatch.stages[idMatch2]?.dnbRegNumToMatch);
                    arrValues.push(leiMatch.stages[idMatch2]?.resp?.httpStatus);
                    arrValues.push(leiMatch.stages[nameMatch]?.resp?.httpStatus);
                    arrValues.push(leiMatch?.resolved);

                    if(leiMatch.dplDBs.map121.primaryName && data0?.attributes?.entity?.legalName?.name) {
                        arrValues.push(jaroWrinker(leiMatch.dplDBs.map121.primaryName, data0?.attributes?.entity?.legalName?.name));
                    }

                    console.log( arrValues.map(nullUndefToEmptyStr).join('|') );

                    return;
                }

                //Process the D&B D+ data block in JSON format and prepare the LEI match
                function prepareLeiMatch(jsonIn) {
                    try {
                        leiMatch.dplDBs = new DplDBs(jsonIn)
                    }
                    catch(err) {
                        throw new Error(`Unable to instantiate a D&B D+ data blocks object from file ${leiMatch.fileName}`);
                    }

                    //Store a couple of high level LEI match parameters
                    leiMatch.inqDuns = leiMatch.dplDBs.map121.inqDuns;
                    leiMatch.ctry = leiMatch.dplDBs.map121.countryISO;

                    leiMatch.stages = [ 
                        getMatchRegNum(leiMatch.dplDBs, idMatch1),
                        getMatchRegNum(leiMatch.dplDBs, idMatch2),
                        {}
                    ];

                    //Instantiate a new LEI filter request for registration number matching
                    leiMatch.stages[idMatch1].gleifFilterReq = new LeiFilter({
                        'filter[entity.registeredAs]': leiMatch.stages[idMatch1].dnbRegNumToMatch,
                        'filter[entity.legalAddress.country]': leiMatch.ctry
                    });

                    leiMatch.stages[idMatch2].gleifFilterReq = new LeiFilter({
                        'filter[entity.registeredAs]': leiMatch.stages[idMatch2].dnbRegNumToMatch,
                        'filter[entity.legalAddress.country]': leiMatch.ctry
                    });

                    leiMatch.stages[nameMatch].gleifFilterReq = new LeiFilter({
                        'filter[entity.legalName]': leiMatch.dplDBs.map121.primaryName,
                        'filter[entity.legalAddress.country]': leiMatch.ctry
                    });

                    //Round one match is a registration number match, no ID ➡️ no ID matches
                    if(!leiMatch.stages[idMatch1].dnbRegNumToMatch) { leiMatch.currentStage = nameMatch }

                    return gleifLimiter.removeTokens(1); //Throttle the Gleif requests
                }

                //Execute the LEI request in case a registration number is available
                function execLeiMatch() {
                    if(leiMatch.currentStage === idMatch2 && !leiMatch.stages[idMatch2].dnbRegNumToMatch) {
                        return Promise.resolve(null);
                    }

                    //Fire off the prepared match request
                    return leiMatch.stages[leiMatch.currentStage].gleifFilterReq.execReq();
                }

                //Process the LEI match response
                function processLeiMatchResp(resp) {
                    if(resp) {
                        if(persistFile) { //Persist the Gleif response if so configured
                            if(leiMatch.currentStage === nameMatch) {
                                writeFile(`${leiMatch.inqDuns}_${leiMatch.dplDBs.map121.primaryName}_${resp.httpStatus}`,  dcdrUtf8.decode(resp.buffBody))
                            }
                            else {
                                writeFile(`${leiMatch.inqDuns}_${leiMatch.stages[leiMatch.currentStage].dnbRegNumToMatch}_${resp.httpStatus}`,  dcdrUtf8.decode(resp.buffBody))
                            }
                        }

                        //Store a couple of high level round 1 LEI match parameters
                        leiMatch.stages[leiMatch.currentStage].resp = {};

                        leiMatch.stages[leiMatch.currentStage].resp.httpStatus = resp.httpStatus;

                        //Parse the Gleif response
                        try {
                            leiMatch.stages[leiMatch.currentStage].resp.leiResp = JSON.parse(resp.buffBody)
                        }
                        catch(err) {
                            console.error(err.message);
                            throw new Error(`Unable to instantiate a LEI object from API response`);
                        }

                        if(leiMatch.stages[leiMatch.currentStage]?.resp?.leiResp?.data?.[0]) { //LEI match
                            leiMatch.lei = leiMatch.stages[leiMatch.currentStage].resp.leiResp.data[0].id;
                            leiMatch.resolved = leiMatch.currentStage;
                        }
                    }

                    if(leiMatch.currentStage < nameMatch && !Number.isInteger(leiMatch?.resolved)) {
                        leiMatch.currentStage++;

                        gleifLimiter.removeTokens(1)
                            .then( execLeiMatch )
                            .then( processLeiMatchResp )

                        return;
                    }

                    generateOutput();
                }

                //Object for keeping track of data across multiple async calls
                const leiMatch = { fileName: fn, currentStage: idMatch1 };

                //Main application logic
                readFileLimiter.removeTokens(1)                   //Throttle the reading of files
                    .then( () => fs.readFile(`../io/out/${fn}`) ) //Read the JSON file containing the data blocks & prepare the match request
                    .then( prepareLeiMatch )                      //Respect the rate limits dictated by the API
                    .then( execLeiMatch )                         //Request the filtered LEI match
                    .then( processLeiMatchResp )                  //Handle the API response
                    .catch( err => console.error(err.message) )
            })
    })
    .catch(err => console.error(err.message))
