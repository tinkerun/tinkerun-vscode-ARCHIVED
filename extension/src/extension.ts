import { window, ExtensionContext } from 'vscode'
import { TinkerEditorProvider } from './editor'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate (context: ExtensionContext) {
  context.subscriptions.push(
    window.registerCustomEditorProvider(
      'tinkerun.tinker',
      new TinkerEditorProvider(context)
    )
  )
}

// this method is called when your extension is deactivated
export function deactivate () {}
