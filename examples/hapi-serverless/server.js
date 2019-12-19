'use strict'

const Path = require('path')
const Hapi = require('@hapi/hapi')

const users = [
  { id: 1, name: 'Marcus' },
  { id: 2, name: 'Norman' },
  { id: 3, name: 'Christian' }
]

module.exports.createServer = async (start) => {
  const server = new Hapi.Server({
    port: 3000
  })

  /**
   * Views and static assets
   */
  await server.register([
    {
      plugin: require('@hapi/inert')
    },
    {
      plugin: require('@hapi/vision')
    }
  ])

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
      path: '/query',
      options: {
        handler: request => {
          return request.query
        }
      }
    },
    {
      method: 'GET',
      path: '/headers',
      options: {
        handler: request => {
          return request.headers
        }
      }
    },
    {
      method: 'GET',
      path: '/users',
      options: {
        handler: () => {
          return users
        }
      }
    },
    {
      method: 'POST',
      path: '/users',
      options: {
        handler: (request) => {
          users.push({
            id: users.length + 1,
            name: request.payload.name
          })

          return users
        }
      }
    },
    {
      method: 'PUT',
      path: '/users/{id}',
      options: {
        handler: (request, h) => {
          const user = users.find(user => user.id === parseInt(request.params.id))

          if (!user) {
            return h.response().code(404)
          }

          user.name = request.payload.name

          return user
        }
      }
    },
    {
      method: 'GET',
      path: '/images/{path*}',
      options: {
        handler: {
          directory: { path: Path.resolve(__dirname, 'images') }
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
