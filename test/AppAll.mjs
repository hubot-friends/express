'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'
import after from 'after'

describe('app.all()', () => {
  it('should add a router per method', (t, done) => {
    const app = express()
    const cb = after(2, done)

    app.all('/tobi', (req, res) => {
      res.end(req.method)
    })

    request(app)
      .put('/tobi')
      .expect(200, 'PUT', cb)

    request(app)
      .get('/tobi')
      .expect(200, 'GET', cb)
  })

  it('should run the callback for a method just once', (t, done) => {
    const app = express()
    let n = 0

    app.all('/(.*)', (req, res, next) => {
      if (n++) return done(new Error('DELETE called several times'))
      next()
    })

    request(app)
    .del('/tobi')
    .expect(404, done)
  })
})
