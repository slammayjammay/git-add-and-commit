const gitFiles = require('git-files')
const minimatch = require('minimatch')

/**
 * @param {array} fileTypes - The types of gitFiles to look for, e.g. 'staged'.
 * @param {string} pathType - The type of path for files (relative, absolute, etc.).
 * @return {array}
 */
const getFilesOfTypes = (fileTypes, pathType = 'relative') => {
	let files = []

	for (let fileType of fileTypes) {
		files.push(...gitFiles[fileType](pathType))
	}

	return files
}

/**
 * @param {array} files - The list of files to test.
 * @param {array} globs - The list of globs to test.
 * @param {object} [options] - Options.
 * @return {array}
 */
const matchGlobsAgainstFiles = (files, globs, options = {}) => {
	let matches = {}

	for (let file of files) {
		for (let glob of globs) {
			if (fileMatchesGlob(file, glob, options)) {
				matches[file] = true
			}
		}
	}

	return Object.keys(matches)
}

function fileMatchesGlob(file, glob, options = {}) {
	// for minimatch
	options.nocase = !options.caseSensitive

	let globsToTry = [
		`*${glob}*`,
		`**/*${glob}*`,
		`**/*${glob}*/**/*`,
		`**${glob}*/**/*`,
		`**/*${glob}**/*`
	]

	for (let globTry of globsToTry) {
		if (minimatch(file, globTry, options)) {
			return true
		}
	}

	return false
}

module.exports = {
	getFilesOfTypes,
	matchGlobsAgainstFiles
}
