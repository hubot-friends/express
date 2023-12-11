'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('throw after .end()', () => {
  it('should fail gracefully', (t, done) => {
    const app = express()

    app.get('/', (req, res) => {
      res.end('yay')
      throw new Error('boom')
    })

    request(app)
    .get('/')
    .expect('yay')
    .expect(200, done)
  })
})
