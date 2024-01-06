'use strict'

import { describe, it } from 'node:test'
import ExpressApp from '../lib/application.js'
import express from '../lib/express.js'
import request from 'supertest'
import assert from 'node:assert'

describe('exports', () => {
  it('should expose Router', () => {
    assert.strictEqual(typeof express.Router, 'function')
  })

  it('should expose json middleware', () => {
    assert.equal(typeof express.json, 'function')
    assert.equal(express.json.length, 1)
  })

  it('should expose raw middleware', () => {
    assert.equal(typeof express.raw, 'function')
    assert.equal(express.raw.length, 1)
  })

  it('should expose static middleware', () => {
    assert.equal(typeof express.static, 'function')
    assert.equal(express.static.length, 2)
  })

  it('should expose text middleware', () => {
    assert.equal(typeof express.text, 'function')
    assert.equal(express.text.length, 1)
  })

  it('should expose urlencoded middleware', () => {
    assert.equal(typeof express.urlencoded, 'function')
    assert.equal(express.urlencoded.length, 1)
  })

  it('should permit adding to the .request', (t, done) => {
    class CustomApp extends ExpressApp {
      constructor() {
        super()
        this.request = {
          foo () {
            return 'bar'
          }
        }
      }
    }
    const app = express(CustomApp)
    const server = app.listen()

    app.use((req, res, next) => {
      res.end(req.foo())
    })

    request(server)
    .get('/')
    .expect('bar', () => server.close(done))
  })

  it('should permit adding to the .response', (t, done) => {
    class CustomApp extends ExpressApp {
      constructor() {
        super()
        this.response = {
          foo () {
            this.send('bar')
          }
        }
      }
    }
    const app = express(CustomApp)
    const server = app.listen()

    app.use((req, res, next) => {
      res.foo()
    })

    request(server)
    .get('/')
    .expect('bar', () => server.close(done))
  })
})
