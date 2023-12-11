'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('req', () => {
  describe('.fresh', () => {
    it('should return true when the resource is not modified', (t, done) => {
      const app = express()
      const etag = '"12345"'

      app.use((req, res) => {
        res.set('ETag', etag)
        res.send(req.fresh)
      })

      request(app)
      .get('/')
      .set('If-None-Match', etag)
      .expect(304, done)
    })

    it('should return false when the resource is modified', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.set('ETag', '"123"')
        res.send(req.fresh)
      })

      request(app)
      .get('/')
      .set('If-None-Match', '"12345"')
      .expect(200, 'false', done)
    })

    it('should return false without response headers', (t, done) => {
      const app = express()

      app.disable('x-powered-by')
      app.use((req, res) => {
        res.send(req.fresh)
      })

      request(app)
      .get('/')
      .expect(200, 'false', done)
    })
  })
})
