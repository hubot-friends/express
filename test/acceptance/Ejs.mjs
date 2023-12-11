
import { describe, it, after } from 'node:test'
import app from '../../examples/ejs/index.js'
import request from 'supertest'
  
describe('ejs', () => {
  after(() => {
    app.close()
  })
  describe('GET /', () => {
    it('should respond with html', (t, done) => {
      request(app)
      .get('/')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/<li>tobi &lt;tobi@learnboost\.com&gt;<\/li>/)
      .expect(/<li>loki &lt;loki@learnboost\.com&gt;<\/li>/)
      .expect(/<li>jane &lt;jane@learnboost\.com&gt;<\/li>/)
      .expect(200, done)
    })
  })
})
