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

function doWork() {
    return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000)))
}

const job = [];

for(let i = 0; i < 5; i++) {
    job.push([ i, [] ]);

    for(let j = 0; j < 50; j++) {
        job[ i ][ 1 ].push( { workItem:`item ${j} of chunk ${i + 1}`, status: 'In progress' } )
    }
}

//Asynchronous function for processing job chunks
async function process(arr) {
    return Promise.all(arr.map( elem => doWork().then( () => elem.status = 'done' ) ))
}

//Process the array of arrays one array at a time
for(const [idx0, arrChunk] of job.entries()) {
    await process( arrChunk[1] ); //One array at a time

    console.log(`Round ${idx0 + 1}`);

    arrChunk[1].forEach(elem => {
        console.log(`${elem.workItem} now has status ${elem.status}`);
    });

    console.log('');
}
