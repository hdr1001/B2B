// *********************************************************************
//
// Collection of shared utilities
// JavaScript code file: utils.js
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

//Some imports related to reading and writing to and from files
import * as os from 'os';
import { promises as fs } from 'fs';

//A decoder takes a stream of bytes as input & emits a stream of code points
const dcdrUtf8 = new TextDecoder('utf-8');

//A unique string ID generator
import { customAlphabet } from 'nanoid';

//Update a key value in the .env file
//Source: https://stackoverflow.com/questions/64996008/update-attributes-in-env-file-in-node-js
function setEnvValue(key, value) {
    const dotEnv = '.env';

    // read file from hdd & split if from a linebreak to a array
    fs.readFile(dotEnv, 'utf8')
        .then(file => {
            const ENV_VARS = file.split(os.EOL);

            // find the env we want based on the key
            const target = ENV_VARS.indexOf(ENV_VARS.find((line) => {
                // (?<!#\s*)   Negative lookbehind to avoid matching comments (lines that starts with #).
                //             There is a double slash in the RegExp constructor to escape it.
                // (?==)       Positive lookahead to check if there is an equal sign right after the key.
                //             This is to prevent matching keys prefixed with the key of the env var to update.
                const keyValRegex = new RegExp(`(?<!#\\s*)${key}(?==)`);
    
                return line.match(keyValRegex);
            }));
    
            // if key-value pair exists in the .env file,
            if (target !== -1) { // replace the key/value with the new value
                ENV_VARS.splice(target, 1, `${key}=${value}`);
            }
            else { // if it doesn't exist, add it instead
                ENV_VARS.push(`${key}=${value}`);
            }

            return ENV_VARS;
        })
        .then(ENV_VARS => fs.writeFile(dotEnv, ENV_VARS.join(os.EOL)))
        .then(() => console.log(`Succesfully updated file ${dotEnv}`))
        .catch(err => console.error(err));
}

//Convert a DUNS to a string of 9 digits
function cleanDUNS(inDUNS) {
    //Correct the old school XX-XXX-XXXX DUNS format
    let outDUNS = inDUNS.length === 11 && inDUNS.slice(2, 3) === '-' && inDUNS.slice(6, 7) === '-'
        ? inDUNS.slice(0, 2) + inDUNS.slice(3, 6) + inDUNS.slice(7)
        : inDUNS;

    //Return an empty sting if more than nine or any non-numeric characters
    if(outDUNS.length > 9 || !/^\d*$/.test(outDUNS)) { return '' }

    //Return the DUNS with, if needed, 0s prepended
    return '000000000'.slice(0, 9 - outDUNS.length) + outDUNS;
}

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

//ISO 8601 UTC Z date/time string to YYYYMMDD or YYMMDD
function sDateIsoToYYYYMMDD (sDateIso, length = 8) {
    return sDateIso.split('T')[0].replace(/-/g,"").slice(length * -1)
}

//Function objEmpty returns true if:
// 1. The value of the parameter is undefined of null
// 2. The parameter passed in is an object and has no (enumerable) properties
//An error will be thrown when the parameter passed in is not undefined, null
//or of type object. In all other cases false will be returned.
function objEmpty(obj) {
    if(obj === undefined || obj === null) { return true }

    if(obj && obj.constructor !== Object) {
        throw new Error('Only an object parameter is allowed when invoking function objEmpty')
    }

    if(Object.keys(obj).length === 0) { return true }

    return false;
}

//Does a value represent a valid number
function isNumber(value) {
    return typeof value === 'number' && isFinite(value);
}

//No dashes or underscores therefore use a a custom alphabet
const custAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(custAlphabet, 6); //Six characters should do

export {
    dcdrUtf8,
    setEnvValue,
    cleanDUNS,
    isValidLei,
    sDateIsoToYYYYMMDD,
    objEmpty,
    isNumber,
    nanoid
};
