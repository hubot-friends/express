'use strict'
import { describe, it } from 'node:test'
import express from '../lib/express.js'
import request from 'supertest'

const isIoJs = process.release
  ? process.release.name === 'io.js'
  : ['v1.', 'v2.', 'v3.'].indexOf(process.version.slice(0, 3)) !== -1

describe('res', () => {
  describe('.status(code)', () => {
    describe('when "code" is undefined', () => {
      it('should raise error for invalid status code', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.status(undefined).end()
        })

        request(app)
          .get('/')
          .expect(500, /Invalid status code/, err => {
            if (isIoJs) {
              done(err ? null : new Error('expected error'))
            } else {
              done(err)
            }
          })
      })
    })

    describe('when "code" is null', () => {
      it('should raise error for invalid status code', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.status(null).end()
        })

        request(app)
          .get('/')
          .expect(500, /Invalid status code/, err => {
            if (isIoJs) {
              done(err ? null : new Error('expected error'))
            } else {
              done(err)
            }
          })
      })
    })

    describe('when "code" is 201', () => {
      it('should set the response status code to 201', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.status(201).end()
        })

        request(app)
          .get('/')
          .expect(201, done)
      })
    })

    describe('when "code" is 302', () => {
      it('should set the response status code to 302', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.status(302).end()
        })

        request(app)
          .get('/')
          .expect(302, done)
      })
    })

    describe('when "code" is 403', () => {
      it('should set the response status code to 403', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.status(403).end()
        })

        request(app)
          .get('/')
          .expect(403, done)
      })
    })

    describe('when "code" is 501', () => {
      it('should set the response status code to 501', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.status(501).end()
        })

        request(app)
          .get('/')
          .expect(501, done)
      })
    })

    describe('when "code" is "410"', () => {
      it('should set the response status code to 410', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.status('410').end()
        })

        request(app)
          .get('/')
          .expect(410, done)
      })
    })

    describe('when "code" is 410.1', () => {
      it('should set the response status code to 410', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.status(410.1).end()
        })

        request(app)
          .get('/')
          .expect(410, err => {
            if (isIoJs) {
              done(err ? null : new Error('expected error'))
            } else {
              done(err)
            }
          })
      })
    })

    describe('when "code" is 1000', () => {
      it('should raise error for invalid status code', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.status(1000).end()
        })

        request(app)
          .get('/')
          .expect(500, /Invalid status code/, err => {
            if (isIoJs) {
              done(err ? null : new Error('expected error'))
            } else {
              done(err)
            }
          })
      })
    })

    describe('when "code" is 99', () => {
      it('should raise error for invalid status code', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.status(99).end()
        })

        request(app)
          .get('/')
          .expect(500, /Invalid status code/, err => {
            if (isIoJs) {
              done(err ? null : new Error('expected error'))
            } else {
              done(err)
            }
          })
      })
    })

    describe('when "code" is -401', () => {
      it('should raise error for invalid status code', (t, done) => {
        const app = express()

        app.use((req, res) => {
          res.status(-401).end()
        })

        request(app)
          .get('/')
          .expect(500, /Invalid status code/, err => {
            if (isIoJs) {
              done(err ? null : new Error('expected error'))
            } else {
              done(err)
            }
          })
      })
    })
  })
})
