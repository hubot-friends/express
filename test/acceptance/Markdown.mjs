import app from '../../examples/markdown/index.js'
import { describe, it, after } from 'node:test'
import request from 'supertest'

describe('markdown', () => {
  after(() => {
    app.close()
  })
  describe('GET /', () => {
    it('should respond with html', (t, done) => {
      request(app)
        .get('/')
        .expect(/<h1[^>]*>Markdown Example<\/h1>/,done)
    })
  })

  describe('GET /fail',() => {
    it('should respond with an error', (t, done) => {
      request(app)
        .get('/fail')
        .expect(500,done)
    })
  })
})
