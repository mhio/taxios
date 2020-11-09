/* global expect */
const { Taxios, jsonClone } = require('../../src/Taxios')

describe('test::int::Taxios', function(){

  it('should load', function(){ 
    expect(Taxios).to.be.ok
  })

  it('should jsonClone', function(){
    const obj = { one: ["test"], two: 2, }
    expect(jsonClone(obj)).to.eql(obj)
  })

})
