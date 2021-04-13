import {window} from 'vscode'
import {basename} from 'path'

import {database} from './database'

/**
 * @type {Map<string, TinkerTerminal>}
 */
const terminals = new Map()

export class TinkerTerminal {
  /**
   * @param {string} file
   */
  constructor (file) {
    this.file = file

    this.terminal = window.createTerminal({
      name: basename(file),
      hideFromUser: true,
    })

    this.terminal.sendText(database(file).get('command').value())

    terminals.set(`${this.terminal.processId}`, this)
  }

  show () {
    this.terminal.show()
  }

  sendText (text) {
    this.terminal.sendText(text)
  }

  dispose () {
    terminals.delete(this.file)
    terminals.delete(`${this.terminal.processId}`)

    this.terminal.dispose()
  }

  /**
   * @param {string} file
   * @return {boolean}
   */
  static isConnected (file) {
    return terminals.has(file)
  }

  /**
   * @param {string} file
   * @return {TinkerTerminal}
   */
  static instance (file) {
    if (!TinkerTerminal.isConnected(file)) {
      terminals.set(file, new TinkerTerminal(file))
    }

    return terminals.get(file)
  }
}
