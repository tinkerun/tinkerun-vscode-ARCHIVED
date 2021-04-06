import {
  CancellationToken,
  CustomTextEditorProvider,
  ExtensionContext,
  TextDocument,
  Uri,
  Webview,
  WebviewPanel, workspace
} from 'vscode'

import { Message } from './message'
import { Connection } from './connection'
import { isProduction } from './utils'

export class TinkerEditorProvider implements CustomTextEditorProvider {
  private readonly context: ExtensionContext

  constructor (context: ExtensionContext) {
    this.context = context
  }

  resolveCustomTextEditor (document: TextDocument, webviewPanel: WebviewPanel, token: CancellationToken): void | Thenable<void> {
    const webview = webviewPanel.webview

    this.render(webview)

    const connection = new Connection(document)

    // 发送 SET_COMMAND 消息至 webview
    const postSetCommandMessage = () => {
      webview.postMessage({
        type: 'SET_COMMAND',
        payload: connection.command
      })
    }

    const onChangeSubscription = workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        // 更新 connection 对象中的数据
        connection.refresh()
        postSetCommandMessage()
      }
    })

    webviewPanel.onDidDispose(() => {
      onChangeSubscription.dispose()
    })

    // 绑定 webview 返回的消息
    webview.onDidReceiveMessage((message: Message) => {
      switch (message.type) {
        case 'SET_COMMAND':
          connection.setCommand(message.payload)
      }
    })

    postSetCommandMessage()
  }

  render (webview: Webview) {
    webview.options = {
      enableScripts: true
    }

    const tinkerScriptUrl = isProduction ? webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, 'webview/build/dist', 'tinker.js')
    ).toString() : 'http://localhost:8080/dist/tinker.js'

    // 用于开发模式打开 HMR
    // https://github.com/snowpackjs/esm-hmr/blob/master/src/client.ts#L33
    const wsScript = isProduction ? '' : '<script>window.HMR_WEBSOCKET_URL = \'ws://localhost:8080\'</script>'

    webview.html = `
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
                ${wsScript}
                <script type="module" src="${tinkerScriptUrl}"></script>
            </body>
        </html>
        `
  }
}
