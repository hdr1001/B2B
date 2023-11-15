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
    const ret = { dnbRegNum: '', dnbRegNumToMatch: '' };

    if(!(oDpl.org?.registrationNumbers && oDpl.org.registrationNumbers.length)) {
        return ret
    }

    const ctry = oDpl.map121.countryISO.toLowerCase();

    if(stage === idMatch2 && !['be', 'ch', 'no'].includes(ctry)) {
        return ret
    }
    const arrDplRegNums = oDpl.org.registrationNumbers;

    const arrPreferredRegNums = arrDplRegNums.filter(oRegNum => oRegNum.isPreferredRegistrationNumber);

    if(arrPreferredRegNums.length) {
        ret.dnbRegNum = arrPreferredRegNums[0].registrationNumber
    }
    else {
        ret.dnbRegNum = arrDplRegNums[0].registrationNumber
    }

    switch(ctry) {
        case 'at':
            const atTrRegnum = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 1336);

            if(atTrRegnum.length && atTrRegnum[0].registrationNumber.slice(0, 2) === 'FN') {
                ret.dnbRegNumToMatch = atTrRegnum[0].registrationNumber.slice(2)
            }

            break;

        case 'be':
            const enterpriseRegnum = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 800);
         
            if(stage === idMatch2) {
                if(enterpriseRegnum.length) { ret.dnbRegNumToMatch = enterpriseRegnum[0].registrationNumber }
            }
            else {
                if(enterpriseRegnum.length && enterpriseRegnum[0].registrationNumber.length === 10) {
                    ret.dnbRegNumToMatch = enterpriseRegnum[0].registrationNumber.slice(0, 4);
                    ret.dnbRegNumToMatch += '.' + enterpriseRegnum[0].registrationNumber.slice(4, 7);
                    ret.dnbRegNumToMatch += '.' + enterpriseRegnum[0].registrationNumber.slice(-3);
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
            const fiChRegnum = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 553);

            if(fiChRegnum.length) { ret.dnbRegNumToMatch = fiChRegnum[0].registrationNumber.replace(/(.)(?=.$)/, '$1-'); }
            
            break;

        case 'fr':
            const sirenRegnum = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 2078);

            if(sirenRegnum.length) { ret.dnbRegNumToMatch = sirenRegnum[0].registrationNumber }
            
            break;

        case 'gr':
            const grCocRegnum = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 14246);

            if(grCocRegnum.length === 12) {
                ret.dnbRegNumToMatch = grCocRegnum[0].registrationNumber
            }
            else {
                ret.dnbRegNumToMatch = '000000000000'.slice(0, 12 - grCocRegnum[0].registrationNumber.length) + grCocRegnum[0].registrationNumber
            }
            
            break;

        case 'hu':
            const huRegnum = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 1359);

            if(huRegnum.length) {
                ret.dnbRegNumToMatch = huRegnum[0].registrationNumber.slice(0, 2);
                ret.dnbRegNumToMatch += "-" + huRegnum[0].registrationNumber.slice(2, 4);
                ret.dnbRegNumToMatch += "-" + huRegnum[0].registrationNumber.slice(4);
            }
            
            break;
    
        case 'no': //this is just 50/50 when executing a gleif search
            const noEnterpriseRegNum = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 1699);

            if(stage === idMatch2) {
                if(noEnterpriseRegNum.length && noEnterpriseRegNum[0].registrationNumber.length !== 9) {
                    ret.dnbRegNumToMatch = noEnterpriseRegNum[0].registrationNumber
                }
            }
            else {
                if(noEnterpriseRegNum.length && noEnterpriseRegNum[0].registrationNumber.length === 9) {
                    ret.dnbRegNumToMatch = noEnterpriseRegNum[0].registrationNumber.slice(0, 3);
                    ret.dnbRegNumToMatch += ' ' + noEnterpriseRegNum[0].registrationNumber.slice(3, 6);
                    ret.dnbRegNumToMatch += ' ' + noEnterpriseRegNum[0].registrationNumber.slice(-3);
                }
            }

            break;
        
        case 'pl':
            const plCcRegnum = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 18519);

            if(plCcRegnum.length) { ret.dnbRegNumToMatch = plCcRegnum[0].registrationNumber }
            
            break;

        case 'ro': //this is just 50/50 when executing a gleif search
            const roRegnum = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 1436);

            if(roRegnum.length) { ret.dnbRegNumToMatch = roRegnum[0].registrationNumber }
            
            break;

        case 'se':
            if(ret.dnbRegNum.length === 10) {
                ret.dnbRegNumToMatch = ret.dnbRegNum.slice(0, 6) + '-' + ret.dnbRegNum.slice(-4)
            }

            break;

        case 'si':
            const siRegnum = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 9409);

            if(siRegnum.length) { ret.dnbRegNumToMatch = siRegnum[0].registrationNumber + '000' }
            
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
            .filter(fn => fn.indexOf('dnb_dpl_1114_ci_L1') > -1)
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
