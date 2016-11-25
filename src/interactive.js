const execSync = require('child_process').execSync
const chalk = require('chalk')
const stripAnsi = require('strip-ansi')
const ansiEscapes = require('ansi-escapes')
const debounce = require('lodash.debounce')
const keypress = require('terminal-keypress')
const jumper = require('terminal-jumper')

class Interactive {
	setup() {
		jumper.block(chalk.green('Enter a file glob: '), 'enter')
		jumper.break()
		jumper.block(chalk.green('Files found:'), 'found')
		jumper.block('', 'files')
		jumper.render()

		this.renderFoundGitFiles()
		jumper.jumpTo('enter', -1)

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
		let onKeypress = debounce((char, key) => {
			let input = keypress.input()
			let glob = stripAnsi(input)
			jumper.find('enter').content(chalk.green('Enter a file glob: ') + input)

			this.renderFoundGitFiles(glob)
			jumper.jumpTo('enter', -1)
		}, 200)

		keypress.on('keypress', onKeypress)
		keypress.once('return', () => {
			keypress.removeListener('keypress', onKeypress)
			this.renderAddSuccess()
			this.startCommit()
		})
	}

	renderAddSuccess() {
		jumper.reset()
		let glob = stripAnsi(keypress.input())

		this.addFiles = this.getGitFilesMatching(glob).split('\n').filter(file => file !== '')
		let foundFiles = this.addFiles
			.map(file => `${chalk.red(file)}  ${chalk.green('✓')}`)
			.join('\n')

		jumper.block(chalk.green('Added files:'), 'found')
		jumper.block(chalk.red(foundFiles), 'files')
		jumper.break()
		jumper.block('---------------------------------------------')
		jumper.break()
		jumper.block(chalk.green('Enter commit message: ""'), 'commit')
		jumper.render()
		jumper.jumpTo('commit', -2)
	}

	startCommit() {
		keypress.color(letter => chalk.green(letter))
		keypress.beginInput()

		let onKeypress = debounce(() => {
			let content = `Enter commit message: ${chalk.green('"')}${keypress.input()}${chalk.green('"')}`
			jumper.find('commit').content(content)
			jumper.render('commit')
			jumper.jumpTo('commit', -2)
		}, 200)
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
		jumper.break()
		jumper.block('---------------------------------------------')
		jumper.break()
		jumper.block('Files committed successfully.')
		jumper.render()

		keypress.exit()
	}

	renderFoundGitFiles(glob = '') {
		let gitFiles = this.getGitFilesMatching(glob)

		jumper.find('files').content(chalk.red(gitFiles))
		jumper.render()
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
		jumper.erase()
	}

	exitAfterAdd() {
		console.log()
		console.log()
		console.log('Aborting...no files added.')
	}
}

module.exports = Interactive
