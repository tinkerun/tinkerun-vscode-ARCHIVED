import {
  CancellationToken,
  commands,
  CustomTextEditorProvider,
  ExtensionContext,
  TextDocument,
  TextDocumentChangeEvent,
  Uri,
  Webview,
  WebviewPanel,
  workspace
} from 'vscode'

import { Message } from './message'
import { isProduction } from './utils'
import { Tinker } from './tinker'

export class TinkerEditorProvider implements CustomTextEditorProvider {
  private readonly context: ExtensionContext

  private _tinker: Tinker | undefined

  // @ts-expect-error
  private webview: Webview

  // @ts-expect-error
  private document: TextDocument

  constructor (context: ExtensionContext) {
    this.context = context
  }

  /**
   * 获取 Tinker 对象单例
   */
  get tinker () {
    if (this._tinker == null) {
      this._tinker = Tinker.instance(this.document.fileName)
    }

    return this._tinker
  }

  /**
   * 发送 command 至 webview
   *
   * @private
   */
  private postSetCommandMessage () {
    this.webview.postMessage({
      type: 'SET_COMMAND',
      payload: this.tinker.command
    })
  }

  /**
   * 发送 tinker 的连接状态至 webview
   */
  postSetConnectedMessage () {
    this.webview.postMessage({
      type: 'SET_CONNECTED',
      payload: this.tinker.isConnected
    })
  }

  /**
   * 内容数据改变事件
   *
   * @param {TextDocumentChangeEvent} e
   * @private
   */
  private onDidChangeTextDocument (e: TextDocumentChangeEvent) {
    if (e.document.uri.toString() === this.document.uri.toString() && (this.tinker != null)) {
      // 更新数据
      this.tinker.refresh()
      this.postSetCommandMessage()
    }
  }

  resolveCustomTextEditor (document: TextDocument, webviewPanel: WebviewPanel, token: CancellationToken): void | Thenable<void> {
    this.webview = webviewPanel.webview
    this.document = document

    this.render()

    const onChangeSubscription = workspace.onDidChangeTextDocument(this.onDidChangeTextDocument)

    webviewPanel.onDidDispose(() => {
      onChangeSubscription.dispose()
    })
  }

  /**
   * 生产环境下使用文件，开发环境下使用 url 地址
   */
  get tinkerScriptUrl () {
    if (isProduction) {
      return this
        .webview
        .asWebviewUri(
          Uri.joinPath(this.context.extensionUri, 'webview/build/dist', 'tinker.js')
        )
        .toString()
    }

    return 'http://localhost:8080/dist/tinker.js'
  }

  /**
   * 用于开发模式打开 HMR
   * 参考 https://github.com/snowpackjs/esm-hmr/blob/master/src/client.ts#L33
   */
  get wsScript () {
    if (isProduction) {
      return ''
    }

    return '<script>window.HMR_WEBSOCKET_URL = \'ws://localhost:8080\'</script>'
  }

  /**
   * 加载 webview 内容
   */
  render () {
    this.webview.options = {
      enableScripts: true
    }

    // 绑定 webview 返回的消息
    this.webview.onDidReceiveMessage((message: Message) => {
      switch (message.type) {
        case 'SET_COMMAND':
          this.tinker.command = message.payload
          break
        case 'GET_COMMAND':
          this.postSetCommandMessage()
          break
        case 'CONNECT':
          commands.executeCommand('tinkerun.connections.connect', this.tinker)
          this.postSetConnectedMessage()
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
