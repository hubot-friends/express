import fs from 'node:fs'

const variableRegExp = /\$([0-9a-zA-Z\.]+)/g

function generateVariableLookup(data) {
  return function variableLookup(str, path) {
    const parts = path.split('.')
    let value = data

    for (let i = 0; i < parts.length; i++) {
      value = value[parts[i]]
    }

    return value
  }
}

const renderFile = (fileName, options, callback) => {
  function onReadFile(err, str) {
    if (err) {
      callback(err)
      return
    }

    try {
      str = str.replace(variableRegExp, generateVariableLookup(options))
    } catch (e) {
      err = e
      err.name = 'RenderError'
    }

    callback(err, str)
  }

  fs.readFile(fileName, 'utf8', onReadFile)
}

export default renderFile
