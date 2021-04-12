import {Terminal as BaseTerminal, window} from 'vscode'
import {basename} from 'path'

import {database} from './database'

let terminals = new Map<string, Terminal>()

export class Terminal {

  private readonly terminal: BaseTerminal
  readonly file: string

  constructor(file: string) {
    this.file = file

    this.terminal = window.createTerminal({
      name: basename(file),
      hideFromUser: true,
    })

    this.terminal.sendText(database(file).get('command').value())

    terminals.set(`${this.terminal.processId}`, this)
  }

  show() {
    this.terminal.show()
  }

  sendText(text: string) {
    this.terminal.sendText(text)
  }

  dispose() {
    terminals.delete(this.file)
    terminals.delete(`${this.terminal.processId}`)

    this.terminal.dispose()
  }

  static isConnected(file: string): boolean {
    return terminals.has(file)
  }

  static instance(file: string): Terminal {
    if (!terminals.has(file)) {
      terminals.set(file, new Terminal(file))
    }

    // @ts-ignore
    return terminals.get(file)
  }
}
