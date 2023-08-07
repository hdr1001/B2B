const baseURL = url => `${url.scheme}://${url.domainSub}.${url.domain}.${url.domainTop}${url.port ? ':' + url.port : ''}/`;

const sharedHeaders = { 'Content-Type': 'application/json' };

const api = {
    gleif: {
        url: {
            scheme: 'https',
            domainSub: 'api',
            domain: 'gleif',
            domainTop: 'org',
            port: '',
        },
        headers: sharedHeaders
    }
};

const apiEndpoint = {
    gleif: {
        leiPageSizePageNum: { 'page[size]': 10, 'page[number]': 1 },
        leiRecs: { //LEI records
            path: baseURL(api.gleif.url) + 'api/v1/lei-records/',
            getReq: function(lei) {
                return new Request(
                    `${this.path}${lei}`,
                    {
                        headers: api.gleif.headers
                    }    
                )
            }
        },

        leiRecRegAs: {
            path: baseURL(api.gleif.url) + 'api/v1/lei-records/',
            getReq: function(regNum, isoCtry) { //Registration number exchanged for LEI
                const qryParameters = {
                    ...apiEndpoint.gleif.leiPageSizePageNum,
                    'filter[entity.registeredAs]': regNum,
                    'filter[entity.legalAddress.country]': isoCtry,
                };

                return new Request(
                    `${this.path}?${new URLSearchParams(qryParameters)}`,
                    {
                        headers: api.gleif.headers
                    }    
                )
            }
        }
    }
};

let apiKey = 'gleif'; 
let apiEndpointKey = 'leiRecs';

const lei = '529900W18LQJJN6SJ336';

fetch(apiEndpoint[apiKey][apiEndpointKey].getReq(lei))
    .then(resp => {
        if (resp.ok) {
            return resp.json();
        }
        else {
            throw new Error(`Fetch response not okay, HTTP status: ${resp.statusText}`);
        }
    })
    .then(leiRec => {
        if(lei === leiRec?.data?.attributes?.lei) {
            console.log('✅ LEI request')
        }
        else {
            console.log('❌ LEI request')
        }
    })
    .catch(err => console.error("Unable to fetch -", err));


apiEndpointKey = 'leiRecRegAs';

fetch(apiEndpoint[apiKey][apiEndpointKey].getReq('33302453', 'NL'))
    .then(resp => {
        if (resp.ok) {
            return resp.json();
        }
        else {
            throw new Error(`Fetch response not okay, HTTP status: ${resp.statusText}`);
        }
    })
    .then(leiRec => {
        if(leiRec?.data?.[0]?.attributes?.lei === '724500QLFWTRHA3K0440') {
            console.log('✅ Registration number exchange for LEI')
        }
        else {
            console.log('❌ Registration number exchange for LEI')
        }
    })
    .catch(err => console.error("Unable to fetch -", err));
    