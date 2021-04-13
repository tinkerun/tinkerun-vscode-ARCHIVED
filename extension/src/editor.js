import {commands, Uri, workspace} from 'vscode'

import {isProduction} from './utils'
import {TinkerTerminal} from './terminal'
import {database} from './database'

/**
 *
 * @type {Map<string, TinkerEditor>}
 */
const editors = new Map()

class TinkerEditor {
  /**
   * @param {string} file
   * @returns {TinkerEditor|undefined}
   */
  static instance (file) {
    return editors.get(file)
  }

  /**
   * @param {string} file
   * @param {WebviewPanel} webviewPanel
   * @param {ExtensionContext} context
   */
  constructor (file, webviewPanel, context) {
    this.file = file
    this.db = database(this.file)

    this.webview = webviewPanel.webview
    this.context = context

    const onChangeSubscription = workspace.onDidChangeTextDocument(this.onDidChangeTextDocument.bind(this))
    webviewPanel.onDidDispose(() => {
      onChangeSubscription.dispose()
      editors.delete(this.file)
    })
  }

  get command () {
    return this.db.get('command').value()
  }

  set command (value) {
    this.db.set('command', value).write()
  }

  /**
   * 发送 command 至 webview
   */
  postSetCommandMessage () {
    this.webview.postMessage({
      type: 'SET_COMMAND',
      payload: this.command,
    })
  }

  /**
   * 发送 tinker 的连接状态至 webview
   */
  postSetConnectedMessage () {
    this.webview.postMessage({
      type: 'SET_CONNECTED',
      payload: TinkerTerminal.isConnected(this.file),
    })
  }

  /**
   * 内容数据改变事件
   *
   * @param {TextDocumentChangeEvent} e
   */
  onDidChangeTextDocument (e) {
    if (e.document.uri.path === this.file) {
      // 更新数据
      this.db.read()
      this.postSetCommandMessage()
    }
  }

  /**
   * 生产环境下使用文件，开发环境下使用 url 地址
   */
  get tinkerScriptUrl () {
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
      enableScripts: true,
    }

    // 绑定 webview 返回的消息
    this.webview.onDidReceiveMessage(message => {
      switch (message.type) {
        case 'SET_COMMAND':
          this.command = message.payload
          break
        case 'GET_COMMAND':
          this.postSetCommandMessage()
          break
        case 'CONNECT':
          commands.executeCommand('tinkerun.connect', this.file)
          this.postSetConnectedMessage()
          break
        case 'DISCONNECT':
          commands.executeCommand('tinkerun.disconnect', this.file)
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
                  window.vscode = acquireVsCodeApi()
                </script>
                ${this.wsScript}
                <script type="module" src="${this.tinkerScriptUrl}"></script>
            </body>
        </html>
        `
  }
}

class TinkerEditorProvider {
  /**
   * @param {ExtensionContext} context
   */
  constructor (context) {
    this.context = context
  }

  /**
   * @param {TextDocument} document
   * @param {WebviewPanel} webviewPanel
   * @param {CancellationToken} token
   */
  resolveCustomTextEditor (document, webviewPanel, token) {
    const file = document.uri.path

    if (!editors.has(file)) {
      editors.set(file, new TinkerEditor(file, webviewPanel, this.context))
    }

    editors.get(file).render()
  }
}

export {
  TinkerEditor,
  TinkerEditorProvider,
}
