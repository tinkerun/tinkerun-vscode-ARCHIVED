import {ThemeIcon, TreeItem, TreeItemCollapsibleState} from 'vscode'

import {SnippetSchema} from './tinker'

export class SnippetItem extends TreeItem {

    contextValue = 'snippet'

    iconPath = new ThemeIcon('code')

    /**
     * 用于找回 connection
     */
    file: string

    constructor(snippet: SnippetSchema, file: string) {
        super(snippet.name, TreeItemCollapsibleState.None)

        this.file = file
    }

}