import yaml from 'js-yaml'
import fs from 'fs'

export function configure(filePath) {
    const doc = yaml.load(fs.readFileSync(filePath, 'utf8'));

    return doc
}