'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'
import assert from 'node:assert'

describe('res', () => {
  describe('.json(object)', () => {
    it('should not support jsonp callbacks', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.json({ foo: 'bar' })
      })

      request(app)
      .get('/?callback=foo')
      .expect('{"foo":"bar"}', done)
    })

    it('should not override previous Content-Types', (t, done) => {
      const app = express()

      app.get('/', (req, res) => {
        res.type('application/vnd.example+json')
        res.json({ hello: 'world' })
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/vnd.example+json; charset=utf-8')
      .expect(200, '{"hello":"world"}', done)
    })

    describe('when given primitives', () => {
      it('should respond with json for null', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.json(null)
        })

        request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200, 'null', done)
      })

      it('should respond with json for Number', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.json(300)
        })

        request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200, '300', done)
      })

      it('should respond with json for String', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.json('str')
        })

        request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200, '"str"', done)
      })
    })

    describe('when given an array', () => {
      it('should respond with json', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.json(['foo', 'bar', 'baz'])
        })

        request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200, '["foo","bar","baz"]', done)
      })
    })

    describe('when given an object', () => {
      it('should respond with json', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.json({ name: 'tobi' })
        })

        request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200, '{"name":"tobi"}', done)
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
          res.json({ '&': '<script>' })
        })

        request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200, '{"\\u0026":"\\u003cscript\\u003e"}', done)
      })

      it('should not break undefined escape', (t, done) => {
        const app = express()

        app.enable('json escape')

        app.use((req, res) => {
          res.json(undefined)
        })

        request(app)
          .get('/')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200, '', done)
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
          res.json({ name: 'tobi', _id: 12345 })
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
          res.json({ name: 'tobi', age: 2 })
        })

        request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200, '{\n  "name": "tobi",\n  "age": 2\n}', done)
      })
    })
  })

  describe('.json(status, object)', () => {
    it('should respond with json and set the .statusCode', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.json(201, { id: 1 })
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(201, '{"id":1}', done)
    })
  })

  describe('.json(object, status)', () => {
    it('should respond with json and set the .statusCode for backwards compat', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.json({ id: 1 }, 201)
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(201, '{"id":1}', done)
    })

    it('should use status as second number for backwards compat', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.json(200, 201)
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(201, '200', done)
    })
  })
})
