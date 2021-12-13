import nettime from 'nettime'
import logger from 'loglevel'
import {
    getDuration, getMilliseconds,
    computeAverageDurations, createTimingsFromDurations
} from 'nettime/lib/timings.js'

import { cookies as sitesCookies } from './cookies.mjs'

export async function run(urlToCrawl, store) {
    const results = await nettime({
        url: urlToCrawl.url,
        includeHeaders: true,
        returnResponse: true,
        followRedirects: true,
        headers : {
            'accept': "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            'accept-encoding': "gzip, deflate, br",
            'accept-language': "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
            'cache-control': "max-age=0",
            'cookie': sitesCookies [urlToCrawl.site],
            'dnt':  "1",
            'referer': "https://www.google.com/",
            'sec-ch-ua': 'Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
            'sec-ch-ua-mobile': "?0",
            'sec-ch-ua-platform': "macOS",
            'sec-fetch-dest': "document",
            'sec-fetch-mode': "navigate",
            'sec-fetch-site': "cross-site",
            'sec-fetch-user': "?1",
            'upgrade-insecure-requests': "1",
            'user-agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36"
        }
    });

    const result = results.pop()

    if (result.statusCode === 302) {
        logger.error('We should not see redirection ...')
        console.log(result)
    }
            
    let timings = result.timings

    const metrics = {
        statusCode : result.statusCode,
        socketOpen : getMilliseconds(timings.socketOpen),
        dnsLookup : getMilliseconds(timings.dnsLookup),
        tcpConnection : getMilliseconds(nettime.getDuration(timings.socketOpen, timings.tcpConnection)),
        tlsHandshake : getMilliseconds(nettime.getDuration(timings.tcpConnection ,timings.tlsHandshake)),
        firstByte : getMilliseconds(nettime.getDuration(timings.tlsHandshake, timings.firstByte)),
        contentTransfer : getMilliseconds(nettime.getDuration(timings.firstByte, timings.contentTransfer)),
        socketClose : getMilliseconds(nettime.getDuration(timings.contentTransfer,timings.socketClose)),
        responseSize : Buffer.byteLength(result.response),
        headers : result.headers
    }

    await store({
        '@timestamp' : new Date(),
        device: {
            type: 'desktop'
        },
        meta : urlToCrawl,
        http : metrics
    })
}