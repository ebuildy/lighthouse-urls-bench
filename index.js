const { Client } = require('@elastic/elasticsearch')
const logger = require('loglevel')
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const { getSystemErrorMap } = require('util');
const { exit } = require('process');

const client = new Client({
  node: 'http://localhost:9200'
})

const urls = [
    {
        "site": "qwant",
        "url" : "https://www.qwant.com",
        "name" : "home"
    },
    {
        "site": "qwant",
        "url" : "https://www.qwant.com/?q=toulon&t=web",
        "name" : "search_city"
    },
    {
        "site": "qwant",
        "url" : "https://www.qwant.com/?q=qwant&t=web",
        "name" : "search_qwant"
    },
    {
        "site": "duckduckgo",
        "url" : "https://duckduckgo.com/",
        "name" : "home"
    },
    {
        "site": "duckduckgo",
        "url" : "https://duckduckgo.com/?q=toulon&t=h_&ia=web",
        "name" : "search_city"
    },
    {
        "site": "duckduckgo",
        "url" : "https://duckduckgo.com/?q=qwant&t=h_&ia=web",
        "name" : "search_qwant"
    },
    {
        "site": "google",
        "url" : "https://www.google.com/",
        "name" : "home"
    },
    {
        "site": "google",
        "url" : "https://www.google.com/search?q=toulon&source=hp",
        "name" : "search_city"
    },
    {
        "site": "google",
        "url" : "https://www.google.com/search?q=qwant&source=hp",
        "name" : "search_qwant"
    },
    {
        "site": "bing",
        "url" : "https://www.bing.com/",
        "name" : "home"
    },
    {
        "site": "bing",
        "url" : "https://www.bing.com/search?q=toulon&form=QBLH&sp=-1&pq=toul&sc=8-4&qs=n&sk=&",
        "name" : "search_city"
    },
    {
        "site": "bing",
        "url" : "https://www.bing.com/search?q=qwant&form=QBLH&sp=-1&pq=toul&sc=8-4&qs=n&sk=&",
        "name" : "search_qwant"
    },
    {
        "site": "ecosia",
        "url" : "https://www.ecosia.org/",
        "name" : "home"
    },
    {
        "site": "ecosia",
        "url" : "https://www.ecosia.org/search?q=toulon",
        "name" : "search_city"
    },
    {
        "site": "ecosia",
        "url" : "https://www.ecosia.org/search?q=qwant",
        "name" : "search_qwant"
    }
]

const esIndexName = 'lighthouse-results-v2'

async function run () {

    var urlIndex = 0;

    try {
        await client.indices.create({
            index: esIndexName,
            body: {
                settings: {
                    index: {
                        number_of_shards: 1,
                        number_of_replicas: 0
                    }
                },
                mappings: {
                    dynamic_templates: [
                        {
                            numericValue : {
                                match: "numericValue",
                                mapping : {
                                    type : "float"
                                }
                            }
                        }
                    ]
                }
            }
        });
    }
    catch(e) {
        logger.error(e)
    }

    const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});

    const options = {
        logLevel: 'warn', 
        output: 'json', 
        onlyCategories: ['performance'], 
        port: chrome.port
    }

    const lhConfig = {
        extends: 'lighthouse:default',
        settings: {
            formFactor: "desktop",
            "locale": "fr-FR",
            "screenEmulation": {
                "mobile": false,
                "width": 1000,
                "height": 2000,
                "deviceScaleFactor": 1,
                "disabled": false
              },
          emulatedUserAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36",
          skipAudits: ['uses-http2']
        },
      }

    while(true) {

        const urlToCrawl = urls[urlIndex];

        logger.info("=======> Analyzing " + urlToCrawl.url)

        const runnerResult = await lighthouse(urlToCrawl.url, options, lhConfig);

        const auditDomains = {
            id: 'network-hosts-count',
            title: 'Distinct hosts',
            numericValue: runnerResult.lhr.audits['network-server-latency'].details.items.length,
            numericUnit: "",
            displayValue: ""
        }

        const auditResourceSummary = {
            id: 'resource-summary-v2',
            title: 'Resource summary',
            numericValue: runnerResult.lhr.audits['resource-summary'].details.items[0].requestCount,
            numericUnit: "",
            displayValue: ""
        }

        const auditsList = Object
            .values(runnerResult.lhr.audits)
            .filter(audit => {
                return typeof audit.numericValue != 'undefined'
            }).map(audit => {
                return {
                    id: audit.id,
                    title: audit.title,
                    numericValue: audit.numericValue,
                    numericUnit: audit.numericUnit,
                    displayValue: audit.displayValue
                }
            })

        auditsList.push(auditDomains)
        auditsList.push(auditResourceSummary)

        const audits = Object.assign({}, ...auditsList.map((x) => ({[x.id]: x})));

        try {
            await client.index({
                index: esIndexName,
                body: {
                    '@timestamp' : new Date(),
                    meta : urlToCrawl,
                    audits
                }
            })
        } catch(e) {
            logger.error(e.meta.body.error)
        }

        urlIndex ++;

        if (urlIndex >= urls.length) {
            urlIndex = 0;
        }
    }
};

run().catch(console.log)