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

//Per country logic for converting D&B D+ registration numbers to ones for use in LEI filter requests
const regNumConversion = new Map([
    [ 'at', regNums => { //FN269858a       -> 269858a
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 1336)?.[0];

                if(regNumOfType && regNumOfType.registrationNumber) {
                    if(regNumOfType.registrationNumber.slice(0, 2).toLowerCase() === 'fn') {
                        return regNumOfType.registrationNumber.slice(2)
                    }
                }

                return '';
            }
    ],

    [ 'au', regNums => { //004028077       -> 004 028 077
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 1335)?.[0];

                if(regNumOfType) {
                    const dnbRegNum = regNumOfType.registrationNumber;

                    if(dnbRegNum.length === 9) {
                        return `${dnbRegNum.slice(0, 3)} ${dnbRegNum.slice(3, 6)} ${dnbRegNum.slice(-3)}` 
                    }
                }

                return '';
            }
    ],

    [ 'be', regNums => { //0438950833      -> 0438.950.833
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 800)?.[0];

                if(regNumOfType) {
                    const dnbRegNum = regNumOfType.registrationNumber;

                    if(dnbRegNum.length === 10) {
                        return `${dnbRegNum.slice(0, 4)}.${dnbRegNum.slice(4, 7)}.${dnbRegNum.slice(-3)}` 
                    }
                }

                return '';
            }
    ],

    [ 'ch', regNums => { //CHE-105.962.823 -> CHE105962823
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 28865)?.[0];

                if(regNumOfType && regNumOfType.registrationNumber) {
                    return regNumOfType.registrationNumber.replace(/[^a-z0-9]/gi, '')
                }

                return '';
            }
    ],

    [ 'cl', regNums => { //774185801       -> 77418580-1
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 1344)?.[0];

                if(regNumOfType) {
                    const dnbRegNum = regNumOfType.registrationNumber;

                    if(dnbRegNum.length === 9) {
                        return `${dnbRegNum.slice(0, 8)}-${dnbRegNum.slice(-1)}` 
                    }
                }

                return '';
            }
    ],

    [ 'it', regNums => { //00470550013     -> 00470550013 (not preferred)
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 2023)?.[0];

                if(regNumOfType) { return regNumOfType.registrationNumber }

                return '';
            }
    ],

    [ 'fi', regNums => { //01120389        -> 0112038-9
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 553)?.[0];

                if(regNumOfType) {
                    const dnbRegNum = regNumOfType.registrationNumber;

                    if(dnbRegNum.length === 8) {
                        return `${dnbRegNum.slice(0, 7)}-${dnbRegNum.slice(-1)}` 
                    }
                }

                return '';
            }
    ],

    [ 'fr', regNums => { //382357721       -> 382357721 (not preferred)
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 2078)?.[0];

                if(regNumOfType) { return regNumOfType.registrationNumber }

                return '';
            }
    ],

    [ 'gr', regNums => { //272801000       -> 000272801000
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 14246)?.[0];

                if(regNumOfType) {
                    const dnbRegNum = regNumOfType.registrationNumber;

                    if(dnbRegNum.length && dnbRegNum.length <= 12) {
                        return '000000000000'.slice(0, 12 - dnbRegNum.length) + dnbRegNum
                    }
                }

                return '';
            }
    ],

    [ 'hu', regNums => { //0110042048      -> 01-10-042048
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 1359)?.[0];

                if(regNumOfType) {
                    const dnbRegNum = regNumOfType.registrationNumber;

                    if(dnbRegNum.length === 10) {
                        return `${dnbRegNum.slice(0, 2)}-${dnbRegNum.slice(2, 4)}-${dnbRegNum.slice(4)}` 
                    }
                }

                return '';
            }
    ],

    [ 'jp', regNums => { //3180001017428   -> 1800-01-017428
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 32475)?.[0];

                if(regNumOfType) {
                    const dnbRegNum = regNumOfType.registrationNumber;

                    if(dnbRegNum.length === 13) {
                        return `${dnbRegNum.slice(1, 5)}-${dnbRegNum.slice(5, 7)}-${dnbRegNum.slice(7)}` 
                    }
                }

                return '';
            }
    ],

    [ 'kr', regNums => { //2208115028      -> 220-81-15028
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 1387)?.[0];

                if(regNumOfType) {
                    const dnbRegNum = regNumOfType.registrationNumber;

                    if(dnbRegNum.length === 10) {
                        return `${dnbRegNum.slice(0, 3)}-${dnbRegNum.slice(3, 5)}-${dnbRegNum.slice(5)}` 
                    }
                }

                return '';
            }
    ],

    [ 'no', regNums => { //915442552       -> 915 442 552
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 1699)?.[0];

                if(regNumOfType) {
                    const dnbRegNum = regNumOfType.registrationNumber;

                    if(dnbRegNum.length === 9) {
                        return `${dnbRegNum.slice(0, 3)} ${dnbRegNum.slice(3, 6)} ${dnbRegNum.slice(-3)}` 
                    }
                }

                return '';
            }
    ],

    [ 'pl', regNums => { //0000008734      -> 0000008734 (not preferred)
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 18519)?.[0];

                if(regNumOfType) { return regNumOfType.registrationNumber }

                return '';
            }
    ],

    [ 'ro', regNums => { //J20/384/2022    -> J20/384/2022 (not preferred)
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 1436)?.[0];

                if(regNumOfType) { return regNumOfType.registrationNumber }

                return '';
            }
    ],

    [ 'se', regNums => { //5560003468      -> 556000-3468
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 1861)?.[0];

                if(regNumOfType) {
                    const dnbRegNum = regNumOfType.registrationNumber;

                    if(dnbRegNum.length === 10) {
                        return `${dnbRegNum.slice(0, 6)}-${dnbRegNum.slice(-4)}` 
                    }
                }

                return '';
            }
    ],

    [ 'si', regNums => { //5042437         -> 5042437000
                const regNumOfType = regNums.filter(regNum => regNum.typeDnBCode === 9409)?.[0];

                if(regNumOfType) {
                    return `${regNumOfType.registrationNumber}000` 
                }

                return '';
            }
    ]

]);

