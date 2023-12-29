// *********************************************************************
//
// Entry point the API Hub Express server 
// JavaScript code file: index.js
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

import express from 'express';
import { ApiHubErr } from './err.js';
import hub from './routes/hub.js';

const app = express();

const port = process.env.API_SERVER_PORT || 8080; //Server port

app.use('/hub', hub); //Base URL

app.use((req, resp) => { //An HTTP request catch-all
    const err = new ApiHubErr('unableToLocate', `Requested: ${req.path}`);

    resp.status(err.httpStatus.code).json( err );
});

//Start the Express server
const server = app.listen(port, err => {
    if(err) {
        console.log(`Error occurred initializing Express server, ${err.message}`)
    }
    else {
        console.log(`Now listening on port ${server.address().port}`)
    }
});
