'use strict'
import { describe,it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('res', () => {
  describe('.type(str)', () => {
    it('should set the Content-Type based on a filename', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.type('foo.js').end('var name = "tj"')
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/javascript; charset=utf-8')
      .end(done)
    })

    it('should default to application/octet-stream', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.type('rawr').end('var name = "tj"')
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/octet-stream', done)
    })

    it('should set the Content-Type with type/subtype', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.type('application/vnd.amazon.ebook')
          .end('var name = "tj"')
      })

      request(app)
      .get('/')
      .expect('Content-Type', 'application/vnd.amazon.ebook', done)
    })
  })
})
