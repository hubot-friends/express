'use strict'
import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'
import utils from './support/Utils.mjs'

describe('res.vary()', () => {
  describe('with no arguments', () => {
    it('should throw error', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.vary()
        res.end()
      })

      request(app)
      .get('/')
      .expect(500, /field.*required/, done)
    })
  })

  describe('with an empty array', () => {
    it('should not set Vary', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.vary([])
        res.end()
      })

      request(app)
      .get('/')
      .expect(utils.shouldNotHaveHeader('Vary'))
      .expect(200, done)
    })
  })

  describe('with an array', () => {
    it('should set the values', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.vary(['Accept', 'Accept-Language', 'Accept-Encoding'])
        res.end()
      })

      request(app)
      .get('/')
      .expect('Vary', 'Accept, Accept-Language, Accept-Encoding')
      .expect(200, done)
    })
  })

  describe('with a string', () => {
    it('should set the value', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.vary('Accept')
        res.end()
      })

      request(app)
      .get('/')
      .expect('Vary', 'Accept')
      .expect(200, done)
    })
  })

  describe('when the value is present', () => {
    it('should not add it again', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.vary('Accept')
        res.vary('Accept-Encoding')
        res.vary('Accept-Encoding')
        res.vary('Accept-Encoding')
        res.vary('Accept')
        res.end()
      })

      request(app)
      .get('/')
      .expect('Vary', 'Accept, Accept-Encoding')
      .expect(200, done)
    })
  })
})
