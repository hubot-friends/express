'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('req', () => {
  describe('.secure', () => {
    describe('when X-Forwarded-Proto is missing', () => {
      it('should return false when http', (t, done) => {
        const app = express()

        app.get('/', (req, res) => {
          res.send(req.secure ? 'yes' : 'no')
        })

        request(app)
        .get('/')
        .expect('no', done)
      })
    })
  })

  describe('.secure', () => {
    describe('when X-Forwarded-Proto is present', () => {
      it('should return false when http', (t, done) => {
        const app = express()

        app.get('/', (req, res) => {
          res.send(req.secure ? 'yes' : 'no')
        })

        request(app)
        .get('/')
        .set('X-Forwarded-Proto', 'https')
        .expect('no', done)
      })

      it('should return true when "trust proxy" is enabled', (t, done) => {
        const app = express()

        app.enable('trust proxy')

        app.get('/', (req, res) => {
          res.send(req.secure ? 'yes' : 'no')
        })

        request(app)
        .get('/')
        .set('X-Forwarded-Proto', 'https')
        .expect('yes', done)
      })

      it('should return false when initial proxy is http', (t, done) => {
        const app = express()

        app.enable('trust proxy')

        app.get('/', (req, res) => {
          res.send(req.secure ? 'yes' : 'no')
        })

        request(app)
        .get('/')
        .set('X-Forwarded-Proto', 'http, https')
        .expect('no', done)
      })

      it('should return true when initial proxy is https', (t, done) => {
        const app = express()

        app.enable('trust proxy')

        app.get('/', (req, res) => {
          res.send(req.secure ? 'yes' : 'no')
        })

        request(app)
        .get('/')
        .set('X-Forwarded-Proto', 'https, http')
        .expect('yes', done)
      })

      describe('when "trust proxy" trusting hop count', () => {
        it('should respect X-Forwarded-Proto', (t, done) => {
          const app = express()

          app.set('trust proxy', 1)

          app.get('/', (req, res) => {
            res.send(req.secure ? 'yes' : 'no')
          })

          request(app)
          .get('/')
          .set('X-Forwarded-Proto', 'https')
          .expect('yes', done)
        })
      })
    })
  })
})
