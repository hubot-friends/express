'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('req', () => {
  describe('.acceptsLanguage', () => {
    it('should return language if accepted', (t, done) => {
      const app = express()

      app.get('/', (req, res) => {
        res.send({
          'en-us': req.acceptsLanguage('en-us'),
          en: req.acceptsLanguage('en')
        })
      })

      request(app)
        .get('/')
        .set('Accept-Language', 'en;q=.5, en-us')
        .expect(200, { 'en-us': 'en-us', en: 'en' }, done)
    })

    it('should be false if language not accepted', (t, done) => {
      const app = express()

      app.get('/', (req, res) => {
        res.send({
          es: req.acceptsLanguage('es')
        })
      })

      request(app)
        .get('/')
        .set('Accept-Language', 'en;q=.5, en-us')
        .expect(200, { es: false }, done)
    })

    describe('when Accept-Language is not present', () => {
      it('should always return language', (t, done) => {
        const app = express()

        app.get('/', (req, res) => {
          res.send({
            en: req.acceptsLanguage('en'),
            es: req.acceptsLanguage('es'),
            jp: req.acceptsLanguage('jp')
          })
        })

        request(app)
          .get('/')
          .expect(200, { en: 'en', es: 'es', jp: 'jp' }, done)
      })
    })
  })
})
