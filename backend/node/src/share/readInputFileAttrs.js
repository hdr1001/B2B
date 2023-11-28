// *********************************************************************
//
// Read an input file into an array of arrays of objects
// JavaScript code file: readInputFileAttrs.js
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

//Import library for synchronous file read
import { readFileSync } from 'fs';

function readInputFileAttrs(
        file = 'idr.txt', //Name and parh to the input file
        splitOn = '|',     //Attribute delimiter
        arrChunkSize = 50  //Size of the second dimension of the array
    ) {
        let arrIn;
 
        //Read the input file (synchronous)
        try {
           arrIn = readFileSync(`../io/in/${file}`).toString().split('\n')
        }
        catch(err) {
           console.error(err.message);
           return arrIn;
        }
     
        //Remove empty rows & split on delimiter
        arrIn = arrIn
            .map(row => row.trim())
            .filter(row => !!row)
            .map(row => row.split(splitOn));

        //Split the rows into a header (arrIn) & input rows (arrRows)
        const arrRows = arrIn.splice(1);

        //Return an array of request objects
        return arrRows.map(elem => elem.reduce(
            (obj, currValue, idx) => { obj[arrIn[0][idx]] = currValue; return obj },
            {},
        ));
}

export { readInputFileAttrs };
