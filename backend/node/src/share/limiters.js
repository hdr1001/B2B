// *********************************************************************
//
// B2B rate limiters, stay within the bandwidth provided
// JavaScript code file: limiters.js
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

//Using the module provided by John Hurliman
//https://github.com/jhurliman/node-rate-limiter
import { RateLimiter } from 'limiter';

//Max bandwidth on the GLEIF API
const gleifLimiter = new RateLimiter({ tokensPerInterval: 2, interval: 'second' });

//Max bandwidth on the GLEIF API
const dnbDplLimiter = new RateLimiter({ tokensPerInterval: 4, interval: 'second' });

//Max bandwidth for reading files
const readFileLimiter = new RateLimiter({ tokensPerInterval: 50, interval: 'second' });

//Max bandwidth for executing SQL statements
const pgDbLimiter = new RateLimiter({ tokensPerInterval: 50, interval: 'second' });

export { gleifLimiter, dnbDplLimiter, readFileLimiter, pgDbLimiter };
