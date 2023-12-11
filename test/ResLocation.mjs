'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

describe('res', () => {
  describe('.location(url)', () => {
    it('should set the header', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.location('http://google.com').end()
      })

      request(app)
      .get('/')
      .expect('Location', 'http://google.com')
      .expect(200, done)
    })

    it('should encode "url"', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.location('https://google.com?q=\u2603 §10').end()
      })

      request(app)
      .get('/')
      .expect('Location', 'https://google.com?q=%E2%98%83%20%C2%A710')
      .expect(200, done)
    })

    it('should not touch already-encoded sequences in "url"', (t, done) => {
      const app = express()

      app.use((req, res) => {
        res.location('https://google.com?q=%A710').end()
      })

      request(app)
      .get('/')
      .expect('Location', 'https://google.com?q=%A710')
      .expect(200, done)
    })

    describe('when url is "back"', () => {
      it('should set location from "Referer" header', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.location('back').end()
        })

        request(app)
        .get('/')
        .set('Referer', '/some/page.html')
        .expect('Location', '/some/page.html')
        .expect(200, done)
      })

      it('should set location from "Referrer" header', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.location('back').end()
        })

        request(app)
        .get('/')
        .set('Referrer', '/some/page.html')
        .expect('Location', '/some/page.html')
        .expect(200, done)
      })

      it('should prefer "Referrer" header', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.location('back').end()
        })

        request(app)
        .get('/')
        .set('Referer', '/some/page1.html')
        .set('Referrer', '/some/page2.html')
        .expect('Location', '/some/page2.html')
        .expect(200, done)
      })

      it('should set the header to "/" without referrer', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.location('back').end()
        })

        request(app)
        .get('/')
        .expect('Location', '/')
        .expect(200, done)
      })
    })
  })
})
