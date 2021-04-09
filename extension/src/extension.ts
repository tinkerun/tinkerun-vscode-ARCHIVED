import {window, ExtensionContext, commands} from 'vscode'

import { TinkerEditorProvider } from './editor'
import {ConnectionItem, ConnectionTreeDataProvider} from './connection'
import {Tinker} from './tinker'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate (context: ExtensionContext) {

  const editor = new TinkerEditorProvider(context)

  context.subscriptions.push(
    window.registerCustomEditorProvider(
      'tinkerun.tinker',
      editor
    )
  )

  const treeDataProvider = new ConnectionTreeDataProvider()

  const viewer = window.createTreeView(
    'tinkerunConnections',
    {
      treeDataProvider,
      canSelectMany: false,
    }
  )

  context.subscriptions.push(
    commands.registerCommand(
      'tinkerun.connections.connect',
      (tinker: Tinker) => {
        tinker.connect()

        const item = treeDataProvider.getElement(tinker.file) as ConnectionItem
        item.connected()
        treeDataProvider.refresh(item)

        // 参考文档：`If the tree view is not visible then the tree view is shown and element is revealed.`
        // 展示 tree view 以及 connection item 中的 snippets
        viewer.reveal(item, {expand: true})

        // webview 中的 connect 按钮触发 connected
        editor.postSetConnectedMessage()
      }
    )
  )

  context.subscriptions.push(
    commands.registerCommand(
      'tinkerun.connections.disconnect',
      (tinker: Tinker) => {
        tinker.disconnect()

        treeDataProvider.refresh(
          treeDataProvider.getElement(tinker.file)
        )
      }
    )
  )

  context.subscriptions.push(
    commands.registerCommand(
      'tinkerun.snippets.create',
      (item: ConnectionItem) => {
        item.tinker.createSnippet()
        treeDataProvider.refresh(item)
      }
    )
  )
}

// this method is called when your extension is deactivated
export function deactivate () {}
