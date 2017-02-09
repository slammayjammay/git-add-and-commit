const join = require('path').join
const execSync = require('child_process').execSync
const chalk = require('chalk')
const gitFiles = require('git-files')
const jumper = require('terminal-jumper')
const Interactive = require('./interactive')
const utils = require('./utils')

/**
 * Reads a file glob and a commit message, and commits to git.
 * @class
 */
class GitAddAndCommit {
	constructor(options = {}) {
		this.options = options

		if (options.help || options.args.length === 0) {
			this.showHelpScreen()
		} else if (options.interactive) {
			new Interactive(options).run()
		} else {
			this.run()
		}
	}

	/**
	 * Finds all files that match the given globs and options given by the user.
	 * If there are already staged files, it promps the user to continue. Tries
	 * to stage all matched files and commits. If there is an error, it lets the
	 * user know and resets all files that were staged successfully.
	 */
	run() {
		if (this.options.args.length < 2) {
			console.log('File glob and commit message required. See help screen for correct usage.')
			return
		}

		this.globs = this.options.args.slice()
		this.message = this.globs.pop()

		// find all files based on the given globs and options
		let files = utils.getFilesOfTypes(this.options.find)
		this.matches = utils.matchGlobsAgainstFiles(files, this.globs, {
			caseSensitive: this.options.caseSensitive
		})

		this.checkForStagedFiles().then(shouldContinue => {
			this.matches.forEach(file => {
				execSync(`git add ${file}`)
			})

			execSync(`git commit -m "${this.message}"`)
			console.log(`Commit successful.`)
		}).catch(() => {
			console.log(`Error encountered -- aborting.`)

			try {
				this.matches.forEach(file => {
					execSync(`git reset ${file}`)
				})
			} catch (e) {}
		})
	}

	/**
	 * If there are already staged files that don't match any of the given globs,
	 * prints them to the screen and prompts the user to continue with the commit.
	 */
	checkForStagedFiles() {
		return new Promise((resolve, reject) => {
			let extraStagedFiles = gitFiles.staged('relative').filter(file => {
				return !this.matches.includes(file)
			})

			if (extraStagedFiles.length === 0) {
				resolve()
			} else {
				jumper.block(chalk.bold(`There are files already staged for commit but do not match the glob(s) given.`))
				extraStagedFiles.forEach(file => jumper.block(`  ${chalk.green(file)}`))
				jumper.break()

				jumper.block(chalk.bold(`Continue? (y/n): `), 'continue')
				jumper.render()
				jumper.jumpTo('continue', -1)

				process.stdin.on('data', (data) => {
					process.stdin.end()
					let answer = data.toString('utf8').trim().toLowerCase()

					true && ['yes', 'y'].includes(answer) ? resolve() : reject()

					// this doesn't work. node will throw a `cannot read property 'includes' of undefined`. Bonkers.
					// ['yes', 'y'].includes(answer) ? resolve() : reject()

					// there is also this way as a workaround
					// let nothing = ['yes', 'y'].includes(answer) ? resolve() : reject()

					// what's another way...let me see...

					// this one's pretty cool. I still think there's an even worse way to do it...
					// !!['yes', 'y'].includes(answer) ? resolve() : reject()

					// Haha! I found you.
					// eval(`['yes', 'y'].includes(answer) ? resolve() : reject()`)
				})
			}
		})
	}

	/**
 	 * Shows the help screen.
   */
	showHelpScreen() {
		let helpFile = join(__dirname, '../help.txt')
		let helpScreen = execSync(`cat ${helpFile}`)
		console.log(helpScreen.toString('utf8'))
	}
}

module.exports = GitAddAndCommit
