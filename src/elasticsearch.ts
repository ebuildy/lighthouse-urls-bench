import { Client } from '@elastic/elasticsearch'
import _ from 'lodash'
import logger from 'loglevel'
import { AnalyzeResult } from '.'
import { Config } from './config'

export class ElasticsearchStore {
  client: Client
  esIndexName: string
  extraMeta: Record<string, string>

  constructor(config: Config) {
    this.esIndexName = config.store.elasticsearch.index
    this.extraMeta = config.store.meta

    this.client = new Client({
      node: config.store.elasticsearch.url,
    })
  }

  async init() {
    try {
      await this.client.indices.create({
        index: this.esIndexName,
        body: {
          settings: {
            index: {
              number_of_shards: 1,
              number_of_replicas: 0,
            },
          },
          mappings: {
            dynamic_templates: [
              {
                numericValue: {
                  match: 'numericValue',
                  mapping: {
                    type: 'float',
                  },
                },
              },
            ],
          },
        },
      })
    } catch (e: any) {
      // errors.ElasticsearchClientError
      logger.error(e.meta.body ? e.meta.body.error.reason : e.meta)
    }
  }

  async store(result: AnalyzeResult) {
    const argBody = {
      '@timestamp': result.timestamp,
      analyzer: result.analyzer,
      resource: result.resource,
      device: result.device,
      result: result.result,
    }
    const body = _.merge(argBody, { meta: this.extraMeta })

    try {
      await this.client.index({
        index: this.esIndexName,
        body,
      })
    } catch (e: any) {
      // errors.ElasticsearchClientError
      logger.error(e.meta.body ? e.meta.body.error : e.meta)
    }
  }
}
