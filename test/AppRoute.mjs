'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('app.route', () => {
  it('should return a new route', (t, done) => {
    const app = express()

    app.route('/foo')
    .get((req, res) => {
      res.send('get')
    })
    .post((req, res) => {
      res.send('post')
    })

    request(app)
    .post('/foo')
    .expect('post', done)
  })

  it('should all .VERB after .all', (t, done) => {
    const app = express()

    app.route('/foo')
    .all((req, res, next) => {
      next()
    })
    .get((req, res) => {
      res.send('get')
    })
    .post((req, res) => {
      res.send('post')
    })

    request(app)
    .post('/foo')
    .expect('post', done)
  })

  it('should support dynamic routes', (t, done) => {
    const app = express()

    app.route('/:foo')
    .get((req, res) => {
      res.send(req.params.foo)
    })

    request(app)
    .get('/test')
    .expect('test', done)
  })

  it('should not error on empty routes', (t, done) => {
    const app = express()

    app.route('/:foo')

    request(app)
    .get('/test')
    .expect(404, done)
  })
})
