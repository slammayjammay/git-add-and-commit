#!/usr/bin/env node
'use strict'

const join = require('path').join
const GitAddAndCommit = require(join(__dirname, './git-add-and-commit'))

let options = {}
let args = process.argv.slice(2)

if (args.includes('-i') || args.includes('--interactive')) {
	options.interactive = true
}
if (args.includes('-h') || args.includes('--help')) {
	options.help = true
}

new GitAddAndCommit(options)
