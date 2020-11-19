/* global expect */
const { Taxios, jsonClone } = require('../../')
const Koa = require('koa')
const http = require('http')

describe('test::int::Taxios', function(){

  it('should load', function(){ 
    expect(Taxios).to.be.ok
  })

  it('should jsonClone', function(){
    const obj = { one: ['test'], two: 2, }
    expect(jsonClone(obj)).to.eql(obj)
  })

  describe('test the app', function(){

    let request

    beforeEach(async function(){
      const app = new Koa()
      app.use(async ctx => {
        ctx.body = 'result in text'
      })
      request = await Taxios.app(app)
    })

    afterEach(async function(){
      request.handleMochaError(this)
      await request.cleanUp()
    })

    it('should request from the app for great success', async function(){
      const res = await request.send('options', '/whatever', {}, { headers: { type: 'yeet' } })
      expect( res.data ).to.equal('result in text')
    })

    it('should request from the app for great success', async function(){
      const res = await request.post('/whatever', { data: true})
      expect( res.data ).to.equal('result in text')
    })

    it('should request from the app for great success', async function(){
      const res = await request.get('/whatever', {}, { headers: { type: 'yeet' } })
      expect( res.data ).to.equal('result in text')
    })

    it('should request from a custom url', async function(){
      const port = request.srv.address().port
      const res = await request.get(`http://127.0.0.1:${port}/whatever`, {}, { headers: { type: 'yeet' } })
      expect( res.data ).to.equal('result in text')
      expect( res.config.url ).to.match(/^http:\/\/127\.0\.0\.1:/)
    })

  })

  describe('test a request that errors on the server side', function(){

    let request

    beforeEach(async function(){
      const app = new Koa()
      app.use(async ctx => {
        ctx.status = 500
        ctx.body = 'error will robinson!'
      })
      request = await Taxios.app(app)
    })

    afterEach(async function(){
      request.handleMochaError(this)
      await request.cleanUp()
    })

    it('should request from the app for great error', async function(){
      const res = await request.sendError('options', '/whatever', {}, { headers: { type: 'yeet' } })
      expect( res.data ).to.equal('error will robinson!')
      expect( res.status ).to.equal(500)
    })

  })

  describe('test injecting a already created server', function(){

    let server
    let logger

    beforeEach(function(done){
      logger = Taxios.logger()
      server = new http.createServer((req, res) => {
        res.writeHead(200, {'Content-Type':'text/plain'})
        res.end('hello')
        logger.info('test')
      })
      server.listen(done)
    })
    afterEach(function(done){
      server.close(done)
    })

    it('should request from the server for great success', async function(){
      const request = Taxios.server(server, null, logger)
      await request.send('get', '/whatever', {}, { headers: { type: 'yeet' } })
    })

  })
  describe('test the app with logger', function(){

    let request

    beforeEach(async function(){
      const logger = Taxios.logger()
      const app = new Koa()
      const throwError = async msg => { throw new Error(msg) }
      app.use(async () => throwError('waaah').catch(err => logger.error({ msg: 'got', err })))
      request = await Taxios.app(app, logger)
    })

    afterEach(async function(){
      await request.afterMocha(this)
    })

    it('should request from the app for great success', async function(){
      try {
        await request.send('get', '/whatever', {}, { headers: { type: 'yeet' } })
        expect.fail('no error was thrown')
      }
      catch (err) {
        const errs = request.logger.errors
        expect(errs).to.have.lengthOf(1)
        expect(errs[0][0]).to.equal('error')
        expect(errs[0][1].msg).to.equal('got')
        expect(errs[0][1].err).to.be.an('error')
        expect(errs[0][1].err.message).to.equal('waaah')
      }
    })

  })

})
