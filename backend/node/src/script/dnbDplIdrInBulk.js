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

import { nanoid } from "../share/utils.js";

import { DnbDplIDR } from "../share/apiDefs.js";

import { readInputFileAttrs } from "../share/readInputFileAttrs.js";

function processChunk(arrChunk) {
    return Promise.allSettled(
        arrChunk.map( idrParams => fetch(
                new DnbDplIDR(idrParams).getReq()
            )
            .then(resp => {
                if (resp.ok) {
                    return resp.json();
                }
                else {
                    throw new Error(`Fetch response not okay, HTTP status: ${resp.statusText}`);
                }
            })
            .then(dnbIdrRslt => dnbIdrRslt?.matchCandidates?.[0]?.organization?.duns)
        )
    );
}

async function processChunks(arrChunks) {
    //Process the array of work item chunks one chunk at a time
    for(const [ idx, arrChunk ] of arrChunks.entries()) {
        const arrSettled = await processChunk( arrChunk ); //One array chunk at a time
    
        //List the processing results
        console.log(`Chunk ${idx + 1}`);

        arrSettled.forEach(elem => {
            if(elem.value) {
                console.log(`name ${elem.value} ${nanoid()}`)
            }
            else {
                console.log(elem.reason)
            }
        });

        console.log('');
    }
}

processChunks(readInputFileAttrs())
