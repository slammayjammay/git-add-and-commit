const readline = require('readline')
const execSync = require('child_process').execSync
const chalk = require('chalk')
const ansiEscapes = require('ansi-escapes')
const stripAnsi = require('strip-ansi')
const getCursorPosition = require('get-cursor-position')
const Keypress = require('../../keypress')
const Gymnast = require('../../gymnast/src')

const keypress = new Keypress()
const gymnast = new Gymnast()

/**
 * User enters a file glob, and any add-able git files and shown on each
 * keypress.
 * @class
 */
class Interactive {
	setup() {
		gymnast.block(chalk.green('Enter a file glob: '), 'enter')
		gymnast.break()
		gymnast.block(chalk.green('Files found:'), 'found')
		gymnast.block('', 'files')
		gymnast.render()

		this.renderFoundGitFiles()
		gymnast.jumpTo('enter', -1)

		keypress.init()
		keypress.beginInput()
		keypress.color(letter => chalk.red(letter))

		this.exitBeforeAdd = this.exitBeforeAdd.bind(this)
		this.exitAfterAdd = this.exitAfterAdd.bind(this)

		keypress.on('exit', this.exitBeforeAdd)
	}

	run() {
		this.setup()

		// search git files on keypress
		let onKeypress = () => {
			let input = keypress.input()
			let glob = stripAnsi(input)

			gymnast.find('enter').content(chalk.green('Enter a file glob: ') + input)
			this.renderFoundGitFiles(glob)
			gymnast.jumpTo('enter', -1)
		}

		keypress.on('keypress', onKeypress)
		keypress.once('return', () => {
			keypress.removeListener('keypress', onKeypress)
			this.renderAddSuccess()
			this.startCommit()
		})
	}

	renderAddSuccess() {
		gymnast.reset()
		let glob = stripAnsi(keypress.input())

		this.addFiles = this.getGitFilesMatching(glob).split('\n').filter(file => file !== '')
		let foundFiles = this.addFiles
			.map(file => `${chalk.red(file)}  ${chalk.green('✓')}`)
			.join('\n')

		gymnast.block(chalk.green('Added files:'), 'found')
		gymnast.block(chalk.red(foundFiles), 'files')
		gymnast.break()
		gymnast.block('---------------------------------------------')
		gymnast.break()
		gymnast.block(chalk.green('Enter commit message: ""'), 'commit')
		gymnast.render()
		gymnast.jumpTo('commit', -2)
	}

	startCommit() {
		keypress.color(letter => chalk.green(letter))
		keypress.beginInput()

		let onKeypress = () => {
			let content = `Enter commit message: ${chalk.green('"')}${keypress.input()}${chalk.green('"')}`
			gymnast.find('commit').content(content)
			gymnast.render('commit')
			gymnast.jumpTo('commit', -2)
		}
		keypress.on('keypress', onKeypress)

		keypress.once('return', () => {
			this.commitMessage = stripAnsi(keypress.input())
			keypress.removeListener('keypress', onKeypress)
			this.commit()
			this.complete()
		})

		keypress.removeListener('exit', this.exitBeforeAdd)
		keypress.on('exit', this.exitAfterAdd)
	}

	commit() {
		for (let file of this.addFiles) {
			execSync(`git add ${file}`)
		}
		execSync(`git commit -m "${this.commitMessage}"`)

		keypress.removeListener('exit', this.exitAfterAdd)
	}

	complete() {
		gymnast.break()
		gymnast.block('---------------------------------------------')
		gymnast.break()
		gymnast.block('Files committed successfully.')
		gymnast.render()

		keypress.exit()
	}

	renderFoundGitFiles(glob = '') {
		let gitFiles = this.getGitFilesMatching(glob)

		gymnast.find('files').content(chalk.red(gitFiles))
		gymnast.render()
	}

	getGitFilesMatching(glob) {
		let findModified = 'git diff --name-only'
		let findUntracked = 'git ls-files --other --exclude-standard'
		let command = `{ ${findModified}; ${findUntracked}; } | sort | uniq | grep '${glob}' 2> /dev/null`

		let files
		try {
			files = execSync(command).toString('utf8')
		} catch (e) {
			files = ''
		}

		return files
	}

	exitBeforeAdd() {
		gymnast.erase()
	}

	exitAfterAdd() {
		console.log()
		console.log()
		console.log('Aborting...no files added.')
	}
}

module.exports = Interactive
