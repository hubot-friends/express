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
const fixtures = path.join(__dirname, 'fixtures')

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

    describe('with "cacheControl" option', () => {
      it('should enable cacheControl by default', (t, done) => {
        const app = createApp(path.resolve(__dirname, 'fixtures/name.txt'))

        request(app)
          .get('/')
          .expect('Cache-Control', 'public, max-age=0')
          .expect(200, done)
      })

      it('should accept cacheControl option', (t, done) => {
        const app = createApp(path.resolve(__dirname, 'fixtures/name.txt'), { cacheControl: false })

        request(app)
          .get('/')
          .expect(utils.shouldNotHaveHeader('Cache-Control'))
          .expect(200, done)
      })
    })

    describe('with "dotfiles" option', () => {
      it('should not serve dotfiles by default', (t, done) => {
        const app = createApp(path.resolve(__dirname, 'fixtures/.name'))

        request(app)
          .get('/')
          .expect(404, done)
      });

      it('should accept dotfiles option', (t, done) => {
        const app = createApp(path.resolve(__dirname, 'fixtures/.name'), { dotfiles: 'allow' })

        request(app)
          .get('/')
          .expect(200)
          .expect(shouldHaveBody(Buffer.from('tobi')))
          .end(done)
      })
    })

    describe('with "headers" option', () => {
      it('should accept headers option', (t, done) => {
        const headers = {
          'x-success': 'sent',
          'x-other': 'done'
        }
        const app = createApp(path.resolve(__dirname, 'fixtures/name.txt'), { headers: headers })

        request(app)
          .get('/')
          .expect('x-success', 'sent')
          .expect('x-other', 'done')
          .expect(200, done)
      })

      it('should ignore headers option on 404', (t, done) => {
        const headers = { 'x-success': 'sent' }
        const app = createApp(path.resolve(__dirname, 'fixtures/does-not-exist'), { headers: headers })

        request(app)
          .get('/')
          .expect(utils.shouldNotHaveHeader('X-Success'))
          .expect(404, done)
      })
    })

    describe('with "immutable" option', () => {
      it('should add immutable cache-control directive', (t, done) => {
        const app = createApp(path.resolve(__dirname, 'fixtures/name.txt'), {
          immutable: true,
          maxAge: '4h'
        })

        request(app)
          .get('/')
          .expect('Cache-Control', 'public, max-age=14400, immutable')
          .expect(200, done)
      })
    })

    describe('with "maxAge" option', () => {
      it('should set cache-control max-age from number', (t, done) => {
        const app = createApp(path.resolve(__dirname, 'fixtures/name.txt'), {
          maxAge: 14400000
        })

        request(app)
          .get('/')
          .expect('Cache-Control', 'public, max-age=14400')
          .expect(200, done)
      })

      it('should set cache-control max-age from string', (t, done) => {
        const app = createApp(path.resolve(__dirname, 'fixtures/name.txt'), {
          maxAge: '4h'
        })

        request(app)
          .get('/')
          .expect('Cache-Control', 'public, max-age=14400')
          .expect(200, done)
      })
    })

    describe('with "root" option', () => {
      it('should not transfer relative with without', (t, done) => {
        const app = createApp('test/fixtures/name.txt')

        request(app)
          .get('/')
          .expect(500, /must be absolute/, done)
      })

      it('should serve relative to "root"', (t, done) => {
        const app = createApp('name.txt', {root: fixtures})

        request(app)
          .get('/')
          .expect(200, 'tobi', done)
      })

      it('should disallow requesting out of "root"', (t, done) => {
        const app = createApp('foo/../../user.html', {root: fixtures})

        request(app)
          .get('/')
          .expect(403, done)
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
    });

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
          assert.ok(err)
          assert.strictEqual(err.status, 404)
          res.send('got it')
        })
      })

      request(app)
        .get('/')
        .expect(200, 'got it', done)
    })
  })

  describe('.sendFile(path, options)', () => {
    it('should pass options to send module', (t, done) => {
      request(createApp(path.resolve(fixtures, 'name.txt'), { start: 0, end: 1 }))
        .get('/')
        .expect(200, 'to', done)
    })
  })
})

function createApp(path, options, fn) {
  const app = express()

  app.use((req, res) => {
    res.sendFile(path, options, fn)
  })

  return app
}

function shouldHaveBody (buff) {
  return function (res) {
    var body = !Buffer.isBuffer(res.body)
      ? Buffer.from(res.text)
      : res.body
    assert.ok(body, 'response has body')
    assert.strictEqual(body.toString('hex'), buff.toString('hex'))
  }
}
