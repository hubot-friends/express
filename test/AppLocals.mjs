'use strict'

import { describe, it } from 'node:test'
import express from '../lib/express.js'
import assert from 'node:assert'

describe('app', () => {
  describe('.locals', () => {
    it('should default object', () => {
      const app = express()
      assert.ok(app.locals)
      assert.strictEqual(typeof app.locals, 'object')
    })

    describe('.settings', () => {
      it('should contain app settings ', () => {
        const app = express()
        app.set('title', 'Express')
        assert.ok(app.locals.settings)
        assert.strictEqual(typeof app.locals.settings, 'object')
        assert.strictEqual(app.locals.settings, app.settings)
        assert.strictEqual(app.locals.settings.title, 'Express')
      })
    })
  })
})
