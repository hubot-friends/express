import { describe, it, after } from 'node:test'
import app from '../../examples/route-map/index.js'
import request from 'supertest'

describe('route-map', () => {
  after(() => {
    app.close()
  })
  describe('GET /users', () => {
    it('should respond with users', (t, done) => {
      request(app)
      .get('/users')
      .expect('user list', done)
    })
  })

  describe('DELETE /users', () => {
    it('should delete users', (t, done) => {
      request(app)
      .del('/users')
      .expect('delete users', done)
    })
  })

  describe('GET /users/:id', () => {
    it('should get a user', (t, done) => {
      request(app)
      .get('/users/12')
      .expect('user 12', done)
    })
  })

  describe('GET /users/:id/pets', () => {
    it('should get a users pets', (t, done) => {
      request(app)
      .get('/users/12/pets')
      .expect('user 12\'s pets', done)
    })
  })

  describe('GET /users/:id/pets/:pid', () => {
    it('should get a users pet', (t, done) => {
      request(app)
      .del('/users/12/pets/2')
      .expect('delete 12\'s pet 2', done)
    })
  })
})
