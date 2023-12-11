'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'
import assert from 'node:assert'
import utils from './support/Utils.mjs'

describe('res', () => {
  describe('.jsonp(object)', () => {
    it('should respond with jsonp', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.jsonp({ count: 1 })
      })

      request(app)
      .get('/?callback=something')
      .expect('Content-Type', 'text/javascript; charset=utf-8')
      .expect(200, /something\(\{"count":1\}\);/, done)
    })

    it('should use first callback parameter with jsonp', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.jsonp({ count: 1 })
      })

      request(app)
      .get('/?callback=something&callback=somethingelse')
      .expect('Content-Type', 'text/javascript; charset=utf-8')
      .expect(200, /something\(\{"count":1\}\);/, done)
    })

    it('should ignore object callback parameter with jsonp', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.jsonp({ count: 1 })
      })

      request(app)
      .get('/?callback[a]=something')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200, '{"count":1}', done)
    })

    it('should allow renaming callback', (t, done) => {
      const app = express()

      app.set('jsonp callback name', 'clb')

      app.use((req, res) => {
        res.jsonp({ count: 1 })
      })

      request(app)
      .get('/?clb=something')
      .expect('Content-Type', 'text/javascript; charset=utf-8')
      .expect(200, /something\(\{"count":1\}\);/, done)
    })

    it('should allow []', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.jsonp({ count: 1 })
      })

      request(app)
      .get('/?callback=callbacks[123]')
      .expect('Content-Type', 'text/javascript; charset=utf-8')
      .expect(200, /callbacks\[123\]\(\{"count":1\}\);/, done)
    })

    it('should disallow arbitrary js', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.jsonp({})
      })

      request(app)
      .get('/?callback=foo;bar()')
      .expect('Content-Type', 'text/javascript; charset=utf-8')
      .expect(200, /foobar\(\{\}\);/, done)
    })

    it('should escape utf whitespace', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.jsonp({ str: '\u2028 \u2029 woot' })
      })

      request(app)
      .get('/?callback=foo')
      .expect('Content-Type', 'text/javascript; charset=utf-8')
      .expect(200, /foo\(\{"str":"\\u2028 \\u2029 woot"\}\);/, done)
    })

    it('should not escape utf whitespace for json fallback', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.jsonp({ str: '\u2028 \u2029 woot' })
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200, '{"str":"\u2028 \u2029 woot"}', done)
    })

    it('should include security header and prologue', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.jsonp({ count: 1 })
      })

      request(app)
      .get('/?callback=something')
      .expect('Content-Type', 'text/javascript; charset=utf-8')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect(200, /^\/\*\*\//, done)
    })

    it('should not override previous Content-Types with no callback', (t, done) => {
      const app = express()

      app.get('/', (req, res) => {
        res.type('application/vnd.example+json')
        res.jsonp({ hello: 'world' })
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/vnd.example+json; charset=utf-8')
      .expect(utils.shouldNotHaveHeader('X-Content-Type-Options'))
      .expect(200, '{"hello":"world"}', done)
    })

    it('should override previous Content-Types with callback', (t, done) => {
      const app = express()

      app.get('/', (req, res) => {
        res.type('application/vnd.example+json')
        res.jsonp({ hello: 'world' })
      })

      request(app)
      .get('/?callback=cb')
      .expect('Content-Type', 'text/javascript; charset=utf-8')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect(200, /cb\(\{"hello":"world"\}\);$/, done)
    })

    describe('when given undefined', () => {
      it('should invoke callback with no arguments', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.jsonp(undefined)
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\(\)/, done)
      })
    })

    describe('when given null', () => {
      it('should invoke callback with null', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.jsonp(null)
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\(null\)/, done)
      })
    })

    describe('when given a string', () => {
      it('should invoke callback with a string', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.jsonp('tobi')
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\("tobi"\)/, done)
      })
    })

    describe('when given a number', () => {
      it('should invoke callback with a number', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.jsonp(42)
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\(42\)/, done)
      })
    })

    describe('when given an array', () => {
      it('should invoke callback with an array', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.jsonp(['foo', 'bar', 'baz'])
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\(\["foo","bar","baz"\]\)/, done)
      })
    })

    describe('when given an object', () => {
      it('should invoke callback with an object', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.jsonp({ name: 'tobi' })
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\(\{"name":"tobi"\}\)/, done)
      })
    })

    describe('"json escape" setting', () => {
      it('should be undefined by default', () => {
        const app = express()
        assert.strictEqual(app.get('json escape'), undefined)
      })

      it('should unicode escape HTML-sniffing characters', (t, done) => {
        const app = express()

        app.enable('json escape')

        app.use((req, res) => {
          res.jsonp({ '&': '\u2028<script>\u2029' })
        })

        request(app)
        .get('/?callback=foo')
        .expect('Content-Type', 'text/javascript; charset=utf-8')
        .expect(200, /foo\({"\\u0026":"\\u2028\\u003cscript\\u003e\\u2029"}\)/, done)
      })

      it('should not break undefined escape', (t, done) => {
        const app = express()

        app.enable('json escape')

        app.use((req, res) => {
          res.jsonp(undefined)
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\(\)/, done)
      })
    })

    describe('"json replacer" setting', () => {
      it('should be passed to JSON.stringify()', (t, done) => {
        const app = express()

        app.set('json replacer', function(key, val){
          return key[0] === '_'
            ? undefined
            : val
        })

        app.use((req, res) => {
          res.jsonp({ name: 'tobi', _id: 12345 })
        })

        request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200, '{"name":"tobi"}', done)
      })
    })

    describe('"json spaces" setting', () => {
      it('should be undefined by default', () => {
        const app = express()
        assert(undefined === app.get('json spaces'))
      })

      it('should be passed to JSON.stringify()', (t, done) => {
        const app = express()

        app.set('json spaces', 2)

        app.use((req, res) => {
          res.jsonp({ name: 'tobi', age: 2 })
        })

        request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200, '{\n  "name": "tobi",\n  "age": 2\n}', done)
      })
    })
  })

  describe('.jsonp(status, object)', () => {
    it('should respond with json and set the .statusCode', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.jsonp(201, { id: 1 })
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(201, '{"id":1}', done)
    })
  })

  describe('.jsonp(object, status)', () => {
    it('should respond with json and set the .statusCode for backwards compat', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.jsonp({ id: 1 }, 201)
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(201, '{"id":1}', done)
    })

    it('should use status as second number for backwards compat', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.jsonp(200, 201)
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(201, '200', done)
    })
  })

  it('should not override previous Content-Types', (t, done) => {
    const app = express()

    app.get('/', (req, res) => {
      res.type('application/vnd.example+json')
      res.jsonp({ hello: 'world' })
    })

    request(app)
    .get('/')
    .expect('content-type', 'application/vnd.example+json; charset=utf-8')
    .expect(200, '{"hello":"world"}', done)
  })
})
