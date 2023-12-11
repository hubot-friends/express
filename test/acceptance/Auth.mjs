import app from '../../examples/auth/index.js'
import { describe, it, after } from 'node:test'
import request from 'supertest'

function getCookie(res) {
  return res.headers['set-cookie'][0].split(';')[0]
}

describe('auth', () => {
  after(() => {
    app.close()
  })
  describe('GET /',() => {
    it('should redirect to /login', (t, done) => {
      request(app)
      .get('/')
      .expect('Location', '/login')
      .expect(302, done)
    })
  })

  describe('GET /login',() => {
    it('should render login form', (t, done) => {
      request(app)
      .get('/login')
      .expect(200, /<form/, done)
    })

    it('should display login error for bad user', (t, done) => {
      request(app)
      .post('/login')
      .type('urlencoded')
      .send('username=not-tj&password=foobar')
      .expect('Location', '/login')
      .expect(302, function(err, res){
        if (err) return done(err)
        request(app)
        .get('/login')
        .set('Cookie', getCookie(res))
        .expect(200, /Authentication failed/, done)
      })
    })

    it('should display login error for bad password', (t, done) => {
      request(app)
        .post('/login')
        .type('urlencoded')
        .send('username=tj&password=nogood')
        .expect('Location', '/login')
        .expect(302, function (err, res) {
          if (err) return done(err)
          request(app)
            .get('/login')
            .set('Cookie', getCookie(res))
            .expect(200, /Authentication failed/, done)
        })
    })
  })

  describe('GET /logout',() => {
    it('should redirect to /', (t, done) => {
      request(app)
      .get('/logout')
      .expect('Location', '/')
      .expect(302, done)
    })
  })

  describe('GET /restricted',() => {
    it('should redirect to /login without cookie', (t, done) => {
      request(app)
      .get('/restricted')
      .expect('Location', '/login')
      .expect(302, done)
    })

    it('should succeed with proper cookie', (t, done) => {
      request(app)
      .post('/login')
      .type('urlencoded')
      .send('username=tj&password=foobar')
      .expect('Location', '/')
      .expect(302, function(err, res){
        if (err) return done(err)
        request(app)
        .get('/restricted')
        .set('Cookie', getCookie(res))
        .expect(200, done)
      })
    })
  })

  describe('POST /login', () => {
    it('should fail without proper username', (t, done) => {
      request(app)
      .post('/login')
      .type('urlencoded')
      .send('username=not-tj&password=foobar')
      .expect('Location', '/login')
      .expect(302, done)
    })

    it('should fail without proper password', (t, done) => {
      request(app)
      .post('/login')
      .type('urlencoded')
      .send('username=tj&password=baz')
      .expect('Location', '/login')
      .expect(302, done)
    })

    it('should succeed with proper credentials', (t, done) => {
      request(app)
      .post('/login')
      .type('urlencoded')
      .send('username=tj&password=foobar')
      .expect('Location', '/')
      .expect(302, done)
    })
  })
})
