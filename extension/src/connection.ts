import { TextDocument } from 'vscode'
import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'

export interface ConnectionSchema {
  command: string
  snippets?: SnippetSchema[]
}

export type SnippetType = 'php' | 'shell' | 'js'

export interface SnippetSchema {
  id: string
  name: string
  code: string
  type?: SnippetType
}

export class Connection {
  private readonly db: low.LowdbSync<ConnectionSchema>

  constructor (document: TextDocument) {
    const adapter = new FileSync<ConnectionSchema>(document.uri.fsPath)
    this.db = low(adapter)
  }

  get command (): string {
    return this.db.get('command').value()
  }

  setCommand (command: string) {
    this.db.set('command', command).write()
  }

  refresh () {
    this.db.read()
  }
}
