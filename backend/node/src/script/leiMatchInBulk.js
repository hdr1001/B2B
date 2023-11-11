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
const persistFile = true;   //Persist the response json as a file
const outPath = '../io/out/';
const sDate4 = sDateIsoToYYYYMMDD(new Date().toISOString(), 4)

const writeFile = (fn, data) => 
    fs.writeFile( `${outPath}lei_${sDate4}_${fn}.json`, data )
        .then( /* console.log(`Wrote file ${fn} successfully`) */ )
        .catch( err => console.error(err.message) );

//Get the registration number to use in the LEi match
function getMatchRegNum(oDpl) {
    const ret = { dnbRegNum: '', dnbRegNumToMatch: '' };

    if(!(oDpl.org?.registrationNumbers && oDpl.org.registrationNumbers.length)) {
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

    switch (oDpl.map121.countryISO.toLowerCase()) {
        case 'at':
            const atTrRegnum = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 1336);

            if(atTrRegnum.length && atTrRegnum[0].registrationNumber.slice(0, 2) === 'FN') {
                ret.dnbRegNumToMatch = atTrRegnum[0].registrationNumber.slice(2)
            }

            break;

        case 'be':
            const enterpriseRegnum = arrDplRegNums.filter(oRegNum => oRegNum.typeDnBCode === 800);
         
            if(enterpriseRegnum.length && enterpriseRegnum[0].registrationNumber.length === 10) {
                ret.dnbRegNumToMatch = enterpriseRegnum[0].registrationNumber.slice(0, 4);
                ret.dnbRegNumToMatch += '.' + enterpriseRegnum[0].registrationNumber.slice(4, 7);
                ret.dnbRegNumToMatch += '.' + enterpriseRegnum[0].registrationNumber.slice(-3);
            }

            /* if(round === 2) {
                if(enterpriseRegnum.length) { ret.dnbRegNumToMatch = enterpriseRegnum[0].registrationNumber }
            } */

            break;

        case 'ch':
            /* if(round === 2) {
                ret.dnbRegNumToMatch = ret.dnbRegNum.replace(/[^a-z0-9]/gi, '')
            } */

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

            if(noEnterpriseRegNum.length && noEnterpriseRegNum[0].registrationNumber.length === 9) {
                ret.dnbRegNumToMatch = noEnterpriseRegNum[0].registrationNumber.slice(0, 3);
                ret.dnbRegNumToMatch += ' ' + noEnterpriseRegNum[0].registrationNumber.slice(3, 6);
                ret.dnbRegNumToMatch += ' ' + noEnterpriseRegNum[0].registrationNumber.slice(-3);
            }

            /*if(round === 2) {
                if(noEnterpriseRegNum.length) { ret.dnbRegNumToMatch = noEnterpriseRegNum }
            } */

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

//Try to make a LEI match based on D&B provided registration number
function leiMatchOnRegNum(jsonIn) {
    const leiMatch = {
        inqDuns: oDpl.map121.inqDuns,
        duns: oDpl.map121.duns,
        primaryName: oDpl.map121.primaryName,
        addr1: oDpl.org?.primaryAddress?.streetAddress?.line1,
        addr2: oDpl.org?.primaryAddress?.streetAddress?.line2,
        city: oDpl.org?.primaryAddress?.addressLocality?.name,
        postalCode: oDpl.org?.primaryAddress?.postalCode,
        ctry: oDpl.map121.countryISO,
        legalForm: oDpl.org?.registeredDetails?.legalForm?.dnbCode,

        round1: { //Match on D&B registration number
            ...getMatchRegNum(oDpl)
        }
    };

    const gleifFilterReq = new LeiFilter({
        'filter[entity.registeredAs]': leiMatch.round1.dnbRegNumToMatch,
        //'filter[entity.legalName]': leiMatch.primaryName,
        'filter[entity.legalAddress.country]': leiMatch.ctry
    })

    if(leiMatch.round1.dnbRegNumToMatch) {
        gleifLimiter.removeTokens(1)
            .then(() => gleifFilterReq.execReq())
            .then(resp => {
                leiMatch.round1.resp = {};

                leiMatch.round1.resp.httpStatus = resp.httpStatus;

                if(resp.httpStatus >= 200 || resp.httpStatus < 300) { //HTTP okay
                    try {
                        leiMatch.round1.resp.leiRec = JSON.parse(resp.buffBody);

                        const arrValues = [];

                        //D&B values
                        arrValues.push(leiMatch.inqDuns);
                        arrValues.push(leiMatch.duns);
                        arrValues.push(leiMatch.primaryName);
                        arrValues.push(leiMatch.addr1);
                        arrValues.push(leiMatch.addr2);
                        arrValues.push(leiMatch.city);
                        arrValues.push(leiMatch.postalCode);
                        arrValues.push(leiMatch.ctry);
                        arrValues.push(leiMatch.legalForm);
                        arrValues.push(leiMatch?.round1?.dnbRegNum);
                        arrValues.push(leiMatch?.round1?.dnbRegNumToMatch);
                
                        //Gleif values
                        const data0 = leiMatch.round1.resp.leiRec.data[0];

                        arrValues.push(data0?.id);
                        arrValues.push(data0?.attributes?.entity?.legalName?.name);
                        arrValues.push(data0?.attributes?.entity?.legalAddress?.addressLines?.[0]);
                        arrValues.push(data0?.attributes?.entity?.legalAddress?.addressLines?.[1]);
                        arrValues.push(data0?.attributes?.entity?.legalAddress?.city);
                        arrValues.push(data0?.attributes?.entity?.legalAddress?.region);
                        arrValues.push(data0?.attributes?.entity?.legalAddress?.country);
                        arrValues.push(data0?.attributes?.entity?.legalAddress?.postalCode);
                        arrValues.push(data0?.attributes?.entity?.registeredAs);
                        arrValues.push(data0?.attributes?.entity?.category);
                        arrValues.push(data0?.attributes?.entity?.legalForm?.id);

                        console.log(arrValues.map(nullUndefToEmptyStr).join('|'));
                    }
                    catch(err) {

                    }
                }
                else { //HTTP error
                }
            })
    }
    else {

    }
}

//Read the D&B Direct+ JSON data
fs.readdir('../io/out')
    .then(arrFiles => {
        //Process the files available in the specified directory
        arrFiles
            .filter(fn => fn.endsWith('.json'))
            .filter(fn => fn.indexOf('1108_') > -1)
            .forEach(fn => {
                const leiMatch = { fileName: fn };

                readFileLimiter.removeTokens(1)
                    .then(() => fs.readFile(`../io/out/${fn}`))
                    .then(jsonIn => {
                        try {
                            leiMatch.dplDBs = new DplDBs(jsonIn)
                        }
                        catch(err) {
                            throw new Error(`Unable to instantiate a D&B D+ data blocks object from file ${leiMatch.fileName}`);
                        }

                        leiMatch.inqDuns = leiMatch.dplDBs.map121.inqDuns;
                        leiMatch.ctry = leiMatch.dplDBs.map121.countryISO;

                        leiMatch.round1 = getMatchRegNum(leiMatch.dplDBs);

                        if(!leiMatch.round1.dnbRegNumToMatch) {                            
                            return Promise.resolve()
                        }

                        leiMatch.round1.gleifFilterReq = new LeiFilter({
                            'filter[entity.registeredAs]': leiMatch.round1.dnbRegNumToMatch,
                            'filter[entity.legalAddress.country]': leiMatch.ctry
                        });

                        return gleifLimiter.removeTokens(1);
                    })
                    .then(() => {
                        if(!leiMatch.round1.dnbRegNumToMatch) {
                            return Promise.resolve();
                        }

                        return leiMatch.round1.gleifFilterReq.execReq();
                    })
                    .then(resp => {
                        if(leiMatch.round1.dnbRegNumToMatch) {
                            leiMatch.round1.resp = {};

                            leiMatch.round1.resp.httpStatus = resp.httpStatus;

                            if(persistFile) {
                                writeFile(`${leiMatch.inqDuns}_${leiMatch.round1.dnbRegNumToMatch}_${resp.httpStatus}`,  dcdrUtf8.decode(resp.buffBody))
                            }

                            try {
                                leiMatch.round1.leiResp = JSON.parse(resp.buffBody)
                            }
                            catch(err) {
                                console.error(err.message);
                                throw new Error(`Unable to instantiate a LEI object from API response`);
                            }

                            if(leiMatch.round1.leiResp?.data?.[0]) {
                                leiMatch.lei = leiMatch.round1.leiResp.data[0].id;
                                leiMatch.resolved = 1;
                            }

                            console.log(leiMatch.ctry, leiMatch.inqDuns, leiMatch.round1.resp.httpStatus, leiMatch.lei, leiMatch.resolved)
                        }
                        else {
                            console.log(leiMatch.ctry, leiMatch.inqDuns)
                        }
                    })
                    .catch(err => console.error(err.message))
            })
    })
    .catch(err => console.error(err.message))
