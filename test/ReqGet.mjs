'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'
import assert from 'node:assert'

describe('req', () => {
  describe('.get(field)', () => {
    it('should return the header field value', (t, done) => {
      const app = express()

      app.use((req, res) => {
        assert(req.get('Something-Else') === undefined)
        res.end(req.get('Content-Type'))
      })

      request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .expect('application/json', done)
    })

    it('should special-case Referer', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.end(req.get('Referer'))
      })

      request(app)
      .post('/')
      .set('Referrer', 'http://foobar.com')
      .expect('http://foobar.com', done)
    })

    it('should throw missing header name', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.end(req.get())
      })

      request(app)
      .get('/')
      .expect(500, /TypeError: name argument is required to req.get/, done)
    })

    it('should throw for non-string header name', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.end(req.get(42))
      })

      request(app)
      .get('/')
      .expect(500, /TypeError: name must be a string to req.get/, done)
    })
  })
})
