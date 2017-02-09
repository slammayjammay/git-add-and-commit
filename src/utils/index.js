const gitFiles = require('git-files')
const minimatch = require('minimatch')

/**
 * Returns all git files that match the given types, e.g. 'staged', 'modified'
 * in the form of a map -- fileType: fileName.
 * @param {array} fileTypes - The types of gitFiles to look for, e.g. 'staged'.
 * @param {string} pathType - The type of path for files (relative, absolute, etc.).
 * @return {object}
 */
const getFilesOfTypes = (fileTypes, pathType = 'relative') => {
	let fileMap = {}

	for (let fileType of fileTypes) {
		fileMap[fileType] = fileMap[fileType] || []
		fileMap[fileType].push(...gitFiles[fileType](pathType))
	}

	return fileMap
}

/**
 * Similar to getFilesOfTypes, but returns a unique array of files.
 * @param {array} fileTypes - The types of gitFiles to look for, e.g. 'staged'.
 * @param {string} pathType - The type of path for files (relative, absolute, etc.).
 * @return {array}
 */
const getUniqueFilesOfTypes = (fileTypes, pathType = 'relative') => {
	let fileMap = getFilesOfTypes(fileTypes, pathType)
	let files = []

	for (let fileArray of Object.keys(fileMap).map(key => fileMap[key])) {
		for (let file of fileArray) {
			if (!files.includes(file)) {
				files.push(file)
			}
		}
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

	let globsToTry = options.strict ? [glob] : [
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
	getUniqueFilesOfTypes,
	matchGlobsAgainstFiles
}
