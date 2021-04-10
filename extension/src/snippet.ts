import {
  CancellationToken,
  EventEmitter,
  ProviderResult,
  TextDocument,
  TextDocumentContentProvider,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window
} from 'vscode'

import { SnippetSchema, Tinker } from './tinker'

export const quickInputSnippetName = (value?: string) => window.showInputBox({
  value,
  prompt: 'Snippet Name'
})

export class SnippetItem extends TreeItem {
  contextValue = 'snippet'

  iconPath = new ThemeIcon('code')

  tinker: Tinker

  constructor (snippet: SnippetSchema, file: string) {
    super(snippet.name, TreeItemCollapsibleState.None)

    this.tinker = Tinker.instance(file)
    this.id = snippet.id

    this.command = {
      command: 'tinkerun.snippets.open',
      title: 'Open Snippet',
      arguments: [this]
    }
  }

  get uri () {
    return Uri.parse(`${SnippetContentProvider.scheme}:${this.tinker.file}/${this.id}/${this.label}`)
  }
}

export class SnippetContentProvider implements TextDocumentContentProvider {
  static scheme = 'snippet'

  private readonly documents = new Map<string, TextDocument>()
  private readonly onDidChangeEmitter = new EventEmitter<Uri>()
  onDidChange = this.onDidChangeEmitter.event

  refresh (uri: Uri) {
    this.onDidChangeEmitter.fire(uri)
  }

  provideTextDocumentContent (uri: Uri, token: CancellationToken): ProviderResult<string> {
    const document = this.documents.get(uri.path)

    if (document != null) {
      return document.getText()
    }

    const pathArr = uri.path.split('/')

    // label
    pathArr.pop()

    const id = pathArr.pop()
    const file = pathArr.join('/')

    const tinker = Tinker.instance(file)

    let snippet = {
      code: ''
    }

    if (id) {
      snippet = tinker.getSnippetById(id)
    }

    return Promise.resolve(snippet.code)
  }
}
