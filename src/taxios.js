//const fs = require('fs')
//const path = require('path')
const axios = require('axios')
const http = require('http')
// const http2 = require('http2')
const debug = require('debug')('taxios')

function jsonClone(o) {
  return JSON.parse(JSON.stringify(o))
}

class Taxios {
  
  static _initialiseClass(){
    //this.tls_self_key = fs.readFileSync(path.join(__dirname,'fixture','server-key.pem'))
    //this.tls_self_cert = fs.readFileSync(path.join(__dirname,'fixture','server-cert.pem'))
  }

  /**
   * Helper to create an instance and async listen it
   */
  static async app (app, logger) {
    if (!app) {
      throw new Error('Taxios.app requires and app argument')
    }
    const taxios = new this({ app: app, logger:logger })
    await taxios.listen()
    return taxios
  }

  /**
   * Inject your own server
   */
  static server(http_server, app, logger){
    const taxios = new this({app, logger})
    taxios.server(http_server)
    return taxios
  }

  /**
   * Inject your own http2 server
   */ 
  //static srv2(http2_server, app){
  //  const ret = this.app(app)
  //  ret.srv2(http2_server)
  //  return ret
  //}

  static logger(){
    return new TestPinoLogger()
  }

  constructor({ app, logger }){
    this.app = app
    this.logger = logger || Taxios.logger()
    this.last_response = null
  }
  /**
   * Setup a http server to listen for the app
   * @param {string|number} address   - Node http server listen address 
   * @returns {Promise<http.Server>}
   */
  async listen(address){
    return new Promise((ok, reject) => {
      if (this.srv && this.srv.address && this.srv.address()){
        reject(new Error('Server already lishening'))
      }
      if (!this.srv) {
        if (this.app.callback){
          this.srv = http.createServer(this.app.callback())
        }
        else {
          this.srv = http.createServer(this.app)
        }
      }
      this.srv.listen(address, ()=> {
        const deets = this.srv.address()
        this.url = `http://[${deets.address}]:${deets.port}`
        debug(`url is ${this.url}`, this.srv.address())
        ok(this)
      })
    })
  }
  /**
   * Setup a http2 server to listen for the app
   * @param {string|number} address 
   * @returns {Promise<http2.Server>}
   */
  //listen2(address){
  //  return new Promise(ok => {
  //    // this.srv2 = http2.createServer({}, this.app.callback())
  //    const opts = {
  //      key: this.constructor.tls_self_key,
  //      cert: this.constructor.tls_self_cert,
  //    }
  //    this.srv2 = http2.createSecureServer(opts, this.app.callback())
  //    this.srv2.listen(address, ()=> {
  //      const deets = this.srv2.address()
  //      this.url = `https://${deets.address}:${deets.port}`
  //      debug(`url2 is ${this.srv2.address()} ${this.url}`)
  //     ok(this)
  //    })
  //  })
  //}

  server(http_server){
   this.srv = http_server
   const deets = this.srv.address()
   const server_address = (/:/.exec(deets.address))
     ? `[${deets.address}]`
     : `${deets.address}`
   this.url = `http://${server_address}:${deets.port}`
   return this
  }
  //addSrv2(http2_server){
  //  this.srv2 = http2_server
  //  const deets = this.srv2.address()
  //  const server_address = (/:/.exec(deets.address))
  //    ? `[${deets.address}]`
  //    : `${deets.address}`
  //  this.url = `https://${server_address}:${deets.port}`
  //  return this
  //}

  /**
   * Close down the server
   */
  close(){
    return new Promise(ok => {
      if (this.srv && this.srv.close) {
        this.srv.close(ok)
        // setImmediate(()=> this.srv.emit('close'))
        return debug('http server closing')
      }
      debug('http nothing to close')
      ok(true)
    })
  }

  async post(path, data, options){
    return this.send('post', path, data, options)

  }

  async get(path, data, options){
    return this.send('get', path, data, options)
  }

  /**
   * Request helper
   */
  async send(method, path, data, options){
    const app_url = (/^[a-z]{3,5}:\/\/.+/.exec(path))
      ? path
      : `${this.url}${path}`
    debug(method, app_url, data, options)
    try {
      const config = { method, url: app_url, data, }
      for (const option in options){
        config[option] = options[option]
      }
      debug('send request', config)
      const res = await axios(config)
      this.last_response = res
      debug('got response', res.config.url, res.data, res.headers, )
      return res
    }
    catch (error){
      this.last_response = error.response
      throw error
    }
  }

  /**
   * Request that expects an error response to test. Axios errors will still be thrown
   * if we don't get a response
   */
  async sendError(method, path, data, options){
    try {
      const res = await this.send(method, path, data, options)
      return res
    }
    catch (error) {
      if (error.response) {
        return error.response
      }
      throw error
    }
  }

  /**
   * Mocha helper to check if error, and dump info
   * @param {object} mocha_test 
   */
  handleMochaError(mocha_test){
    // console.log(mocha_test)
    // Not sure how to test this in mocha yet... need some console capturing thing
    /* istanbul ignore next */
    if (mocha_test.currentTest && mocha_test.currentTest.state === 'failed') {
      console.error('logger_errors:')
      console.dir(this.logger.errors, { depth: 6 })
      if (this.last_response) {
        if (this.last_response.data) {
          console.error('response', this.last_response.config.method, this.last_response.config.url, this.last_response.data)
        }
        else {
          console.error({ config: this.last_response.config, headers: this.last_response.headers, data: this.last_response.data })
        }
      }
    }
  }

  /**
   * Clean up a server/logs after tests are complete
   */
  async cleanUp(){
    await this.close()
    this.last_response = null
    this.logger_logs = []
    this.logger.errors = []
    this.srv = null
    return true
  }

  /**
   * Clean up a server/logs after tests are complete
   */
  async afterMocha(mocha_test){
    this.handleMochaError(mocha_test)
    return this.cleanUp()
  }

}

Taxios._initialiseClass()

class TestPinoLogger {

  constructor(){
    this.logs = []
    this.errors = []
    this._level = 'info'
  }

  slient(){}
  fatal(...args) {
    this._log('fatal', ...args)
    this._error('fatal', ...args)
  }
  error(...args) {
    this._log('error', ...args)
    this._error('error', ...args)
  }
  warn(...args){ this._log('warn', ...args) }
  info(...args){ this._log('info', ...args) }
  debug(...args){ this._log('debug', ...args) }
  trace(...args){ this._log('trace', ...args) }

  child(){

  }
  flush(){
    
  }
  get level(){
    return this._level
  }
  set level(value){
    this._level = value
  }

  // Not a pino method
  clearLogs(){
    this.logs = []
    this.errors = []
  }
  _log(level, ...args){ this.logs.push([ level, ...args]) }
  //_log(level, ...args){ this.logs.push([ Date.now(), level, ...args]) }
  _error(level, ...args){
    //const line = [ Date.now(), level, ...args]
    const line = [ level, ...args]
    this.logs.push(line)
    this.errors.push(line)
  }
  
}

module.exports = { Taxios, TestPinoLogger, jsonClone }
