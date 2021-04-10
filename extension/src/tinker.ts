import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import { Terminal, ThemeIcon, window } from 'vscode'
import { nanoid } from 'nanoid'
import { basename } from 'path'

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

export interface SnippetRequest {
  id?: string
  name?: string
  code?: string
  type?: SnippetType
}

const tks = new Map<string, Tinker>()

export class Tinker {
  private readonly db: low.LowdbSync<ConnectionSchema>

  readonly file: string

  private terminal: Terminal | undefined

  constructor (file: string) {
    this.db = low(new FileSync<ConnectionSchema>(file))
    this.file = file
  }

  get command (): string {
    return this.db
      .defaults({
        command: 'cd ~/example-app && php artisan tinker'
      })
      .get('command')
      .value()
  }

  set command (value) {
    this.db.set('command', value).write()
  }

  get snippets (): SnippetSchema[] {
    return this.db
      .defaults({
        snippets: []
      })
      .get('snippets')
      .value()
  }

  getSnippetById (id: string) {
    return this.db
      .get('snippets')
      .find({
        id
      })
      .value()
  }

  createSnippet (snippet?: SnippetRequest) {
    this.db
      .get('snippets')
      .push({
        id: nanoid(),
        name: 'New Snippet',
        code: '',
        ...snippet
      })
      .write()
  }

  updateSnippet (snippet: SnippetRequest) {
    this.db
      .get('snippets')
      .find({
        id: snippet.id
      })
      .assign(snippet)
      .write()
  }

  deleteSnippet (id: string) {
    this.db
      .get('snippets')
      .remove({
        id
      })
      .write()
  }

  get themeIcon (): ThemeIcon {
    let iconId = 'device-desktop'
    if (this.command.includes('ssh')) {
      iconId = 'remote-explorer'
    }

    return new ThemeIcon(iconId)
  }

  get isConnected (): boolean {
    return this.terminal !== undefined
  }

  refresh () {
    this.db.read()
  }

  connect () {
    if (this.terminal == null) {
      this.terminal = window.createTerminal({
        name: basename(this.file),
        hideFromUser: true
      })

      this.terminal.sendText(this.command)
    }

    this.terminal.show()
  }

  disconnect () {
    if (this.terminal != null) {
      this.terminal.dispose()
    }
  }

  static instance (file: string) {
    if (tks.get(file) == null) {
      tks.set(file, new Tinker(file))
    }

    return tks.get(file)
  }
}
