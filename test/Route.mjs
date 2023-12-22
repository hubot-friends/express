'use strict'
import after from 'after'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Route } from '../lib/express.js'
import methods from 'methods'

describe('Route', () => {
  it('should work without handlers', (t, done) => {
    const req = { method: 'GET', url: '/' }
    const route = new Route('/foo')
    route.dispatch(req, {}, done)
  })

  describe('.all', () => {
    it('should add handler', (t, done) =>{
      const req = { method: 'GET', url: '/' }
      var route = new Route('/foo')

      route.all((req, res, next) => {
        req.called = true
        next()
      })

      route.dispatch(req, {}, err => {
        if (err) return done(err)
        assert.ok(req.called)
        done()
      })
    })

    it('should handle VERBS', (t, done) => {
      var count = 0
      var route = new Route('/foo')
      var cb = after(methods.length, err => {
        if (err) return done(err)
        assert.strictEqual(count, methods.length)
        done()
      })

      route.all((req, res, next) => {
        count++
        next()
      })

      methods.forEach(function testMethod(method) {
        const req = { method: method, url: '/' }
        route.dispatch(req, {}, cb)
      })
    })

    it('should stack', (t, done) => {
      const req = { count: 0, method: 'GET', url: '/' }
      var route = new Route('/foo')

      route.all((req, res, next) => {
        req.count++
        next()
      })

      route.all((req, res, next) => {
        req.count++
        next()
      })

      route.dispatch(req, {}, err => {
        if (err) return done(err)
        assert.strictEqual(req.count, 2)
        done()
      })
    })
  })

  describe('.VERB', () => {
    it('should support .get', (t, done) =>{
      const req = { method: 'GET', url: '/' }
      var route = new Route('')

      route.get((req, res, next) => {
        req.called = true
        next()
      })

      route.dispatch(req, {}, err => {
        if (err) return done(err)
        assert.ok(req.called)
        done()
      })
    })

    it('should limit to just .VERB', (t, done) =>{
      const req = { method: 'POST', url: '/' }
      var route = new Route('')

      route.get(() => {
        throw new Error('not me!')
      })

      route.post((req, res, next) => {
        req.called = true
        next()
      })

      route.dispatch(req, {}, err => {
        if (err) return done(err)
        assert.ok(req.called)
        done()
      })
    })

    it('should allow fallthrough', (t, done) =>{
      const req = { order: '', method: 'GET', url: '/' }
      var route = new Route('')

      route.get((req, res, next) => {
        req.order += 'a'
        next()
      })

      route.all((req, res, next) => {
        req.order += 'b'
        next()
      })

      route.get((req, res, next) => {
        req.order += 'c'
        next()
      })

      route.dispatch(req, {}, err => {
        if (err) return done(err)
        assert.strictEqual(req.order, 'abc')
        done()
      })
    })
  })

  describe('errors', () => {
    it('should handle errors via arity 4 functions', (t, done) =>{
      const req = { order: '', method: 'GET', url: '/' }
      var route = new Route('')

      route.all((req, res, next) => {
        next(new Error('foobar'))
      })

      route.all((req, res, next) => {
        req.order += '0'
        next()
      })

      route.all((err, req, res, next) => {
        req.order += 'a'
        next(err)
      })

      route.dispatch(req, {}, err => {
        assert.ok(err)
        assert.strictEqual(err.message, 'foobar')
        assert.strictEqual(req.order, 'a')
        done()
      })
    })

    it('should handle throw', (t, done) => {
      const req = { order: '', method: 'GET', url: '/' }
      var route = new Route('')

      route.all(() => {
        throw new Error('foobar')
      })

      route.all((req, res, next) => {
        req.order += '0'
        next()
      })

      route.all((err, req, res, next) => {
        req.order += 'a'
        next(err)
      })

      route.dispatch(req, {}, err => {
        assert.ok(err)
        assert.strictEqual(err.message, 'foobar')
        assert.strictEqual(req.order, 'a')
        done()
      })
    })

    it('should handle throwing inside error handlers', (t, done) => {
      const req = { method: 'GET', url: '/' }
      var route = new Route('')

      route.get(() => {
        throw new Error('boom!')
      })

      route.get((err, req, res, next) => {
        throw new Error('oops')
      })

      route.get((err, req, res, next) => {
        req.message = err.message
        next()
      })

      route.dispatch(req, {}, err => {
        if (err) return done(err)
        assert.strictEqual(req.message, 'oops')
        done()
      })
    })

    it('should handle throw in .all', (t, done) => {
      const req = { method: 'GET', url: '/' }
      var route = new Route('')

      route.all((req, res, next) => {
        throw new Error('boom!')
      })

      route.dispatch(req, {}, function(err){
        assert.ok(err)
        assert.strictEqual(err.message, 'boom!')
        done()
      })
    })

    it('should handle single error handler', (t, done) => {
      const req = { method: 'GET', url: '/' }
      var route = new Route('')

      route.all((err, req, res, next) => {
        // this should not execute
        throw new Error('should not be called')
      })

      route.dispatch(req, {}, done)
    })
  })
})
