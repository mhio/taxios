const fs = require('fs')
const path = require('path')
const axios = require('axios')
const http = require('http')
const http2 = require('http2')
const debug = require('debug')('taxios')

function jsonClone(o) {
  return JSON.parse(JSON.stringify(o))
}
class Taxios {
  
  static _initialiseClass(){
    //this.tls_self_key = fs.readFileSync(path.join(__dirname,'fixture','server-key.pem'))
    //this.tls_self_cert = fs.readFileSync(path.join(__dirname,'fixture','server-cert.pem'))
  }
  static async app(app, logger){
    const taxios = new this({ app, logger })
    return taxios.listen()
  }

  /**
   * Inject your own server
   */
  static srv(http_server, app){
    const ret = this.app(app)
    ret.srv(http_server)
    return ret
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
  listen(address){
    return new Promise(ok => {
      if (this.app.callback){
        this.srv = http.createServer(this.app.callback())
      }
      else {
        this.srv = http.createServer(this.app)
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

  //addSrv(http_server){
  //  this.srv = http_server
  //  const deets = this.srv.address()
  //  const server_address = (/:/.exec(deets.address))
  //    ? `[${deets.address}]`
  //    : `${deets.address}`
  //  this.url = `http://${server_address}:${deets.port}`
  //  return this
  //}
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
    return new Promise(ok => this.srv && this.srv.close && this.srv.close(ok))
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
    const app_url = `${this.url}${path}`
    debug(method, app_url, data, options)
    try {
      const res = await axios({ method, url: app_url, data, options })
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
   * Mocha helper to check if error, and dump info
   * @param {object} mocha_test 
   */
  handleMochaError(mocha_test){
    // console.log(mocha_test)
    if (mocha_test.currentTest && mocha_test.currentTest.state === 'failed') {
      console.error('logger_errors', this.logger.logs_errors)
      if (this.last_response) {
        if (this.last_response.data) {
          console.error('response', this.last_response.config.method, this.last_response.config.url, this.last_response.data)
        }
        else {
          console.error(this.last_response)
        }
      }
    }
  }

  /**
   * Clean up a server/logs after tests are complete
   */
  async cleanUp(){
    this.close().catch(console.err)
    this.srv = null
    this.last_response = null
    this.logger_logs = []
    this.logger.logs_errors = []
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
    this.logs_errors = []
  }
  fatal(...args) {
    this.logs.push(['fatal', ...args])
    this.logs_errors.push(['fatal', ...args])
  }
  error(...args) {
    this.logs.push(['error', ...args])
    this.logs_errors.push(['error', ...args])
  }
  warn(...args){ this.logs.push(['warn', ...args]) }
  info(...args){ this.logs.push(['info', ...args]) }
  debug(...args){ this.logs.push(['debug', ...args]) }
  clearLogs(){
    this.logs = []
    this.logs_errors = []
  }
}

module.exports = { Taxios, TestPinoLogger, jsonClone }
