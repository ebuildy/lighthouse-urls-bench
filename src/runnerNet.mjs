import nettime from 'nettime'
import logger from 'loglevel'
import {
    getDuration, getMilliseconds,
    computeAverageDurations, createTimingsFromDurations
} from 'nettime/lib/timings.js'

  export async function run(urlToCrawl, store) {

    const result = await nettime(urlToCrawl.url);

    if (result.statusCode === 302) {
        logger.debug('Follow redirect')
        console.log(result)
    }
            
    if (result.statusCode === 200) {
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
        }

        store({
            '@timestamp' : new Date(),
            meta : urlToCrawl,
            http : metrics
        })
    }
}