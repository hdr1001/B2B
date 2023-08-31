// *********************************************************************
//
// Enrich a list of keys (DUNS/LEI/...) using an API
// JavaScript code file: getListOfKeys.js
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

//Functionality to read DUNS, LEIs, etc. from a file
import { readInputFile } from "../share/readInputFileKeys.js";

//Import the GLEIF API and D&B Direct+ rate limiters
import { gleifLimiter } from '../share/limiters.js';

//Emply the respective API definitions
import { LeiReq } from "../share/apiDefs.js"

//Decoder object for decoding utf-8 data in a binary format
import { dcdrUtf8 } from '../share/utils.js';

//Read key data from a file into a two-dimensional array
const arrInp = readInputFile('LEI.txt');

//Asynchronous function for processing the API requests
async function process(arr) {
    return Promise.allSettled(arr.map(key => {
        const ret = { key }; //Start building the return object

        return new Promise((resolve, reject) => {
            gleifLimiter.removeTokens(1) //Respect the API rate limits
                .then(() => fetch(new LeiReq(key).getReq())) //The actual API call
                .then(resp => {
                    if (resp.ok) {
                        ret.httpStatus = resp.status; //Return the HTTP status code

                        return resp.arrayBuffer();
                    }
                    else {
                        reject(`Fetch response not okay, HTTP status: ${resp.statusText}`);
                    }
                })
                .then(arrBuff => {
                    ret.arrBuff = arrBuff; //Return the JSON (as an array of buffers)

                    resolve(ret); //The happy flow return right here
                })
                .catch(err => reject(err))
        });
    }))
}

//Process the array of arrays one array at a time
for(const [idx0, arrChunk] of arrInp.entries()) {
    const arrResolved = await process(arrChunk); //One array at a time

    console.log(`Iteration ${idx0}\n`);

    arrResolved.forEach((elem, idx1) => { //Implement synchronous post-processing below
        if(elem.status === 'fulfilled') {
            console.log(`Element ${idx1}, representing key ${elem.value.key}, fulfilled with status ${elem.value.httpStatus}`)
            //console.log(dcdrUtf8.decode(elem.value.arrBuff))
        }
    });
}
