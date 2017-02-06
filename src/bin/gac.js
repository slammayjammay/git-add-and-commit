#!/usr/bin/env node
'use strict'

const join = require('path').join
const minimist = require('minimist')
const GitAddAndCommit = require(join(__dirname, '../'))

const CLI_OPTIONS = ['caseSensitive', 'help', 'interactive']

let argv = minimist(process.argv.slice(2), {
	alias: {
		c: 'caseSensitive',
		h: 'help',
		i: 'interactive',
		'case-sensitive': 'caseSensitive'
	},
	boolean: CLI_OPTIONS
})

let options = {}
for (let option of CLI_OPTIONS) {
	options[option] = argv[option]
}

new GitAddAndCommit(options)
