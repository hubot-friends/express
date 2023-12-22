'use strict'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import express from '../lib/express.js'
import request from 'supertest'
import utils from './support/Utils.mjs'

describe('res', () => {
  describe('.redirect(url)', () => {
    it('should default to a 302 redirect', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.redirect('http://google.com')
      })

      request(app)
      .get('/')
      .expect('location', 'http://google.com')
      .expect(302, done)
    })

    it('should encode "url"', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.redirect('https://google.com?q=\u2603 §10')
      })

      request(app)
      .get('/')
      .expect('Location', 'https://google.com?q=%E2%98%83%20%C2%A710')
      .expect(302, done)
    })

    it('should not touch already-encoded sequences in "url"', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.redirect('https://google.com?q=%A710')
      })

      request(app)
      .get('/')
      .expect('Location', 'https://google.com?q=%A710')
      .expect(302, done)
    })
  })

  describe('.redirect(status, url)', () => {
    it('should set the response status', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.redirect(303, 'http://google.com')
      })

      request(app)
      .get('/')
      .expect('Location', 'http://google.com')
      .expect(303, done)
    })
  })

  describe('when the request method is HEAD', () => {
    it('should ignore the body', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.redirect('http://google.com')
      })

      request(app)
      .head('/')
      .expect(302)
      .expect('Location', 'http://google.com')
      .expect(shouldNotHaveBody())
      .end(done)
    })
  })

  describe('when accepting html', () => {
    it('should respond with html', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.redirect('http://google.com')
      })

      request(app)
      .get('/')
      .set('Accept', 'text/html')
      .expect('Content-Type', /html/)
      .expect('Location', 'http://google.com')
      .expect(302, '<p>Found. Redirecting to <a href="http://google.com">http://google.com</a></p>', done)
    })

    it('should escape the url', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.redirect('<la\'me>')
      })

      request(app)
      .get('/')
      .set('Host', 'http://example.com')
      .set('Accept', 'text/html')
      .expect('Content-Type', /html/)
      .expect('Location', '%3Cla\'me%3E')
      .expect(302, '<p>Found. Redirecting to <a href="%3Cla&#39;me%3E">%3Cla&#39;me%3E</a></p>', done)
    })

    it('should include the redirect type', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.redirect(301, 'http://google.com')
      })

      request(app)
      .get('/')
      .set('Accept', 'text/html')
      .expect('Content-Type', /html/)
      .expect('Location', 'http://google.com')
      .expect(301, '<p>Moved Permanently. Redirecting to <a href="http://google.com">http://google.com</a></p>', done)
    })
  })

  describe('when accepting text', () => {
    it('should respond with text', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.redirect('http://google.com')
      })

      request(app)
      .get('/')
      .set('Accept', 'text/plain, */*')
      .expect('Content-Type', /plain/)
      .expect('Location', 'http://google.com')
      .expect(302, 'Found. Redirecting to http://google.com', done)
    })

    it('should encode the url', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.redirect('http://example.com/?param=<script>alert("hax");</script>')
      })

      request(app)
      .get('/')
      .set('Host', 'http://example.com')
      .set('Accept', 'text/plain, */*')
      .expect('Content-Type', /plain/)
      .expect('Location', 'http://example.com/?param=%3Cscript%3Ealert(%22hax%22);%3C/script%3E')
      .expect(302, 'Found. Redirecting to http://example.com/?param=%3Cscript%3Ealert(%22hax%22);%3C/script%3E', done)
    })

    it('should include the redirect type', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.redirect(301, 'http://google.com')
      })

      request(app)
      .get('/')
      .set('Accept', 'text/plain, */*')
      .expect('Content-Type', /plain/)
      .expect('Location', 'http://google.com')
      .expect(301, 'Moved Permanently. Redirecting to http://google.com', done)
    })
  })

  describe('when accepting neither text or html', () => {
    it('should respond with an empty body', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.redirect('http://google.com')
      })

      request(app)
      .get('/')
      .set('Accept', 'application/octet-stream')
      .expect(302)
      .expect('location', 'http://google.com')
      .expect('content-length', '0')
      .expect(utils.shouldNotHaveHeader('Content-Type'))
      .expect(shouldNotHaveBody())
      .end(done)
    })
  })
})

function shouldNotHaveBody () {
  return res => {
    assert.ok(res.text === '' || res.text === undefined)
  }
}
