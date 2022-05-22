/* global expect */
const { Taxios, TaxiosError, jsonClone } = require('../../src/taxios')

function genError(message){
  return new Error(message)
}

describe('test::unit::Taxios', function(){

  it('should load', function(){ 
    expect(Taxios).to.be.ok
  })

  it('should jsonClone', function(){
    const obj = { one: ['test'], two: 2, }
    expect(jsonClone(obj)).to.eql(obj)
  })
   
  it('should wrap an error', function(){
    const ori_err = genError('dummy')
    expect(ori_err.stack).to.contain('Error: dummy')
    const err = new TaxiosError(ori_err)
    expect(err.stack).to.contain('TaxiosError: dummy\n    at')
    const lines = err.stack.split('\n')
    expect(lines[3]).to.equal('From previous Error: dummy') 
  })

})
