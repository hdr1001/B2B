// *********************************************************************
//
// Process D&B Direct+ Family tree data
// JavaScript code file: dnbDplProcessFamTree.js
//
// Revived old code to parse a D&B Direct+ Family tree
// At this stage (October 2024) still a work in progress
// Status is "works for me", based on limited testing 
//
// Copyright 2024 Hans de Rooij
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

import { promises as fs } from 'fs';
import { readFileLimiter } from '../share/limiters.js';
import { addr, addressToArray } from '../share/dnbDplCommon.js';

const nullUndefToEmptyStr = elem => elem === null || elem === undefined ? '' : elem;

const sDir = '../io/out';
const sDate = '241018';

function processFamTree(famTree) {
    function processNode(node) {
      function getTradeStyle() {
         if(!node.tradeStyleNames || !node.tradeStyleNames.length) {
            return null;
         }

         node.tradeStyleNames.sort((elem1, elem2) => elem1.priority - elem2.priority);

         return node.tradeStyleNames?.[0].name;
      }

      function isBranch(arrRoles) {
         return arrRoles && arrRoles.length && arrRoles.some(role => role.dnbCode === 9140) ? true : false;
      }

      let arrOutNode = [];

      arrOutNode.push(node?.corporateLinkage?.parent?.duns);
      arrOutNode.push(node.duns);
      arrOutNode.push(node?.primaryName);
      arrOutNode.push(getTradeStyle());
      arrOutNode = arrOutNode.concat(addressToArray(
         node?.primaryAddress,
         [
            addr.component.addrLine1,
            addr.component.addrLine2,
            addr.component.locality,
            addr.component.region,
            addr.component.country,
            addr.component.countryISO,
            addr.component.postalCode
         ]
      ));
      arrOutNode.push(node?.primaryIndustryCode?.usSicV4);
      arrOutNode.push(node?.primaryIndustryCode?.usSicV4Description);
      arrOutNode.push(node?.startDate);
      arrOutNode.push(node?.numberOfEmployees?.[0].value);
      arrOutNode.push(node?.financials?.[0]?.yearlyRevenues?.[0]?.value);
      arrOutNode.push(isBranch(node?.corporateLinkage?.familytreeRolesPlayed));
      arrOutNode.push(node?.corporateLinkage?.hierarchyLevel);
      
      console.log(arrOut.map(nullUndefToEmptyStr).join('|') + '|' + arrOutNode.map(nullUndefToEmptyStr).join('|'));

      if(node.corporateLinkage.children) {
         node.corporateLinkage.children.forEach(child => {
            let childNode = oFamTree.familyTreeMembers.find(node => node.duns === child.duns);
            
            if(childNode) { processNode(childNode) }
         });
      }
    }

    const oFamTree = JSON.parse(famTree);

    const arrOut = [];

    arrOut.push(oFamTree.globalUltimateDuns);

    const gblUlt = oFamTree.familyTreeMembers.find(node => node.duns === oFamTree.globalUltimateDuns)

    processNode(gblUlt);

    arrOut.push(gblUlt.corporateLinkage.children.length);
}

//Read the D&B Direct+ IDentity Resolution JSON responses
fs.readdir(sDir)
    .then(arrFiles => {
        //Process the files available in the specified directory
        arrFiles
            .filter(fn => fn.endsWith('.json'))
            .filter(fn => fn.indexOf(sDate) > -1)
            .forEach(fn => 
                readFileLimiter.removeTokens(1)
                    .then(() => fs.readFile(`${sDir}/${fn}`))
                    .then(famTree => processFamTree(famTree))
                    .catch(err => console.error(err.message))
            );
    })
    .catch(err => console.error(err.message))
