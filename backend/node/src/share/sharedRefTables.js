// *********************************************************************
//
// D&B Direct+ shared code, shared reference tables
// JavaScript code file: sharedRefTables.js
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

// Some registration numbers are VAT#s
// Gentle reminder -> ... is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND ...
const regNumTypeIsVAT = new Set([
    99,    //BE Member
    480,   //LU Member
    481,   //IT Member
    521,   //DK Member
    552,   //FI Member
    1332,  //AD Other
    1334,  //AR RoW
    1339,  //BO RoW
    1340,  //BR RoW
    1344,  //CL RoW
    1346,  //CO RoW
    1348,  //CR RoW
    1351,  //CZ Member
    1352,  //DO RoW
    1353,  //EC RoW
    1354,  //SV RoW
    1356,  //GT RoW
    1361,  //HU Member
    1367,  //JM RoW
    1374,  //MX RoW
    1378,  //NI RoW
    1380,  //PA RoW
    1381,  //PY RoW
    1382,  //PE RoW
    1391,  //TH RoW
    1394,  //UY RoW
    1395,  //VE RoW
    1396,  //VE RoW
    1423,  //AT Member
    1425,  //BG Member
    1428,  //EE Member
    1431,  //LV Member
    1432,  //LI EFTA
    1433,  //LT Member
    1435,  //PL Member
    1437,  //RU Other
    1438,  //SK Member
    1440,  //CH EFTA
    1442,  //TR Candidate
    1861,  //SE Member
    2080,  //FR Member
    2432,  //PT Member
    2472,  //ES Member
    2530,  //IE Member
    2550,  //GB Other
    6273,  //NL Member
    6863,  //US RoW
    6867,  //DE Member
    9125,  //MC Other
    9330,  //EG RoW
    9333,  //IS EFTA
    9336,  //MT Member
    9341,  //AL Candidate
    13103, //PH RoW
    13111, //ID RoW
    14257, //HR Member
    14259, //GR Member
    15169, //ZA RoW
    17277, //MK Candidate
    17282, //BA Other
    17283, //CY Member
    17891, //AU RoW
    30080, //SK Member
    30081, //CZ Member
    30310, //XK RoW
    30317, //RS Candidate
    30318, //ME Candidate
    32167, //IN RoW
    33317, //AE RoW
    33318, //SA RoW
    33323, //IN RoW
    34766, //CA RoW
    34802, //DZ RoW
    36137, //HU Member
    37716, //SI Member
    37794, //SM Other
    42066, //NO EFTA
    42067, //SE Member
    42083  //RO Member
]);

export { regNumTypeIsVAT };
