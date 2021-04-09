import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import {EventEmitter, Pseudoterminal, Terminal, TerminalDimensions, ThemeIcon, window} from 'vscode'
import {nanoid} from 'nanoid'
import {basename} from 'path'

interface ConnectionSchema {
  command: string
  snippets?: SnippetSchema[]
}

type SnippetType = 'php'

export interface SnippetSchema {
  id: string
  name: string
  code: string
  type?: SnippetType
}

let tks: { [key: string]: Tinker } = {}

export class Tinker {
  private db: low.LowdbSync<ConnectionSchema>

  readonly file: string

  private terminal: Terminal | undefined

  constructor(file: string) {
    this.db = low(new FileSync<ConnectionSchema>(file))
    this.file = file
  }

  get command(): string {
    return this.db
      .defaults({
        command: 'cd ~/example-app && php artisan tinker',
      })
      .get('command')
      .value()
  }

  set command(value) {
    this.db.set('command', value).write()
  }

  get snippets(): SnippetSchema[] {
    return this.db
      .defaults({
        snippets: [],
      })
      .get('snippets')
      .value()
  }

  createSnippet() {
    this.db
      .get('snippets')
      .push({
        id: nanoid(),
        name: 'New Snippet',
        code: '',
      })
      .write()
  }

  updateSnippet(snippet: SnippetSchema) {
    this.db
      .get('snippets')
      .find({
        id: snippet.id,
      })
      .assign(snippet)
      .write()
  }

  get themeIcon(): ThemeIcon {
    let iconId = 'device-desktop'
    if (this.command.includes('ssh')) {
      iconId = 'remote-explorer'
    }

    return new ThemeIcon(iconId)
  }

  get isConnected(): boolean {
    return this.terminal !== undefined
  }

  refresh() {
    this.db.read()
  }

  connect() {
    if (!this.terminal) {
      this.terminal = window.createTerminal({
        name: basename(this.file),
        hideFromUser: true,
      })

      this.terminal.sendText(this.command)
    }

    this.terminal.show()
  }

  disconnect() {
    if (this.terminal) {
      this.terminal.dispose()
    }
  }

  static instance(file: string) {
    if (!tks[file]) {
      tks[file] = new Tinker(file)
    }

    return tks[file]
  }
}