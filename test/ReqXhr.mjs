'use strict'

import { describe, it, before } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('req', () => {
  describe('.xhr', () => {
    let app = null
    before(() => {
      app = express()
      app.get('/', (req, res) => {
        res.send(req.xhr)
      })
    })

    it('should return true when X-Requested-With is xmlhttprequest', (t, done) => {
      request(app)
        .get('/')
        .set('X-Requested-With', 'xmlhttprequest')
        .expect(200, 'true', done)
    })

    it('should case-insensitive', (t, done) => {
      request(app)
        .get('/')
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(200, 'true', done)
    })

    it('should return false otherwise', (t, done) => {
      request(app)
        .get('/')
        .set('X-Requested-With', 'blahblah')
        .expect(200, 'false', done)
    })

    it('should return false when not present', (t, done) => {
      request(app)
        .get('/')
        .expect(200, 'false', done)
    })
  })
})
