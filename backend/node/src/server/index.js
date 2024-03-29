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
import 'dotenv/config'; //.env configuration
import { initConfig } from './globs.js';
import { ApiHubErr } from './err.js';
import DplAuthToken from '../share/dnbDplAuth.js'

const app = express();
app.use( express.json() );

//Load, when the database connection is ready, the API Hub routes
await initConfig()
    .then( () => (async () => await import('./routes/hub.js'))() )
    .then( hub => app.use('/hub', hub.default) );

const port = process.env.API_SERVER_PORT || 8080; //Server port

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

//Handle SIGINT (i.e. Ctrl+C) interrupt
process.on('SIGINT', () => {
    console.log('\nServer received SIGINT');

    server.close(() => {
        console.log('Express server closed');

        process.exit(0);
    });
});

const dplAuthToken = new DplAuthToken('v2', false);
