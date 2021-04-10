import { window, ExtensionContext, commands, workspace } from 'vscode'

import { TinkerEditorProvider } from './editor'
import { ConnectionItem, ConnectionTreeDataProvider } from './connection'
import { quickInputSnippetName, SnippetContentProvider, SnippetItem } from './snippet'
import { Tinker } from './tinker'

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

  const connectionTreeDataProvider = new ConnectionTreeDataProvider()

  const connectionsViewer = window.createTreeView(
    'tinkerunConnections',
    {
      treeDataProvider: connectionTreeDataProvider,
      canSelectMany: false
    }
  )

  context.subscriptions.push(
    commands.registerCommand(
      'tinkerun.connections.connect',
      (tinker: Tinker) => {
        tinker.connect()

        const item = connectionTreeDataProvider.getElement(tinker.file) as ConnectionItem
        item.connected()
        connectionTreeDataProvider.refresh(item)

        // 参考文档：`If the tree view is not visible then the tree view is shown and element is revealed.`
        // 展示 tree view 以及 connection item 中的 snippets
        connectionsViewer.reveal(item, { expand: true })

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

        connectionTreeDataProvider.refresh(
          connectionTreeDataProvider.getElement(tinker.file)
        )
      }
    )
  )

  context.subscriptions.push(
    commands.registerCommand(
      'tinkerun.snippets.create',
      async (item: ConnectionItem) => {
        const name = await quickInputSnippetName()
        if (!name) {
          return
        }

        item.tinker.createSnippet({ name })
        connectionTreeDataProvider.refresh(item)
      }
    )
  )

  const snippetContentProvider = new SnippetContentProvider()

  context.subscriptions.push(
    workspace.registerTextDocumentContentProvider(
      SnippetContentProvider.scheme,
      snippetContentProvider
    )
  )

  context.subscriptions.push(
    commands.registerCommand(
      'tinkerun.snippets.open',
      async (item: SnippetItem) => {
        const editor = await window.showTextDocument(item.uri, {
          preview: false
        })

        editor.options = {}
      }
    )
  )

  context.subscriptions.push(
    commands.registerCommand(
      'tinkerun.snippets.delete',
      (item: SnippetItem) => {
        const tinker = item.tinker

        if (item.id) {
          tinker.deleteSnippet(item.id)
        }

        // 更新 tree view
        connectionTreeDataProvider.refresh(
          connectionTreeDataProvider.getElement(tinker.file)
        )

        // 关闭 document
        // 参考 https://stackoverflow.com/a/54767938
        window
          .showTextDocument(item.uri, { preview: true, preserveFocus: false })
          .then(() => commands.executeCommand('workbench.action.closeActiveEditor'))
      }
    )
  )

  context.subscriptions.push(
    commands.registerCommand(
      'tinkerun.snippets.rename',
      async (item: SnippetItem) => {
        const oldUri = item.uri

        if (item.id) {
          const label = typeof item.label !== 'object' ? item.label : item.label.label
          const name = await quickInputSnippetName(label)
          item.tinker.updateSnippet({
            id: item.id,
            name
          })

          // 更新 label
          item.label = name
        }

        connectionTreeDataProvider.refresh(item)

        // TODO 更新 tab name
      }
    )
  )
}

// this method is called when your extension is deactivated
export function deactivate () {
}
