'use strict'

const Lab = require('@hapi/lab')
const HapiLambda = require('..')
const Hapi = require('@hapi/hapi')
const { expect } = require('@hapi/code')

const { describe, it } = (exports.lab = Lab.script())

describe('hapi on AWS Lambda', () => {
  it('tbd', async () => {
    const server = new Hapi.Server()
    const handler = HapiLambda.for(server)

    expect(handler.handle).to.exist()
  })
})
