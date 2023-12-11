import { describe, it, after } from 'node:test'
import app from '../../examples/web-service/index.js'
import request from 'supertest'

describe('web-service', () => {
  after(() => {
    app.close()
  })
  describe('GET /api/users', () => {
    describe('without an api key', () => {
      it('should respond with 400 bad request', (t, done) => {
        request(app)
        .get('/api/users')
        .expect(400, done)
      })
    })

    describe('with an invalid api key', () => {
      it('should respond with 401 unauthorized', (t, done) => {
        request(app)
        .get('/api/users?api-key=rawr')
        .expect(401, done)
      })
    })

    describe('with a valid api key', () => {
      it('should respond users json', (t, done) => {
        request(app)
        .get('/api/users?api-key=foo')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200, '[{"name":"tobi"},{"name":"loki"},{"name":"jane"}]', done)
      })
    })
  })

  describe('GET /api/repos', () => {
    describe('without an api key', () => {
      it('should respond with 400 bad request', (t, done) => {
        request(app)
        .get('/api/repos')
        .expect(400, done)
      })
    })

    describe('with an invalid api key', () => {
      it('should respond with 401 unauthorized', (t, done) => {
        request(app)
        .get('/api/repos?api-key=rawr')
        .expect(401, done)
      })
    })

    describe('with a valid api key', () => {
      it('should respond repos json', (t, done) => {
        request(app)
        .get('/api/repos?api-key=foo')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(/"name":"express"/)
        .expect(/"url":"https:\/\/github.com\/expressjs\/express"/)
        .expect(200, done)
      })
    })
  })

  describe('GET /api/user/:name/repos', () => {
    describe('without an api key', () => {
      it('should respond with 400 bad request', (t, done) => {
        request(app)
        .get('/api/user/loki/repos')
        .expect(400, done)
      })
    })

    describe('with an invalid api key', () => {
      it('should respond with 401 unauthorized', (t, done) => {
        request(app)
        .get('/api/user/loki/repos?api-key=rawr')
        .expect(401, done)
      })
    })

    describe('with a valid api key', () => {
      it('should respond user repos json', (t, done) => {
        request(app)
        .get('/api/user/loki/repos?api-key=foo')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(/"name":"stylus"/)
        .expect(/"url":"https:\/\/github.com\/learnboost\/stylus"/)
        .expect(200, done)
      })

      it('should 404 with unknown user', (t, done) => {
        request(app)
        .get('/api/user/bob/repos?api-key=foo')
        .expect(404, done)
      })
    })
  })

  describe('when requesting an invalid route', () => {
    it('should respond with 404 json', (t, done) => {
      request(app)
        .get('/api/something?api-key=bar')
        .expect('Content-Type', /json/)
        .expect(404, '{"error":"Sorry, can\'t find that"}', done)
    })
  })
})
