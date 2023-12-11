import app from '../../examples/hello-world/index.js'
import { describe, it, after } from 'node:test'
import request from 'supertest'

describe('hello-world', () => {
  after(() => {
    app.close()
  })
  describe('GET /', () => {
    it('should respond with hello world', (t, done) => {
      request(app)
        .get('/')
        .expect(200, 'Hello World', done)
    })
  })

  describe('GET /missing', () => {
    it('should respond with 404', (t, done) => {
      request(app)
        .get('/missing')
        .expect(404, done)
    })
  })
})
