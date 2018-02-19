"use strict";
var fs = require('fs');
var es = require('event-stream');
var texvcjs = require('../');
var yaml = require('js-yaml');
var queue = require('queue');
// mocha is too slow if we run these as individual test cases.
// run them in chunks in order to speed up reporting.
var CHUNKSIZE = 10000;
var qSize = 10;

var assert = require('assert');


var dataDir = __dirname + '/data';

function getExtension(filename) {
    return filename.split('.').pop();
}

function processGroup(fcontents, failures) {
    try {
        var yamlFile = yaml .safeLoad(fcontents);
        Object.keys(yamlFile).forEach(function (hash) {
            var testcase = yamlFile[hash];
            if (testcase.type === 'chem') {
                testcase.options = {
                    usemhchem: true
                };
            }
            var result = texvcjs.check(testcase.q, testcase.options);
            if (result.status !== '+') {
                failures.push({
                    hash: hash,
                    result: result,
                    testcase: testcase
                });
            }
        });
    } catch (e) {
        failures.push(e);
    }
}

fs.readdirSync(dataDir).forEach(function (name) {
    var fname = dataDir + '/' + name;
    if (fs.statSync(fname).isFile() && getExtension(fname) === 'yaml') {
        describe('Run test for file ' + fname, function () {
            it('should pass all tests', function (cb) {
                this.timeout(0);
                var lineNr = 0;
                var fcontents = '';
                var currentChunk = [];
                var failures = [];
                var q = queue();
                q.autostart = true;
                q.concurrency = 8;
                var results = [];
                var size = 0;
                var total = 0;
                var s = fs.createReadStream(fname)
                    .pipe(es.split())
                    .pipe(es.mapSync(function (line) {
                            lineNr += 1;
                            if (!line.startsWith(' ')) {
                                size++;
                                if (fcontents.length && size >= CHUNKSIZE) {
                                    total += size;
                                    q.push(function (done) {
                                        try {
                                            processGroup(fcontents, failures);
                                        } catch (e) {
                                            failures.push(e);
                                        }
                                        console.log('chunk finished ' + total + ' queue length is ' + q.length);
                                        done();
                                        });
                                    if (q.length > qSize) {
                                        currentChunk = [];
                                        size = 0;
                                        s.pause();
                                        console.log('queue full at line ' + lineNr);

                                    }
                                    size = 0;
                                    fcontents = '';
                                }
                            }
                            fcontents += line + "\n";

                        })
                            .on('end', function () {
                                total += size;
                                processGroup(fcontents,failures);
                                console.log( total + ' elements processed.');
                                if(failures.length){
                                    console.log('failures:');
                                    console.dir(failures);
                                    assert.equal(failures.length,0,"Expect failure length to be zero.");
                                }
                                cb();

                            })
                    );
                q.on('success', function () {
                    if (q.lengh < qSize / 2) {
                        s.resume();
                    }
                });
                q.on('end', function () {
                    s.resume();
                });

            });
        });
    }
});