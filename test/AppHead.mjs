'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import assert from 'node:assert'
import request from 'supertest'

describe('HEAD', () => {
  it('should default to GET', (t, done) => {
    const app = express()

    app.get('/tobi', (req, res) => {
      // send() detects HEAD
      res.send('tobi')
    })

    request(app)
    .head('/tobi')
    .expect(200, done)
  })

  it('should output the same headers as GET requests', (t, done) => {
    const app = express()

    app.get('/tobi', (req, res) => {
      // send() detects HEAD
      res.send('tobi')
    })

    request(app)
    .head('/tobi')
    .expect(200, function(err, res){
      if (err) return done(err)
      var headers = res.headers
      request(app)
      .get('/tobi')
      .expect(200, function(err, res){
        if (err) return done(err)
        delete headers.date
        delete res.headers.date
        assert.deepEqual(res.headers, headers)
        done()
      })
    })
  })
})

describe('app.head()', () => {
  it('should override', (t, done) => {
    const app = express()

    app.head('/tobi', (req, res) => {
      res.header('x-method', 'head')
      res.end()
    })

    app.get('/tobi', (req, res) => {
      res.header('x-method', 'get')
      res.send('tobi')
    })

    request(app)
      .head('/tobi')
      .expect('x-method', 'head')
      .expect(200, done)
  })
})
