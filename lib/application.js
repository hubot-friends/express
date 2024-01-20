/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var finalhandler = require('finalhandler')
var Router = require('./router')
var methods = require('methods')
var debug = require('debug')('express:application')
var View = require('./view')
var http = require('http')
var compileETag = require('./utils').compileETag
var compileQueryParser = require('./utils').compileQueryParser
var compileTrust = require('./utils').compileTrust
var merge = require('utils-merge')
var resolve = require('path').resolve
const EventEmitter = require('node:events')
const ExpressResponse = require('./response')
const ExpressRequest = require('./request')

/**
 * Variable for trust proxy inheritance back-compat
 * @private
 */

const trustProxyDefaultSymbol = '@@symbol:trust_proxy_default'

/**
 * Try rendering a view.
 * @private
 */

function tryRender(view, options, callback) {
  try {
    view.render(options, callback)
  } catch (err) {
    callback(err)
  }
}


/**
 * Application prototype.
 */
class ExpressApp extends EventEmitter {
  #server = null
  constructor() {
    super()
    this.init()
    this.request = {}
    this.response = {}
    this.mounts = {}
    this.mountpath = '/'
  }
  /**
   * Initialize the server.
   *
   *   - setup default configuration
   *   - setup default middleware
   *   - setup route reflection methods
   *
   * @private
   */

  init() {
    var router = null

    this.cache = {}
    this.engines = {}
    this.settings = {}

    this.defaultConfiguration()

    // Setup getting to lazily add base router
    Object.defineProperty(this, 'router', {
      configurable: true,
      enumerable: true,
      get: function getrouter() {
        if (router === null) {
          router = new Router({
            caseSensitive: this.enabled('case sensitive routing'),
            strict: this.enabled('strict routing')
          })
        }

        return router
      }
    })
  }

  /**
   * Initialize application configuration.
   * @private
   */

  defaultConfiguration() {
    var env = process.env.NODE_ENV || 'development'

    // default settings
    this.enable('x-powered-by')
    this.set('etag', 'weak')
    this.set('env', env)
    this.set('query parser', 'simple')
    this.set('subdomain offset', 2)
    this.set('trust proxy', false)

    // trust proxy inherit back-compat
    Object.defineProperty(this.settings, trustProxyDefaultSymbol, {
      configurable: true,
      value: true
    })

    debug('booting in %s mode', env)

    this.on('mount', function onmount(parent) {
      // inherit trust proxy
      if (this.settings[trustProxyDefaultSymbol] === true
        && typeof parent.settings['trust proxy fn'] === 'function') {
        delete this.settings['trust proxy']
        delete this.settings['trust proxy fn']
      }
    })

    // setup locals
    this.locals = Object.create(null)

    // top-most app is mounted at /
    this.mountpath = '/'

    // default locals
    this.locals.settings = this.settings

    // default configuration
    this.set('view', View)
    this.set('views', resolve('views'))
    this.set('jsonp callback name', 'callback')

    if (env === 'production') {
      this.enable('view cache')
    }
  }

  /**
   * Dispatch a req, res pair into the application. Starts pipeline processing.
   *
   * If no callback is provided, then default error handlers will respond
   * in the event of an error bubbling through the stack.
   *
   * @private
   */

