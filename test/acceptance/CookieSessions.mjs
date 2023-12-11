
import app from '../../examples/cookie-sessions/index.js'
import { describe, it, after } from 'node:test'
import request from 'supertest'

describe('cookie-sessions', () => {
  after(() => {
    app.close()
  })
  describe('GET /', () => {
    it('should display no views', (t, done) => {
      request(app)
      .get('/')
      .expect(200, 'viewed 1 times\n', done)
    })

    it('should set a session cookie', (t, done) => {
      request(app)
      .get('/')
      .expect('Set-Cookie', /session=/)
      .expect(200, done)
    })

    it('should display 1 view on revisit', (t, done) => {
      request(app)
      .get('/')
      .expect(200, 'viewed 1 times\n', function (err, res) {
        if (err) return done(err)
        request(app)
        .get('/')
        .set('Cookie', getCookies(res))
        .expect(200, 'viewed 2 times\n', done)
      })
    })
  })
})

function getCookies(res) {
  return res.headers['set-cookie'].map(function (val) {
    return val.split(';')[0]
  }).join('; ')
}
