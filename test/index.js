'use strict'

const Zlib = require('zlib')
const Lab = require('@hapi/lab')
const HapiLambda = require('..')
const Hapi = require('@hapi/hapi')
const { expect } = require('@hapi/code')

const { createServer } = require('../examples/hapi-serverless/server')
const ApiGatewayEvent = require('../examples/hapi-serverless/api-gateway-event.json')

const { describe, it, before } = (exports.lab = Lab.script())

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
  before(async () => {
    const server = await createServer(false)
    lambda = HapiLambda.for(server)
  })

  it('has .proxy() method', async () => {
    expect(lambda.proxy).to.exist()
  })

  it('GET rendered HTML', async () => {
    const event = makeEvent({ path: '/', httpMethod: 'GET' })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded } = response
    expect(statusCode).to.equal(200)
    expect(isBase64Encoded).to.be.false()
    expect(body).to.startWith('<!DOCTYPE html>')
    expect(body).to.include('<h1>Going Serverless with hapi!</h1>')
  })

  it('GET users as JSON', async () => {
    const event = makeEvent({ path: '/users', httpMethod: 'GET' })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded } = response
    expect(statusCode).to.equal(200)
    expect(isBase64Encoded).to.be.false()
    expect(body).to.equal(JSON.stringify([
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
    expect(statusCode).to.equal(200)
    expect(isBase64Encoded).to.be.false()
    expect(body).to.equal(JSON.stringify({ id: 3, name: 'Supercharge' }))
  })

  it('GET missing route', async () => {
    const event = makeEvent({ path: '/missing', httpMethod: 'GET' })
    const response = await lambda.proxy(event)

    const { statusCode, body, isBase64Encoded, multiValueHeaders } = response
    expect(statusCode).to.equal(404)
    expect(isBase64Encoded).to.be.false()
    expect(multiValueHeaders).to.include({
      'content-type': ['application/json; charset=utf-8'],
      'cache-control': ['no-cache'],
      'content-length': [60],
      connection: ['keep-alive']
    })
    expect(body).to.equal(JSON.stringify({ statusCode: 404, error: 'Not Found', message: 'Not Found' }))
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
    expect(statusCode).to.equal(200)
    expect(isBase64Encoded).to.be.true()
    expect(body).to.exist()
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
    expect(statusCode).to.equal(200)
    expect(isBase64Encoded).to.be.false()
    expect(body).to.equal(JSON.stringify({ name: 'Marcus' }))
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
    expect(statusCode).to.equal(200)
    expect(isBase64Encoded).to.be.false()
    expect(body).to.include('"x-api-key":"Marcus"')
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
    expect(statusCode).to.equal(200)
    expect(isBase64Encoded).to.be.false()
    expect(body).to.include('"x-api-keys":["Marcus","Marcus-Key2"]')
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
    expect(statusCode).to.equal(200)
    expect(isBase64Encoded).to.be.false()
    expect(body).to.equal('empty-type')
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
    expect(statusCode).to.equal(200)
    expect(isBase64Encoded).to.be.false()
    expect(body).to.equal('encoding-identity')
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
    expect(statusCode).to.equal(200)
    expect(isBase64Encoded).to.be.true()
    expect(multiValueHeaders).to.include({ 'content-encoding': ['gzip'] })
    expect(
      Zlib.gunzipSync(Buffer.from(body, 'base64')).toString('utf8')
    ).to.equal('encoding-gzip')
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
    expect(statusCode).to.equal(200)
    expect(isBase64Encoded).to.be.false()
    expect(body).to.equal('transfer-encoded')
    expect(multiValueHeaders).to.not.include('transfer-encoding')
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
    expect(statusCode).to.equal(200)
    expect(isBase64Encoded).to.be.false()
    expect(body).to.equal(JSON.stringify({ id: 3, name: 'Supercharge-base64' }))
  })
})
