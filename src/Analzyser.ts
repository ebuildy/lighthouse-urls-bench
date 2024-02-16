import { AnalyzeResult } from '.'
import { ConfigResource } from './config'

export interface Analyzer {
  analyze(target: ConfigResource): Promise<AnalyzeResult>
}
