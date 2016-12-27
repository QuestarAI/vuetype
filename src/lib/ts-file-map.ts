import ts = require('typescript')
import vueCompiler = require('vue-template-compiler')
import { readFileSync } from './file-util'

export interface TsFile {
  rawFileName: string
  version: number
  text: string | undefined
}

export class TsFileMap {
  private files = {} as ts.Map<TsFile>

  get fileNames (): string[] {
    return Object.keys(this.files).filter(file => isSupportedFile(file))
  }

  /**
   * If the file does not exists or it is unsupported type,
   * we does not try emit output or the compiler throws an error
   */
  canEmit (fileName: string): boolean {
    const file = this.files[fileName]
    return file != null && !!file.text
  }

  getSrc (fileName: string): string | undefined {
    let file: TsFile | undefined = this.files[fileName]

    // If it does not processed yet,
    // register it into map with returning file data
    if (!file) {
      file = this.registerFile(fileName)
    }

    return file && file.text
  }

  getVersion (fileName: string): string | undefined {
    return this.files[fileName] && this.files[fileName].version.toString()
  }

  registerFile (fileName: string): TsFile | undefined {
    const rawFileName = getRawFileName(fileName)
    const src = readFileSync(rawFileName)

    // If file is not exists
    if (src === undefined) return undefined

    const file: TsFile = {
      rawFileName,
      version: 0,
      text: src
    }

    if (!isVueFile(rawFileName)) {
      this.files[rawFileName] = file
      return file
    }

    // If it is .vue file, extract script part and check it is ts or not
    const script = vueCompiler.parseComponent(src, { pad: true }).script
    if (script == null || script.lang !== 'ts') {
      return undefined
    }

    file.text = script.content

    // To ensure the compiler can process .vue file,
    // we need to add .ts suffix to file name
    this.files[rawFileName + '.ts'] = file

    return file
  }
}

function isSupportedFile (fileName: string): boolean {
  return /\.(vue|tsx?|jsx?)$/.test(fileName)
}

function isVueFile (fileName: string): boolean {
  return /\.vue(?:\.ts)?$/.test(fileName)
}

// If fileName is already suffixed by `.ts` remove it
function getRawFileName (fileName: string): string {
  if (/\.vue\.ts$/.test(fileName)) {
    return fileName.slice(0, -3)
  }
  return fileName
}