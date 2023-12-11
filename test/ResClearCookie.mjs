'use strict'


import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('res', () => {
  describe('.clearCookie(name)', () => {
    it('should set a cookie passed expiry', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.clearCookie('sid').end()
      })

      request(app)
      .get('/')
      .expect('Set-Cookie', 'sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT')
      .expect(200, done)
    })
  })

  describe('.clearCookie(name, options)', () => {
    it('should set the given params', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.clearCookie('sid', { path: '/admin' }).end()
      })

      request(app)
      .get('/')
      .expect('Set-Cookie', 'sid=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:00 GMT')
      .expect(200, done)
    })
  })
})
