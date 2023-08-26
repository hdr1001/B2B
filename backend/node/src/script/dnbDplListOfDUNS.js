// *********************************************************************
//
// D&B Direct+ utilities, enrich a list of DUNS
// JavaScript code file: dnbDplListOfDUNS.js
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

import lineByLine from 'n-readlines';

const liner = new lineByLine('./io/in/DUNS.txt');

const numRowChunks = 50;

function processFilePart(arr) {
    arr.forEach(element => {
        console.log(element)
    });

    return new Promise(r => setTimeout(r, 2000));
}

let line, lineTrimmed, arr = [];

while (line = liner.next()) {
    lineTrimmed = line.toString('utf8').trim();

    if(lineTrimmed) { arr.push(lineTrimmed) }

    if(arr.length >= numRowChunks) {
        await processFilePart(arr);

        arr = [];
    }
}

await processFilePart(arr);
