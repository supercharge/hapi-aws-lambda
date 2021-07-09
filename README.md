<div align="center">
  <a href="https://superchargejs.com">
    <img width="471" style="max-width:100%;" src="https://superchargejs.com/images/supercharge-text.svg" />
  </a>
  <br/>
  <br/>
  <p>
    <h3>hapi on AWS Lambda</h3>
  </p>
  <p>
    Run your hapi server on AWS Lambda.
  </p>
  <br/>
  <p>
    <a href="#installation"><strong>Installation</strong></a> ·
    <a href="#usage"><strong>Usage</strong></a>
  </p>
  <br/>
  <br/>
  <p>
    <a href="https://www.npmjs.com/package/@supercharge/hapi-aws-lambda"><img src="https://img.shields.io/npm/v/@supercharge/hapi-aws-lambda.svg" alt="Latest Version"></a>
    <a href="https://www.npmjs.com/package/@supercharge/hapi-aws-lambda"><img src="https://img.shields.io/npm/dm/@supercharge/hapi-aws-lambda.svg" alt="Monthly downloads"></a>
  </p>
  <p>
    <em>Follow <a href="http://twitter.com/marcuspoehls">@marcuspoehls</a> and <a href="http://twitter.com/superchargejs">@superchargejs</a> for updates!</em>
  </p>
</div>

---

## Introduction
Serverless is becoming popular and widely accepted in the developer community. Going serverless requires a mindset shift. Going serverless requires you to think stateless.

This `@supercharge/hapi-aws-lambda` package let’s you use your [hapi.js](https://hapi.dev) HTTP server on AWS Lambda.

This package wraps your hapi server and transforms an incoming API Gateway event into an HTTP request. The request will be injected into your hapi server and the resulting response transformed *back* into an API-Gateway-compatible format.

It’s basically a “done for you” package to run your hapi server in a serverless function AWS Lambda.


## Requirements
> **hapi v19 (or later)** and **Node.js v12 (or newer)**

This plugin requires **hapi v19** (or later) and **Node.js v12 or newer**.


### Compatibility
| Major Release | [hapi.js](https://github.com/hapijs/hapi) version | Node.js version |
| --- | --- | --- |
| `v2` | `>=19 @hapi/hapi` | `>=12` |
| `v1` | `>=18 hapi` | `>=8` |


## Installation

```
npm i @supercharge/hapi-aws-lambda
```


## Usage
Using `@supercharge/hapi-aws-lambda` is a two-step process:

1. [Implement the function’s entrypoint](#the-lambda-function)
2. [Configure Binary Media Types for your API Gateway](#configure-binary-media-types)


### The Lambda Function
Using `@supercharge/hapi-aws-lambda` is pretty straightforward:

```js
'use strict'

const Hapi = require('@hapi/hapi')
const LambdaHandler = require('@supercharge/hapi-aws-lambda')

// this `handler` will be used as a cached instance
// a warm Lambda function will reuse the handler for incoming events
let handler

module.exports.handler = async event => {
  if (!handler) {
     // First, compose your hapi server with all the plugins and dependencies
    server = new Hapi.Server()

    await server.register({
      plugin: require('@hapi/vision')
    })

    // Second, create a handler instance for your server which will
    // transform the Lambda/API Gateway event to a request, send
    // the request through your hapi server and then create
    // an API Gateay compatible response
    handler = LambdaHandler.for(server)
  }

  return handler.proxy(event)
}
```


### Configure Binary Media Types
Serving images from an HTTP server running in a Lambda function won’t work out of the box. When neccessary, `@supercharge/hapi-aws-lambda` Base64-encodes the response data so that AWS API Gateway can handle the response body.

You need to explicitely configure binary media types in your the API Gateway that is responsible for your Lambda function. Here’s a screenshot of the `*/*` configuration we use:

![AWS API Gateway: Binary Media Types configuration](https://github.com/superchargejs/hapi-aws-lambda/blob/master/media/hapi-aws-api-gateway-binary-media-types.png?raw=1)


## Deployment Example
There’s a deployment example in the [superchargejs/playground-aws-lambda](https://github.com/superchargejs/playground-aws-lambda) repository.

We used the [Serverless](https://serverless.com/cli/) framework to deploy the Supercharge app in the `playground-aws-lambda` repository. The Serverless CLI is sweet. Here’s the sample `serverless.yml` used to deploy the app:

```yaml
service: supercharge-aws-lambda

provider:
  name: aws
  runtime: nodejs12.x
  region: eu-central-1

functions:
  app:
    handler: server.handler
    memorySize: 384 # default is 1024 MB
    events:
      - http: ANY /
      - http: 'ANY {proxy+}'

plugins:
  - serverless-offline
```


## Contributing
Do you miss a string function? We very much appreciate your contribution! Please send in a pull request 😊

1.  Create a fork
2.  Create your feature branch: `git checkout -b my-feature`
3.  Commit your changes: `git commit -am 'Add some feature'`
4.  Push to the branch: `git push origin my-new-feature`
5.  Submit a pull request 🚀


## License
MIT © [Supercharge](https://superchargejs.com)

---

> [superchargejs.com](https://superchargejs.com) &nbsp;&middot;&nbsp;
> GitHub [@supercharge](https://github.com/supercharge) &nbsp;&middot;&nbsp;
> Twitter [@superchargejs](https://twitter.com/superchargejs)
