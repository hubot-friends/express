'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'

describe('app.listen()', () => {
  it('should wrap with an HTTP server', (t, done) => {
    const app = express()

    const server = app.listen(0, () => {
      server.close(done)
    })
  })
})
