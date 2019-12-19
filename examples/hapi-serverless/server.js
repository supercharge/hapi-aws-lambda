'use strict'

const Path = require('path')
const Hapi = require('@hapi/hapi')
const Vision = require('@hapi/vision')

module.exports.createServer = async (start) => {
  const server = new Hapi.Server({
    port: process.env.PORT || 3000
  })

  /**
   * Views
   */
  await server.register({
    plugin: Vision
  })

  server.views({
    engines: {
      hbs: require('handlebars')
    },
    path: Path.resolve(__dirname, 'views')
  })

  /**
   * Routes
   */

  server.route([
    {
      method: 'GET',
      path: '/',
      options: {
        handler: (_, h) => {
          return h.view('index')
        }
      }
    },
    {
      method: 'GET',
      path: '/users',
      options: {
        handler: () => {
          const users = [
            { id: 1, name: 'Marcus' },
            { id: 2, name: 'Norman' },
            { id: 3, name: 'Christian' }
          ]

          return users
        }
      }
    }
  ])

  await server.initialize()

  /**
   * Go for gold!
   */
  if (start) {
    await server.start()
    console.log(`Server started at ${server.info.uri}`)
  }

  return server
}

if (!module.parent) {
  module.exports.createServer(true)

  process.on('unhandledRejection', (err) => {
    throw err
  })
}
