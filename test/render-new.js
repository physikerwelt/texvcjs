"use strict";
var assert = require('assert');
var texvcjs = require('../');
var yaml = require('js-yaml');

var fs = require('fs');

describe('Run test for all mathjax-texvc commands:', function () {
  this.timeout(0);
  // read test cases
  var formulae =  yaml.safeLoad(fs.readFileSync(__dirname +'/render_new.yaml'));
  // create a mocha test case for each chunk
  Object.keys(formulae).forEach(function (hash) {
    var testcase = formulae[hash];
    if (testcase.ignore !== true) {
      it(" $"+testcase.formula+"$", function () {
        if(testcase.type === 'chem'){
          testcase.options = {
            usemhchem:true
          };
        }
        var result = texvcjs.check(testcase.formula,testcase.options);
        assert.equal(result.status, '+',
          JSON.stringify({
            id: testcase.id,
            output: result.output,
            expected: testcase.texvcjs
          }, null, 2));
      });
    }
  });
});
