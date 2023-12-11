'use strict'

import { describe, it } from 'node:test'
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

  it('should expose the application prototype', () => {
    assert.strictEqual(typeof express.application, 'object')
    assert.strictEqual(typeof express.application.set, 'function')
  })

  it('should expose the request prototype', () => {
    assert.strictEqual(typeof express.request, 'object')
    assert.strictEqual(typeof express.request.accepts, 'function')
  })

  it('should expose the response prototype', () => {
    assert.strictEqual(typeof express.response, 'object')
    assert.strictEqual(typeof express.response.send, 'function')
  })

  it('should permit modifying the .application prototype', () => {
    express.application.foo = () => 'bar'
    assert.strictEqual(express().foo(), 'bar')
  })

  it('should permit modifying the .request prototype', (t, done) => {
    express.request.foo = () => 'bar'
    const app = express()

    app.use((req, res, next) => {
      res.end(req.foo())
    })

    request(app)
    .get('/')
    .expect('bar', done)
  })

  it('should permit modifying the .response prototype', (t, done) => {
    express.response.foo = function() { this.send('bar') }
    const app = express()

    app.use((req, res, next) => {
      res.foo()
    })

    request(app)
    .get('/')
    .expect('bar', done)
  })

  it('should throw on old middlewares', () => {
    assert.throws(() => { express.bodyParser() }, /Error:.*middleware.*bodyParser/)
    assert.throws(() => { express.limit() }, /Error:.*middleware.*limit/)
  })
})
