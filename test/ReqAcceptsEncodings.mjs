'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('req', () => {
  describe('.acceptsEncodings', () => {
    it('should return encoding if accepted', (t, done) => {
      const app = express()

      app.get('/', (req, res) => {
        res.send({
          gzip: req.acceptsEncodings('gzip'),
          deflate: req.acceptsEncodings('deflate')
        })
      })

      request(app)
        .get('/')
        .set('Accept-Encoding', ' gzip, deflate')
        .expect(200, { gzip: 'gzip', deflate: 'deflate' }, done)
    })

    it('should be false if encoding not accepted', (t, done) => {
      const app = express()

      app.get('/', (req, res) => {
        res.send({
          bogus: req.acceptsEncodings('bogus')
        })
      })

      request(app)
        .get('/')
        .set('Accept-Encoding', ' gzip, deflate')
        .expect(200, { bogus: false }, done)
    })
  })
})
