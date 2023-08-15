//.env configuration
import * as dotenv from 'dotenv';
dotenv.config();

//Class for executing HTTPS requests
import * as https from 'https';

//Shared HTTP headers
const sharedHeaders = { 'Content-Type': 'application/json' };

const httpAttrLei = {
    host: 'api.gleif.org',
    headers: { ...sharedHeaders, 'accept': 'application/vnd.api+json' }
};

const httpAttrDpl = {
    host: 'plus.dnb.com',
    headers: {
        ...sharedHeaders,
        Authorization: `Bearer ${process.env.DNB_DPL_TOKEN}`        
    }
};

class Https {
    constructor(httpAttr) {
        this.httpAttr = httpAttr
    }

    execReq() {
        return new Promise((resolve, reject) => {
            const httpReq = https.request(this.httpAttr, resp => {
                const chunks = [];

                resp.on('error', err => reject(err));

                resp.on('data', chunk => chunks.push(chunk));

                resp.on('end', () => { //The data product is now available in full
                    const size = chunks.reduce((prev, curr) => prev + curr.length, 0);

                    resolve({
                        buffBody: Buffer.concat(chunks, size),
                        httpStatus: resp.statusCode
                    });
                });
            });

            if(this.httpAttr.method === 'POST' && this.httpAttr.body) {
                httpReq.write(this.httpAttr.body)
            }

            httpReq.end();
        })
    }
}

class LeiReq { //Get LEI record by ID 
    constructor(resource) {
        this.resource = resource;
    }

    def = { api: 'gleif', endpoint: 'leiRecs' };

    path = '/api/v1/lei-records/';

    execReq = function() {
        const http = new Https({
            ...httpAttrLei,
            path: `${this.path}${this.resource}`,
        });

        return http.execReq();
    };
}

class LeiFilter { //Get LEI record using filters
    constructor(qryParameters) {
        this.qryParameters = qryParameters;
    }

    def = { api: 'gleif', endpoint: 'leiRecs' };

    path = '/api/v1/lei-records';

    leiPageSizeNum = { 'page[size]': 10, 'page[number]': 1 };

    execReq = function() {
        const http = new Https({
            ...httpAttrLei,
            path: `${this.path}?${new URLSearchParams({ ...this.qryParameters, ...this.leiPageSizeNum })}`,
        });

        return http.execReq();
    };
}

class DnbDplAuth { //Get D&B D+ access token
    constructor() {
        //Really not for creating multiple instances
    }

    def = { api: 'dnbDpl', endpoint: 'auth' };

    path = '/v2/token';

    method = 'POST';

    execReq = function() {
        const http = new Https({
            ...httpAttrDpl,
            method: this.method,
            path: this.path,
            headers: {
                ...sharedHeaders,
                Authorization: `Basic ${Buffer.from(`${process.env.DNB_DPL_KEY}:${process.env.DNB_DPL_SECRET}`).toString('Base64')}`
            },
            body: JSON.stringify({ 'grant_type': 'client_credentials' })
        });

        return http.execReq();
    };

    //Propagate the token acquired
    updToken = accessToken => {
        process.env.DNB_DPL_TOKEN = accessToken;

        httpAttrDpl.headers.Authorization = `Bearer ${process.env.DNB_DPL_TOKEN}`;
    }
}

class DnbDplDBs { //Get D&B D+ data blocks
    constructor(resource, qryParameters) {
        this.resource = resource;        
        this.qryParameters = qryParameters;
    }

    def = { api: 'dnbDpl', endpoint: 'dbs' };

    path = 'v1/data/duns/';

    getReq = apiEndpoint.dnbDpl.dbs.getReq;
}

const leiReq = new LeiReq('529900F4SNCR9BEWFZ60');

leiReq.execReq().then(ret => console.log(ret.buffBody.toString()));

const leiFilter = new LeiFilter({
    'filter[entity.legalName]': 'Feyenoord',
    'filter[entity.legalAddress.country]': 'NL'
});

leiFilter.execReq().then(ret => console.log(ret.buffBody.toString()));

const dnbDplAuth = new DnbDplAuth;

dnbDplAuth.execReq().then(ret => console.log(ret.buffBody.toString()));

export { LeiReq, LeiFilter, DnbDplAuth, DnbDplDBs };
