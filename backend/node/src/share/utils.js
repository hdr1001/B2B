// *********************************************************************
//
// Collection of shared utilities
// JavaScript code file: utils.js
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

//Some imports related to reading and writing to and from files
import * as os from 'os';
import { promises as fs } from 'fs';

//A decoder takes a stream of bytes as input & emits a stream of code points
const dcdrUtf8 = new TextDecoder('utf-8');

//Update a key value in the .env file
//Source: https://stackoverflow.com/questions/64996008/update-attributes-in-env-file-in-node-js
function setEnvValue(key, value) {
    const dotEnv = '.env';

    // read file from hdd & split if from a linebreak to a array
    fs.readFile(dotEnv, 'utf8')
        .then(file => {
            const ENV_VARS = file.split(os.EOL);

            // find the env we want based on the key
            const target = ENV_VARS.indexOf(ENV_VARS.find((line) => {
                // (?<!#\s*)   Negative lookbehind to avoid matching comments (lines that starts with #).
                //             There is a double slash in the RegExp constructor to escape it.
                // (?==)       Positive lookahead to check if there is an equal sign right after the key.
                //             This is to prevent matching keys prefixed with the key of the env var to update.
                const keyValRegex = new RegExp(`(?<!#\\s*)${key}(?==)`);
    
                return line.match(keyValRegex);
            }));
    
            // if key-value pair exists in the .env file,
            if (target !== -1) { // replace the key/value with the new value
                ENV_VARS.splice(target, 1, `${key}=${value}`);
            }
            else { // if it doesn't exist, add it instead
                ENV_VARS.push(`${key}=${value}`);
            }

            return ENV_VARS;
        })
        .then(ENV_VARS => fs.writeFile(dotEnv, ENV_VARS.join(os.EOL)))
        .then(() => console.log(`Succesfully updated file ${dotEnv}`))
        .catch(err => console.error(err));
}
  
export { dcdrUtf8, setEnvValue };