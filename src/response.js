'use strict'

class ApiGatewayResponse {
  constructor (response) {
    this.response = response
  }

  /**
   * Create an API-Gateway-compatible response using the
   * given `response` from the hapi server.
   *
   * @param {Object} response
   *
   * @returns {APIGatewayProxyResult}
   */

  static from (response) {
    return new this(response).create()
  }

  /**
   * Returns the response object.
   *
   * @returns {Object}
   */
  create () {
    return {
      body: this.payload(),
      statusCode: this.statusCode(),
      multiValueHeaders: this.headers(),
      isBase64Encoded: this.isBase64Encoded()
    }
  }

  /**
   * Returns the response status code.
   *
   * @returns {Number}
   */
  statusCode () {
    return this.response.statusCode
  }

  /**
   * Determine whether the response is base64-encoded.
   *
   * @returns {Boolean}
   */
  isBase64Encoded () {
    const { 'content-type': type, 'content-encoding': encoding } = this.response.headers

    return Boolean(type && !type.match(/; *charset=/)) || Boolean(encoding && encoding !== 'identity')
  }

  /**
   * Returns the response headers.
   *
   * @returns {Object}
   */
  headers () {
    const headers = this.response.headers

    // chunked transfer not currently supported by API Gateway
    if (headers['transfer-encoding'] === 'chunked') {
      delete headers['transfer-encoding']
    }

    return Object
      .entries(headers)
      .reduce((collect, [name, value]) => ({
        ...collect,
        [name]: [].concat(value)
      }), {})
  }

  /**
   * Returns the response payload.
   *
   * @returns {*}
   */
  payload () {
    return this
      .rawPayload()
      .toString(this.isBase64Encoded() ? 'base64' : 'utf8')
  }

  /**
   * Returns the raw hapi response payload.
   *
   * @returns {Buffer}
   */
  rawPayload () {
    return this.response.rawPayload
  }
}

module.exports = ApiGatewayResponse
