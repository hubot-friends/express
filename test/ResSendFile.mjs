'use strict'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import express from '../lib/express.js'
import request from 'supertest'
import after from 'after'
import onFinished from 'on-finished'
import path from 'node:path'
import utils from './support/Utils.mjs'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

async function tryImport (name) {
  try {
    return await import(name)
  } catch (e) {
    return {}
  }
}

function createApp(path, options, fn) {
  const app = express()

  app.use((req, res) => {
    res.sendFile(path, options, fn)
  })

  return app
}
const asyncHooks = await tryImport('async_hooks')
const fixtures = path.join(__dirname, 'fixtures')

const describeAsyncHooks = typeof asyncHooks.AsyncLocalStorage === 'function'
  ? describe
  : describe.skip

describe('res', () => {
  describe('.sendFile(path)', () => {
    it('should error missing path', (t, done) => {
      const app = createApp()

      request(app)
      .get('/')
      .expect(500, /path.*required/, done)
    })

    it('should error for non-string path', (t, done) => {
      const app = createApp(42)

      request(app)
      .get('/')
      .expect(500, /TypeError: path must be a string to res.sendFile/, done)
    })

    it('should error for non-absolute path', (t, done) => {
      const app = createApp('name.txt')

      request(app)
        .get('/')
        .expect(500, /TypeError: path must be absolute/, done)
    })

    it('should transfer a file', (t, done) => {
      const app = createApp(path.resolve(fixtures, 'name.txt'))

      request(app)
      .get('/')
      .expect(200, 'tobi', done)
    })

    it('should transfer a file with special characters in string', (t, done) => {
      const app = createApp(path.resolve(fixtures, '% of dogs.txt'))

      request(app)
      .get('/')
      .expect(200, '20%', done)
    })

    it('should include ETag', (t, done) => {
      const app = createApp(path.resolve(fixtures, 'name.txt'))

      request(app)
      .get('/')
      .expect('ETag', /^(?:W\/)?"[^"]+"$/)
      .expect(200, 'tobi', done)
    })

    it('should 304 when ETag matches', (t, done) => {
      const app = createApp(path.resolve(fixtures, 'name.txt'))

      request(app)
      .get('/')
      .expect('ETag', /^(?:W\/)?"[^"]+"$/)
      .expect(200, 'tobi', (err, res) => {
        if (err) return done(err)
        const etag = res.headers.etag
        request(app)
        .get('/')
        .set('If-None-Match', etag)
        .expect(304, done)
      })
    })

    it('should 404 for directory', (t, done) => {
      const app = createApp(path.resolve(fixtures, 'blog'))

      request(app)
      .get('/')
      .expect(404, done)
    })

    it('should 404 when not found', (t, done) => {
      const app = createApp(path.resolve(fixtures, 'does-no-exist'))

      app.use((req, res) => {
        res.statusCode = 200
        res.send('no!')
      })

      request(app)
      .get('/')
      .expect(404, done)
    })

    it('should send cache-control by default', (t, done) => {
      const app = createApp(path.resolve(__dirname, 'fixtures/name.txt'))

      request(app)
        .get('/')
        .expect('Cache-Control', 'public, max-age=0')
        .expect(200, done)
    })

    it('should not serve dotfiles by default', (t, done) => {
      const app = createApp(path.resolve(__dirname, 'fixtures/.name'))

      request(app)
        .get('/')
        .expect(404, done)
    })

    it('should not override manual content-types', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.contentType('application/x-bogus')
        res.sendFile(path.resolve(fixtures, 'name.txt'))
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/x-bogus')
      .end(done)
    })

    it('should not error if the client aborts', (t, done) => {
      const app = express()
      const cb = after(2, done)
      var error = null

      app.use((req, res) => {
        setImmediate(() => {
          res.sendFile(path.resolve(fixtures, 'name.txt'))
          setTimeout(() => {
            cb(error)
          }, 10)
        })
        test.req.abort()
      })

      app.use((err, req, res, next) => {
        error = err
        next(err)
      })

      const server = app.listen()
      const test = request(server).get('/')
      test.end(err => {
        assert.ok(err)
        server.close(cb)
      })
    })
  })

  describe('.sendFile(path, fn)', () => {
    it('should invoke the callback when complete', (t, done) => {
      const cb = after(2, done)
      const app = createApp(path.resolve(fixtures, 'name.txt'), cb)

      request(app)
      .get('/')
      .expect(200, cb)
    })

    it('should invoke the callback when client aborts', (t, done) => {
      const cb = after(2, done)
      const app = express()

      app.use((req, res) => {
        setImmediate(() => {
          res.sendFile(path.resolve(fixtures, 'name.txt'), err => {
            assert.ok(err)
            assert.strictEqual(err.code, 'ECONNABORTED')
            cb()
          })
        })
        test.req.abort()
      })

      const server = app.listen()
      const test = request(server).get('/')
      test.end(err => {
        assert.ok(err)
        server.close(cb)
      })
    })

    it('should invoke the callback when client already aborted', (t, done) => {
      const cb = after(2, done)
      const app = express()

      app.use((req, res) => {
        onFinished(res, () => {
          res.sendFile(path.resolve(fixtures, 'name.txt'), err => {
            assert.ok(err)
            assert.strictEqual(err.code, 'ECONNABORTED')
            cb()
          })
        })
        test.req.abort()
      })

      const server = app.listen()
      const test = request(server).get('/')
      test.end(err => {
        assert.ok(err)
        server.close(cb)
      })
    })

    it('should invoke the callback without error when HEAD', (t, done) => {
      const app = express()
      const cb = after(2, done)

      app.use((req, res) => {
        res.sendFile(path.resolve(fixtures, 'name.txt'), cb)
      })

      request(app)
      .head('/')
      .expect(200, cb)
    })

    it('should invoke the callback without error when 304', (t, done) => {
      const app = express()
      const cb = after(3, done)

      app.use((req, res) => {
        res.sendFile(path.resolve(fixtures, 'name.txt'), cb)
      })

      request(app)
      .get('/')
      .expect('ETag', /^(?:W\/)?"[^"]+"$/)
      .expect(200, 'tobi', (err, res) => {
        if (err) return cb(err)
        const etag = res.headers.etag
        request(app)
        .get('/')
        .set('If-None-Match', etag)
        .expect(304, cb)
      })
    })

    it('should invoke the callback on 404', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.sendFile(path.resolve(fixtures, 'does-not-exist'), err => {
          res.send(err ? 'got ' + err.status + ' error' : 'no error')
        })
      })

      request(app)
        .get('/')
        .expect(200, 'got 404 error', done)
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
          res.sendFile(path.resolve(fixtures, 'name.txt'), err => {
            if (err) return cb(err)

            const local = req.asyncLocalStorage.getStore()

            assert.strictEqual(local.foo, 'bar')
            cb()
          })
        })

        request(app)
          .get('/')
          .expect('Content-Type', 'text/plain; charset=UTF-8')
          .expect(200, 'tobi', cb)
      })

      it('should persist store on error', (t, done) => {
        const app = express()
        const store = { foo: 'bar' }

        app.use((req, res, next) => {
          req.asyncLocalStorage = new asyncHooks.AsyncLocalStorage()
          req.asyncLocalStorage.run(store, next)
        })

        app.use((req, res) => {
          res.sendFile(path.resolve(fixtures, 'does-not-exist'), err => {
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

  describe('.sendFile(path, options)', () => {
    it('should pass options to send module', (t, done) => {
      request(createApp(path.resolve(fixtures, 'name.txt'), { start: 0, end: 1 }))
      .get('/')
      .expect(200, 'to', done)
    })

    describe('with "acceptRanges" option', () => {
      describe('when true', () => {
        it('should advertise byte range accepted', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'nums.txt'), {
              acceptRanges: true
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect('Accept-Ranges', 'bytes')
            .expect('123456789')
            .end(done)
        })

        it('should respond to range request', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'nums.txt'), {
              acceptRanges: true
            })
          })

          request(app)
            .get('/')
            .set('Range', 'bytes=0-4')
            .expect(206, '12345', done)
        })
      })

      describe('when false', () => {
        it('should not advertise accept-ranges', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'nums.txt'), {
              acceptRanges: false
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect(utils.shouldNotHaveHeader('Accept-Ranges'))
            .end(done)
        })

        it('should not honor range requests', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'nums.txt'), {
              acceptRanges: false
            })
          })

          request(app)
            .get('/')
            .set('Range', 'bytes=0-4')
            .expect(200, '123456789', done)
        })
      })
    })

    describe('with "cacheControl" option', () => {
      describe('when true', () => {
        it('should send cache-control header', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'user.html'), {
              cacheControl: true
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect('Cache-Control', 'public, max-age=0')
            .end(done)
        })
      })

      describe('when false', () => {
        it('should not send cache-control header', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'user.html'), {
              cacheControl: false
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect(utils.shouldNotHaveHeader('Cache-Control'))
            .end(done)
        })
      })
    })

    describe('with "dotfiles" option', () => {
      describe('when "allow"', () => {
        it('should allow dotfiles', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, '.name'), {
              dotfiles: 'allow'
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect(utils.shouldHaveBody(Buffer.from('tobi')))
            .end(done)
        })
      })

      describe('when "deny"', () => {
        it('should deny dotfiles', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, '.name'), {
              dotfiles: 'deny'
            })
          })

          request(app)
            .get('/')
            .expect(403)
            .expect(/Forbidden/)
            .end(done)
        })
      })

      describe('when "ignore"', () => {
        it('should ignore dotfiles', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, '.name'), {
              dotfiles: 'ignore'
            })
          })

          request(app)
            .get('/')
            .expect(404)
            .expect(/Not Found/)
            .end(done)
        })
      })
    })

    describe('with "headers" option', () => {
      it('should set headers on response', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendFile(path.resolve(fixtures, 'user.html'), {
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
          res.sendFile(path.resolve(fixtures, 'user.html'), {
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
          res.sendFile(path.resolve(fixtures, 'user.html'), {
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
          res.sendFile(path.resolve(fixtures, 'does-not-exist'), {
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
    })

    describe('with "immutable" option', () => {
      describe('when true', () => {
        it('should send cache-control header with immutable', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'user.html'), {
              immutable: true
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect('Cache-Control', 'public, max-age=0, immutable')
            .end(done)
        })
      })

      describe('when false', () => {
        it('should not send cache-control header with immutable', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'user.html'), {
              immutable: false
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect('Cache-Control', 'public, max-age=0')
            .end(done)
        })
      })
    })

    describe('with "lastModified" option', () => {
      describe('when true', () => {
        it('should send last-modified header', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'user.html'), {
              lastModified: true
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect(utils.shouldHaveHeader('Last-Modified'))
            .end(done)
        })

        it('should conditionally respond with if-modified-since', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'user.html'), {
              lastModified: true
            })
          })

          request(app)
            .get('/')
            .set('If-Modified-Since', (new Date(Date.now() + 99999).toUTCString()))
            .expect(304, done)
        })
      })

      describe('when false', () => {
        it('should not have last-modified header', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'user.html'), {
              lastModified: false
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect(utils.shouldNotHaveHeader('Last-Modified'))
            .end(done)
        })

        it('should not honor if-modified-since', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'user.html'), {
              lastModified: false
            })
          })

          request(app)
            .get('/')
            .set('If-Modified-Since', (new Date(Date.now() + 99999).toUTCString()))
            .expect(200)
            .expect(utils.shouldNotHaveHeader('Last-Modified'))
            .end(done)
        })
      })
    })

    describe('with "maxAge" option', () => {
      it('should set cache-control max-age to milliseconds', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendFile(path.resolve(fixtures, 'user.html'), {
            maxAge: 20000
          })
        })

        request(app)
          .get('/')
          .expect(200)
          .expect('Cache-Control', 'public, max-age=20')
          .end(done)
      })

      it('should cap cache-control max-age to 1 year', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendFile(path.resolve(fixtures, 'user.html'), {
            maxAge: 99999999999
          })
        })

        request(app)
          .get('/')
          .expect(200)
          .expect('Cache-Control', 'public, max-age=31536000')
          .end(done)
      })

      it('should min cache-control max-age to 0', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendFile(path.resolve(fixtures, 'user.html'), {
            maxAge: -20000
          })
        })

        request(app)
          .get('/')
          .expect(200)
          .expect('Cache-Control', 'public, max-age=0')
          .end(done)
      })

      it('should floor cache-control max-age', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendFile(path.resolve(fixtures, 'user.html'), {
            maxAge: 21911.23
          })
        })

        request(app)
          .get('/')
          .expect(200)
          .expect('Cache-Control', 'public, max-age=21')
          .end(done)
      })

      describe('when cacheControl: false', () => {
        it('should not send cache-control', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'user.html'), {
              cacheControl: false,
              maxAge: 20000
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect(utils.shouldNotHaveHeader('Cache-Control'))
            .end(done)
        })
      })

      describe('when string', () => {
        it('should accept plain number as milliseconds', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'user.html'), {
              maxAge: '20000'
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect('Cache-Control', 'public, max-age=20')
            .end(done)
        })

        it('should accept suffix "s" for seconds', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'user.html'), {
              maxAge: '20s'
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect('Cache-Control', 'public, max-age=20')
            .end(done)
        })

        it('should accept suffix "m" for minutes', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'user.html'), {
              maxAge: '20m'
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect('Cache-Control', 'public, max-age=1200')
            .end(done)
        })

        it('should accept suffix "d" for days', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendFile(path.resolve(fixtures, 'user.html'), {
              maxAge: '20d'
            })
          })

          request(app)
            .get('/')
            .expect(200)
            .expect('Cache-Control', 'public, max-age=1728000')
            .end(done)
        })
      })
    })

    describe('with "root" option', () => {
      it('should allow relative path', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendFile('name.txt', {
            root: fixtures
          })
        })

        request(app)
          .get('/')
          .expect(200, 'tobi', done)
      })

      it('should allow up within root', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendFile('fake/../name.txt', {
            root: fixtures
          })
        })

        request(app)
          .get('/')
          .expect(200, 'tobi', done)
      })

      it('should reject up outside root', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendFile('..' + path.sep + path.relative(path.dirname(fixtures), path.join(fixtures, 'name.txt')), {
            root: fixtures
          })
        })

        request(app)
          .get('/')
          .expect(403, done)
      })

      it('should reject reading outside root', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendFile('../name.txt', {
            root: fixtures
          })
        })

        request(app)
          .get('/')
          .expect(403, done)
      })
    })
  })

  describe('.sendfile(path, fn)', () => {
    it('should invoke the callback when complete', (t, done) => {
      const app = express()
      const cb = after(2, done)

      app.use((req, res) => {
        res.sendfile('test/fixtures/user.html', cb)
      })

      request(app)
      .get('/')
      .expect(200, cb)
    })

    it('should utilize the same options as express.static()', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.sendfile('test/fixtures/user.html', { maxAge: 60000 })
      })

      request(app)
      .get('/')
      .expect('Cache-Control', 'public, max-age=60')
      .end(done)
    })

    it('should invoke the callback when client aborts', (t, done) => {
      const cb = after(2, done)
      const app = express()

      app.use((req, res) => {
        setImmediate(() => {
          res.sendfile('test/fixtures/name.txt', err => {
            assert.ok(err)
            assert.strictEqual(err.code, 'ECONNABORTED')
            cb()
          })
        })
        test.req.abort()
      })

      const server = app.listen()
      const test = request(server).get('/')
      test.end(err => {
        assert.ok(err)
        server.close(cb)
      })
    })

    it('should invoke the callback when client already aborted', (t, done) => {
      const cb = after(2, done)
      const app = express()

      app.use((req, res) => {
        onFinished(res, () => {
          res.sendfile('test/fixtures/name.txt', err => {
            assert.ok(err)
            assert.strictEqual(err.code, 'ECONNABORTED')
            cb()
          })
        })
        test.req.abort()
      })

      const server = app.listen()
      const test = request(server).get('/')
      test.end(err => {
        assert.ok(err)
        server.close(cb)
      })
    })

    it('should invoke the callback without error when HEAD', (t, done) => {
      const app = express()
      const cb = after(2, done)

      app.use((req, res) => {
        res.sendfile('test/fixtures/name.txt', cb)
      })

      request(app)
      .head('/')
      .expect(200, cb)
    })

    it('should invoke the callback without error when 304', (t, done) => {
      const app = express()
      const cb = after(3, done)

      app.use((req, res) => {
        res.sendfile('test/fixtures/name.txt', cb)
      })

      request(app)
      .get('/')
      .expect('ETag', /^(?:W\/)?"[^"]+"$/)
      .expect(200, 'tobi', (err, res) => {
        if (err) return cb(err)
        const etag = res.headers.etag
        request(app)
        .get('/')
        .set('If-None-Match', etag)
        .expect(304, cb)
      })
    })

    it('should invoke the callback on 404', (t, done) => {
      const app = express()
      var calls = 0

      app.use((req, res) => {
        res.sendfile('test/fixtures/nope.html', err => {
          assert.equal(calls++, 0)
          assert(!res.headersSent)
          res.send(err.message)
        })
      })

      request(app)
      .get('/')
      .expect(200, /^ENOENT.*?, stat/, done)
    })

    it('should not override manual content-types', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.contentType('txt')
        res.sendfile('test/fixtures/user.html')
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .end(done)
    })

    it('should invoke the callback on 403', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.sendfile('test/fixtures/foo/../user.html', err => {
          assert(!res.headersSent)
          res.send(err.message)
        })
      })

      request(app)
      .get('/')
      .expect('Forbidden')
      .expect(200, done)
    })

    it('should invoke the callback on socket error', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.sendfile('test/fixtures/user.html', err => {
          assert.ok(err)
          assert.ok(!res.headersSent)
          assert.strictEqual(err.message, 'broken!')
          done()
        })

        req.socket.destroy(new Error('broken!'))
      })

      request(app)
      .get('/')
      .end(() => {})
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
          res.sendfile('test/fixtures/name.txt', err => {
            if (err) return cb(err)

            const local = req.asyncLocalStorage.getStore()

            assert.strictEqual(local.foo, 'bar')
            cb()
          })
        })

        request(app)
          .get('/')
          .expect('Content-Type', 'text/plain; charset=UTF-8')
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
          res.sendfile('test/fixtures/does-not-exist', err => {
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

  describe('.sendfile(path)', () => {
    it('should not serve dotfiles', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.sendfile('test/fixtures/.name')
      })

      request(app)
      .get('/')
      .expect(404, done)
    })

    it('should accept dotfiles option', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.sendfile('test/fixtures/.name', { dotfiles: 'allow' })
      })

      request(app)
        .get('/')
        .expect(200)
        .expect(utils.shouldHaveBody(Buffer.from('tobi')))
        .end(done)
    })

    it('should accept headers option', (t, done) => {
      const app = express()
      var headers = {
        'x-success': 'sent',
        'x-other': 'done'
      }

      app.use((req, res) => {
        res.sendfile('test/fixtures/user.html', { headers: headers })
      })

      request(app)
      .get('/')
      .expect('x-success', 'sent')
      .expect('x-other', 'done')
      .expect(200, done)
    })

    it('should ignore headers option on 404', (t, done) => {
      const app = express()
      var headers = { 'x-success': 'sent' }

      app.use((req, res) => {
        res.sendfile('test/fixtures/user.nothing', { headers: headers })
      })

      request(app)
      .get('/')
        .expect(utils.shouldNotHaveHeader('X-Success'))
        .expect(404, done)
    })

    it('should transfer a file', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.sendfile('test/fixtures/name.txt')
      })

      request(app)
      .get('/')
      .expect(200, 'tobi', done)
    })

    it('should transfer a directory index file', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.sendfile('test/fixtures/blog/')
      })

      request(app)
      .get('/')
      .expect(200, '<b>index</b>', done)
    })

    it('should 404 for directory without trailing slash', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.sendfile('test/fixtures/blog')
      })

      request(app)
      .get('/')
      .expect(404, done)
    })

    it('should transfer a file with urlencoded name', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.sendfile('test/fixtures/%25%20of%20dogs.txt')
      })

      request(app)
      .get('/')
      .expect(200, '20%', done)
    })

    it('should not error if the client aborts', (t, done) => {
      const app = express()
      const cb = after(2, done)
      var error = null

      app.use((req, res) => {
        setImmediate(() => {
          res.sendfile(path.resolve(fixtures, 'name.txt'))
          setTimeout(() => {
            cb(error)
          }, 10)
        })
        test.req.abort()
      })

      app.use((err, req, res, next) => {
        error = err
        next(err)
      })

      const server = app.listen()
      const test = request(server).get('/')
      test.end(err => {
        assert.ok(err)
        server.close(cb)
      })
    })

    describe('with an absolute path', () => {
      it('should transfer the file', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendfile(path.join(__dirname, '/fixtures/user.html'))
        })

        request(app)
        .get('/')
        .expect('Content-Type', 'text/html; charset=UTF-8')
        .expect(200, '<p>{{user.name}}</p>', done)
      })
    })

    describe('with a relative path', () => {
      it('should transfer the file', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendfile('test/fixtures/user.html')
        })

        request(app)
        .get('/')
        .expect('Content-Type', 'text/html; charset=UTF-8')
        .expect(200, '<p>{{user.name}}</p>', done)
      })

      it('should serve relative to "root"', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendfile('user.html', { root: 'test/fixtures/' })
        })

        request(app)
        .get('/')
        .expect('Content-Type', 'text/html; charset=UTF-8')
        .expect(200, '<p>{{user.name}}</p>', done)
      })

      it('should consider ../ malicious when "root" is not set', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendfile('test/fixtures/foo/../user.html')
        })

        request(app)
        .get('/')
        .expect(403, done)
      })

      it('should allow ../ when "root" is set', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendfile('foo/../user.html', { root: 'test/fixtures' })
        })

        request(app)
        .get('/')
        .expect(200, done)
      })

      it('should disallow requesting out of "root"', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.sendfile('foo/../../user.html', { root: 'test/fixtures' })
        })

        request(app)
        .get('/')
        .expect(403, done)
      })

      it('should next(404) when not found', (t, done) => {
        const app = express()
        let calls = 0

        app.use((req, res) => {
          res.sendfile('user.html')
        })

        app.use((req, res) => {
          assert(0, 'this should not be called')
        })

        app.use((err, req, res, next) => {
          ++calls
          next(err)
        })

        request(app)
          .get('/')
          .expect(404, err => {
            if (err) return done(err)
            assert.strictEqual(calls, 1)
            done()
          })
      })

      describe('with non-GET', () => {
        it('should still serve', (t, done) => {
          const app = express()

          app.use((req, res) => {
            res.sendfile(path.join(__dirname, '/fixtures/name.txt'))
          })

          request(app)
          .get('/')
          .expect('tobi', done)
        })
      })
    })
  })

  describe('.sendfile(path, options)', () => {
    it('should pass options to send module', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.sendfile(path.resolve(fixtures, 'name.txt'), { start: 0, end: 1 })
      })

      request(app)
        .get('/')
        .expect(200, 'to', done)
    })
  })
})
