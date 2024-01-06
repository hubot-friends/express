'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'
import after from 'after'
import { URL } from 'node:url'

describe('app', () => {
  describe('.request', () => {
    it('should extend the request prototype', (t, done) => {
      const app = express()
      const server = app.listen()
      app.request.querystring = function () {
        return new URL(this.url, 'http://localhost').search.replace('?', '')
      }

      app.use((req, res) => {
        res.end(req.querystring())
      })

      request(server)
      .get('/foo?name=tobi')
      .expect('name=tobi', ()=> server.close(done))
    })

    it('should only extend for the referenced app', (t, done) => {
      const app1 = express()
      const app2 = express()
      const cb = after(2, done)
      app1.name = 'app1'
      app2.name = 'app2'

      app1.request.foobar = function () {
        return 'tobi'
      }

      app1.get('/', (req, res) => {
        res.send(req.foobar())
      })

      app2.get('/', (req, res) => {
        res.send(req.foobar())
      })

      request(app1)
        .get('/')
        .expect(200, 'tobi', cb)

      request(app2)
        .get('/')
        .expect(500, /(?:not a function|has no method)/, cb)
    })

    it('should inherit to sub apps', (t, done) => {
      const app1 = express()
      const app2 = express()
      const cb = after(2, done)
      app1.name = 'app1'
      app2.name = 'app2'

      app1.request.foobar = () => {
        return 'tobi'
      }

      app1.use('/sub', app2)

      app1.get('/', (req, res) => {
        res.send(req.foobar())
      })

      app2.get('/', (req, res) => {
        res.send(req.foobar())
      })

      request(app1)
        .get('/')
        .expect(200, 'tobi', cb)

      request(app1)
        .get('/sub')
        .expect(200, 'tobi', cb)
    })

    it('should allow sub app to override', (t, done) => {
      const app1 = express()
      const app2 = express()
      const cb = after(2, done)

      app1.request.foobar = () => {
        return 'tobi'
      }

      app2.request.foobar = () => {
        return 'loki'
      }

      app1.use('/sub', app2)

      app1.get('/', (req, res) => {
        res.send(req.foobar())
      })

      app2.get('/', (req, res) => {
        res.send(req.foobar())
      })

      request(app1)
        .get('/')
        .expect(200, 'tobi', cb)

      request(app1)
        .get('/sub')
        .expect(200, 'loki', cb)
    })

    it('should not pollute parent app', (t, done) => {
      const app1 = express()
      const app2 = express()
      const cb = after(2, done)
      app1.name = 'app1'
      app2.name = 'app2'
      app1.request.foobar = () => {
        return 'tobi'
      }

      app2.request.foobar = () => {
        return 'loki'
      }

      app1.use('/sub', app2)

      app1.get('/sub/foo', (req, res) => {
        res.send(req.foobar())
      })

      app2.get('/', (req, res) => {
        res.send(req.foobar())
      })

      request(app1)
        .get('/sub')
        .expect(200, 'loki', cb)

      request(app1)
        .get('/sub/foo')
        .expect(200, 'tobi', cb)
    })
  })
})
