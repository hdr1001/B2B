// *********************************************************************
//
// B2B test code, process data in chunks
// JavaScript code file: chunks.js
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

//Set the number of work items to be processed
const numWorkItems = 260;

//Create an array for storing the work items
const arrWorkItems = new Array(numWorkItems);

//Fill arrWorkItems with work item objects
for(let i = 0; i < numWorkItems; i++) {
    arrWorkItems[ i ] = { item:`item ${i}`, stage: 'created' };
}

//Initialize the array to divvy up arrWorkItems & set the chunck size
const arrChunks = [], chunkSize = 50;

//Divvy up arrWorkItems
for(let i = 0; i < numWorkItems; i += chunkSize) {
    arrChunks.push(arrWorkItems.slice(i, i + chunkSize));
}

//Simulate some work being done
function doWork(workItem) {
    const rnd = Math.random();

    //Simulate an error condition
    if(rnd > 0.95) {
        workItem.stage = 'rejected';
        return Promise.reject(new Error(`No worries ➡️ it's just that rnd > 0.95, item = ${workItem.item}`));
    }

    //Set the resolve delay in milliseconds
    const msDelay = Math.floor(rnd * 3000);

    //Resolve the promise after a short delay
    return new Promise(
        resolve => {
            setTimeout(() => {
                    workItem.stage = 'done';
                    resolve(workItem);
                },
                msDelay
            )
        }
    )
}

//Asynchronous function for processing a chunk of work items
async function processChunk(arrChunk) {
    return Promise.allSettled(
        arrChunk.map(
            workItem => { 
                workItem.stage = 'processing';
                return doWork(workItem) 
                /*
                    .then( workItem => { console.log(workItem.stage); return workItem })
                    .catch( err => { console.error(err); throw err })
                */
            }
        )
    );
}

//Process the array of work item chunks one chunk at a time
for(const [ idx, arrChunk ] of arrChunks.entries()) {
    const arrSettled = await processChunk( arrChunk ); //One array chunk at a time

    //List the processing results
    console.log(`Chunk ${idx + 1}`);

    arrSettled.forEach(elem => {
        if(elem.value) {
            console.log(`Work ${elem.value.item} has status ${elem.status} with stage ${elem.value.stage}`)
        }
        else {
            console.log(elem.reason)
        }
    });

    console.log('');
}
