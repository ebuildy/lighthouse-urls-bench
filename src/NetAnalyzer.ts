/* eslint-disable max-len */
import logger from 'loglevel'
import nettime from 'nettime'
import { AnalyzeResult } from '.'
import { Analyzer } from './Analzyser'
import { Config, ConfigResource } from './config'

export class NetAnalyzer implements Analyzer {
  gblCookies: Record<string, string>

  constructor(config: Config) {
    this.gblCookies = config.cookies
  }

  getDurationMilliseconds(start: number[], end: number[]): number {
    let seconds = end[0] - start[0]
    let nanoseconds = end[1] - start[1]
    if (nanoseconds < 0) {
      --seconds
      nanoseconds += 1e9
    }
    return this.getMilliseconds([seconds, nanoseconds])
  }

  getMilliseconds([seconds, nanoseconds]: number[]): number {
    return seconds * 1000 + Math.round(nanoseconds / 1000) / 1000
  }

  async analyze(target: ConfigResource): Promise<AnalyzeResult> {
    const result = await nettime({
      url: target.url || '',
      includeHeaders: true,
      returnResponse: true,
      followRedirects: false,
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'max-age=0',
        cookie: this.gblCookies[target.site] || '',
        dnt: '1',
        referer: 'https://www.google.com/',
        'sec-ch-ua':
          'Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': 'macOS',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36',
      },
    })

    if (result.statusCode === 302) {
      logger.error('We should not see redirection ...')
      console.log(result)
    }

    const { timings } = result

    const metrics = {
      statusCode: result.statusCode,
      socketOpen: this.getMilliseconds(timings.socketOpen),
      dnsLookup: this.getMilliseconds(timings.dnsLookup),
      tcpConnection: this.getDurationMilliseconds(
        timings.socketOpen,
        timings.tcpConnection,
      ),
      tlsHandshake: this.getDurationMilliseconds(
        timings.tcpConnection,
        timings.tlsHandshake,
      ),
      firstByte: this.getDurationMilliseconds(
        timings.tlsHandshake,
        timings.firstByte,
      ),
      contentTransfer: this.getDurationMilliseconds(
        timings.firstByte,
        timings.contentTransfer,
      ),
      socketClose: this.getDurationMilliseconds(
        timings.contentTransfer,
        timings.socketClose,
      ),
      responseSize: result.response?.byteLength,
      headers: result.headers,
    }

    return {
      timestamp: new Date(),
      analyzer: 'net',
      resource: target,
      device: {
        type: 'desktop',
      },
      result: metrics,
    } as AnalyzeResult
  }
}
