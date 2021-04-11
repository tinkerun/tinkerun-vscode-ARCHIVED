import {window, ExtensionContext, commands, workspace, Uri} from 'vscode'
import path from 'path'

import {TinkerEditor, TinkerEditorProvider} from './editor'
import {TinkerFileSystemProvider} from './filesystem'
import {Terminal} from './terminal'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

  context.subscriptions.push(
    window.registerCustomEditorProvider(
      'tinkerun.tinker',
      new TinkerEditorProvider(context),
    ),
  )

  context.subscriptions.push(
    window.onDidCloseTerminal(async e => {
      const terminal = Terminal.instance(`${e.processId}`)
      if (terminal) {
        commands.executeCommand('tinkerun.disconnect', terminal.file)
      }
    })
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
    commands.registerCommand(
      'tinkerun.connect',
      (file: string) => {
        Terminal.instance(file).show()

        workspace.updateWorkspaceFolders(0, 0, {
          uri: Uri.parse('tinker:/').with({fragment: file}),
          name: `Tinkerun: ${path.basename(file)}`,
        })

        TinkerEditor.instance(file).postSetConnectedMessage()
      },
    ),
  )

  context.subscriptions.push(
    commands.registerCommand(
      'tinkerun.disconnect',
      (file: string) => {
        // 清理文件夹
        const index = workspace.getWorkspaceFolder(Uri.parse(`tinker:/`).with({fragment: file}))?.index
        if (index !== undefined) {
          workspace.updateWorkspaceFolders(index, 1)
        }
        // 清理 terminal
        const terminal = Terminal.instance(file)
        if (terminal) {
          terminal.dispose()
        }

        TinkerEditor.instance(file).postSetConnectedMessage()
      },
    ),
  )
}

// this method is called when your extension is deactivated
export function deactivate() {
}
