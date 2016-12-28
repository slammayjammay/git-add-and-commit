const join = require('path').join
const execSync = require('child_process').execSync
const gitFiles = require('git-files')
const Interactive = require('./interactive')

/**
 * Reads a file glob and a commit message, and commits to git.
 * @class
 */
class GitAddAndCommit {
	constructor(options = {}) {
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
		let stagedFiles = gitFiles.staged('relative')
		let stageWarning = stagedFiles.length > 0

		if (stageWarning) {
			// ignore all files that have already been staged, then stage them after this commit
			process.stdout.write('There are file(s) already staged for commit. Resetting staged files...')
			for (let file of stagedFiles) {
				execSync(`git reset ${file}`)
			}
			console.log('Done.')
		}

		try {
			let args = process.argv.slice(2)
			let glob = args[0]
			let commitMessage = args[1]

			let files = this.getGitFilesMatching(glob)
			for (let file of files) {
				execSync(`git add ${file}`)
			}

			execSync(`git commit -m "${commitMessage}"`)
			console.log('Commit successful.')

			if (stageWarning) {
				process.stdout.write('Re-adding previously staged files...')
				for (let file of stagedFiles) {
					execSync(`git add ${file}`)
				}
				console.log('Done.')
			}
		} catch (e) {
			console.log('Encountered error -- aborting.')
			process.stdin.write('Resetting added files...')
			execSync('git reset .')
			process.stdin.write('Done.')
			console.log()
		}
	}

	/**
	 * Copy-pasted from interactive.js.
	 * TODO: There's probably a better way.
	 */
	 getGitFilesMatching(glob) {
 		let files = gitFiles.all('relative').sort()
 		let regex = new RegExp(glob, 'i')
 		return files.filter(file => regex.test(file))
 	}

	/**
 	 * Shows the help screen.
   */
	showHelpScreen() {
		let helpFile = join(__dirname, './help.txt')
		let helpScreen = execSync(`cat ${helpFile}`)
		console.log(helpScreen.toString('utf8'))
	}
}

module.exports = GitAddAndCommit
