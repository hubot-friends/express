'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'
import assert from 'node:assert'

describe('req', () => {
  describe('.query', () => {
    it('should default to {}', (t, done) => {
      const app = createApp()

      request(app)
      .get('/')
      .expect(200, '{}', done)
    })

    it('should default to parse simple keys', (t, done) => {
      const app = createApp()

      request(app)
      .get('/?user[name]=tj')
      .expect(200, '{"user[name]":"tj"}', done)
    })

    describe('when "query parser" is extended', () => {
      it('should parse complex keys', (t, done) => {
        const app = createApp('extended');

        request(app)
        .get('/?foo[0][bar]=baz&foo[0][fizz]=buzz&foo[]=done!')
        .expect(200, '{"foo":[{"bar":"baz","fizz":"buzz"},"done!"]}', done)
      })

      it('should parse parameters with dots', (t, done) => {
        const app = createApp('extended')

        request(app)
        .get('/?user.name=tj')
        .expect(200, '{"user.name":"tj"}', done)
      })
    })

    describe('when "query parser" is simple', () => {
      it('should not parse complex keys', (t, done) => {
        const app = createApp('simple')

        request(app)
        .get('/?user%5Bname%5D=tj')
        .expect(200, '{"user[name]":"tj"}', done)
      })
    })

    describe('when "query parser" is a function', () => {
      it('should parse using function', (t, done) => {
        const app = createApp(function (str) {
          return {'length': (str || '').length}
        })

        request(app)
        .get('/?user%5Bname%5D=tj')
        .expect(200, '{"length":17}', done)
      })
    })

    describe('when "query parser" disabled', () => {
      it('should not parse query', (t, done) => {
        const app = createApp(false)

        request(app)
        .get('/?user%5Bname%5D=tj')
        .expect(200, '{}', done)
      })
    })

    describe('when "query parser" enabled', () => {
      it('should not parse complex keys', (t, done) => {
        const app = createApp(true)

        request(app)
        .get('/?user%5Bname%5D=tj')
        .expect(200, '{"user[name]":"tj"}', done)
      })
    })

    describe('when "query parser" an unknown value', () => {
      it('should throw', () => {
        assert.throws(createApp.bind(null, 'bogus'),
          /unknown value.*query parser/)
      })
    })
  })
})

function createApp(setting) {
  const app = express()

  if (setting !== undefined) {
    app.set('query parser', setting)
  }

  app.use((req, res) => {
    res.send(req.query)
  })

  return app
}
