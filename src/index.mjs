import { init as initES, store } from './elasticsearch.mjs'
import { init as initRunnerNet, run as runNet } from './runnerNet.mjs'
import { init as initRunnerLighthouse, run as runLighthouse } from './runnerLighthouse.mjs'
import { configure } from './config.mjs'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function run () {

    let urlIndex = 0
    const config = configure('./config.yaml')
    const urls = config.urls

    initRunnerNet(config)
    initRunnerLighthouse(config)
    initES(config.elasticsearch)

    while(true) {

        const urlToCrawl = urls[urlIndex];

        console.log("=======> Analyzing " + urlToCrawl.url)

        await runNet(urlToCrawl, store)
        await runLighthouse(urlToCrawl, store)

        urlIndex ++;

        if (urlIndex >= urls.length) {
            urlIndex = 0;
        }

        await delay(100)
    }
};

run().catch(console.log)