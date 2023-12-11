'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'
import assert from 'node:assert'

describe('middleware', () => {
  describe('.next()', () => {
    it('should behave like connect', (t, done) => {
      const app = express()
        , calls = []

      app.use((req, res, next) => {
        calls.push('one')
        next()
      })

      app.use((req, res, next) => {
        calls.push('two')
        next()
      })

      app.use((req, res) => {
        let buf = ''
        res.setHeader('Content-Type', 'application/json')
        req.setEncoding('utf8')
        req.on('data', chunk => buf += chunk )
        req.on('end', () => {
          res.end(buf)
        })
      })

      request(app)
      .get('/')
      .set('Content-Type', 'application/json')
      .send('{"foo":"bar"}')
      .expect('Content-Type', 'application/json')
      .expect(() => assert.deepEqual(calls, ['one', 'two']) )
      .expect(200, '{"foo":"bar"}', done)
    })
  })
})
