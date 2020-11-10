/* global expect */
const { TestPinoLogger } = require('../../src/taxios')

describe('test::unit::TestPinoLogger', function(){

  it('should load', function(){ 
    expect(TestPinoLogger).to.be.ok
  })

  it('should log levels', function(){
    const log = new TestPinoLogger()
    expect(log.debug('')).to.eql(undefined)
    expect(log.info('')).to.eql(undefined)
    expect(log.warn('')).to.eql(undefined)
    expect(log.error('')).to.eql(undefined)
    expect(log.fatal('')).to.eql(undefined)
  })

  it('should error into store', function(){
    const log = new TestPinoLogger()
    expect(log.error({ msg: 'whatever' })).to.eql(undefined)
    expect(log.errors).to.eql([[
      'error',
      { msg: 'whatever' },
    ]])
  })

  it('should fatel into store', function(){
    const log = new TestPinoLogger()
    expect(log.fatal({ msg: 'fatal' })).to.eql(undefined)
    expect(log.errors).to.eql([[
      'fatal',
      { msg: 'fatal' },
  ]])
  })

})
