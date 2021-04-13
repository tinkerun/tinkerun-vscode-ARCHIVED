import {FileType} from 'vscode'
import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'

/**
 * @param {string} name
 * @returns FileStat
 */
const tinkerFile = name => {
  return {
    ctime: Date.now(),
    mtime: Date.now(),
    size: 0,
    type: FileType.File,
    data: '',
    name,
  }
}

/**
 * @param {string} name
 * @returns FileStat
 */
const tinkerDirectory = name => {
  return {
    ctime: Date.now(),
    mtime: Date.now(),
    size: 0,
    type: FileType.Directory,
    entries: {},
    name,
  }
}

/**
 * @type {Map<string, low>}
 */
const databases = new Map()

/**
 *
 * @param {string} file
 * @return {low}
 */
const database = (file) => {
  if (!databases.has(file)) {
    const db = low(new FileSync(file))

    db
      .defaults({
        command: 'cd ~/example-app && php artisan tinker',
        fs: tinkerDirectory('fs'),
      })
      .write()

    databases.set(file, db)
  }

  return databases.get(file)
}

export {
  database,
  tinkerFile,
  tinkerDirectory,
}
