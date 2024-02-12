// *********************************************************************
//
// API Hub server Postgres objects
// JavaScript code file: pg.js
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

import pg from 'pg';
pg.defaults.parseInt8 = true;

const { Pool } = pg;

const { PG_HOST, PG_DATABASE, PG_USER, PG_PASSWORD } = process.env;

const pgConn = {
    host: PG_HOST,
    database: PG_DATABASE,
    user: PG_USER,
    password: PG_PASSWORD,
    port: 5432,
    max: 10, //set pool max size to 10
    idleTimeoutMillis: 1000, //close idle clients after 1 second
    connectionTimeoutMillis: 9999, //return an error after 10 seconds if connection could not be established
    maxUses: 7500, //close (and replace) a connection after it has been used 7500 times
}

//const pool = new Pool({ ...pgConn, ssl: false });
const pool = new Pool({ ...pgConn, ssl: { require: true } });

pool.query('SELECT NOW() as now')
    .then(sqlRslt => console.log(`Database connection at ${sqlRslt.rows[0].now}`))
    .catch(err => console.log(err));

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
// https://node-postgres.com/features/pooling
pool.on('error', (err, client) => {
    console.log(`Unexpected error on idle client ${err.toString()}`);
    process.exit(-1);
})
  
export default {
    query: (text, params) => pool.query(text, params)
}
