'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

function render(path, options, fn) {
  fs.readFile(path, 'utf8', (err, str) => {
    if (err) return fn(err)
    str = str.replace('{{user.name}}', options.user.name)
    fn(null, str)
  })
}

describe('app', () => {
  describe('.engine(ext, fn)', () => {
    it('should map a template engine', (t, done) => {
      const app = express()

      app.set('views', path.join(__dirname, 'fixtures'))
      app.engine('.html', render)
      app.locals.user = { name: 'tobi' }

      app.render('user.html', (err, str) => {
        if (err) return done(err)
        assert.strictEqual(str, '<p>tobi</p>')
        done()
      })
    })

    it('should throw when the callback is missing', () => {
      const app = express()
      assert.throws(() => {
        app.engine('.html', null)
      }, /callback function required/)
    })

    it('should work without leading "."', (t, done) => {
      const app = express()

      app.set('views', path.join(__dirname, 'fixtures'))
      app.engine('html', render)
      app.locals.user = { name: 'tobi' }

      app.render('user.html', (err, str) => {
        if (err) return done(err)
        assert.strictEqual(str, '<p>tobi</p>')
        done()
      })
    })

    it('should work "view engine" setting', (t, done) => {
      const app = express()

      app.set('views', path.join(__dirname, 'fixtures'))
      app.engine('html', render)
      app.set('view engine', 'html')
      app.locals.user = { name: 'tobi' }

      app.render('user', (err, str) => {
        if (err) return done(err)
        assert.strictEqual(str, '<p>tobi</p>')
        done()
      })
    })

    it('should work "view engine" with leading "."', (t, done) => {
      const app = express()

      app.set('views', path.join(__dirname, 'fixtures'))
      app.engine('.html', render)
      app.set('view engine', '.html')
      app.locals.user = { name: 'tobi' }

      app.render('user', (err, str) => {
        if (err) return done(err)
        assert.strictEqual(str, '<p>tobi</p>')
        done()
      })
    })
  })
})