  handle(req, res, callback) {
    res.app = this
    req.app = this
    req.res = res

    // final handler
    var done = callback || finalhandler(req, res, {
      env: this.get('env'),
      onerror: this.logerror.bind(this)
    })

    // set powered by header
    if (this.enabled('x-powered-by')) {
      res.setHeader('X-Powered-By', 'Express')
    }

    // setup locals
    if (!res.locals) {
      res.locals = Object.create(null)
    }

    this.#mergeMethodsFromTargetToSource(this.request, req)
    this.#mergeMethodsFromTargetToSource(this.response, res)

    if(this.parent) {
      this.#mergeMethodsFromTargetToSource(this.parent.request, req)
      this.#mergeMethodsFromTargetToSource(this.parent.response, res)
    }

    if(this.parent && this.mountpath === req.originalUrl) {
      this.#mergeMethodsFromTargetToSource(this.request, req)
      this.#mergeMethodsFromTargetToSource(this.response, res)
    }
    this.router.handle(req, res, done)
  }
  #mergeMethodsFromTargetToSource(source, target) {
    Object.keys(source).forEach(key => target[key] = source[key].bind(target))
  }

  /**
   * Proxy `Router#use()` to add middleware to the app router.
   * See Router#use() documentation for details.
   *
   * If the _fn_ parameter is an express app, then it will be
   * mounted at the _route_ specified.
   *
   * @public
   */

  use(fn) {
    var offset = 0;
    var path = '/';

    // default path to '/'
    // disambiguate app.use([fn])
    if (typeof fn !== 'function' && !(fn instanceof ExpressApp)) {
      var arg = fn;

      while (Array.isArray(arg) && arg.length !== 0) {
        arg = arg[0];
      }

      // first arg is the path
      if (typeof arg !== 'function') {
        offset = 1;
        path = fn;
      }
    }

    var fns = Array.from(arguments).slice(offset).flat(Infinity);

    if (fns.length === 0) {
      throw new TypeError('app.use() requires a middleware function')
    }

    // get router
    var router = this.router
    fns.forEach(fn => {
      if (fn instanceof ExpressApp) {
        fn.mountpath = path
        fn.parent = fn === this ? null : this
        this.router.use(path, fn.handle.bind(fn))
        if(!this.mounts[path]) this.mounts[path] = new Set()
        this.mounts[path].add(fn)
        fn.emit('mount', this)
      } else {
        router.use(path, fn)
      }
    })
    return this
  }

  /**
   * Proxy to the app `Router#route()`
   * Returns a new `Route` instance for the _path_.
   *
   * Routes are isolated middleware stacks for specific paths.
   * See the Route api docs for details.
   *
   * @public
   */

  route(path) {
    return this.router.route(path)
  }

  /**
   * Register the given template engine callback `fn`
   * as `ext`.
   *
   * By default will `require()` the engine based on the
   * file extension. For example if you try to render
   * a "foo.ejs" file Express will invoke the following internally:
   *
   *     app.engine('ejs', require('ejs').__express)
   *
   * For engines that do not provide `.__express` out of the box,
   * or if you wish to "map" a different extension to the template engine
   * you may use this method. For example mapping the EJS template engine to
   * ".html" files:
   *
   *     app.engine('html', require('ejs').renderFile)
   *
   * In this case EJS provides a `.renderFile()` method with
   * the same signature that Express expects: `(path, options, callback)`,
   * though note that it aliases this method as `ejs.__express` internally
   * so if you're using ".ejs" extensions you don't need to do anything.
   *
   * Some template engines do not follow this convention, the
   * [Consolidate.js](https://github.com/tj/consolidate.js)
   * library was created to map all of node's popular template
   * engines to follow this convention, thus allowing them to
   * work seamlessly within Express.
   *
   * @param {String} ext
   * @param {Function} fn
   * @return {app} for chaining
   * @public
   */

  engine(ext, fn) {
    if (typeof fn !== 'function') {
      throw new Error('callback function required')
    }

    // get file extension
    var extension = ext[0] !== '.'
      ? '.' + ext
      : ext

    // store engine
    this.engines[extension] = fn

    return this
  }

  /**
   * Proxy to `Router#param()` with one added api feature. The _name_ parameter
   * can be an array of names.
   *
   * See the Router#param() docs for more details.
   *
   * @param {String|Array} name
   * @param {Function} fn
   * @return {app} for chaining
   * @public
   */

  param(name, fn) {
    if (Array.isArray(name)) {
      for (var i = 0; i < name.length; i++) {
        this.param(name[i], fn)
      }
      return this
    }
    this.router.param(name, fn)
    return this
  }

  /**
   * Assign `setting` to `val`, or return `setting`'s value.
   *
   *    app.set('foo', 'bar')
   *    app.set('foo')
   *    // => "bar"
   *
   * Mounted servers inherit their parent server's settings.
   *
   * @param {String} setting
   * @param {*} [val]
   * @return {Server} for chaining
   * @public
   */

  set(setting, val) {
    // Sat, Jan 6, 2024 - from jguerra
    // Sometimes, multiple apps may share settings, but inherit settings
    // I don't know the exact scenario yet, but this is a workaround for now
    const app = this.parent ? (!setting.includes('trust proxy') || !this.settings[setting] ? this.parent : this) : this
    if (arguments.length === 1) {
      if (this.settings[setting]) {
        return this.settings[setting]
      } else if (this.parent) {
        return this.parent.settings[setting]
      } else {
        return this.settings[setting]
      }
    }

    debug('set "%s" to %o', setting, val)

    // set value
    app.settings[setting] = val

    // trigger matched settings
    switch (setting) {
      case 'etag':
        app.set('etag fn', compileETag(val))
        break
      case 'query parser':
        app.set('query parser fn', compileQueryParser(val))
        break
      case 'trust proxy':
        // child should not use parent's trust proxy setting
        this.set('trust proxy fn', compileTrust(val))

        // trust proxy inherit back-compat
        Object.defineProperty(this.settings, trustProxyDefaultSymbol, {
          configurable: true,
          value: false
        })
        break
    }
    return this
  }

  /**
   * Return the app's absolute pathname
   * based on the parent(s) that have
   * mounted it.
   *
   * For example if the application was
   * mounted as "/admin", which itself
   * was mounted as "/blog" then the
   * return value would be "/blog/admin".
   *
   * @return {String}
   * @private
   */

  path() {
    return this.parent
      ? this.parent.path() + this.mountpath
      : ''
  }

  /**
   * Check if `setting` is enabled (truthy).
   *
   *    app.enabled('foo')
   *    // => false
   *
   *    app.enable('foo')
   *    app.enabled('foo')
   *    // => true
   *
   * @param {String} setting
   * @return {Boolean}
   * @public
   */

  enabled(setting) {
    return Boolean(this.set(setting))
  }

  /**
   * Check if `setting` is disabled.
   *
   *    app.disabled('foo')
   *    // => true
   *
   *    app.enable('foo')
   *    app.disabled('foo')
   *    // => false
   *
   * @param {String} setting
   * @return {Boolean}
   * @public
   */

  disabled(setting) {
    return !this.set(setting)
  }

  /**
   * Enable `setting`.
   *
   * @param {String} setting
   * @return {app} for chaining
   * @public
   */

  enable(setting) {
    return this.set(setting, true)
  }

  /**
   * Disable `setting`.
   *
   * @param {String} setting
   * @return {app} for chaining
   * @public
   */

  disable(setting) {
    return this.set(setting, false)
  }

  // Explicitly defining http method registration to make code more transparent; less opaque.
  get(...args) {
    if (args.length === 1) {
      return this.set(args.shift())
    }

    var route = this.route(args.shift())
    route.get(...args)
    return this
  }
  post(...args) {
    var route = this.route(args.shift())
    route.post(...args)
    return this
  }
  put(...args) {
    var route = this.route(args.shift())
    route.put(...args)
    return this
  }
  delete(...args) {
    var route = this.route(args.shift())
    route.delete(...args)
    return this
  }
  patch(...args) {
    var route = this.route(args.shift())
    route.patch(...args)
    return this
  }
  head(...args) {
    var route = this.route(args.shift())
    route.head(...args)
    return this
  }
  options(...args) {
    var route = this.route(args.shift())
    route.options(...args)
    return this
  }

  /**
   * Special-cased "all" method, applying the given route `path`,
   * middleware, and callback to _every_ HTTP method.
   *
   * @param {String} path
   * @param {Function} ...
   * @return {app} for chaining
   * @public
   */
  all(...args) {
    var route = this.route(args.shift())
    for (var i = 0; i < methods.length; i++) {
      route[methods[i]].apply(route, args)
    }
    return this
  }
  delete(...args) {
    var route = this.route(args.shift())
    route.delete(...args)
    return this
  }
  checkout(...args) {
    var route = this.route(args.shift())
    route.checkout(...args)
    return this
  }
  copy(...args) {
    var route = this.route(args.shift())
    route.copy(...args)
    return this
  }
  lock(...args) {
    var route = this.route(args.shift())
    route.lock(...args)
    return this
  }
  merge(...args) {
    var route = this.route(args.shift())
    route.merge(...args)
    return this
  }
  mkactivity(...args) {
    var route = this.route(args.shift())
    route.mkactivity(...args)
    return this
  }
  mkcol(...args) {
    var route = this.route(args.shift())
    route.mkcol(...args)
    return this
  }
  move(...args) {
    var route = this.route(args.shift())
    route.move(...args)
    return this
  }
  'm-search'(...args) {
    var route = this.route(args.shift())
    route.m-search(...args)
    return this
  }
  notify(...args) {
    var route = this.route(args.shift())
    route.notify(...args)
    return this
  }
  propfind(...args) {
    var route = this.route(args.shift())
    route.propfind(...args)
    return this
  }
  proppatch(...args) {
    var route = this.route(args.shift())
    route.proppatch(...args)
    return this
  }
  purge(...args) {
    var route = this.route(args.shift())
    route.purge(...args)
    return this
  }
  report(...args) {
    var route = this.route(args.shift())
    route.report(...args)
    return this
  }
  search(...args) {
    var route = this.route(args.shift())
    route.search(...args)
    return this
  }
  subscribe(...args) {
    var route = this.route(args.shift())
    route.subscribe(...args)
    return this
  }
  trace(...args) {
    var route = this.route(args.shift())
    route.trace(...args)
    return this
  }
  unlock(...args) {
    var route = this.route(args.shift())
    route.unlock(...args)
    return this
  }
  unsubscribe(...args) {
    var route = this.route(args.shift())
    route.unsubscribe(...args)
    return this
  }
  acl(...args) {
    var route = this.route(args.shift())
    route.acl(...args)
    return this
  }
  link(...args) {
    var route = this.route(args.shift())
    route.link(...args)
    return this
  }
  unlink(...args) {
    var route = this.route(args.shift())
    route.unlink(...args)
    return this
  }
  source(...args) {
    var route = this.route(args.shift())
    route.source(...args)
    return this
  }
  rebind(...args) {
    var route = this.route(args.shift())
    route.rebind(...args)
    return this
  }
  mkcalendar(...args) {
    var route = this.route(args.shift())
    route.mkcalendar(...args)
    return this
  }
  'm-search'(...args) {
    var route = this.route(args.shift())
    route['m-search'](...args)
    return this
  }
  bind(...args) {
    var route = this.route(args.shift())
    route.bind(...args)
    return this
  }
  unbind(...args) {
    var route = this.route(args.shift())
    route.unbind(...args)
    return this
  }

  /**
   * Render the given view `name` name with `options`
   * and a callback accepting an error and the
   * rendered template string.
   *
   * Example:
   *
   *    app.render('email', { name: 'Tobi' }, function(err, html){
   *      // ...
   *    })
   *
   * @param {String} name
   * @param {Object|Function} options or fn
   * @param {Function} callback
   * @public
   */

  render(name, options, callback) {
    var cache = this.cache
    var done = callback
    var engines = this.engines
    var opts = options
    var renderOptions = {}
    var view

    // support callback function as second arg
    if (typeof options === 'function') {
      done = options
      opts = {}
    }

    // merge app.locals
    merge(renderOptions, this.locals)

    // merge options._locals
    if (opts._locals) {
      merge(renderOptions, opts._locals)
    }

    // merge options
    merge(renderOptions, opts)

    // set .cache unless explicitly provided
    if (renderOptions.cache == null) {
      renderOptions.cache = this.enabled('view cache')
    }

    // primed cache
    if (renderOptions.cache) {
      view = cache[name]
    }

    // view
    if (!view) {
      var View = this.get('view')

      view = new View(name, {
        defaultEngine: this.get('view engine'),
        root: this.get('views'),
        engines: engines
      })

      if (!view.path) {
        var dirs = Array.isArray(view.root) && view.root.length > 1
          ? 'directories "' + view.root.slice(0, -1).join('", "') + '" or "' + view.root[view.root.length - 1] + '"'
          : 'directory "' + view.root + '"'
        var err = new Error('Failed to lookup view "' + name + '" in views ' + dirs)
        err.view = view
        return done(err)
      }

      // prime the cache
      if (renderOptions.cache) {
        cache[name] = view
      }
    }

    // render
    tryRender(view, renderOptions, done)
  }

  /**
   * Listen for connections.
   *
   * A node `http.Server` is returned. This
   * application is no longer a `Function` so the registered
   * callback is the `handle` method, `bound` to `this`.
   * If you wish to create both an HTTP
   * and HTTPS server you may do so with the "http"
   * and "https" modules as shown here:
   *
   *    var http = require('http')
   *      , https = require('https')
   *      , express = require('express')
   *      , app = express()
   *
   *    http.createServer({ IncomingMessage: ExpressRequest, ServerResponse: ExpressResponse }, this.handle.bind(this)).listen(80)
   *    https.createServer({ IncomingMessage: ExpressRequest, ServerResponse: ExpressResponse }, this.handle.bind(this)).listen(443)
   *
   * If you want to create an http2 server, currently, you would have to create custom classes that extend the http2.IncomingMessage and http2.ServerResponse classes. Then you would pass those classes into
   * and implement the Decorator pattern, composing instances of ExpressRequest and ExpressResponse, and passing those into the http2.createSecureServer as options. See the http2 documentation for more information.
   * @return {http.Server}
   * @public
   */

  listen(...args) {
    this.#server = http.createServer({ IncomingMessage: ExpressRequest, ServerResponse: ExpressResponse }, this.handle.bind(this))
    return this.#server.listen(...args)
  }
  address () {
    return this.#server?.address() ?? null
  }

  /**
   * Log error using console.error.
   *
   * @param {Error} err
   * @private
   */

  logerror(err) {
    /* istanbul ignore next */
    if (this.get('env') !== 'test') console.error(err.stack || err.toString())
  }
}
module.exports = ExpressApp
