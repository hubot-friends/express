'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('OPTIONS', () => {
  it('should default to the routes defined', (t, done) => {
    const app = express()
    const server = app.listen()
    app.delete('/', () => {})
    app.get('/users', (req, res) => {})
    app.put('/users', (req, res) => {})

    request(server)
    .options('/users')
    .expect('Allow', 'GET, HEAD, PUT')
    .expect(200, 'GET, HEAD, PUT', () => server.close(done))
  })

  it('should only include each method once', (t, done) => {
    const app = express()
    const server = app.listen()

    app.delete('/', () => {})
    app.get('/users', (req, res) => {})
    app.put('/users', (req, res) => {})
    app.get('/users', (req, res) => {})

    request(server)
    .options('/users')
    .expect('Allow', 'GET, HEAD, PUT')
    .expect(200, 'GET, HEAD, PUT', () => server.close(done))
  })

  it('should not be affected by app.all', (t, done) => {
    const app = express()
    const server = app.listen()

    app.get('/', () => {})
    app.get('/users', (req, res) => {})
    app.put('/users', (req, res) => {})
    app.all('/users', (req, res, next) => {
      res.setHeader('x-hit', '1')
      next()
    })

    request(server)
    .options('/users')
    .expect('x-hit', '1')
    .expect('Allow', 'GET, HEAD, PUT')
    .expect(200, 'GET, HEAD, PUT', () => server.close(done))
  })

  it('should not respond if the path is not defined', (t, done) => {
    const app = express()
    const server = app.listen()

    app.get('/users', (req, res) => {})

    request(server)
    .options('/other')
    .expect(404, () => server.close(done))
  })

  it('should forward requests down the middleware chain', (t, done) => {
    const app = express()
    const server = app.listen()
    const router = new express.Router()

    router.get('/users', (req, res) => {})
    app.use(router)
    app.get('/other', (req, res) => {})

    request(server)
    .options('/other')
    .expect('Allow', 'GET, HEAD')
    .expect(200, 'GET, HEAD', () => server.close(done))
  })

  describe('when error occurs in response handler', () => {
    it('should pass error to callback', (t, done) => {
      const app = express()
      const server = app.listen()
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

      request(server)
      .options('/users')
      .expect(200, 'true', () => server.close(done))
    })
  })
})

describe('app.options()', () => {
  it('should override the default behavior', (t, done) => {
    const app = express()
    const server = app.listen()
    app.options('/users', (req, res) => {
      res.set('Allow', 'GET')
      res.send('GET')
    })

    app.get('/users', (req, res) => {})
    app.put('/users', (req, res) => {})

    request(server)
    .options('/users')
    .expect('GET')
    .expect('Allow', 'GET', () => server.close(done))
  })
})
