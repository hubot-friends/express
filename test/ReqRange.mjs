'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('req', () => {
  describe('.range(size)', () => {
    it('should return parsed ranges', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.json(req.range(120))
      })

      request(app)
      .get('/')
      .set('Range', 'bytes=0-50,51-100')
      .expect(200, '[{"start":0,"end":50},{"start":51,"end":100}]', done)
    })

    it('should cap to the given size', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.json(req.range(75))
      })

      request(app)
      .get('/')
      .set('Range', 'bytes=0-100')
      .expect(200, '[{"start":0,"end":74}]', done)
    })

    it('should cap to the given size when open-ended', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.json(req.range(75))
      })

      request(app)
      .get('/')
      .set('Range', 'bytes=0-')
      .expect(200, '[{"start":0,"end":74}]', done)
    })

    it('should have a .type', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.json(req.range(120).type)
      })

      request(app)
      .get('/')
      .set('Range', 'bytes=0-100')
      .expect(200, '"bytes"', done)
    })

    it('should accept any type', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.json(req.range(120).type)
      })

      request(app)
      .get('/')
      .set('Range', 'users=0-2')
      .expect(200, '"users"', done)
    })

    it('should return undefined if no range', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.send(String(req.range(120)))
      })

      request(app)
      .get('/')
      .expect(200, 'undefined', done)
    })
  })

  describe('.range(size, options)', () => {
    describe('with "combine: true" option', () => {
      it('should return combined ranges', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.json(req.range(120, {
            combine: true
          }))
        })

        request(app)
        .get('/')
        .set('Range', 'bytes=0-50,51-100')
        .expect(200, '[{"start":0,"end":100}]', done)
      })
    })
  })
})
