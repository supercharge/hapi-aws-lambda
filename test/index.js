'use strict'

const Zlib = require('zlib')
const HapiLambda = require('..')
const Hapi = require('@hapi/hapi')

const { createServer } = require('../examples/hapi-serverless/server')
const ApiGatewayEvent = require('../examples/hapi-serverless/api-gateway-event.json')

let lambda

function clone (json) {
  return JSON.parse(JSON.stringify(json))
}

function makeEvent (overrides) {
  const { event: baseEvent } = clone(ApiGatewayEvent)
  const event = Object.assign({}, baseEvent, overrides)
  event.headers = Object.assign({}, baseEvent.headers, overrides.headers)

  return event
}

describe('hapi on AWS Lambda', () => {
  beforeAll(async () => {
    const server = await createServer(false)
    lambda = HapiLambda.for(server)
  })

  it('has .proxy() method', async () => {
    expect(lambda.proxy).toBeDefined()
  })

  it('GET rendered HTML', async () => {
    const event = makeEvent({ path: '/', httpMethod: 'GET' })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded } = response
    expect(statusCode).toEqual(200)
    expect(isBase64Encoded).toBe(false)
    expect(body).toStartWith('<!DOCTYPE html>')
    expect(body).toInclude('<h1>Going Serverless with hapi!</h1>')
  })

  it('GET users as JSON', async () => {
    const event = makeEvent({ path: '/users', httpMethod: 'GET' })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded } = response
    expect(statusCode).toEqual(200)
    expect(isBase64Encoded).toBe(false)
    expect(body).toEqual(JSON.stringify([
      { id: 1, name: 'Marcus' },
      { id: 2, name: 'Norman' },
      { id: 3, name: 'Christian' }
    ]))
  })

  it('POST JSON user', async () => {
    const event = makeEvent({
      path: '/users/3',
      httpMethod: 'PUT',
      body: { name: 'Supercharge' }
    })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded } = response
    expect(statusCode).toEqual(200)
    expect(isBase64Encoded).toBe(false)
    expect(body).toEqual(JSON.stringify({ id: 3, name: 'Supercharge' }))
  })

  it('GET missing route', async () => {
    const event = makeEvent({ path: '/missing', httpMethod: 'GET' })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded, multiValueHeaders } = response
    expect(statusCode).toEqual(404)
    expect(isBase64Encoded).toBe(false)
    expect(multiValueHeaders).toMatchObject({
      'content-type': ['application/json; charset=utf-8'],
      'cache-control': ['no-cache'],
      'content-length': [60],
      connection: ['keep-alive']
    })
    expect(body).toEqual(JSON.stringify({ statusCode: 404, error: 'Not Found', message: 'Not Found' }))
  })

  it('serves images', async () => {
    const event = makeEvent({
      path: '/images/supercharge-logo.svg',
      httpMethod: 'GET',
      multiValueQueryStringParameters: {
        name: 'Marcus'
      }
    })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded } = response
    expect(statusCode).toEqual(200)
    expect(isBase64Encoded).toBe(true)
    expect(body).toBeDefined()
  })

  it('handles querystrings', async () => {
    const event = makeEvent({
      path: '/query',
      httpMethod: 'GET',
      multiValueQueryStringParameters: {
        name: 'Marcus'
      }
    })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded } = response
    expect(statusCode).toEqual(200)
    expect(isBase64Encoded).toBe(false)
    expect(body).toEqual(JSON.stringify({ name: 'Marcus' }))
  })

  it('handles headers', async () => {
    const event = makeEvent({
      path: '/headers',
      httpMethod: 'GET',
      headers: {
        'X-API-Key': 'Marcus'
      }
    })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded } = response
    expect(statusCode).toEqual(200)
    expect(isBase64Encoded).toBe(false)
    expect(body).toInclude('"x-api-key":"Marcus"')
  })

  it('handles headers with multiple values', async () => {
    const event = makeEvent({
      path: '/headers',
      httpMethod: 'GET',
      headers: {
        'X-API-Keys': ['Marcus', 'Marcus-Key2']
      }
    })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded } = response
    expect(statusCode).toEqual(200)
    expect(isBase64Encoded).toBe(false)
    expect(body).toInclude('"x-api-keys":["Marcus","Marcus-Key2"]')
  })

  it('empty type', async () => {
    const server = new Hapi.Server()
    server.route({
      method: 'GET',
      path: '/',
      handler: (_, h) => {
        const response = h.response('empty-type').type('')
        response._contentType = null

        return response
      }
    })
    const lambda = HapiLambda.for(server)

    const event = makeEvent({
      path: '/',
      httpMethod: 'GET'
    })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded } = response
    expect(statusCode).toEqual(200)
    expect(isBase64Encoded).toBe(false)
    expect(body).toEqual('empty-type')
  })

  it('content encoding', async () => {
    const server = new Hapi.Server()

    server.route({
      method: 'GET',
      path: '/',
      handler: (_, h) => {
        return h
          .response('encoding-identity')
          .header('content-encoding', 'identity')
      }
    })

    const lambda = HapiLambda.for(server)

    const event = makeEvent({
      path: '/',
      httpMethod: 'GET'
    })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded } = response
    expect(statusCode).toEqual(200)
    expect(isBase64Encoded).toBe(false)
    expect(body).toEqual('encoding-identity')
  })

  it('content encoding gzip', async () => {
    const server = new Hapi.Server()

    server.route({
      method: 'GET',
      path: '/',
      handler: (_, h) => {
        return h
          .response(Zlib.gzipSync('encoding-gzip'))
          .header('content-encoding', 'gzip')
      }
    })

    const lambda = HapiLambda.for(server)

    const event = makeEvent({
      path: '/',
      httpMethod: 'GET'
    })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded, multiValueHeaders } = response
    expect(statusCode).toEqual(200)
    expect(isBase64Encoded).toBe(true)
    expect(multiValueHeaders).toMatchObject({ 'content-encoding': ['gzip'] })
    expect(
      Zlib.gunzipSync(Buffer.from(body, 'base64')).toString('utf8')
    ).toEqual('encoding-gzip')
  })

  it('removes transfer-encoding header', async () => {
    const server = new Hapi.Server()
    server.route({
      method: 'GET',
      path: '/',
      handler: (_, h) => {
        return h
          .response('transfer-encoded')
          .header('transfer-encoding', 'chunked')
      }
    })
    const lambda = HapiLambda.for(server)

    const event = makeEvent({
      path: '/',
      httpMethod: 'GET'
    })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded, multiValueHeaders } = response
    expect(statusCode).toEqual(200)
    expect(isBase64Encoded).toBe(false)
    expect(body).toEqual('transfer-encoded')
    expect(
      Object.keys(multiValueHeaders)
    ).not.toInclude('transfer-encoding')
  })

  it('base64 encoded request', async () => {
    const event = makeEvent({
      path: '/users/3',
      httpMethod: 'PUT',
      body: Buffer.from('{"name": "Supercharge-base64"}').toString('base64'),
      isBase64Encoded: true
    })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded } = response
    expect(statusCode).toEqual(200)
    expect(isBase64Encoded).toBe(false)
    expect(body).toEqual(JSON.stringify({ id: 3, name: 'Supercharge-base64' }))
  })
})
