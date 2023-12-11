'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'
import cookieParser from 'cookie-parser'

describe('req', () => {
  describe('.signedCookies', () => {
    it('should return a signed JSON cookie', (t, done) => {
      const app = express()

      app.use(cookieParser('secret'))

      app.use((req, res) => {
        if (req.path === '/set') {
          res.cookie('obj', { foo: 'bar' }, { signed: true })
          res.end()
        } else {
          res.send(req.signedCookies)
        }
      })

      request(app)
      .get('/set')
      .end((err, res) => {
        if (err) return done(err)
        const cookie = res.header['set-cookie']

        request(app)
        .get('/')
        .set('Cookie', cookie)
        .expect(200, { obj: { foo: 'bar' } }, done)
      })
    })
  })
})

