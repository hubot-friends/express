'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('app.del()', () => {
  it('should alias app.delete()', (t, done) => {
    const app = express()

    app.del('/tobi', (req, res) => {
      res.end('deleted tobi!')
    })

    request(app)
    .del('/tobi')
    .expect('deleted tobi!', done)
  })
})
