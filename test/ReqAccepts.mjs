'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('req', () => {
  describe('.accepts(type)', () => {
    it('should return true when Accept is not present', (t, done) => {
      const app = express()

      app.use((req, res, next) => {
        res.end(req.accepts('json') ? 'yes' : 'no')
      })

      request(app)
      .get('/')
      .expect('yes', done)
    })

    it('should return true when present', (t, done) => {
      const app = express()

      app.use((req, res, next) => {
        res.end(req.accepts('json') ? 'yes' : 'no')
      })

      request(app)
      .get('/')
      .set('Accept', 'application/json')
      .expect('yes', done)
    })

    it('should return false otherwise', (t, done) => {
      const app = express()

      app.use((req, res, next) => {
        res.end(req.accepts('json') ? 'yes' : 'no')
      })

      request(app)
      .get('/')
      .set('Accept', 'text/html')
      .expect('no', done)
    })
  })

  it('should accept an argument list of type names', (t, done) => {
    const app = express()

    app.use((req, res, next) => {
      res.end(req.accepts('json', 'html'))
    })

    request(app)
    .get('/')
    .set('Accept', 'application/json')
    .expect('json', done)
  })

  describe('.accepts(types)', () => {
    it('should return the first when Accept is not present', (t, done) => {
      const app = express()

      app.use((req, res, next) => {
        res.end(req.accepts(['json', 'html']))
      })

      request(app)
      .get('/')
      .expect('json', done)
    })

    it('should return the first acceptable type', (t, done) => {
      const app = express()

      app.use((req, res, next) => {
        res.end(req.accepts(['json', 'html']))
      })

      request(app)
      .get('/')
      .set('Accept', 'text/html')
      .expect('html', done)
    })

    it('should return false when no match is made', (t, done) => {
      const app = express()

      app.use((req, res, next) => {
        res.end(req.accepts(['text/html', 'application/json']) ? 'yup' : 'nope')
      })

      request(app)
      .get('/')
      .set('Accept', 'foo/bar, bar/baz')
      .expect('nope', done)
    })

    it('should take quality into account', (t, done) => {
      const app = express()

      app.use((req, res, next) => {
        res.end(req.accepts(['text/html', 'application/json']))
      })

      request(app)
      .get('/')
      .set('Accept', '*/html; q=.5, application/json')
      .expect('application/json', done)
    })

    it('should return the first acceptable type with canonical mime types', (t, done) => {
      const app = express()

      app.use((req, res, next) => {
        res.end(req.accepts(['application/json', 'text/html']))
      })

      request(app)
      .get('/')
      .set('Accept', '*/html')
      .expect('text/html', done)
    })
  })
})
