import { Client } from '@elastic/elasticsearch'
import logger from 'loglevel'

const client = new Client({
    node: 'http://localhost:9200'
})

const esIndexName = 'lighthouse-results-v2'

export async function init() {
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
        logger.error(e.meta.body.error.reason)
    }
}

export async function store(body) {
    try {
        await client.index({
            index: esIndexName,
            body
        })
    } catch(e) {
        logger.error(e.meta.body.error)
    }
}