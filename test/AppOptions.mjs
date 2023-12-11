'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('OPTIONS', () => {
  it('should default to the routes defined', (t, done) => {
    const app = express()

    app.del('/', () => {})
    app.get('/users', (req, res) => {})
    app.put('/users', (req, res) => {})

    request(app)
    .options('/users')
    .expect('Allow', 'GET,HEAD,PUT')
    .expect(200, 'GET,HEAD,PUT', done)
  })

  it('should only include each method once', (t, done) => {
    const app = express()

    app.del('/', () => {})
    app.get('/users', (req, res) => {})
    app.put('/users', (req, res) => {})
    app.get('/users', (req, res) => {})

    request(app)
    .options('/users')
    .expect('Allow', 'GET,HEAD,PUT')
    .expect(200, 'GET,HEAD,PUT', done)
  })

  it('should not be affected by app.all', (t, done) => {
    const app = express()

    app.get('/', () => {})
    app.get('/users', (req, res) => {})
    app.put('/users', (req, res) => {})
    app.all('/users', (req, res, next) => {
      res.setHeader('x-hit', '1')
      next()
    })

    request(app)
    .options('/users')
    .expect('x-hit', '1')
    .expect('Allow', 'GET,HEAD,PUT')
    .expect(200, 'GET,HEAD,PUT', done)
  })

  it('should not respond if the path is not defined', (t, done) => {
    const app = express()

    app.get('/users', (req, res) => {})

    request(app)
    .options('/other')
    .expect(404, done)
  })

  it('should forward requests down the middleware chain', (t, done) => {
    const app = express()
    const router = new express.Router()

    router.get('/users', (req, res) => {})
    app.use(router)
    app.get('/other', (req, res) => {})

    request(app)
    .options('/other')
    .expect('Allow', 'GET,HEAD')
    .expect(200, 'GET,HEAD', done)
  })

  describe('when error occurs in response handler', () => {
    it('should pass error to callback', (t, done) => {
      const app = express()
      const router = express.Router()

      router.get('/users', (req, res) => {})

      app.use((req, res, next) => {
        res.writeHead(200)
        next()
      })
      app.use(router)
      app.use((err, req, res, next) => {
        res.end('true')
      })

      request(app)
      .options('/users')
      .expect(200, 'true', done)
    })
  })
})

describe('app.options()', () => {
  it('should override the default behavior', (t, done) => {
    const app = express()

    app.options('/users', (req, res) => {
      res.set('Allow', 'GET')
      res.send('GET')
    })

    app.get('/users', (req, res) => {})
    app.put('/users', (req, res) => {})

    request(app)
    .options('/users')
    .expect('GET')
    .expect('Allow', 'GET', done)
  })
})
