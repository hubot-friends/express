
import { describe, it, after } from 'node:test'
import app from '../../examples/downloads/index.js'
import request from 'supertest'
  
describe('downloads', () => {
  after(() => {
    app.close()
  })
  describe('GET /', () => {
    it('should have a link to amazing.txt', (t, done) => {
      request(app)
      .get('/')
      .expect(/href="\/files\/amazing.txt"/, done)
    })
  })

  describe('GET /files/notes/groceries.txt', () => {
    it('should have a download header', (t, done) => {
      request(app)
        .get('/files/notes/groceries.txt')
        .expect('Content-Disposition', 'attachment; filename="groceries.txt"')
        .expect(200, done)
    })
  })

  describe('GET /files/amazing.txt', () => {
    it('should have a download header', (t, done) => {
      request(app)
      .get('/files/amazing.txt')
      .expect('Content-Disposition', 'attachment; filename="amazing.txt"')
      .expect(200, done)
    })
  })

  describe('GET /files/missing.txt', () => {
    it('should respond with 404', (t, done) => {
      request(app)
      .get('/files/missing.txt')
      .expect(404, done)
    })
  })

  describe('GET /files/../index.js', () => {
    it('should respond with 403', (t, done) => {
      request(app)
        .get('/files/../index.js')
        .expect(403, done)
    })
  })
})
