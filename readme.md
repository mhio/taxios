# taxios

Testing made easier with axios.
If your app can inject a pino logger, mocha can dump more app context on errors.

```
const { App } = require('../lib/App')
const { Taxios } = require('taxios')

describe('test the app', function(){

  let request

  beforeEach(async function(){
    const logger = Taxios.logger()
    const app = await App.setup({ logger })
    request = await Taxios.app(app, logger)
  })

  afterEach(async function(){
    // Get some error context from your app, if it uses the logger
    request.handleMochaError(this)
    // Close down the server
    await request.cleanUp()
  })

  // Or both steps in one
  afterEach(async function(){
    await request.afterMocha(this)
  })

  it('should request from the app for great success', async function(){
    const res = request.send('get', '/whatever', {}, { headers: { type: 'yeet' } })
    expect( res.data ).to.containSubset({
      yote: true
    })
  })

})
```
