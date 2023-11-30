// *********************************************************************
//
// D&B Direct+ IDentity Resolution in bulk
// JavaScript code file: dnbDplIdrInBulk.js
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

import { dcdrUtf8, sDateIsoToYYYYMMDD, nanoid } from "../share/utils.js";

import { dnbDplLimiter } from '../share/limiters.js';

import { DnbDplIDR } from "../share/apiDefs.js";

import { readInputFileAttrs } from "../share/readInputFileAttrs.js";

//Import the file system for persisting API responses
import { promises as fs } from 'fs';

//Current month day is made part of the file name
const monthDay = sDateIsoToYYYYMMDD(new Date().toISOString(), 4);

function processChunk(arrChunk) {
    return Promise.allSettled(
        arrChunk.map(
            idrParams => {
                //Object for keeping track of data across multiple async calls
                const idrRslts = { idrParams };

                //Logic for processing an IDR request
                return dnbDplLimiter.removeTokens(1)                //Throttle the D+ API requests
                    .then(() => 
                        fetch(new DnbDplIDR(idrParams).getReq())    //Fire off the requests
                    )
                    .then(resp => {
                        idrRslts.httpStatus = resp.status;

                        return resp.arrayBuffer();                  //Retrieve the array buffer of the HTTP response
                    })
                    .then(arrBuff => {
                        const fID = idrRslts.idrParams.customerReference5 || nanoid();
                        const fn = `../io/out/dnb_dpl_idr_${monthDay}_${fID}_${idrRslts.httpStatus}.json`;

                        idrRslts.fn = fn;

                        return fs.writeFile( fn, dcdrUtf8.decode(arrBuff) ); //Write the file
                    })
                    .then(() => idrRslts)
                    .catch( err => console.error(err.message) );
            }
        )
    )
}

async function processChunks(arrChunks) {
    //Process the array of work item chunks one chunk at a time
    for(const [ idx, arrChunk ] of arrChunks.entries()) {
        const arrSettled = await processChunk( arrChunk ); //One array chunk at a time
    
        //List the processing results
        console.log(`Chunk ${idx + 1}`);

        arrSettled.forEach(elem => {
            if(elem.value) {
                console.log(`Successfully wrote file ${elem.value.fn}`)
            }
            else {
                console.error(elem.reason)
            }
        });

        console.log('');
    }
}

processChunks(readInputFileAttrs())
