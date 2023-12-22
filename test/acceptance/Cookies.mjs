
import { describe, it, after } from 'node:test'
import app from '../../examples/cookies/index.js'
import request from 'supertest'
import utils from '../support/Utils.mjs'

describe('cookies', () => {
  after(() => {
    app.close()
  })
  describe('GET /', () => {
    it('should have a form', (t, done) => {
      request(app)
      .get('/')
      .expect(/<form/, done)
    })

    it('should respond with no cookies', (t, done) => {
      request(app)
      .get('/')
      .expect(utils.shouldNotHaveHeader('Set-Cookie'))
      .expect(200, done)
    })

    it('should respond to cookie', (t, done) => {
      request(app)
      .post('/')
      .type('urlencoded')
      .send({ remember: 1 })
      .expect(302, (err, res) => {
        if (err) return done(err)
        request(app)
        .get('/')
        .set('Cookie', res.headers['set-cookie'][0])
        .expect(200, /Remembered/, done)
      })
    })
  })

  describe('GET /forget', () => {
    it('should clear cookie', (t, done) => {
      request(app)
      .post('/')
      .type('urlencoded')
      .send({ remember: 1 })
      .expect(302, (err, res) => {
        if (err) return done(err)
        request(app)
        .get('/forget')
        .set('Cookie', res.headers['set-cookie'][0])
        .expect('Set-Cookie', /remember=;/)
        .expect(302, done)
      })
    })
  })

  describe('POST /', () => {
    it('should set a cookie', (t, done) => {
      request(app)
      .post('/')
      .type('urlencoded')
      .send({ remember: 1 })
      .expect('Set-Cookie', /remember=1/)
      .expect(302, done)
    })

    it('should not set cookie w/o remember', (t, done) => {
      request(app)
      .post('/')
      .send({})
      .expect(utils.shouldNotHaveHeader('Set-Cookie'))
      .expect(302, done)
    })
  })
})
