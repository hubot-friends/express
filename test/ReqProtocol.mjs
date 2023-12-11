'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('req', () => {
  describe('.protocol', () => {
    it('should return the protocol string', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.end(req.protocol)
      })

      request(app)
      .get('/')
      .expect('http', done)
    })

    describe('when "trust proxy" is enabled', () => {
      it('should respect X-Forwarded-Proto', (t, done) => {
        const app = express()

        app.enable('trust proxy')

        app.use((req, res) => {
          res.end(req.protocol)
        })

        request(app)
        .get('/')
        .set('X-Forwarded-Proto', 'https')
        .expect('https', done)
      })

      it('should default to the socket addr if X-Forwarded-Proto not present', (t, done) => {
        const app = express()

        app.enable('trust proxy')

        app.use((req, res) => {
          req.connection.encrypted = true
          res.end(req.protocol)
        })

        request(app)
        .get('/')
        .expect('https', done)
      })

      it('should ignore X-Forwarded-Proto if socket addr not trusted', (t, done) => {
        const app = express()

        app.set('trust proxy', '10.0.0.1')

        app.use((req, res) => {
          res.end(req.protocol)
        })

        request(app)
        .get('/')
        .set('X-Forwarded-Proto', 'https')
        .expect('http', done)
      })

      it('should default to http', (t, done) => {
        const app = express()

        app.enable('trust proxy')

        app.use((req, res) => {
          res.end(req.protocol)
        })

        request(app)
        .get('/')
        .expect('http', done)
      })

      describe('when trusting hop count', () => {
        it('should respect X-Forwarded-Proto', (t, done) => {
          const app = express()

          app.set('trust proxy', 1)

          app.use((req, res) => {
            res.end(req.protocol)
          })

          request(app)
          .get('/')
          .set('X-Forwarded-Proto', 'https')
          .expect('https', done)
        })
      })
    })

    describe('when "trust proxy" is disabled', () => {
      it('should ignore X-Forwarded-Proto', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.end(req.protocol)
        })

        request(app)
        .get('/')
        .set('X-Forwarded-Proto', 'https')
        .expect('http', done)
      })
    })
  })
})
