import { describe, it, after } from 'node:test'
import app from '../../examples/multi-router/index.js'
import request from 'supertest'

describe('multi-router', () => {
  after(() => {
    app.close()
  })
  describe('GET /',() => {
    it('should respond with root handler', (t, done) => {
      request(app)
      .get('/')
      .expect(200, 'Hello from root route.', done)
    })
  })

  describe('GET /api/v1/',() => {
    it('should respond with APIv1 root handler', (t, done) => {
      request(app)
      .get('/api/v1/')
      .expect(200, 'Hello from APIv1 root route.', done)
    })
  })

  describe('GET /api/v1/users',() => {
    it('should respond with users from APIv1', (t, done) => {
      request(app)
      .get('/api/v1/users')
      .expect(200, 'List of APIv1 users.', done)
    })
  })

  describe('GET /api/v2/',() => {
    it('should respond with APIv2 root handler', (t, done) => {
      request(app)
      .get('/api/v2/')
      .expect(200, 'Hello from APIv2 root route.', done)
    })
  })

  describe('GET /api/v2/users',() => {
    it('should respond with users from APIv2', (t, done) => {
      request(app)
      .get('/api/v2/users')
      .expect(200, 'List of APIv2 users.', done)
    })
  })
})
