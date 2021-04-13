import {
  Disposable,
  EventEmitter,
  FileChangeType,
  FileSystemError,
  FileType,
} from 'vscode'
import path from 'path'
import compact from 'lodash/compact'
import {TextDecoder, TextEncoder} from 'util'

import {database, tinkerFile, tinkerDirectory} from './database'

class TinkerFileSystemProvider {
  constructor () {
    /** @type {EventEmitter<FileChangeEvent[]>} */
    this.emitter = new EventEmitter()
    this.events = []
    this.timer = null

    /** @type {Event<FileChangeEvent[]>} */
    this.onDidChangeFile = this.emitter.event
  }

  /**
   * @param {Uri} uri
   * @return {string}
   */
  static file (uri) {
    return uri.fragment
  }

  /**
   *
   * @param {Uri} uri
   * @return {any}
   */
  static db (uri) {
    return database(TinkerFileSystemProvider.file(uri))
  }

  /**
   * @param {Uri} uri
   */
  createDirectory (uri) {
    const basename = path.posix.basename(uri.path)
    const dirname = uri.with({
      path: path.posix.dirname(uri.path),
    })

    const entry = tinkerDirectory(basename)

    TinkerFileSystemProvider.db(uri)
      .update(`${TinkerFileSystemProvider.uriToPath(dirname)}.size`, n => n + 1)
      .set(TinkerFileSystemProvider.uriToPath(uri), entry)
      .write()

    const events = [
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

  /**
   * @param {Uri} uri
   * @param {{ recursive: boolean }} options
   */
  delete (uri, options) {
    const dirname = uri.with({
      path: path.posix.dirname(uri.path),
    })

    TinkerFileSystemProvider.db(uri)
      .update(`${TinkerFileSystemProvider.uriToPath(dirname)}.size`, n => n - 1)
      .unset(TinkerFileSystemProvider.uriToPath(uri))
      .write()

    const events = [
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

  /**
   * @param {Uri} uri
   * @return [string, FileType][]
   */
  readDirectory (uri) {
    const dir = TinkerFileSystemProvider.lookupDirectory(uri)
    console.log(dir)

    const res = []
    for (const entry of Object.values(dir.entries)) {
      res.push([entry.name, entry.type])
    }

    return res
  }

  /**
   * @param {Uri} uri
   * @return {Uint8Array}
   */
  readFile (uri) {
    const {data} = TinkerFileSystemProvider.lookupFile(uri)
    if (data !== undefined) {
      return new TextEncoder().encode(data)
    }

    throw FileSystemError.FileNotFound(uri)
  }

  /**
   * @param {Uri} oldUri
   * @param {Uri} newUri
   * @param {{ overwrite: boolean }} options
   */
  rename (oldUri, newUri, options) {
    let entryNew

    try {
      entryNew = TinkerFileSystemProvider.lookup(newUri)
    } catch (e) {}

    if (!options.overwrite && entryNew) {
      throw FileSystemError.FileExists(newUri)
    }

    const newName = path.posix.basename(newUri.path)

    const oldEntry = TinkerFileSystemProvider.lookup(oldUri)

    TinkerFileSystemProvider.db(oldUri)
      .set(TinkerFileSystemProvider.uriToPath(newUri), {
        ...oldEntry,
        mtime: Date.now(),
        name: newName,
      })
      .unset(TinkerFileSystemProvider.uriToPath(oldUri))
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

  /**
   * @param {Uri} uri
   * @return {FileStat}
   */
  stat (uri) {
    return TinkerFileSystemProvider.lookup(uri)
  }

  /**
   * @param {Uri} uri
   * @param {{ recursive: boolean, excludes: string[] }} options
   * @return {Disposable}
   */
  watch (uri, options) {
    return new Disposable(() => {
    })
  }

  /**
   * @param {Uri} uri
   * @param {Uint8Array} content
   * @param {{ create: boolean, overwrite: boolean }} options
   */
  writeFile (uri, content, options) {
    const basename = path.posix.basename(uri.path)

    let entry

    try {
      // 如果不存在会返回错误，希望找不到的时候为 undefined
      entry = TinkerFileSystemProvider.lookupFile(uri)
    } catch (e) {
    }

    if (!entry && !options.create) {
      throw FileSystemError.FileNotFound(uri)
    }

    if (entry && options.create && !options.overwrite) {
      throw FileSystemError.FileExists(uri)
    }

    if (!entry) {
      const dirname = uri.with({
        path: path.posix.dirname(uri.path),
      })

      TinkerFileSystemProvider.db(uri)
        .update(`${TinkerFileSystemProvider.uriToPath(dirname)}.size`, n => n + 1)
        .set(TinkerFileSystemProvider.uriToPath(uri), tinkerFile(basename))
        .write()

      this.fireEvents([
        {
          type: FileChangeType.Created,
          uri,
        },
        {
          type: FileChangeType.Changed,
          dirname,
        },
      ])
    }

    TinkerFileSystemProvider.db(uri)
      .update(TinkerFileSystemProvider.uriToPath(uri), entry => ({
        ...entry,
        mtime: Date.now(),
        data: new TextDecoder().decode(content),
      }))
      .write()

    this.fireEvents([
      {
        type: FileChangeType.Changed,
        uri,
      },
    ])
  }

  /**
   * @param {Uri} uri
   * @return {string}
   */
  static uriToPath (uri) {
    const parts = compact(uri.path.replace('.', '___').split('/'))
    parts.unshift('fs')

    if (parts.length <= 1) {
      return 'fs'
    }

    return parts.join('.entries.')
  }

  /**
   * @param {Uri} uri
   * @return {FileStat}
   */
  static lookup (uri) {
    const db = TinkerFileSystemProvider.db(uri)
    const path = TinkerFileSystemProvider.uriToPath(uri)

    if (!db.has(path).value()) {
      throw FileSystemError.FileNotFound(uri)
    }

    return db.get(path).value()
  }

  /**
   * @param {Uri} uri
   * @return {FileStat}
   */
  static lookupDirectory (uri) {
    const entry = TinkerFileSystemProvider.lookup(uri)
    if (entry.type === FileType.Directory) {
      return entry
    }

    throw FileSystemError.FileNotADirectory(uri)
  }

  /**
   * @param {Uri} uri
   * @return {FileStat}
   */
  static lookupFile (uri) {
    const entry = TinkerFileSystemProvider.lookup(uri)
    if (entry.type === FileType.File) {
      return entry
    }

    throw FileSystemError.FileIsADirectory(uri)
  }

  /**
   * @param {FileChangeEvent[]} events
   */
  fireEvents (events) {
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

export {
  TinkerFileSystemProvider,
}
