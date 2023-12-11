'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('res', () => {
  describe('.locals', () => {
    it('should be empty by default', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.json(res.locals)
      })

      request(app)
      .get('/')
      .expect(200, {}, done)
    })
  })

  it('should work when mounted', (t, done) => {
    const app = express()
    const blog = express()

    app.use(blog)

    blog.use((req, res, next) => {
      res.locals.foo = 'bar'
      next()
    })

    app.use((req, res) => {
      res.json(res.locals)
    })

    request(app)
    .get('/')
    .expect(200, { foo: 'bar' }, done)
  })
})
