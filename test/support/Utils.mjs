import assert from 'node:assert'

export default {
  shouldHaveBody,
  shouldHaveHeader,
  shouldNotHaveBody,
  shouldNotHaveHeader
}

/**
 * Assert that a supertest response has a specific body.
 *
 * @param {Buffer} buf
 * @returns {function}
 */

function shouldHaveBody (buf) {
  return res => {
    const body = !Buffer.isBuffer(res.body)
      ? Buffer.from(res.text)
      : res.body
    assert.ok(body, 'response has body')
    assert.strictEqual(body.toString('hex'), buf.toString('hex'))
  }
}

/**
 * Assert that a supertest response does have a header.
 *
 * @param {string} header Header name to check
 * @returns {function}
 */

function shouldHaveHeader (header) {
  return res => {
    assert.ok((header.toLowerCase() in res.headers), 'should have header ' + header)
  }
}

/**
 * Assert that a supertest response does not have a body.
 *
 * @returns {function}
 */

function shouldNotHaveBody () {
  return res => {
    assert.ok(res.text === '' || res.text === undefined)
  }
}

/**
 * Assert that a supertest response does not have a header.
 *
 * @param {string} header Header name to check
 * @returns {function}
 */
function shouldNotHaveHeader(header) {
  return res => {
    assert.ok(!(header.toLowerCase() in res.headers), 'should not have header ' + header)
  }
}
