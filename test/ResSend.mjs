'use strict'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import express from '../lib/express.js'
import request from 'supertest'
import methods from 'methods'
import utils from './support/Utils.mjs'

describe('res', () => {
  describe('.send()', () => {
    it('should set body to ""', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.send()
      })

      request(app)
      .get('/')
      .expect(200, '', done)
    })
  })

  describe('.send(null)', () => {
    it('should set body to ""', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.send(null)
      })

      request(app)
      .get('/')
      .expect('Content-Length', '0')
      .expect(200, '', done)
    })
  })

  describe('.send(undefined)', () => {
    it('should set body to ""', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.send(undefined)
      })

      request(app)
      .get('/')
      .expect(200, '', done)
    })
  })

  describe('.send(code)', () => {
    it('should set .statusCode', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.send(201)
      })

      request(app)
      .get('/')
      .expect('Created')
      .expect(201, done)
    })
  })

  describe('.send(code, body)', () => {
    it('should set .statusCode and body', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.send(201, 'Created :)')
      })

      request(app)
      .get('/')
      .expect('Created :)')
      .expect(201, done)
    })
  })

  describe('.send(body, code)', () => {
    it('should be supported for backwards compat', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.send('Bad!', 400)
      })

      request(app)
      .get('/')
      .expect('Bad!')
      .expect(400, done)
    })
  })

  describe('.send(code, number)', () => {
    it('should send number as json', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.send(200, 0.123)
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200, '0.123', done)
    })
  })

  describe('.send(String)', () => {
    it('should send as html', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.send('<p>hey</p>')
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(200, '<p>hey</p>', done)
    })

    it('should set ETag', (t, done) => {
      const app = express()

      app.use((req, res) => {
        var str = Array(1000).join('-')
        res.send(str)
      })

      request(app)
      .get('/')
      .expect('ETag', 'W/"3e7-qPnkJ3CVdVhFJQvUBfF10TmVA7g"')
      .expect(200, done)
    })

    it('should not override Content-Type', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.set('Content-Type', 'text/plain').send('hey')
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect(200, 'hey', done)
    })

    it('should override charset in Content-Type', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.set('Content-Type', 'text/plain; charset=iso-8859-1').send('hey')
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect(200, 'hey', done)
    })

    it('should keep charset in Content-Type for Buffers', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.set('Content-Type', 'text/plain; charset=iso-8859-1').send(Buffer.from('hi'))
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'text/plain; charset=iso-8859-1')
      .expect(200, 'hi', done)
    })
  })

  describe('.send(Buffer)', () => {
    it('should send as octet-stream', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.send(Buffer.from('hello'))
      })

      request(app)
        .get('/')
        .expect(200)
        .expect('Content-Type', 'application/octet-stream')
        .expect(utils.shouldHaveBody(Buffer.from('hello')))
        .end(done)
    })

    it('should set ETag', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.send(Buffer.alloc(999, '-'))
      })

      request(app)
      .get('/')
      .expect('ETag', 'W/"3e7-qPnkJ3CVdVhFJQvUBfF10TmVA7g"')
      .expect(200, done)
    })

    it('should not override Content-Type', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.set('Content-Type', 'text/plain').send(Buffer.from('hey'))
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect(200, 'hey', done)
    })

    it('should not override ETag', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.type('text/plain').set('ETag', '"foo"').send(Buffer.from('hey'))
      })

      request(app)
      .get('/')
      .expect('ETag', '"foo"')
      .expect(200, 'hey', done)
    })
  })

  describe('.send(Object)', () => {
    it('should send as application/json', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.send({ name: 'tobi' })
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200, '{"name":"tobi"}', done)
    })
  })

  describe('when the request method is HEAD', () => {
    it('should ignore the body', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.send('yay')
      })

      request(app)
        .head('/')
        .expect(200)
        .expect(utils.shouldNotHaveBody())
        .end(done)
    })
  })

  describe('when .statusCode is 204', () => {
    it('should strip Content-* fields, Transfer-Encoding field, and body', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.status(204).set('Transfer-Encoding', 'chunked').send('foo')
      })

      request(app)
      .get('/')
      .expect(utils.shouldNotHaveHeader('Content-Type'))
      .expect(utils.shouldNotHaveHeader('Content-Length'))
      .expect(utils.shouldNotHaveHeader('Transfer-Encoding'))
      .expect(204, '', done)
    })
  })

  describe('when .statusCode is 205', () => {
    it('should strip Transfer-Encoding field and body, set Content-Length', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.status(205).set('Transfer-Encoding', 'chunked').send('foo')
      })

      request(app)
        .get('/')
        .expect(utils.shouldNotHaveHeader('Transfer-Encoding'))
        .expect('Content-Length', '0')
        .expect(205, '', done)
    })
  })

  describe('when .statusCode is 304', () => {
    it('should strip Content-* fields, Transfer-Encoding field, and body', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.status(304).set('Transfer-Encoding', 'chunked').send('foo')
      })

      request(app)
      .get('/')
      .expect(utils.shouldNotHaveHeader('Content-Type'))
      .expect(utils.shouldNotHaveHeader('Content-Length'))
      .expect(utils.shouldNotHaveHeader('Transfer-Encoding'))
      .expect(304, '', done)
    })
  })

  it('should always check regardless of length', (t, done) => {
    const app = express()
    var etag = '"asdf"'

    app.use((req, res, next) => {
      res.set('ETag', etag)
      res.send('hey')
    })

    request(app)
    .get('/')
    .set('If-None-Match', etag)
    .expect(304, done)
  })

  it('should respond with 304 Not Modified when fresh', (t, done) => {
    const app = express()
    var etag = '"asdf"'

    app.use((req, res) => {
      var str = Array(1000).join('-')
      res.set('ETag', etag)
      res.send(str)
    })

    request(app)
    .get('/')
    .set('If-None-Match', etag)
    .expect(304, done)
  })

  it('should not perform freshness check unless 2xx or 304', (t, done) => {
    const app = express()
    var etag = '"asdf"'

    app.use((req, res, next) => {
      res.status(500)
      res.set('ETag', etag)
      res.send('hey')
    })

    request(app)
    .get('/')
    .set('If-None-Match', etag)
    .expect('hey')
    .expect(500, done)
  })

  it('should not support jsonp callbacks', (t, done) => {
    const app = express()

    app.use((req, res) => {
      res.send({ foo: 'bar' })
    })

    request(app)
    .get('/?callback=foo')
    .expect('{"foo":"bar"}', done)
  })

  it('should be chainable', (t, done) => {
    const app = express()

    app.use((req, res) => {
      assert.equal(res.send('hey'), res)
    })

    request(app)
    .get('/')
    .expect(200, 'hey', done)
  })

  describe('"etag" setting', () => {
    describe('when enabled', () => {
      it('should send ETag', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.send('kajdslfkasdf')
        })

        app.enable('etag')

        request(app)
        .get('/')
        .expect('ETag', 'W/"c-IgR/L5SF7CJQff4wxKGF/vfPuZ0"')
        .expect(200, done)
      })

      methods.forEach(function (method) {
        if (method === 'connect') return

        it('should send ETag in response to ' + method.toUpperCase() + ' request', (t, done) => {
          const app = express()

          app[method]('/', (req, res) => {
            res.send('kajdslfkasdf')
          })

          request(app)
          [method]('/')
          .expect('ETag', 'W/"c-IgR/L5SF7CJQff4wxKGF/vfPuZ0"')
          .expect(200, done)
        })
      })

      it('should send ETag for empty string response', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.send('')
        })

        app.enable('etag')

        request(app)
        .get('/')
        .expect('ETag', 'W/"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"')
        .expect(200, done)
      })

      it('should send ETag for long response', (t, done) => {
        const app = express()

        app.use((req, res) => {
          var str = Array(1000).join('-')
          res.send(str)
        })

        app.enable('etag')

        request(app)
        .get('/')
        .expect('ETag', 'W/"3e7-qPnkJ3CVdVhFJQvUBfF10TmVA7g"')
        .expect(200, done)
      })

      it('should not override ETag when manually set', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.set('etag', '"asdf"')
          res.send(200)
        })

        app.enable('etag')

        request(app)
        .get('/')
        .expect('ETag', '"asdf"')
        .expect(200, done)
      })

      it('should not send ETag for res.send()', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.send()
        })

        app.enable('etag')

        request(app)
        .get('/')
        .expect(utils.shouldNotHaveHeader('ETag'))
        .expect(200, done)
      })
    })

    describe('when disabled', () => {
      it('should send no ETag', (t, done) => {
        const app = express()

        app.use((req, res) => {
          var str = Array(1000).join('-')
          res.send(str)
        })

        app.disable('etag')

        request(app)
        .get('/')
        .expect(utils.shouldNotHaveHeader('ETag'))
        .expect(200, done)
      })

      it('should send ETag when manually set', (t, done) => {
        const app = express()

        app.disable('etag')

        app.use((req, res) => {
          res.set('etag', '"asdf"')
          res.send(200)
        })

        request(app)
        .get('/')
        .expect('ETag', '"asdf"')
        .expect(200, done)
      })
    })

    describe('when "strong"', () => {
      it('should send strong ETag', (t, done) => {
        const app = express()

        app.set('etag', 'strong')

        app.use((req, res) => {
          res.send('hello, world!')
        })

        request(app)
        .get('/')
        .expect('ETag', '"d-HwnTDHB9U/PRbFMN1z1wps51lqk"')
        .expect(200, done)
      })
    })

    describe('when "weak"', () => {
      it('should send weak ETag', (t, done) => {
        const app = express()

        app.set('etag', 'weak')

        app.use((req, res) => {
          res.send('hello, world!')
        })

        request(app)
        .get('/')
        .expect('ETag', 'W/"d-HwnTDHB9U/PRbFMN1z1wps51lqk"')
        .expect(200, done)
      })
    })

    describe('when a function', () => {
      it('should send custom ETag', (t, done) => {
        const app = express()

        app.set('etag', function (body, encoding) {
          var chunk = !Buffer.isBuffer(body)
            ? Buffer.from(body, encoding)
            : body
          assert.strictEqual(chunk.toString(), 'hello, world!')
          return '"custom"'
        })

        app.use((req, res) => {
          res.send('hello, world!')
        })

        request(app)
        .get('/')
        .expect('ETag', '"custom"')
        .expect(200, done)
      })

      it('should not send falsy ETag', (t, done) => {
        const app = express()

        app.set('etag', function (body, encoding) {
          return undefined
        })

        app.use((req, res) => {
          res.send('hello, world!')
        })

        request(app)
        .get('/')
        .expect(utils.shouldNotHaveHeader('ETag'))
        .expect(200, done)
      })
    })
  })
})
