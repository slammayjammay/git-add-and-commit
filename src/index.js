#!/usr/bin/env node
'use strict';

var join = require('path').join;
var GitAddAndCommit = require(join(__dirname, './git-add-and-commit'));

var options = {};

var args = process.argv.slice(2);
if (args.indexOf('-i') !== -1 || args.indexOf('--interactive') !== -1) {
	options.interactive = true;
}
if (args.indexOf('-h') !== -1 || args.indexOf('--help') !== -1) {
	options.help = true;
}

new GitAddAndCommit(options);
