import {
  Disposable,
  Event,
  EventEmitter,
  FileChangeEvent,
  FileChangeType,
  FileStat,
  FileSystemError,
  FileSystemProvider,
  FileType,
  Uri,
} from 'vscode'
import path from 'path'
import compact from 'lodash/compact'
import Timer = NodeJS.Timer

import {database, Database, TinkerDirectory, TinkerEntry, TinkerFile} from './database'
import {TextDecoder, TextEncoder} from 'util'

export class TinkerFileSystemProvider implements FileSystemProvider {

  private static db(uri: Uri): Database {
    return database(uri.fragment)
  }

  createDirectory(uri: Uri): void | Thenable<void> {
    const basename = path.posix.basename(uri.path)
    const dirname = uri.with({
      path: path.posix.dirname(uri.path),
    })

    const entry = new TinkerDirectory(basename)

    TinkerFileSystemProvider.db(uri)
      .set(TinkerFileSystemProvider.uriToPath(uri), entry)
      .write()

    const events: FileChangeEvent[] = [
      {
        type: FileChangeType.Changed,
        uri: dirname,
      },
      {
        type: FileChangeType.Created,
        uri: uri,
      },
    ]

    this.fireEvents(events)
  }

  delete(uri: Uri, options: { recursive: boolean }): void | Thenable<void> {
    const dirname = uri.with({
      path: path.posix.dirname(uri.path),
    })

    TinkerFileSystemProvider.db(uri)
      .unset(TinkerFileSystemProvider.uriToPath(uri))
      .write()

    const events: FileChangeEvent[] = [
      {
        type: FileChangeType.Changed,
        uri: dirname,
      },
      {
        type: FileChangeType.Deleted,
        uri: uri,
      },
    ]

    this.fireEvents(events)
  }

  readDirectory(uri: Uri): [string, FileType][] | Thenable<[string, FileType][]> {
    const {entries} = TinkerFileSystemProvider.lookupDirectory(uri)

    const res: [string, FileType][] = []
    for (const name in entries) {
      res.push([entries[name].name, entries[name].type])
    }

    return res
  }

  readFile(uri: Uri): Uint8Array | Thenable<Uint8Array> {
    const data = TinkerFileSystemProvider.lookupFile(uri).data
    if (data !== undefined) {
      return new TextEncoder().encode(data)
    }

    throw FileSystemError.FileNotFound()
  }

  rename(oldUri: Uri, newUri: Uri, options: { overwrite: boolean }): void | Thenable<void> {
    if (!options.overwrite && TinkerFileSystemProvider.lookup(newUri)) {
      throw FileSystemError.FileExists(newUri)
    }

    const newName = path.posix.basename(newUri.path)
    TinkerFileSystemProvider.db(oldUri)
      .set(`${TinkerFileSystemProvider.uriToPath(oldUri)}.name`, newName)
      .write()

    const events = [
      {
        type: FileChangeType.Deleted,
        uri: oldUri,
      },
      {
        type: FileChangeType.Created,
        uri: newUri,
      },
    ]

    this.fireEvents(events)
  }

  stat(uri: Uri): FileStat | Thenable<FileStat> {
    return TinkerFileSystemProvider.lookup(uri)
  }

  watch(uri: Uri, options: { recursive: boolean; excludes: string[] }): Disposable {
    return new Disposable(() => false)
  }

  writeFile(uri: Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): void | Thenable<void> {
    const basename = path.posix.basename(uri.path)

    let entry = undefined

    try {
      // 如果不存在会返回错误，希望找不到的时候为 undefined
      entry = TinkerFileSystemProvider.lookupFile(uri)
    } catch (e) {}

    if (!entry && !options.create) {
      throw FileSystemError.FileNotFound()
    }

    if (entry && options.create && !options.overwrite) {
      throw FileSystemError.FileExists(uri)
    }

    if (!entry) {
      TinkerFileSystemProvider.db(uri)
        .set(TinkerFileSystemProvider.uriToPath(uri), new TinkerFile(basename))
        .write()

      this.fireEvents([
        {
          type: FileChangeType.Created,
          uri,
        }
      ])
    }

    TinkerFileSystemProvider.db(uri)
      .set(`${TinkerFileSystemProvider.uriToPath(uri)}.data`, new TextDecoder().decode(content))
      .write()

    this.fireEvents([
      {
        type: FileChangeType.Changed,
        uri,
      }
    ])
  }

  private static uriToPath(uri: Uri): string {
    const parts = compact(uri.path.replace('.', '___').split('/'))
    parts.unshift('fs')

    if (parts.length <= 1) {
      return 'fs'
    }

    return parts.join('.entries.')
  }

  private static lookup(uri: Uri): TinkerEntry {
    const db = TinkerFileSystemProvider.db(uri)
    const path = TinkerFileSystemProvider.uriToPath(uri)

    if (!db.has(path).value()) {
      throw FileSystemError.FileNotFound()
    }

    return db.get(path).value()
  }

  private static lookupDirectory(uri: Uri): TinkerDirectory {
    const entry = TinkerFileSystemProvider.lookup(uri)
    if (entry.type === FileType.Directory) {
      return entry as TinkerDirectory
    }

    throw FileSystemError.FileNotADirectory(uri)
  }

  private static lookupFile(uri: Uri): TinkerFile {
    const entry = TinkerFileSystemProvider.lookup(uri)
    if (entry.type === FileType.File) {
      return entry as TinkerFile
    }

    throw FileSystemError.FileIsADirectory()
  }

  private emitter = new EventEmitter<FileChangeEvent[]>()
  private events: FileChangeEvent[] = []
  private timer?: Timer

  readonly onDidChangeFile: Event<FileChangeEvent[]> = this.emitter.event

  private fireEvents(events: FileChangeEvent[]): void {
    this.events.push(...events)

    if (this.timer) {
      clearTimeout(this.timer)
    }

    this.timer = setTimeout(() => {
      this.emitter.fire(this.events)
      this.events.length = 0
    }, 5)

    this.emitter.fire(events)
  }
}