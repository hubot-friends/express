'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('res', () => {
  describe('.sendStatus(statusCode)', () => {
    it('should send the status code and message as body', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.sendStatus(201)
      })

      request(app)
      .get('/')
      .expect(201, 'Created', done)
    })

    it('should work with unknown code', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.sendStatus(599)
      })

      request(app)
      .get('/')
      .expect(599, '599', done)
    })
  })
})
