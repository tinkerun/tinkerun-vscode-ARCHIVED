import {FileStat, FileType} from 'vscode'
import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'

export class TinkerFile implements FileStat {
  ctime: number = Date.now()
  mtime: number = Date.now()
  size: number = 0
  type: FileType = FileType.File

  name: string
  data?: string

  constructor(name: string) {
    this.name = name
  }
}

export class TinkerDirectory implements FileStat {
  ctime: number = Date.now()
  mtime: number = Date.now()
  size: number = 0
  type: FileType = FileType.Directory

  name: string
  entries: TinkerEntries

  constructor(name: string) {
    this.name = name
    this.entries = {}
  }
}

export type TinkerEntry = TinkerFile | TinkerDirectory
export type TinkerEntries = {[key: string]: TinkerEntry}

export interface TinkerSchema {
  command: string
  fs: TinkerDirectory
}

export type Database = low.LowdbSync<TinkerSchema>

const databases = new Map<string, Database>()

export function database(file: string): Database {
  if (!databases.has(file)) {
    const db = low(new FileSync<TinkerSchema>(file))

    db
      .defaults({
        command: 'cd ~/example-app && php artisan tinker',
        fs: new TinkerDirectory('fs'),
      })
      .write()

    databases.set(file, db)
  }

  // @ts-ignore
  return databases.get(file)
}