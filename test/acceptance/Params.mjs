import { describe, it, after } from 'node:test'
import app from '../../examples/params/index.js'
import request from 'supertest'

describe('params', () => {
  after(() => {
    app.close()
  })
  describe('GET /', () => {
    it('should respond with instructions', (t, done) => {
      request(app)
        .get('/')
        .expect(/Visit/,done)
    })
  })

  describe('GET /user/0', () => {
    it('should respond with a user', (t, done) => {
      request(app)
        .get('/user/0')
        .expect(/user tj/,done)
    })
  })

  describe('GET /user/9', () => {
    it('should fail to find user', (t, done) => {
      request(app)
      .get('/user/9')
      .expect(404, /failed to find user/, done)
    })
  })

  describe('GET /users/0-2', () => {
    it('should respond with three users', (t, done) => {
      request(app)
      .get('/users/0-2')
      .expect(/users tj, tobi, loki/, done)
    })
  })

  describe('GET /users/foo-bar', () => {
    it('should fail integer parsing', (t, done) => {
      request(app)
      .get('/users/foo-bar')
      .expect(400, /failed to parseInt foo/, done)
    })
  })
})
