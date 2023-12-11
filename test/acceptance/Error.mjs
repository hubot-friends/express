import app from '../../examples/error/index.js'
import { describe, it, after } from 'node:test'
import request from 'supertest'

describe('error', () => {
  after(() => {
    app.close()
  })
  describe('GET /', () => {
    it('should respond with 500', (t, done) => {
      request(app)
        .get('/')
        .expect(500,done)
    })
  })

  describe('GET /next', () => {
    it('should respond with 500', (t, done) => {
      request(app)
        .get('/next')
        .expect(500,done)
    })
  })

  describe('GET /missing', () => {
    it('should respond with 404', (t, done) => {
      request(app)
        .get('/missing')
        .expect(404,done)
    })
  })
})
