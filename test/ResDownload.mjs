'use strict'

import { describe, it } from 'node:test'
import path from 'node:path'
import express from '../lib/express.js'
import request from 'supertest'
import assert from 'node:assert'
import after from 'after'
import utils from './support/Utils.mjs'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

async function tryImport (name) {
  try {
    return await import(name)
  } catch (e) {
    return {}
  }
}

const asyncHooks = tryImport('async_hooks')

const FIXTURES_PATH = path.join(__dirname, 'fixtures')

const describeAsyncHooks = typeof asyncHooks.AsyncLocalStorage === 'function'
  ? describe
  : describe.skip

  
describe('res', () => {
  describe('.download(path)', () => {
    it('should transfer as an attachment', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.download('test/fixtures/user.html')
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect('Content-Disposition', 'attachment; filename="user.html"')
      .expect(200, '<p>{{user.name}}</p>', done)
    })

    it('should accept range requests', (t, done) => {
      const app = express()

      app.get('/', (req, res) => {
        res.download('test/fixtures/user.html')
      })

      request(app)
        .get('/')
        .expect('Accept-Ranges', 'bytes')
        .expect(200, '<p>{{user.name}}</p>', done)
    })

    it('should respond with requested byte range', (t, done) => {
      const app = express()

      app.get('/', (req, res) => {
        res.download('test/fixtures/user.html')
      })

      request(app)
        .get('/')
        .set('Range', 'bytes=0-2')
        .expect('Content-Range', 'bytes 0-2/20')
        .expect(206, '<p>', done)
    })
  })

  describe('.download(path, filename)', () => {
    it('should provide an alternate filename', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.download('test/fixtures/user.html', 'document')
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect('Content-Disposition', 'attachment; filename="document"')
      .expect(200, done)
    })
  })

  describe('.download(path, fn)', () => {
    it('should invoke the callback', (t, done) => {
      const app = express()
      const cb = after(2, done)

      app.use((req, res) => {
        res.download('test/fixtures/user.html', cb)
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect('Content-Disposition', 'attachment; filename="user.html"')
      .expect(200, cb)
    })

    describeAsyncHooks('async local storage', () => {
      it('should presist store', (t, done) => {
        const app = express()
        const cb = after(2, done)
        const store = { foo: 'bar' }

        app.use((req, res, next) => {
          req.asyncLocalStorage = new asyncHooks.AsyncLocalStorage()
          req.asyncLocalStorage.run(store, next)
        })

        app.use((req, res) => {
          res.download('test/fixtures/name.txt', err => {
            if (err) return cb(err)

            const local = req.asyncLocalStorage.getStore()

            assert.strictEqual(local.foo, 'bar')
            cb()
          })
        })

        request(app)
          .get('/')
          .expect('Content-Type', 'text/plain; charset=UTF-8')
          .expect('Content-Disposition', 'attachment; filename="name.txt"')
          .expect(200, 'tobi', cb)
      })

      it('should presist store on error', (t, done) => {
        const app = express()
        const store = { foo: 'bar' }

        app.use((req, res, next) => {
          req.asyncLocalStorage = new asyncHooks.AsyncLocalStorage()
          req.asyncLocalStorage.run(store, next)
        })

        app.use((req, res) => {
          res.download('test/fixtures/does-not-exist', err => {
            const local = req.asyncLocalStorage.getStore()

            if (local) {
              res.setHeader('x-store-foo', String(local.foo))
            }

            res.send(err ? 'got ' + err.status + ' error' : 'no error')
          })
        })

        request(app)
          .get('/')
          .expect(200)
          .expect('x-store-foo', 'bar')
          .expect('got 404 error')
          .end(done)
      })
    })
  })

  describe('.download(path, options)', () => {
    it('should allow options to res.sendFile()', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.download('test/fixtures/.name', {
          dotfiles: 'allow',
          maxAge: '4h'
        })
      })

      request(app)
        .get('/')
        .expect(200)
        .expect('Content-Disposition', 'attachment; filename=".name"')
        .expect('Cache-Control', 'public, max-age=14400')
        .expect(utils.shouldHaveBody(Buffer.from('tobi')))
        .end(done)
    })

    describe('with "headers" option', () => {
      it('should set headers on response', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.download('test/fixtures/user.html', {
            headers: {
              'X-Foo': 'Bar',
              'X-Bar': 'Foo'
            }
          })
        })

        request(app)
          .get('/')
          .expect(200)
          .expect('X-Foo', 'Bar')
          .expect('X-Bar', 'Foo')
          .end(done)
      })

      it('should use last header when duplicated', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.download('test/fixtures/user.html', {
            headers: {
              'X-Foo': 'Bar',
              'x-foo': 'bar'
            }
          })
        })

        request(app)
          .get('/')
          .expect(200)
          .expect('X-Foo', 'bar')
          .end(done)
      })

      it('should override Content-Type', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.download('test/fixtures/user.html', {
            headers: {
              'Content-Type': 'text/x-custom'
            }
          })
        })

        request(app)
          .get('/')
          .expect(200)
          .expect('Content-Type', 'text/x-custom')
          .end(done)
      })

      it('should not set headers on 404', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.download('test/fixtures/does-not-exist', {
            headers: {
              'X-Foo': 'Bar'
            }
          })
        })

        request(app)
          .get('/')
          .expect(404)
          .expect(utils.shouldNotHaveHeader('X-Foo'))
          .end(done)
      })

      describe('when headers contains Content-Disposition', () => {
        it('should be ignored', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.download('test/fixtures/user.html', {
              headers: {
                'Content-Disposition': 'inline'
              }
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect('Content-Disposition', 'attachment; filename="user.html"')
            .end(done)
        })

        it('should be ignored case-insensitively', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.download('test/fixtures/user.html', {
              headers: {
                'content-disposition': 'inline'
              }
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect('Content-Disposition', 'attachment; filename="user.html"')
            .end(done)
        })
      })
    })

    describe('with "root" option', () => {
      it('should allow relative path', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.download('name.txt', {
            root: FIXTURES_PATH
          })
        })

        request(app)
          .get('/')
          .expect(200)
          .expect('Content-Disposition', 'attachment; filename="name.txt"')
          .expect(utils.shouldHaveBody(Buffer.from('tobi')))
          .end(done)
      })

      it('should allow up within root', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.download('fake/../name.txt', {
            root: FIXTURES_PATH
          })
        })

        request(app)
          .get('/')
          .expect(200)
          .expect('Content-Disposition', 'attachment; filename="name.txt"')
          .expect(utils.shouldHaveBody(Buffer.from('tobi')))
          .end(done)
      })

      it('should reject up outside root', (t, done) => {
        const app = express()

        app.use((req, res) => {
          const p = '..' + path.sep +
            path.relative(path.dirname(FIXTURES_PATH), path.join(FIXTURES_PATH, 'name.txt'))

          res.download(p, {
            root: FIXTURES_PATH
          })
        })

        request(app)
          .get('/')
          .expect(403)
          .expect(utils.shouldNotHaveHeader('Content-Disposition'))
          .end(done)
      })

      it('should reject reading outside root', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.download('../name.txt', {
            root: FIXTURES_PATH
          })
        })

        request(app)
          .get('/')
          .expect(403)
          .expect(utils.shouldNotHaveHeader('Content-Disposition'))
          .end(done)
      })
    })
  })

  describe('.download(path, filename, fn)', () => {
    it('should invoke the callback', (t, done) => {
      const app = express()
      const cb = after(2, done)

      app.use((req, res) => {
        res.download('test/fixtures/user.html', 'document', cb)
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect('Content-Disposition', 'attachment; filename="document"')
      .expect(200, cb)
    })
  })

  describe('.download(path, filename, options, fn)', () => {
    it('should invoke the callback', (t, done) => {
      const app = express()
      const cb = after(2, done)
      const options = {}

      app.use((req, res) => {
        res.download('test/fixtures/user.html', 'document', options, cb)
      })

      request(app)
      .get('/')
      .expect(200)
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect('Content-Disposition', 'attachment; filename="document"')
      .end(cb)
    })

    it('should allow options to res.sendFile()', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.download('test/fixtures/.name', 'document', {
          dotfiles: 'allow',
          maxAge: '4h'
        })
      })

      request(app)
        .get('/')
        .expect(200)
        .expect('Content-Disposition', 'attachment; filename="document"')
        .expect('Cache-Control', 'public, max-age=14400')
        .expect(utils.shouldHaveBody(Buffer.from('tobi')))
        .end(done)
    })

    describe('when options.headers contains Content-Disposition', () => {
      it('should be ignored', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.download('test/fixtures/user.html', 'document', {
            headers: {
              'Content-Type': 'text/x-custom',
              'Content-Disposition': 'inline'
            }
          })
        })

        request(app)
        .get('/')
        .expect(200)
        .expect('Content-Type', 'text/x-custom')
        .expect('Content-Disposition', 'attachment; filename="document"')
        .end(done)
      })

      it('should be ignored case-insensitively', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.download('test/fixtures/user.html', 'document', {
            headers: {
              'content-type': 'text/x-custom',
              'content-disposition': 'inline'
            }
          })
        })

        request(app)
        .get('/')
        .expect(200)
        .expect('Content-Type', 'text/x-custom')
        .expect('Content-Disposition', 'attachment; filename="document"')
        .end(done)
      })
    })
  })

  describe('on failure', () => {
    it('should invoke the callback', (t, done) => {
      const app = express()

      app.use((req, res, next) => {
        res.download('test/fixtures/foobar.html', function(err){
          if (!err) return next(new Error('expected error'))
          res.send('got ' + err.status + ' ' + err.code)
        })
      })

      request(app)
      .get('/')
      .expect(200, 'got 404 ENOENT', done)
    })

    it('should remove Content-Disposition', (t, done) => {
      const app = express()

      app.use((req, res, next) => {
        res.download('test/fixtures/foobar.html', function(err){
          if (!err) return next(new Error('expected error'))
          res.end('failed')
        })
      })

      request(app)
        .get('/')
        .expect(utils.shouldNotHaveHeader('Content-Disposition'))
        .expect(200, 'failed', done)
    })
  })
})
