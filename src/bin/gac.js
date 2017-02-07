#!/usr/bin/env node
'use strict'

const join = require('path').join
const minimist = require('minimist')
const GitAddAndCommit = require(join(__dirname, '../'))

let booleans = {
	c: 'caseSensitive',
	h: 'help',
	i: 'interactive'
}

let needArgs = {
	e: 'except',
	o: 'only'
}

const CLI_OPTIONS = Object.assign({}, booleans, needArgs)

let argv = minimist(process.argv.slice(2), {
	alias: CLI_OPTIONS,
	boolean: Object.keys(booleans).map(key => booleans[key])
})

let options = {}
setupOptions(options)
parseFilesToFind(options)
new GitAddAndCommit(options)

//
// Helpers
//
function setupOptions(options) {
	for (let option of Object.keys(booleans).map(key => booleans[key])) {
		options[option] = argv[option]
	}
}

function parseFilesToFind(options) {
	let _letterToFileMap = {
		d: 'deleted',
		m: 'modified',
		s: 'staged',
		u: 'untracked'
	}

	// defaults
	let find = {
		deleted: true,
		modified: true,
		staged: true,
		untracked: true
	}

	for (let file of argv.except && argv.except.split(',') || []) { // that's a cool line
		delete find[_letterToFileMap[file[0] && file[0].toLowerCase()]] // another cool line
	}

	// need to delete all find files if `argv.only` is present
	find = argv.only ? {} : find

	for (let file of argv.only && argv.only.split(',') || []) {
		find[_letterToFileMap[file[0].toLowerCase()]] = true
	}

	options.find = find
}
