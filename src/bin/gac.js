#!/usr/bin/env node
'use strict'

const join = require('path').join
const minimist = require('minimist')
const GitAddAndCommit = require(join(__dirname, '../'))

let args = Object.keys(minimist(process.argv.slice(2)))
let options = {
	caseInsensitive: true
}

if (args.includes('h') || args.includes('help')) {
	options.help = true
}
if (args.includes('i') || args.includes('interactive')) {
	options.interactive = true
}
if (args.includes('c') || args.includes('case-sensitive')) {
	options.caseInsensitive = false
}

new GitAddAndCommit(options)
