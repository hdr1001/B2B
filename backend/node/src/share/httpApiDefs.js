//Class for executing HTTPS requests
import * as https from 'https';

class Https {
    constructor() {
        this.httpAttr = {
            host: 'api.gleif.org',
            path: '/api/v1/countries',
            method: 'GET',
            headers: { 'accept': 'application/vnd.api+json' }
        };
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

const ohttps = new Https;

ohttps.execReq().then(ret => console.log(ret.buffBody.toString()));
