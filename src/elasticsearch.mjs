import { Client } from '@elastic/elasticsearch'
import logger from 'loglevel'
import _ from 'lodash'

let client, esIndexName, extraMeta;

export async function init(config) {

    esIndexName = config.index;
    extraMeta = config.meta

    client = new Client({
        node: config.url,
        ssl: {
            rejectUnauthorized: false
          }
    })

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
        logger.error(e.meta.body ? e.meta.body.error.reason : e.meta)
    }
}

export async function store(body) {

    body = _.merge(body, { meta : extraMeta })

    try {
        await client.index({
            index: esIndexName,
            body
        })
    } catch(e) {
        logger.error(e.meta.body ? e.meta.body.error : e.meta)
    }
}