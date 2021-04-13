import {window, commands, workspace, Uri} from 'vscode'
import path from 'path'

import {TinkerEditor, TinkerEditorProvider} from './editor'
import {TinkerFileSystemProvider} from './filesystem'
import {TinkerTerminal} from './terminal'
import {minifyPHPCode} from './utils'

/**
 * @param {TextDocument} doc
 */
const closeDocument = doc => {
  // 参考 https://stackoverflow.com/a/54767938
  window
    .showTextDocument(doc.uri, {
      preview: true,
      preserveFocus: false,
    })
    .then(() => {
      return commands.executeCommand('workbench.action.closeActiveEditor')
    })
}

/**
 * @param {ExtensionContext} context
 */
const activate = (context) => {
  context.subscriptions.push(
    window.registerCustomEditorProvider(
      'tinkerun.tinker',
      new TinkerEditorProvider(context),
    ),
  )

  context.subscriptions.push(
    workspace.registerFileSystemProvider(
      'tinker',
      new TinkerFileSystemProvider(),
      {
        isCaseSensitive: true,
      },
    ),
  )

  context.subscriptions.push(
    window.onDidCloseTerminal(async e => {
      if (TinkerTerminal.isConnected(`${e.processId}`)) {
        commands.executeCommand(
          'tinkerun.disconnect',
          TinkerTerminal.instance(`${e.processId}`).file,
        )
      }
    }),
  )

  //
  context.subscriptions.push(
    workspace.onDidChangeWorkspaceFolders(e => {
      const folders = e.added
      for (const folder of folders) {
        const uri = folder.uri
        if (uri.scheme === 'tinker') {
          const file = TinkerFileSystemProvider.file(uri)

          const terminal = TinkerTerminal.instance(file)
          terminal.show()

          const editor = TinkerEditor.instance(file)
          if (editor) {
            editor.postSetConnectedMessage()
          }
        }
      }
    }),
  )

  context.subscriptions.push(
    commands.registerCommand(
      'tinkerun.connect',
      (file) => {
        try {
          if (file instanceof Uri) {
            file = file.path
          }

          // 创建一个 workspace 文件夹，用于展开 .tinker 文件中的代码
          const uri = Uri.parse('tinker:/').with({fragment: file})
          workspace.updateWorkspaceFolders(0, 0, {
            uri,
            name: `Tinkerun: ${path.basename(file)}`,
          })
        } catch (e) {
          console.error(e)
          window.showInformationMessage(e.message)
        }
      },
    ),
  )

  context.subscriptions.push(
    commands.registerCommand(
      'tinkerun.disconnect',
      (file) => {
        try {
          if (file instanceof Uri) {
            file = file.path
          }

          // 清理文件夹
          const uri = Uri.parse('tinker:/').with({fragment: file})
          const index = workspace.getWorkspaceFolder(uri)?.index
          if (index !== undefined) {
            workspace.updateWorkspaceFolders(index, 1)
          }
          // 清理 terminal
          if (TinkerTerminal.isConnected(file)) {
            const terminal = TinkerTerminal.instance(file)
            terminal.dispose()
          }

          // 关闭当前打开的文档
          workspace.textDocuments.forEach(doc => {
            if (doc.uri.fragment === uri.fragment) {
              closeDocument(doc)
            }
          })

          const editor = TinkerEditor.instance(file)
          if (editor) {
            editor.postSetConnectedMessage()
          }
        } catch (e) {
          console.error(e)
          window.showInformationMessage(e.message)
        }
      },
    ),
  )

  context.subscriptions.push(
    commands.registerCommand(
      'tinkerun.run',
      (uri) => {
        try {
          if (uri.scheme !== 'tinker') {
            return
          }

          const document = workspace.textDocuments.find(doc => {
            return doc.uri.path === uri.path && doc.uri.fragment === uri.fragment
          })
          if (!document) {
            return
          }

          document.save()

          const file = TinkerFileSystemProvider.file(uri)
          const terminal = TinkerTerminal.instance(file)
          terminal.show()
          const code = minifyPHPCode(document.getText())

          terminal.sendText(code)
        } catch (e) {
          console.error(e)
          window.showInformationMessage(e.message)
        }
      },
    ),
  )
}

// this method is called when your extension is deactivated
const deactivate = () => {}

export {
  activate,
  deactivate,
}
