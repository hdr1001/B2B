// *********************************************************************
//
// Collection of Gleif related utilities
// JavaScript code file: utilsGleif.js
//
// Copyright 2024 Hans de Rooij
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

//Check LEI as issued by GLEIF
function isValidLei(sKey) {
    let m = 0, charCode;

    for(let i = 0; i < sKey.length; i++) {
        charCode = sKey.charCodeAt(i);

        if(charCode >= 48 && charCode <= 57) {
            m = (m * 10 + charCode - 48) % 97 
        }
        else if(charCode >= 65 && charCode <= 90) {
            m = (m * 100 + charCode - 55) % 97 
        }
        else {
            console.log(`Unexpected character at ${i}`);
            return false;
        }
    }

    return m === 1;
} 

const regNumConversion = new Map([
    [ 'at', regNums => { //FN269858a       -> 269858a
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 1336)
            }
    ],

    [ 'au', regNums => regNums.filter(regNum => regNum.typeDnBCode === 1335) ],  //004028077       -> 004 028 077

    [ 'be', regNums => regNums.filter(regNum => regNum.typeDnBCode === 800) ],   //0438950833      -> 0438.950.833

    [ 'ch', regNums => regNums.filter(regNum => regNum.typeDnBCode === 28865) ], //CHE-105.962.823 -> CHE105962823

    [ 'it', regNums => { //00470550013     -> 00470550013 (not preferred)
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 2023)?.[0];

                if(regNumOfType) { return regNumOfType.registrationNumber }

                return '';
            }
    ],

    [ 'fi', regNums => regNums.filter(regNum => regNum.typeDnBCode === 553) ],   //01120389        -> 0112038-9

    [ 'fr', regNums => { //382357721       -> 382357721 (not preferred)
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 2078)?.[0];

                if(regNumOfType) { return regNumOfType.registrationNumber }

                return '';
            }
    ],

    [ 'gr', regNums => { //272801000       -> 000272801000
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 14246)?.[0];

                if(regNumOfType) {
                    return '000000000000'.slice(0, 12 - regNumOfType.registrationNumber.length) + regNumOfType.registrationNumber
                }

                return '';
            }
    ],

    [ 'hu', regNums => regNums.filter(regNum => regNum.typeDnBCode === 1359) ],  //0110042048      -> 01-10-042048

    [ 'no', regNums => regNums.filter(regNum => regNum.typeDnBCode === 1699) ],  //915442552       -> 915 442 552

    [ 'pl', regNums => { //0000008734      -> 0000008734 (not preferred)
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 18519);

                if(regNumOfType) { return regNumOfType.registrationNumber }

                return '';
            }
    ],

    [ 'ro', regNums => regNums.filter(regNum => regNum.typeDnBCode === 1436) ],  //

    [ 'se', regNums => regNums.filter(regNum => regNum.typeDnBCode === 1861) ],  //5560003468      -> 556000-3468

    [ 'si', regNums => regNums.filter(regNum => regNum.typeDnBCode === 9409) ],  //5042437         -> 5042437000

]);

//Convert D&B registration numbers to IDs which can be used in LEI filter requests
function dplRegNumsToLeiFilter() {
    
}

export {
    isValidLei,
    dplRegNumsToLeiFilter
};
