import { describe, it, after } from 'node:test'
import app from '../../examples/resource/index.js'
import request from 'supertest'

describe('resource', () => {
  after(() => {
    app.close()
  })
  describe('GET /', () => {
    it('should respond with instructions', (t, done) => {
      request(app)
        .get('/')
        .expect(/^<h1>Examples:<\/h1>/,done)
    })
  })

  describe('GET /users', () => {
    it('should respond with all users', (t, done) => {
      request(app)
        .get('/users')
        .expect(/^\[{"name":"tj"},{"name":"ciaran"},{"name":"aaron"},{"name":"guillermo"},{"name":"simon"},{"name":"tobi"}\]/,done)
    })
  })

  describe('GET /users/1', () => {
    it('should respond with user 1', (t, done) => {
      request(app)
        .get('/users/1')
        .expect(/^{"name":"ciaran"}/,done)
    })
  })

  describe('GET /users/9', () => {
    it('should respond with error', (t, done) => {
      request(app)
        .get('/users/9')
        .expect('{"error":"Cannot find user"}', done)
    })
  })

  describe('GET /users/1..3', () => {
    it('should respond with users 1 through 3', (t, done) => {
      request(app)
        .get('/users/1..3')
        .expect(/^<ul><li>ciaran<\/li>\n<li>aaron<\/li>\n<li>guillermo<\/li><\/ul>/,done)
    })
  })

  describe('DELETE /users/1', () => {
    it('should delete user 1', (t, done) => {
      request(app)
        .del('/users/1')
        .expect(/^destroyed/,done)
    })
  })

  describe('DELETE /users/9', () => {
    it('should fail', (t, done) => {
      request(app)
        .del('/users/9')
        .expect('Cannot find user', done)
    })
  })

  describe('GET /users/1..3.json', () => {
    it('should respond with users 2 and 3 as json', (t, done) => {
      request(app)
        .get('/users/1..3.json')
        .expect(/^\[null,{"name":"aaron"},{"name":"guillermo"}\]/,done)
    })
  })
})
