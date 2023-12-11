import { describe, it, after } from 'node:test'
import app from '../../examples/vhost/index.js'
import request from 'supertest'

describe('vhost', () => {
  after(() => {
    app.close()
  })
  describe('example.com', () => {
    describe('GET /', () => {
      it('should say hello', (t, done) => {
        request(app)
        .get('/')
        .set('Host', 'example.com')
        .expect(200, /hello/i, done)
      })
    })

    describe('GET /foo', () => {
      it('should say foo', (t, done) => {
        request(app)
        .get('/foo')
        .set('Host', 'example.com')
        .expect(200, 'requested foo', done)
      })
    })
  })

  describe('foo.example.com', () => {
    describe('GET /', () => {
      it('should redirect to /foo', (t, done) => {
        request(app)
        .get('/')
        .set('Host', 'foo.example.com')
        .expect(302, /Redirecting to http:\/\/example.com:3000\/foo/, done)
      })
    })
  })

  describe('bar.example.com', () => {
    describe('GET /', () => {
      it('should redirect to /bar', (t, done) => {
        request(app)
        .get('/')
        .set('Host', 'bar.example.com')
        .expect(302, /Redirecting to http:\/\/example.com:3000\/bar/, done)
      })
    })
  })
})
