import * as ChromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import Details from 'lighthouse/types/lhr/audit-details'
import _ from 'lodash'
import { AnalyzeResult } from '.'
import { Analyzer } from './Analzyser'
import { Config, ConfigResource } from './config'

const defaultOptions = {
  logLevel: 'warn',
  output: 'json',
  onlyCategories: ['performance'],
}

const defaultConfig = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop',
    locale: 'fr-FR',
    screenEmulation: {
      mobile: false,
      width: 1000,
      height: 2000,
      deviceScaleFactor: 1,
      disabled: false,
    },
    emulatedUserAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36',
    skipAudits: ['uses-http2'],
  },
}

export class LighthouseAnalyzer implements Analyzer {
  lhOptions: Record<string, string>
  lhConfig: Record<string, string>
  chromeOptions: ChromeLauncher.Options
  chrome: ChromeLauncher.LaunchedChrome | null

  constructor(config: Config) {
    this.chromeOptions = config.lighthouse.chromeOptions
    this.lhOptions = _.merge(defaultOptions, config.lighthouse.options)
    this.lhConfig = _.merge(defaultConfig, config.lighthouse.config)
    this.chrome = null
  }

  async init() {
    this.chrome = await ChromeLauncher.launch(this.chromeOptions)
  }

  async analyze(target: ConfigResource): Promise<AnalyzeResult> {
    const runnerResult = await lighthouse(
      target.url,
      { ...this.lhOptions, port: this.chrome?.port },
      this.lhConfig,
    )

    if (typeof runnerResult === 'undefined') {
      return {
        analyzer: 'lighthouse',
        timestamp: new Date(),
        resource: target,
        device: {
          type: 'desktop',
        },
      } as AnalyzeResult
    }

    const audits = runnerResult === null ? {} : runnerResult.lhr.audits

    const auditsList = Object.values(audits)
      .filter(audit => typeof audit.numericValue !== 'undefined')
      .map(audit => ({
        id: audit.id,
        title: audit.title,
        numericValue: audit.numericValue,
        numericUnit: audit.numericUnit,
        displayValue: audit.displayValue,
      }))

    if (
      audits['network-server-latency'] &&
      audits['network-server-latency'].details
    ) {
      const tableDetails: Details.Table = audits['network-server-latency']
        .details as Details.Table

      auditsList.push({
        id: 'network-hosts-count',
        title: 'Distinct hosts',
        numericValue: tableDetails.items.length,
        numericUnit: '',
        displayValue: '',
      })
    }

    if (audits['resource-summary'] && audits['resource-summary'].details) {
      const tableDetails: Details.Table = audits['resource-summary']
        .details as Details.Table

      auditsList.push({
        id: 'resource-summary-v2',
        title: 'Resource summary',
        numericValue: tableDetails.items[0].requestCount as number,
        numericUnit: '',
        displayValue: '',
      })
    }

    const results = Object.assign({}, ...auditsList.map(x => ({ [x.id]: x })))

    return {
      timestamp: new Date(),
      resource: target,
      device: {
        type: 'desktop',
      },
      result: results,
    } as AnalyzeResult
  }

  async kill() {
    if (this.chrome) {
      await this.chrome.kill()
    }
  }
}