//Convert D&B registration numbers to IDs which can be used in LEI filter requests
function dplRegNumsToLeiFilter(regNums, isoCtry) {
    const fRegNumConv = regNumConversion.get(isoCtry.toLowerCase());

    if(fRegNumConv) { return fRegNumConv(regNums) }

    return '';
}

/* Test code
const testRegNums = [
    { registrationNumbers: [ { registrationNumber: 'FN269858a', typeDnBCode: 1336, isPreferredRegistrationNumber: null } ], isoCtry: 'at', leiFilter: '269858a' },
    { registrationNumbers: [ { registrationNumber: '004028077', typeDnBCode: 1335, isPreferredRegistrationNumber: null } ], isoCtry: 'au', leiFilter: '004 028 077' }, 
    { registrationNumbers: [ { registrationNumber: '0438950833', typeDnBCode: 800, isPreferredRegistrationNumber: null } ], isoCtry: 'be', leiFilter: '0438.950.833' },
    { registrationNumbers: [ { registrationNumber: 'CHE-105.962.823', typeDnBCode: 28865, isPreferredRegistrationNumber: null } ], isoCtry: 'ch', leiFilter: 'CHE105962823' },
    { registrationNumbers: [ { registrationNumber: '774185801', typeDnBCode: 1344, isPreferredRegistrationNumber: null } ], isoCtry: 'cl', leiFilter: '77418580-1' },
    { registrationNumbers: [ { registrationNumber: '00470550013', typeDnBCode: 2023, isPreferredRegistrationNumber: null } ], isoCtry: 'it', leiFilter: '00470550013' },
    { registrationNumbers: [ { registrationNumber: '01120389', typeDnBCode: 553, isPreferredRegistrationNumber: null } ], isoCtry: 'fi', leiFilter: '0112038-9' },
    { registrationNumbers: [ { registrationNumber: '382357721', typeDnBCode: 2078, isPreferredRegistrationNumber: null } ], isoCtry: 'fr', leiFilter: '382357721' },
    { registrationNumbers: [ { registrationNumber: '272801000', typeDnBCode: 14246, isPreferredRegistrationNumber: null } ], isoCtry: 'gr', leiFilter: '000272801000' },
    { registrationNumbers: [ { registrationNumber: '0110042048', typeDnBCode: 1359, isPreferredRegistrationNumber: null } ], isoCtry: 'hu', leiFilter: '01-10-042048' },
    { registrationNumbers: [ { registrationNumber: '3180001017428', typeDnBCode: 32475, isPreferredRegistrationNumber: null } ], isoCtry: 'jp', leiFilter: '1800-01-017428' },
    { registrationNumbers: [ { registrationNumber: '2208115028', typeDnBCode: 1387, isPreferredRegistrationNumber: null } ], isoCtry: 'kr', leiFilter: '220-81-15028' },
    { registrationNumbers: [ { registrationNumber: '915442552', typeDnBCode: 1699, isPreferredRegistrationNumber: null } ], isoCtry: 'no', leiFilter: '915 442 552' },
    { registrationNumbers: [ { registrationNumber: '0000008734', typeDnBCode: 18519, isPreferredRegistrationNumber: null } ], isoCtry: 'pl', leiFilter: '0000008734' },
    { registrationNumbers: [ { registrationNumber: 'J20/384/2022', typeDnBCode: 1436, isPreferredRegistrationNumber: null }, { registrationNumber: '45791029', typeDnBCode: 17278, isPreferredRegistrationNumber: true } ], isoCtry: 'ro', leiFilter: 'J20/384/2022' },
    { registrationNumbers: [ { registrationNumber: '5560003468', typeDnBCode: 1861, isPreferredRegistrationNumber: null } ], isoCtry: 'se', leiFilter: '556000-3468' },
    { registrationNumbers: [ { registrationNumber: '5042437', typeDnBCode: 9409, isPreferredRegistrationNumber: null } ], isoCtry: 'si', leiFilter: '5042437000' }
];

console.log(testRegNums.map(testRegNum => dplRegNumsToLeiFilter( testRegNum.registrationNumbers, testRegNum.isoCtry ) === testRegNum.leiFilter));
*/

export {
    isValidLei,
    dplRegNumsToLeiFilter
};
