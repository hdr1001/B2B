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

import { readInputFile } from "../share/readInputFileKeys.js";

const arrInp = readInputFile();

async function process(arr) {
    const retArr = [];

    arr.forEach(element => retArr.push(new Promise(resolve => setTimeout(() => resolve(element), Math.floor(Math.random() * 1000)))));

    return Promise.all(retArr);
}

for(const arrChunk of arrInp) {
    const arrResolved = await process(arrChunk);

    console.log(`Chunk ${arrResolved.length}`);
    arrResolved.forEach(elem => console.log(elem));
}
