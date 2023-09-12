// *********************************************************************
//
// Read an input file into a two dimensional array of keys
// JavaScript code file: readInputFileKeys.js
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

//funtion to clean a DUNS is defined in utils.js
import { cleanDUNS } from './utils.js';

//Read a file line by line (synchronously!)
import lineByLine from 'n-readlines';

//Key cleanup code
function transform(buff, keyType) {
    let ret = buff.toString('utf8').trim();

    switch(keyType) {
        case 'duns':
            ret = cleanDUNS(ret);
            break;

        default:
            //console.log('No cleanup specified')
    }

    return ret;    
}

function readInputFile(
        file = 'DUNS.txt', //Name of the input file
        keyType = 'duns',
        dedup = true,      //Deduplicate the keys on the input file
        arrChunkSize = 50  //Size of the second dimension of the array
    ) {
        const setKeys = new Set; //Set is used for checking for duplicates

        //Read the input file line-by-line
        const liner = new lineByLine(`../io/in/${file}`);

        const retArr = [];

        let line, lineTransformed, arr = [];

        while(line = liner.next()) { //Loop over all the lines in the file
            lineTransformed = transform(line, keyType); //Cleanup done here

            if(dedup && setKeys.has(lineTransformed)) { //Duplicate check
                //console.log(`Duplicate key ${lineTransformed}`)
            }
            else {
                if(lineTransformed) { //New key with length > 0
                    arr.push(lineTransformed); //Add to the return array

                    //Add the key to the deduplication set
                    if(dedup) { setKeys.add(lineTransformed) }
                }
            }

            //Build the two dimensional array
            if(arr.length >= arrChunkSize) {
                retArr.push(arr);
        
                arr = [];
            }    
        }

        //Add the remainder to the two dimensional array
        if(arr.length) { retArr.push(arr) }

        return retArr;
}

export { readInputFile };
