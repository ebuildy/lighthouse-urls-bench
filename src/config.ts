import { Options } from 'chrome-launcher'
import fs from 'fs'
import yaml from 'js-yaml'
import { parseStringPromise } from 'xml2js'

type SitemapURLSet = {
  loc: string
}

type ConfigElasticsearch = {
  url: string
  index: string
}

type ConfigStore = {
  elasticsearch: ConfigElasticsearch
  meta: Record<string, string>
}

type ConfigLighthouse = {
  enabled: boolean
  chromeOptions: Options
  options: Record<string, string>
  config: Record<string, string>
}

export type ConfigResource = {
  site: string
  name: string
  url?: string
  sitemapContent?: string
}

export type Config = {
  cookies: Record<string, string>
  resources: ConfigResource[]
  store: ConfigStore
  lighthouse: ConfigLighthouse
}

export class ConfigFactory {
  async build(filePath: string): Promise<Config> {
    const doc: Config = yaml.load(fs.readFileSync(filePath, 'utf8')) as Config
    const resources = doc.resources || []
    const resourcesWithSitemap = await Promise.all(
      resources.map(
        async (resource: ConfigResource): Promise<ConfigResource[]> => {
          if (resource.sitemapContent) {
            const sitemapData = await parseStringPromise(
              resource.sitemapContent,
            )

            return sitemapData.urlset.url.map(
              (urlset: SitemapURLSet): ConfigResource => ({
                site: resource.site,
                name: resource.name,
                url: urlset.loc,
              }),
            )
          }

          return [resource]
        },
      ),
    )

    return { ...doc, resources: resourcesWithSitemap.flat() }
  }
}
