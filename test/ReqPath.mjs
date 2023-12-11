'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('req', () => {
  describe('.path', () => {
    it('should return the parsed pathname', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.end(req.path)
      })

      request(app)
      .get('/login?redirect=/post/1/comments')
      .expect('/login', done)
    })
  })
})
