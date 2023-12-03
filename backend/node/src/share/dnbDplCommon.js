// *********************************************************************
//
// D&B Direct+ code shared by Data Block and Match Candidate object
// wrappers
// JavaScript code file: dnbDplCommon.js
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

import { objEmpty } from "./utils.js";

import { constructElemLabel } from "./elemLabel.js";

//Test if a variable is an object ➡️ null doesn't qualify!
const isObject = obj => typeof obj === 'object' && obj !== null;

//Recursively get to an attribute value
const getObjAttrValue = (obj, component) => {
    function getNextObjAttrValue(obj, component) {
        if(!isObject(obj)) { return null }

        if(idx === component.attrs.length - 1)  { return obj[component.attrs[idx]] }

        return getNextObjAttrValue( obj[component.attrs[idx++]], component );
    }

    let idx = 0;

    return getNextObjAttrValue(obj, component);
}

//Method addressToArray will convert D&B Direct+ address objects (primary, registered,
//...) to an array of a specified length (= arrAddrComponents.length).
//This method is applicable to data blocks Company Information L1+ and Hierarchies & 
//Connections L1
//
//Three parameters
//1. A reference to a Direct+ address object
//2. An array of address object attributes or the outcome of a custom algorithm can be 
//   returned (options: oDpl.consts.addr.component)
//3. Specify boolean value true for the element labels to be returned
function addressToArray(addr, arrAddrComponents, elemLabel) {
    //Return the address attribute value for a specific address object attribute or
    //invoke a custom, address related, algorithm
    function getAttrValue(oAddr, addrComponent) {
        if(typeof oAddr !== 'object' || objEmpty(oAddr)) {
            return null
        }

        //Custom address component algorithms
        if(addrComponent.custom === 'line1') { //Custom algorithm named line1
            //This algorithm goes the extra mile to insure data for line 1
            if(oAddr?.streetAddress?.line1) { return oAddr.streetAddress.line1 }

            let ret;

            if(oAddr?.streetName) { ret = addr.streetName }

            if(oAddr?.streetNumber) {
                if(ret) {
                    ret += ' ' + oAddr.streetNumber
                }
                else {
                    ret = oAddr.streetNumber
                }
            }

            if(ret) { return ret }

            if(oAddr?.postOfficeBox && oAddr?.postOfficeBox?.postOfficeBoxNumber) {
                if(oAddr?.postOfficeBox?.typeDescription) {
                    return `Pobox ${oAddr.postOfficeBox.postOfficeBoxNumber}`
                }
                else {
                    return oAddr.postOfficeBox.postOfficeBoxNumber
                }
            }

            return null;
        }

        //From here on out straight-up address object attribute values are returned.
        //These values are mapped 1-2-1 but, at most, two levels deep.
        return getObjAttrValue(oAddr, addrComponent)
    }

    //Use map to return a new array of labels or attribute values
    return arrAddrComponents.map(addrComponent => elemLabel 
        ? constructElemLabel(elemLabel, addrComponent.desc)
        : getAttrValue(addr, addrComponent)
    )
}

export { isObject, getObjAttrValue, addressToArray };
