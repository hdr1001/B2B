// *********************************************************************
//
// Class for adding a label to a data-element
// JavaScript code file: elemLabel.js
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

class ElemLabel {
    constructor(label, idx, pre, post) {
        this.label = label;
        this.idx = idx;
        this.pre = pre;
        this.post = post;
    }

    setLabelIdx(label, idx) {
        if(label) { this.label = label }

        if(idx || idx === 0) {
            this.idx = idx 
        }

        return this;
    }

    toString() {
        let ret = this.pre ? `${this.pre} ${this.label}` : this.label;

        if(this.post) { ret += ' ' + this.post }
        if(this.idx || this.idx === 0) { ret += ' ' + this.idx }

        return ret;
    }
}

const constructElemLabel = (elemLabel, text, idx) => elemLabel instanceof ElemLabel
        ? elemLabel.setLabelIdx(text, idx).toString()
        : new ElemLabel(text, idx);

export { ElemLabel, constructElemLabel };
