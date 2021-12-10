import { urls } from './urls.mjs'
import { init as initES, store } from './elasticsearch.mjs'
import { run as runNet } from './runnerNet.mjs'
import { run as runLighthouse } from './runnerLighthouse.mjs'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function run () {

    var urlIndex = 0;

    initES();

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