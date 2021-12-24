import lighthouse from 'lighthouse'
import chromeLauncher from 'chrome-launcher'
import _ from 'lodash'

const defaultOptions = {
    logLevel: 'warn', 
    output: 'json', 
    onlyCategories: ['performance']
}

const defaultConfig = {
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
    }
}

let lhOptions, lhConfig, chrome

export async function init(config) {
    chrome = await chromeLauncher.launch(config.lighthouse.chrome)

    lhOptions = _.merge(defaultOptions, config.lighthouse.options, { port: chrome.port })
    lhConfig = _.merge(defaultConfig, config.lighthouse.config)    
}

export async function run(urlToCrawl, store) {
    const runnerResult = await lighthouse(urlToCrawl.url, lhOptions, lhConfig)

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

    await store({
        '@timestamp' : new Date(),
        device: {
            type: 'desktop'
        },
        meta : urlToCrawl,
        audits
    })
}