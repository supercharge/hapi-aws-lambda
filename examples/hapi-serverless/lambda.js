'use strict'

const HapiOnLambda = require('../../index')
const { createServer } = require('./server')

let handler

exports.handler = async (event) => {
  if (!handler) {
    const server = await createServer()
    handler = HapiOnLambda.for(server)
  }

  return handler.proxy(event)
}
