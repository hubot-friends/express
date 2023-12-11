'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('res', () => {
  describe('.set(field, value)', () => {
    it('should set the response header field', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.set('Content-Type', 'text/x-foo; charset=utf-8').end()
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'text/x-foo; charset=utf-8')
      .end(done)
    })

    it('should coerce to a string', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.set('X-Number', 123)
        res.end(typeof res.get('X-Number'))
      })

      request(app)
      .get('/')
      .expect('X-Number', '123')
      .expect(200, 'string', done)
    })
  })

  describe('.set(field, values)', () => {
    it('should set multiple response header fields', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.set('Set-Cookie', ["type=ninja", "language=javascript"])
        res.send(res.get('Set-Cookie'))
      })

      request(app)
      .get('/')
      .expect('["type=ninja","language=javascript"]', done)
    })

    it('should coerce to an array of strings', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.set('X-Numbers', [123, 456])
        res.end(JSON.stringify(res.get('X-Numbers')))
      })

      request(app)
      .get('/')
      .expect('X-Numbers', '123, 456')
      .expect(200, '["123","456"]', done)
    })

    it('should not set a charset of one is already set', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.set('Content-Type', 'text/html; charset=lol')
        res.end()
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'text/html; charset=lol')
      .expect(200, done)
    })

    it('should throw when Content-Type is an array', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.set('Content-Type', ['text/html'])
        res.end()
      })

      request(app)
      .get('/')
      .expect(500, /TypeError: Content-Type cannot be set to an Array/, done)
    })
  })

  describe('.set(object)', () => {
    it('should set multiple fields', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.set({
          'X-Foo': 'bar',
          'X-Bar': 'baz'
        }).end()
      })

      request(app)
      .get('/')
      .expect('X-Foo', 'bar')
      .expect('X-Bar', 'baz')
      .end(done)
    })

    it('should coerce to a string', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.set({ 'X-Number': 123 })
        res.end(typeof res.get('X-Number'))
      })

      request(app)
      .get('/')
      .expect('X-Number', '123')
      .expect(200, 'string', done)
    })
  })
})
