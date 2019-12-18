'use strict'

const Request = require('./request')
const ApiGatewayResponse = require('./response')

class HapiOnAwsLambda {
  constructor (server) {
    this.server = server
  }

  /**
   * Create a new instance wrapping the hapi `server`.
   *
   * @param {Server} server
   *
   * @returns {HapiOnAwsLambda}
   */
  static for (server) {
    return new this({ server })
  }

  /**
   * Transforms an incoming API Gateway event into a hapi request. The request
   * will be injected into the wrapped server and the resulting response
   * transformed into an API-Gateway-compatible format.
   *
   * @param {APIGatewayEvent} event - the API Gateway event
   *
   * @returns {APIGatewayProxyResult}
   */
  async handle (event) {
    const response = await this.sendThroughServer(event)

    return ApiGatewayResponse.from(response)
  }

  /**
   * Create a request using the event’s input and inject
   * it into the hapi server. Returns the hapi response.
   *
   * @param {APIGatewayEvent} event
   *
   * @returns {Response}
   */
  async sendThroughServer (event) {
    return this.server.inject(
      Request.createFrom(event)
    )
  }
}

module.exports = HapiOnAwsLambda
