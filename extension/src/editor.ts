import {
  CancellationToken,
  commands,
  CustomTextEditorProvider,
  ExtensionContext,
  TextDocument,
  TextDocumentChangeEvent,
  Uri,
  Webview,
  WebviewPanel, window,
  workspace,
} from 'vscode'

import {Message} from './message'
import {isProduction} from './utils'
import {Terminal} from './terminal'
import {database, Database} from './database'

const editors = new Map<string, TinkerEditor>()

export class TinkerEditor {
  private db: Database
  private webview: Webview
  private context: ExtensionContext
  private readonly file: string

  static instance(file: string): TinkerEditor {
    const editor = editors.get(file)
    if (editor) {
      return editor
    }

    throw new Error('editor not found')
  }

  static render(document: TextDocument, webviewPanel: WebviewPanel, context: ExtensionContext) {
    const file = document.uri.path

    if (!editors.has(file)) {
      editors.set(file, new TinkerEditor(file, webviewPanel, context))
    }

    // @ts-ignore
    editors.get(file).renderView()
  }

  constructor(file: string, webviewPanel: WebviewPanel, context: ExtensionContext) {
    this.webview = webviewPanel.webview
    this.file = file
    this.db = database(file)
    this.context = context

    const onChangeSubscription = workspace.onDidChangeTextDocument(this.onDidChangeTextDocument)

    webviewPanel.onDidDispose(() => {
      onChangeSubscription.dispose()
    })
  }

  get command(): string {
    return this.db
      .get('command')
      .value()
  }

  set command(value) {
    this.db.set('command', value).write()
  }

  /**
   * 发送 command 至 webview
   *
   * @private
   */
  private postSetCommandMessage() {
    this.webview.postMessage({
      type: 'SET_COMMAND',
      payload: this.command,
    })
  }

  /**
   * 发送 tinker 的连接状态至 webview
   */
  postSetConnectedMessage() {
    this.webview.postMessage({
      type: 'SET_CONNECTED',
      payload: Terminal.isConnected(this.file),
    })
  }

  /**
   * 内容数据改变事件
   *
   * @param {TextDocumentChangeEvent} e
   * @private
   */
  private onDidChangeTextDocument(e: TextDocumentChangeEvent) {
    if (e.document.uri.path === this.file) {
      // 更新数据
      this.db.read()
      this.postSetCommandMessage()
    }
  }

  /**
   * 生产环境下使用文件，开发环境下使用 url 地址
   */
  get tinkerScriptUrl() {
    if (isProduction) {
      return this
        .webview
        .asWebviewUri(
          Uri.joinPath(this.context.extensionUri, 'webview/build/dist', 'tinker.js'),
        )
        .toString()
    }

    return 'http://localhost:8080/dist/tinker.js'
  }

  /**
   * 用于开发模式打开 HMR
   * 参考 https://github.com/snowpackjs/esm-hmr/blob/master/src/client.ts#L33
   */
  get wsScript() {
    if (isProduction) {
      return ''
    }

    return '<script>window.HMR_WEBSOCKET_URL = \'ws://localhost:8080\'</script>'
  }

  /**
   * 加载 webview 内容
   */
  renderView() {
    this.webview.options = {
      enableScripts: true,
    }

    // 绑定 webview 返回的消息
    this.webview.onDidReceiveMessage((message: Message) => {
      switch (message.type) {
        case 'SET_COMMAND':
          this.command = message.payload
          break
        case 'GET_COMMAND':
          this.postSetCommandMessage()
          break
        case 'CONNECT':
          commands.executeCommand('tinkerun.connect', this.file)
          break
        case 'GET_CONNECTED':
          this.postSetConnectedMessage()
          break
      }
    })

    this.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>.tinker</title>
            </head>
            <body>
                <div id="root"></div>
                <script>
                  const vscode = acquireVsCodeApi()
                </script>
                ${this.wsScript}
                <script type="module" src="${this.tinkerScriptUrl}"></script>
            </body>
        </html>
        `
  }

}

export class TinkerEditorProvider implements CustomTextEditorProvider {
  private readonly context: ExtensionContext

  constructor(context: ExtensionContext) {
    this.context = context
  }

  resolveCustomTextEditor(document: TextDocument, webviewPanel: WebviewPanel, token: CancellationToken): void | Thenable<void> {
    TinkerEditor.render(document, webviewPanel, this.context)
  }
}
