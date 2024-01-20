'use strict'
import after from 'after'
import { Router } from '../index.js'
import methods from 'methods'
import assert from 'assert'
import { describe, it } from 'node:test'

describe('Router', () => {
  it('should return a function with router methods', () =>  {
    const router = new Router()
    assert(router instanceof Router)

    assert(typeof router.get === 'function')
    assert(typeof router.handle === 'function')
    assert(typeof router.use === 'function')
  })

  it('should support .use of other routers', (t, done) => {
    const router = new Router()
    const another = new Router()

    another.get('/bar', (req, res) => {
      res.end()
    })
    router.use('/foo', another.handle.bind(another))

    router.handle({ url: '/foo/bar', method: 'GET' }, { end: done}, done)
  })

  it('should support dynamic routes', (t, done) => {
    const router = new Router()
    const another = new Router()

    another.get('/:bar', (req, res) => {
      assert.strictEqual(req.params.bar, 'route')
      res.end()
    })
    router.use('/:foo', another.handle.bind(another))

    router.handle({ url: '/test/route', method: 'GET' }, { end: done}, done)
  })

  it('should handle blank URL', (t, done) => {
    const router = new Router()

    router.use((req, res) => {
      throw new Error('should not be called')
    })

    router.handle({ url: '', method: 'GET' }, {}, done)
  })

  it('should handle missing URL',(t, done) => {
    const router = new Router()

    router.use((req, res) => {
      throw new Error('should not be called')
    })

    router.handle({ method: 'GET' }, {}, done)
  })

  it('should not stack overflow with many registered routes', (t, done) => {
    const handler = (req, res) => { res.end(new Error('wrong handler')) }
    const router = new Router()

    for (let i = 0; i < 6000; i++) {
      router.get('/thing' + i, handler)
    }

    router.get('/', (req, res) => {
      res.end()
    })

    router.handle({ url: '/', method: 'GET' }, { end: done}, done)
  })

  describe('.handle', () => {
    it('should dispatch', (t, done) => {
      const router = new Router()

      router.route('/foo').get((req, res) => {
        res.send('foo')
      })

      const res = {
        send: function(val) {
          assert.strictEqual(val, 'foo')
          done()
        }
      }
      router.handle({ url: '/foo', method: 'GET' }, res, done)
    })
  })

  describe('.multiple callbacks', () => {
    it('should throw if a callback is null', () => {
      assert.throws(() => {
        const router = new Router()
        router.route('/foo').all(null)
      })
    })

    it('should throw if a callback is undefined', () => {
      assert.throws(() => {
        const router = new Router()
        router.route('/foo').all(undefined)
      })
    })

    it('should throw if a callback is not a function', () => {
      assert.throws(() => {
        const router = new Router()
        router.route('/foo').all('not a function')
      })
    })

    it('should not throw if all callbacks are functions', () => {
      const router = new Router()
      router.route('/foo').all(() => {}).all(() => {})
    })
  })

  describe('error', () => {
    it('should skip non error middleware', (t, done) => {
      const router = new Router()

      router.get('/foo', (req, res, next) => {
        next(new Error('foo'))
      })

      router.get('/bar', (req, res, next) => {
        next(new Error('bar'))
      })

      router.use((req, res, next) => {
        assert(false)
      })

      router.use((err, req, res, next) => {
        assert.equal(err.message, 'foo')
        done()
      })

      router.handle({ url: '/foo', method: 'GET' }, {}, done)
    })

    it('should handle throwing inside routes with params', (t, done) =>  {
      const router = new Router()

      router.get('/foo/:id', () => {
        throw new Error('foo')
      })

      router.use((req, res, next) => {
        assert(false)
      })

      router.use((err, req, res, next) => {
        assert.equal(err.message, 'foo')
        done()
      })

      router.handle({ url: '/foo/2', method: 'GET' }, {}, () =>  {})
    })

    it('should handle throwing in handler after async param', (t, done) =>  {
      const router = new Router()

      router.param('user', function(req, res, next, val){
        process.nextTick(() => {
          req.user = val
          next()
        })
      })

      router.use('/:user', (req, res, next) => {
        throw new Error('oh no!')
      })

      router.use((err, req, res, next) => {
        assert.equal(err.message, 'oh no!')
        done()
      })

      router.handle({ url: '/bob', method: 'GET' }, {}, () =>  {})
    })

    it('should handle throwing inside error handlers', (t, done) =>  {
      const router = new Router()

      router.use((req, res, next) => {
        throw new Error('boom!')
      })

      router.use((err, req, res, next) => {
        throw new Error('oops')
      })

      router.use((err, req, res, next) => {
        assert.equal(err.message, 'oops')
        done()
      })

      router.handle({ url: '/', method: 'GET' }, {}, done)
    })
  })

  describe('FQDN', () => {
    it('should not obscure FQDNs',(t, done) => {
      const request = { hit: 0, url: 'http://example.com/foo', method: 'GET' }
      const router = new Router()

      router.use((req, res, next) => {
        assert.equal(req.hit++, 0)
        assert.equal(req.url, 'http://example.com/foo')
        next()
      })

      router.handle(request, {}, err => {
        if (err) return done(err)
        assert.equal(request.hit, 1)
        done()
      })
    })

    it('should ignore FQDN in search',(t, done) => {
      const request = { hit: 0, url: '/proxy?url=http://example.com/blog/post/1', method: 'GET' }
      const router = new Router()

      router.use('/proxy', (req, res, next) => {
        assert.equal(req.hit++, 0)
        assert.equal(req.url, '/?url=http://example.com/blog/post/1')
        next()
      })

      router.handle(request, {}, err => {
        if (err) return done(err)
        assert.equal(request.hit, 1)
        done()
      })
    })

    it('should ignore FQDN in path',(t, done) => {
      const request = { hit: 0, url: '/proxy/http://example.com/blog/post/1', method: 'GET' }
      const router = new Router()

      router.use('/proxy', (req, res, next) => {
        assert.equal(req.hit++, 0)
        assert.equal(req.url, '/http://example.com/blog/post/1')
        next()
      })

      router.handle(request, {}, err => {
        if (err) return done(err)
        assert.equal(request.hit, 1)
        done()
      })
    })

    it('should adjust FQDN req.url',(t, done) => {
      const request = { hit: 0, url: 'http://example.com/blog/post/1', method: 'GET' }
      const router = new Router()

      router.use('/blog', (req, res, next) => {
        assert.equal(req.hit++, 0)
        assert.equal(req.url, 'http://example.com/post/1')
        next()
      })

      router.handle(request, {}, err => {
        if (err) return done(err)
        assert.equal(request.hit, 1)
        done()
      })
    })

    it('should adjust FQDN req.url with multiple handlers',(t, done) => {
      const request = { hit: 0, url: 'http://example.com/blog/post/1', method: 'GET' }
      const router = new Router()

      router.use((req, res, next) => {
        assert.equal(req.hit++, 0)
        assert.equal(req.url, 'http://example.com/blog/post/1')
        next()
      })

      router.use('/blog', (req, res, next) => {
        assert.equal(req.hit++, 1)
        assert.equal(req.url, 'http://example.com/post/1')
        next()
      })

      router.handle(request, {}, err => {
        if (err) return done(err)
        assert.equal(request.hit, 2)
        done()
      })
    })

    it('should adjust FQDN req.url with multiple routed handlers',(t, done) => {
      const request = { hit: 0, url: 'http://example.com/blog/post/1', method: 'GET' }
      const router = new Router()

      router.use('/blog', (req, res, next) => {
        assert.equal(req.hit++, 0)
        assert.equal(req.url, 'http://example.com/post/1')
        next()
      })

      router.use('/blog', (req, res, next) => {
        assert.equal(req.hit++, 1)
        assert.equal(req.url, 'http://example.com/post/1')
        next()
      })

      router.use((req, res, next) => {
        assert.equal(req.hit++, 2)
        assert.equal(req.url, 'http://example.com/blog/post/1')
        next()
      })

      router.handle(request, {}, err => {
        if (err) return done(err)
        assert.equal(request.hit, 3)
        done()
      })
    })
  })

  describe('.all', () =>  {
    it('should support using .all to capture all http verbs', (t, done) => {
      const router = new Router()

      let count = 0
      router.all('/foo', () => { count++ })

      const url = '/foo?bar=baz'

      methods.forEach(function testMethod(method) {
        router.handle({ url: url, method: method }, {}, () =>  {})
      })

      assert.equal(count, methods.length)
      done()
    })
  })

  describe('.use', () => {
    it('should require middleware', () => {
      const router = new Router()
      assert.throws(() => { router.use('/') }, /argument handler is required/)
    })

    it('should reject string as middleware', () => {
      const router = new Router()
      assert.throws(() => { router.use('/', 'foo') }, /argument handler must be a function/)
    })

    it('should reject number as middleware', () => {
      const router = new Router()
      assert.throws(() => { router.use('/', 42) }, /argument handler must be a function/)
    })

    it('should reject null as middleware', () => {
      const router = new Router()
      assert.throws(() => { router.use('/', null) }, /argument handler must be a function/)
    })

    it('should reject Date as middleware', () => {
      const router = new Router()
      assert.throws(() => { router.use('/', new Date()) }, /argument handler must be a function/)
    })

    it('should be called for any URL', (t, done) => {
      const cb = after(4, done)
      const router = new Router()

      function no () {
        throw new Error('should not be called')
      }

      router.use((req, res) => {
        res.end()
      })

      router.handle({ url: '/', method: 'GET' }, { end: cb }, no)
      router.handle({ url: '/foo', method: 'GET' }, { end: cb }, no)
      router.handle({ url: 'foo', method: 'GET' }, { end: cb }, no)
      router.handle({ url: '*', method: 'GET' }, { end: cb }, no)
    })

    it('should accept array of middleware', (t, done) => {
      let count = 0
      const router = new Router()

      function fn1(req, res, next){
        assert.equal(++count, 1)
        next()
      }

      function fn2(req, res, next){
        assert.equal(++count, 2)
        next()
      }

      router.use([fn1, fn2], (req, res) => {
        assert.equal(++count, 3)
        done()
      })

      router.handle({ url: '/foo', method: 'GET' }, {}, () => {})
    })
  })

  describe('.param', () => {
    it('should require function', () => {
      const router = new Router()
      assert.throws(router.param.bind(router, 'id'), /argument fn is required/)
    })

    it('should reject non-function', () => {
      const router = new Router()
      assert.throws(router.param.bind(router, 'id', 42), /argument fn must be a function/)
    })

    it('should call param function when routing VERBS', (t, done) => {
      const router = new Router()

      router.param('id', (req, res, next, id) => {
        assert.equal(id, '123')
        next()
      })

      router.get('/foo/:id/bar', (req, res, next) => {
        assert.equal(req.params.id, '123')
        next()
      })

      router.handle({ url: '/foo/123/bar', method: 'get' }, {}, done)
    })

    it('should call param function when routing middleware', (t, done) => {
      const router = new Router()

      router.param('id', (req, res, next, id) => {
        assert.equal(id, '123')
        next()
      })

      router.use('/foo/:id/bar', (req, res, next) => {
        assert.equal(req.params.id, '123')
        assert.equal(req.url, '/baz')
        next()
      })

      router.handle({ url: '/foo/123/bar/baz', method: 'get' }, {}, done)
    })

    it('should only call once per request', (t, done) => {
      let count = 0
      const req = { url: '/foo/bob/bar', method: 'get' }
      const router = new Router()
      const sub = new Router()

      sub.get('/bar', (req, res, next) => {
        next()
      })

      router.param('user', (req, res, next, user) => {
        count++
        req.user = user
        next()
      })
      const r = new Router()
      router.use('/foo/:user/', r.handle.bind(r))
      router.use('/foo/:user/', sub.handle.bind(sub))

      router.handle(req, {}, err => {
        if (err) return done(err)
        assert.equal(count, 1)
        assert.equal(req.user, 'bob')
        done()
      })
    })

    it('should call when values differ', (t, done) => {
      let count = 0
      const req = { url: '/foo/bob/bar', method: 'get' }
      const router = new Router()
      const sub = new Router()

      sub.get('/bar', (req, res, next) => {
        next()
      })

      router.param('user', (req, res, next, user) => {
        count++
        req.user = user
        next()
      })
      const r = new Router()
      router.use('/foo/:user/', r.handle.bind(r))
      router.use('/:user/bob/', sub.handle.bind(sub))

      router.handle(req, {}, err => {
        if (err) return done(err)
        assert.equal(count, 2)
        assert.equal(req.user, 'foo')
        done()
      })
    })
  })

  describe('parallel requests', () => {
    it('should not mix requests', (t, done) => {
      const req1 = { url: '/foo/50/bar', method: 'get' }
      const req2 = { url: '/foo/10/bar', method: 'get' }
      const router = new Router()
      const sub = new Router()

      done = after(2, done)

      sub.get('/bar', (req, res, next) => {
        next()
      })

      router.param('ms', function(req, res, next, ms) {
        ms = parseInt(ms, 10)
        req.ms = ms
        setTimeout(next, ms)
      })
      const r = new Router()
      router.use('/foo/:ms/', r.handle.bind(r))
      router.use('/foo/:ms/', sub.handle.bind(sub))

      router.handle(req1, {}, function(err) {
        assert.ifError(err)
        assert.equal(req1.ms, 50)
        assert.equal(req1.originalUrl, '/foo/50/bar')
        done()
      })

      router.handle(req2, {}, function(err) {
        assert.ifError(err)
        assert.equal(req2.ms, 10)
        assert.equal(req2.originalUrl, '/foo/10/bar')
        done()
      })
    })
  })
})
