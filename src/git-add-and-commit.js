const join = require('path').join
const execSync = require('child_process').execSync
const Interactive = require('./interactive')

/**
 * Reads a file glob and a commit message, and commits to git.
 * @class
 */
class GitAddAndCommit {
	constructor(options) {
		if (options.help) {
			this.showHelpScreen()
		} else if (options.interactive) {
			new Interactive().run()
		} else {
			this.normal()
		}
	}

	/**
	* Attempts to add and commit. Errors out in a non-ugly way.
	*/
	normal() {
		try {
			var args = process.argv.slice(2)
			var fileGlob = args[0]
			var commitMessage = args[1]

			execSync('git add -- *' + fileGlob + '*')
			execSync('git commit -m "' + commitMessage + '"')
		} catch (e) {
			console.log('Encountered error -- aborting.')
			process.stdin.write('Reset added files...')
			execSync('git reset .')
			process.stdin.write('Done.')
			console.log()
		}
	}

	/**
	* Shows the help screen.
	*/
	showHelpScreen() {
		var helpFile = join(__dirname, './help.txt')
		var helpScreen = execSync('cat ' + helpFile)
		console.log(helpScreen.toString('utf8'))
	}
}

module.exports = GitAddAndCommit
