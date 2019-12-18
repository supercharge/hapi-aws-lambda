'use strict'

const Querystring = require('querystring')

class Request {
  constructor (event) {
    this.event = event
  }

  /**
   * Create a request instance for the given API Gateway `event`.
   *
   * @param {APIGatewayEvent} event
   *
   * @returns {Request}
   */
  static createFrom (event) {
    return new this(event).create()
  }

  /**
   * Returns a hapi-compatible request that
   * can be injected into a hapi server.
   *
   * @returns {Object}
   */
  create () {
    return {
      url: this.url(),
      method: this.method(),
      payload: this.payload(),
      headers: this.headers()
    }
  }

  /**
   * Returns the request’s URL with query parameters if
   * query params are present on the incoming request.
   *
   * @returns {String}
   */
  url () {
    return this.hasQuerystring()
      ? `${this.event.path}?${this.query()}`
      : this.event.path
  }

  /**
   * Determine whether the incoming request has query parameters.
   *
   * @returns {Boolean}
   */
  hasQuerystring () {
    return !!this.query()
  }

  /**
   * Returns the request’s stringified query parameters.
   *
   * @returns {String}
   */
  query () {
    return Querystring.stringify(
      this.event.multiValueQueryStringParameters
    )
  }

  /**
   * Returns the HTTP method.abs
   *
   * @returns {String}
   */
  method () {
    return this.event.httpMethod
  }

  /**
   * Returns the request payload.
   *
   * @returns {*}
   */
  payload () {
    return this.event.isBase64Encoded
      ? Buffer.from(this.event.body, 'base64')
      : this.event.body
  }

  /**
   * Returns the request headers.
   *
   * @returns {Object}
   */
  headers () {
    const headers = this.event.multiValueHeaders || {}

    return Object
      .entries(headers)
      .reduce((collect, [name, value]) => ({
        ...collect,
        [name]: (value.length === 1) ? value[0] : value
      }), {})
  }
}

module.exports = Request
