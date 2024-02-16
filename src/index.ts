'use strict'

import { setTimeout } from 'node:timers/promises'

import { Analyzer } from './Analzyser'
import { LighthouseAnalyzer } from './LighthouseAnalyzer.js'
import { NetAnalyzer } from './NetAnalyzer.js'
import { ConfigFactory, ConfigResource } from './config.js'
import { ElasticsearchStore } from './elasticsearch.js'

import { Command } from 'commander'

//add the following line
const program = new Command()

program
  .version('1.0.0')
  .description('Run web benchmarks')
  .requiredOption('-c, --config [value]', 'config yaml file path')
  .parse(process.argv)

const options = program.opts()

// console.log(figlet.textSync('BenchTheNet'))

const configFactory = new ConfigFactory()

export type AnalyzeDevice = {
  type: string
}

export type AnalyzeResult = {
  timestamp: Date
  analyzer: string
  resource: ConfigResource
  device: AnalyzeDevice
  result: Record<string, any>
}

async function main() {
  const config = await configFactory.build(options.config)
  const store = new ElasticsearchStore(config)
  const analyzerNet = new NetAnalyzer(config)
  const analyzerLighthouse = new LighthouseAnalyzer(config)

  const analyzers = [analyzerNet, analyzerLighthouse]

  await store.init()
  await analyzerLighthouse.init()

  let urlIndex = 0

  const { resources } = config

  while (true) {
    const urlToCrawl = resources[urlIndex]

    console.log(`=======> Analyzing ${urlToCrawl.url}`)

    const results = await Promise.all(
      analyzers.map((analyzer: Analyzer) => {
        return analyzer.analyze(urlToCrawl)
      }),
    )

    results.map((result: AnalyzeResult) => {
      store.store(result)
    })

    urlIndex += 1

    if (urlIndex >= resources.length) {
      urlIndex = 0
    }

    await setTimeout(100)
  }
}

main()
  .then(text => {
    console.log(text)
  })
  .catch(err => {
    console.log(err)
  })
