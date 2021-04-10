import {
  Event,
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  workspace
} from 'vscode'
import { basename } from 'path'

import { Tinker } from './tinker'
import { SnippetItem } from './snippet'

export class ConnectionItem extends TreeItem {
  contextValue = 'connection'

  tinker: Tinker

  constructor (file: string) {
    super(basename(file), TreeItemCollapsibleState.None)

    this.tinker = Tinker.instance(file)

    this.iconPath = this.tinker.themeIcon

    this.command = {
      title: 'Connect',
      command: 'tinkerun.connections.connect',
      arguments: [this.tinker]
    }
  }

  connected () {
    // 设置选中不再触发 command
    this.command = undefined
    // 设置可打开状态
    this.collapsibleState = TreeItemCollapsibleState.Expanded
  }
}

export class ConnectionTreeDataProvider implements TreeDataProvider<TreeItem> {
  private readonly _onDidChangeTreeData: EventEmitter<TreeItem | undefined | void> = new EventEmitter<TreeItem | undefined | void>()

  onDidChangeTreeData: Event<void | TreeItem | undefined | null> = this._onDidChangeTreeData.event

  private elements: {[file: string]: TreeItem} = {}

  getElement (file: string) {
    return this.elements[file]
  }

  refresh (element?: TreeItem) {
    this._onDidChangeTreeData.fire(element)
  }

  getParent (element: TreeItem): ProviderResult<TreeItem> {
    if (element instanceof SnippetItem) {
      return this.getElement(element.tinker.file)
    }

    return null
  }

  getChildren (element?: TreeItem): ProviderResult<TreeItem[]> {
    if (element != null) {
      if (element instanceof ConnectionItem && element.tinker.isConnected) {
        // 获取所有 snippets
        return Promise.resolve(
          this.resolveSnippetItems(element)
        )
      }

      return Promise.resolve([])
    }

    return Promise.resolve(this.resolveConnectionItems())
  }

  getTreeItem (element: TreeItem): TreeItem | Thenable<TreeItem> {
    return element
  }

  private resolveSnippetItems (element: ConnectionItem) {
    return element.tinker
      .snippets
      .map(snippet => new SnippetItem(snippet, element.tinker.file))
  }

  private resolveConnectionItems () {
    return workspace
      .findFiles('*.tinker')
      .then(uris => uris.map(uri => {
        const item = new ConnectionItem(uri.path)
        this.elements[uri.path] = item
        return item
      }))
  }
}
