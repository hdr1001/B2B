// *********************************************************************
//
// Read an input file into a two dimensional array
// JavaScript code file: readInputFile.js
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

function transform(buff) {
    return buff.toString('utf8').trim();    
}

function readInputFile(
        file = 'DUNS.txt', //Name of the input file
        arrChunkSize = 50  //Size of the second dimension of the array
    ) {
        const liner = new lineByLine(`./io/in/${file}`);

        const retArr = [];

        let line, lineTransformed, arr = [];

        while(line = liner.next()) {
            lineTransformed = transform(line);

            if(lineTransformed) { arr.push(lineTransformed) }

            if(arr.length >= arrChunkSize) {
                retArr.push(arr);
        
                arr = [];
            }    
        }

        if(arr.length) { retArr.push(arr) }

        return retArr;
}

export { readInputFile };
