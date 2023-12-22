'use strict'

import { describe, it, before } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'
import assert from 'node:assert'
import tryImport from './support/TryImport.mjs'

describe('express.json()', () => {
  it('should parse JSON', (t, done) => {
    request(createApp())
      .post('/')
      .set('Content-Type', 'application/json')
      .send('{"user":"tobi"}')
      .expect(200, '{"user":"tobi"}', done)
  })

  it('should handle Content-Length: 0', (t, done) => {
    request(createApp())
      .post('/')
      .set('Content-Type', 'application/json')
      .set('Content-Length', '0')
      .expect(200, '{}', done)
  })

  it('should handle empty message-body', (t, done) => {
    request(createApp())
      .post('/')
      .set('Content-Type', 'application/json')
      .set('Transfer-Encoding', 'chunked')
      .expect(200, '{}', done)
  })

  it('should handle no message-body', (t, done) => {
    request(createApp())
      .post('/')
      .set('Content-Type', 'application/json')
      .unset('Transfer-Encoding')
      .expect(200, '{}', done)
  })

  it('should 400 when invalid content-length', (t, done) => {
    const app = express()

    app.use((req, res, next) => {
      req.headers['content-length'] = '20' // bad length
      next()
    })

    app.use(express.json())

    app.post('/', (req, res) => {
      res.json(req.body)
    })

    request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .send('{"str":')
      .expect(400, /content length/, done)
  })

  it('should handle duplicated middleware', (t, done) => {
    const app = express()

    app.use(express.json())
    app.use(express.json())

    app.post('/', (req, res) => {
      res.json(req.body)
    })

    request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .send('{"user":"tobi"}')
      .expect(200, '{"user":"tobi"}', done)
  })

  describe('when JSON is invalid', () => {
    let app = null
    before(() => {
      app = createApp()
    })

    it('should 400 for bad token', (t, done) => {
      request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .send('{:')
        .expect(400, parseError('{:'), done)
    })

    it('should 400 for incomplete', (t, done) => {
      request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .send('{"user"')
        .expect(400, parseError('{"user"'), done)
    })

    it('should error with type = "entity.parse.failed"', (t, done) => {
      request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .set('X-Error-Property', 'type')
        .send(' {"user"')
        .expect(400, 'entity.parse.failed', done)
    })

    it('should include original body on error object', (t, done) => {
      request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .set('X-Error-Property', 'body')
        .send(' {"user"')
        .expect(400, ' {"user"', done)
    })
  })

  describe('with limit option', () => {
    it('should 413 when over limit with Content-Length', (t, done) => {
      const buf = Buffer.alloc(1024, '.')
      request(createApp({ limit: '1kb' }))
        .post('/')
        .set('Content-Type', 'application/json')
        .set('Content-Length', '1034')
        .send(JSON.stringify({ str: buf.toString() }))
        .expect(413, done)
    })

    it('should error with type = "entity.too.large"', (t, done) => {
      const buf = Buffer.alloc(1024, '.')
      request(createApp({ limit: '1kb' }))
        .post('/')
        .set('Content-Type', 'application/json')
        .set('Content-Length', '1034')
        .set('X-Error-Property', 'type')
        .send(JSON.stringify({ str: buf.toString() }))
        .expect(413, 'entity.too.large', done)
    })

    it('should 413 when over limit with chunked encoding', (t, done) => {
      const buf = Buffer.alloc(1024, '.')
      const server = createApp({ limit: '1kb' })
      const test = request(server).post('/')
      test.set('Content-Type', 'application/json')
      test.set('Transfer-Encoding', 'chunked')
      test.write('{"str":')
      test.write('"' + buf.toString() + '"}')
      test.expect(413, done)
    })

    it('should accept number of bytes', (t, done) => {
      const buf = Buffer.alloc(1024, '.')
      request(createApp({ limit: 1024 }))
        .post('/')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ str: buf.toString() }))
        .expect(413, done)
    })

    it('should not change when options altered', (t, done) => {
      const buf = Buffer.alloc(1024, '.')
      const options = { limit: '1kb' }
      const server = createApp(options)

      options.limit = '100kb'

      request(server)
        .post('/')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ str: buf.toString() }))
        .expect(413, done)
    })

    it('should not hang response', (t, done) => {
      const buf = Buffer.alloc(10240, '.')
      const server = createApp({ limit: '8kb' })
      const test = request(server).post('/')
      test.set('Content-Type', 'application/json')
      test.write(buf)
      test.write(buf)
      test.write(buf)
      test.expect(413, done)
    })
  })

  describe('with inflate option', () => {
    describe('when false', () => {
      let app = null
      before(() => {
        app = createApp({ inflate: false })
      })

      it('should not accept content-encoding', (t, done) => {
        const test = request(app).post('/')
        test.set('Content-Encoding', 'gzip')
        test.set('Content-Type', 'application/json')
        test.write(Buffer.from('1f8b080000000000000bab56ca4bcc4d55b2527ab16e97522d00515be1cc0e000000', 'hex'))
        test.expect(415, 'content encoding unsupported', done)
      })
    })

    describe('when true', () => {
      let app = null
      before(() => {
        app = createApp({ inflate: true })
      })

      it('should accept content-encoding', (t, done) => {
        const test = request(app).post('/')
        test.set('Content-Encoding', 'gzip')
        test.set('Content-Type', 'application/json')
        test.write(Buffer.from('1f8b080000000000000bab56ca4bcc4d55b2527ab16e97522d00515be1cc0e000000', 'hex'))
        test.expect(200, '{"name":"论"}', done)
      })
    })
  })

  describe('with strict option', () => {
    describe('when undefined', () => {
      let app = null
      before(() => {
        app = createApp()
      })

      it('should 400 on primitives', (t, done) => {
        request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .send('true')
          .expect(400, parseError('#rue').replaceAll('#', 't'), done)
      })
    })

    describe('when false', () => {
      let app = null
      before(() => {
        app = createApp({ strict: false })
      })

      it('should parse primitives', (t, done) => {
        request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .send('true')
          .expect(200, 'true', done)
      })
    })

    describe('when true', () => {
      let app = null
      before(() => {
        app = createApp({ strict: true })
      })

      it('should not parse primitives', (t, done) => {
        request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .send('true')
          .expect(400, parseError('#rue').replaceAll('#', 't'), done)
      })

      it('should not parse primitives with leading whitespaces', (t, done) => {
        request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .send('    true')
          .expect(400, parseError('    #rue').replaceAll('#', 't'), done)
      })

      it('should allow leading whitespaces in JSON', (t, done) => {
        request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .send('   { "user": "tobi" }')
          .expect(200, '{"user":"tobi"}', done)
      })

      it('should error with type = "entity.parse.failed"', (t, done) => {
        request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('X-Error-Property', 'type')
          .send('true')
          .expect(400, 'entity.parse.failed', done)
      })

      it('should include correct message in stack trace', (t, done) => {
        request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('X-Error-Property', 'stack')
          .send('true')
          .expect(400)
          .expect(shouldContainInBody(parseError('#rue').replaceAll('#', 't')))
          .end(done)
      })
    })
  })

  describe('with type option', () => {
    describe('when "application/vnd.api+json"', () => {
      let app = null
      before(() => {
        app = createApp({ type: 'application/vnd.api+json' })
      })

      it('should parse JSON for custom type', (t, done) => {
        request(app)
          .post('/')
          .set('Content-Type', 'application/vnd.api+json')
          .send('{"user":"tobi"}')
          .expect(200, '{"user":"tobi"}', done)
      })

      it('should ignore standard type', (t, done) => {
        request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .send('{"user":"tobi"}')
          .expect(200, '', done)
      })
    })

    describe('when ["application/json", "application/vnd.api+json"]', () => {
      let app = null
      before(() => {
        app = createApp({
          type: ['application/json', 'application/vnd.api+json']
        })
      })

      it('should parse JSON for "application/json"', (t, done) => {
        request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .send('{"user":"tobi"}')
          .expect(200, '{"user":"tobi"}', done)
      })

      it('should parse JSON for "application/vnd.api+json"', (t, done) => {
        request(app)
          .post('/')
          .set('Content-Type', 'application/vnd.api+json')
          .send('{"user":"tobi"}')
          .expect(200, '{"user":"tobi"}', done)
      })

      it('should ignore "application/x-json"', (t, done) => {
        request(app)
          .post('/')
          .set('Content-Type', 'application/x-json')
          .send('{"user":"tobi"}')
          .expect(200, '', done)
      })
    })

    describe('when a function', () => {
      it('should parse when truthy value returned', (t, done) => {
        const app = createApp({ type: accept })

        function accept(req) {
          return req.headers['content-type'] === 'application/vnd.api+json'
        }

        request(app)
          .post('/')
          .set('Content-Type', 'application/vnd.api+json')
          .send('{"user":"tobi"}')
          .expect(200, '{"user":"tobi"}', done)
      })

      it('should work without content-type', (t, done) => {
        const app = createApp({ type: accept })

        function accept(req) {
          return true
        }

        const test = request(app).post('/')
        test.write('{"user":"tobi"}')
        test.expect(200, '{"user":"tobi"}', done)
      })

      it('should not invoke without a body', (t, done) => {
        const app = createApp({ type: accept })

        function accept(req) {
          throw new Error('oops!')
        }

        request(app)
          .get('/')
          .expect(404, done)
      })
    })
  })

  describe('with verify option', () => {
    it('should assert value if function', () => {
      assert.throws(createApp.bind(null, { verify: 'lol' }),
        /TypeError: option verify must be function/)
    })

    it('should error from verify', (t, done) => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] === 0x5b) throw new Error('no arrays')
        }
      })

      request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .send('["tobi"]')
        .expect(403, 'no arrays', done)
    })

    it('should error with type = "entity.verify.failed"', (t, done) => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] === 0x5b) throw new Error('no arrays')
        }
      })

      request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .set('X-Error-Property', 'type')
        .send('["tobi"]')
        .expect(403, 'entity.verify.failed', done)
    })

    it('should allow custom codes', (t, done) => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] !== 0x5b) return
          const err = new Error('no arrays')
          err.status = 400
          throw err
        }
      })

      request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .send('["tobi"]')
        .expect(400, 'no arrays', done)
    })

    it('should allow custom type', (t, done) => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] !== 0x5b) return
          const err = new Error('no arrays')
          err.type = 'foo.bar'
          throw err
        }
      })

      request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .set('X-Error-Property', 'type')
        .send('["tobi"]')
        .expect(403, 'foo.bar', done)
    })

    it('should include original body on error object', (t, done) => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] === 0x5b) throw new Error('no arrays')
        }
      })

      request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .set('X-Error-Property', 'body')
        .send('["tobi"]')
        .expect(403, '["tobi"]', done)
    })

    it('should allow pass-through', (t, done) => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] === 0x5b) throw new Error('no arrays')
        }
      })

      request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .send('{"user":"tobi"}')
        .expect(200, '{"user":"tobi"}', done)
    })

    it('should work with different charsets', (t, done) => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] === 0x5b) throw new Error('no arrays')
        }
      })

      const test = request(app).post('/')
      test.set('Content-Type', 'application/json; charset=utf-16')
      test.write(Buffer.from('feff007b0022006e0061006d00650022003a00228bba0022007d', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should 415 on unknown charset prior to verify', (t, done) => {
      const app = createApp({
        verify: function (req, res, buf) {
          throw new Error('unexpected verify call')
        }
      })

      const test = request(app).post('/')
      test.set('Content-Type', 'application/json; charset=x-bogus')
      test.write(Buffer.from('00000000', 'hex'))
      test.expect(415, 'unsupported charset "X-BOGUS"', done)
    })
  })

  describe('charset', () => {
    let app = null
    before(() => {
      app = createApp()
    })

    it('should parse utf-8', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Type', 'application/json; charset=utf-8')
      test.write(Buffer.from('7b226e616d65223a22e8aeba227d', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should parse utf-16', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Type', 'application/json; charset=utf-16')
      test.write(Buffer.from('feff007b0022006e0061006d00650022003a00228bba0022007d', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should parse when content-length != char length', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Type', 'application/json; charset=utf-8')
      test.set('Content-Length', '13')
      test.write(Buffer.from('7b2274657374223a22c3a5227d', 'hex'))
      test.expect(200, '{"test":"å"}', done)
    })

    it('should default to utf-8', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Type', 'application/json')
      test.write(Buffer.from('7b226e616d65223a22e8aeba227d', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should fail on unknown charset', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Type', 'application/json; charset=koi8-r')
      test.write(Buffer.from('7b226e616d65223a22cec5d4227d', 'hex'))
      test.expect(415, 'unsupported charset "KOI8-R"', done)
    })

    it('should error with type = "charset.unsupported"', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Type', 'application/json; charset=koi8-r')
      test.set('X-Error-Property', 'type')
      test.write(Buffer.from('7b226e616d65223a22cec5d4227d', 'hex'))
      test.expect(415, 'charset.unsupported', done)
    })
  })

  describe('encoding', () => {
    let app = null
    before(() => {
      app = createApp({ limit: '1kb' })
    })

    it('should parse without encoding', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Type', 'application/json')
      test.write(Buffer.from('7b226e616d65223a22e8aeba227d', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should support identity encoding', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Encoding', 'identity')
      test.set('Content-Type', 'application/json')
      test.write(Buffer.from('7b226e616d65223a22e8aeba227d', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should support gzip encoding', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Encoding', 'gzip')
      test.set('Content-Type', 'application/json')
      test.write(Buffer.from('1f8b080000000000000bab56ca4bcc4d55b2527ab16e97522d00515be1cc0e000000', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should support deflate encoding', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Encoding', 'deflate')
      test.set('Content-Type', 'application/json')
      test.write(Buffer.from('789cab56ca4bcc4d55b2527ab16e97522d00274505ac', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should be case-insensitive', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Encoding', 'GZIP')
      test.set('Content-Type', 'application/json')
      test.write(Buffer.from('1f8b080000000000000bab56ca4bcc4d55b2527ab16e97522d00515be1cc0e000000', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should 415 on unknown encoding', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Encoding', 'nulls')
      test.set('Content-Type', 'application/json')
      test.write(Buffer.from('000000000000', 'hex'))
      test.expect(415, 'unsupported content encoding "nulls"', done)
    })

    it('should error with type = "encoding.unsupported"', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Encoding', 'nulls')
      test.set('Content-Type', 'application/json')
      test.set('X-Error-Property', 'type')
      test.write(Buffer.from('000000000000', 'hex'))
      test.expect(415, 'encoding.unsupported', done)
    })

    it('should 400 on malformed encoding', (t, done) => {
      const test = request(app).post('/')
      test.set('Content-Encoding', 'gzip')
      test.set('Content-Type', 'application/json')
      test.write(Buffer.from('1f8b080000000000000bab56cc4d55b2527ab16e97522d00515be1cc0e000000', 'hex'))
      test.expect(400, done)
    })

    it('should 413 when inflated value exceeds limit', (t, done) => {
      // gzip'd data exceeds 1kb, but deflated below 1kb
      const test = request(app).post('/')
      test.set('Content-Encoding', 'gzip')
      test.set('Content-Type', 'application/json')
      test.write(Buffer.from('1f8b080000000000000bedc1010d000000c2a0f74f6d0f071400000000000000', 'hex'))
      test.write(Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'))
      test.write(Buffer.from('0000000000000000004f0625b3b71650c30000', 'hex'))
      test.expect(413, done)
    })
  })
})

function createApp(options) {
  const app = express()

  app.use(express.json(options))

  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.send(String(err[req.headers['x-error-property'] || 'message']))
  })

  app.post('/', (req, res) => {
    res.json(req.body)
  })

  return app
}

function parseError(str) {
  try {
    JSON.parse(str)
    throw new SyntaxError('strict violation')
  } catch (e) {
    return e.message
  }
}

function shouldContainInBody(str) {
  return function (res) {
    assert.ok(res.text.indexOf(str) !== -1,
      'expected \'' + res.text + '\' to contain \'' + str + '\'')
  }
}
