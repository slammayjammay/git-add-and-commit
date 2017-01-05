const execSync = require('child_process').execSync
const spawnSync = require('child_process').spawnSync
const chalk = require('chalk')
const ansiEscapes = require('ansi-escapes')
const debounce = require('lodash.debounce')
const gitFiles = require('git-files')
const keypress = require('terminal-keypress')
const jumper = require('terminal-jumper')

class Interactive {
	constructor() {
		this.fileIndex = 0
		this.showingIndicator = false
		this.showingDiff = false
		this.gitAddPrompt = `${chalk.green('Enter a file glob')} ${chalk.gray('(press tab to toggle diff)')}${chalk.green(': ')}`

		this.onType = debounce(this.onType.bind(this), 200)
		this.onTab = this.onTab.bind(this)
		this.onArrow = this.onArrow.bind(this)
		this.exitBeforeAdd = this.exitBeforeAdd.bind(this)
		this.exitAfterAdd = this.exitAfterAdd.bind(this)

		keypress.init()
		keypress.on('exit', () => this.showCursor())
		keypress.on('exit', this.exitBeforeAdd)
	}

	run() {
		let addedFiles = execSync('git diff --cached --name-only').toString('utf8').trim()

		if (addedFiles) {
			this.showAlreadyAddedFilesWarning()
		} else {
			this.showGlobPrompt()
		}
	}

	showAlreadyAddedFilesWarning() {
		let warningMessage = chalk.bold('There are file(s) already staged for commit. Continue (y/n)? ')
		jumper.block(warningMessage, 'addWarning')
		jumper.render()
		jumper.jumpTo('addWarning', -1)
		keypress.beginInput()

		keypress.once('return', () => {
			let answer = keypress.input()
			jumper.erase()

			if (['y', 'yes', 'Y', 'Yes'].includes(answer)) {
				jumper.remove('addWarning')
				this.showGlobPrompt()
			} else if (['n', 'no', 'N', 'No'].includes(answer)) {
				keypress.exit()
			}
		})
	}

	showGlobPrompt() {
		// configure keypress
		keypress.color(letter => chalk.red(letter))
		keypress.disableBehavior('tab right left')

		// show prompt and available files
		jumper.block(this.gitAddPrompt, 'enter')
		jumper.break()
		jumper.block(chalk.green('Files found:'), 'found')
		this.renderFoundGitFiles()

		jumper.jumpTo('enter', -1)
		keypress.beginInput()

		keypress.on('keypress', this.onType)
		keypress.on('tab', this.onTab)
		keypress.on('arrow', this.onArrow)

		keypress.once('return', () => {
			this.showCursor()
			keypress.removeListener('keypress', this.onType)
			keypress.removeListener('tab', this.onTab)
			this.renderAddSuccess()
			this.startCommit()
		})
	}

	onType(char, key) {
		if (['left', 'right', 'up', 'down', 'tab', 'return'].includes(key.name)) {
			return
		}

		if (this.showingIndicator) {
			this.showCursor()
			this.fileIndex = 0
			this.showingIndicator = false
		}

		let glob = keypress.input()
		let coloredInput = keypress.input(true)
		jumper.find('enter').content(this.gitAddPrompt + coloredInput)

		this.renderFoundGitFiles(glob)
		jumper.jumpTo('enter', -1)
	}

	onTab() {
		if (this.showingDiff) {
			this.showOriginalScreen()
		} else {
			this.showAlternateScreen()
		}

		this.showingDiff = !this.showingDiff
	}

	onArrow(dir) {
		if (['left', 'right'].includes(dir)) {
			return
		}
		if (!this.showingIndicator && dir === 'up') {
			return
		}

		let numFiles = this.getGitFilesMatching(keypress.input()).length

		if (numFiles < 2) {
			return
		}

		// go to the correct file based on input direction
		if (!this.showingIndicator) {
			this.fileIndex = 0
			this.hideCursor()
		} else if (dir === 'up') {
			this.fileIndex -= 1
		} else if (dir === 'down') {
			this.fileIndex += 1
		}

		// return if the index is lower than 0 or greater than the number of files
		if (this.fileIndex < 0) {
			this.fileIndex = 0
			jumper.render()
			jumper.jumpTo('enter', -1)
			this.showCursor()
			this.showingIndicator = false
			return
		}
		if (this.fileIndex > numFiles - 1) {
			this.fileIndex = numFiles - 1
			return
		}

		// erase any previously printed indicators
		jumper.render()

		// write a file indicator on the current file line
		jumper.jumpTo(`gitFile${this.fileIndex}`, -1)
		process.stdout.write(ansiEscapes.cursorForward(2))
		process.stdout.write(chalk.blue('<'))

		this.showingIndicator = true
	}

	showCursor() {
		process.stdout.write(ansiEscapes.cursorShow)
	}

	hideCursor() {
		process.stdout.write(ansiEscapes.cursorHide)
	}

	getIndicatedFile() {
		let currentLine = jumper.find(`gitFile${this.fileIndex}`).escapedText
		return currentLine.trim().split(' ')[1]
	}

	showOriginalScreen() {
		// remove scrollback so that scrolling up on the original screen doesn't show the diff
		process.stdout.write(execSync("clear && printf \'\\e[3J\'", { encoding: 'utf8' }))
		// switch to original screen
		spawnSync('tput', ['rmcup'], { stdio: 'inherit' })

		jumper.jumpTo('enter', -1)
		keypress.enable()
	}

	showAlternateScreen() {
		// prevent rendering on each keypress
		keypress.disable()

		// if the indicator is showing, grab the diff for the chosen file.
		// otherwise, grab the diff for the current glob entry
		let diff
		if (this.showingIndicator) {
			let file = this.getIndicatedFile()
			diff = execSync(`git -c color.ui=always diff -- ${file}`).toString('utf8')
		} else {
			let glob = keypress.input()
			diff = execSync(`git -c color.ui=always diff -- *${glob}*`).toString('utf8')
		}

		// show diff on alternate screen
		spawnSync('tput', ['smcup'], { stdio: 'inherit' })
		jumper.cursorTo(0, 0)
		console.log(diff)

		// make sure to enable a second tab after disabling all events
		keypress.once('tab', this.onTab)
	}

	renderAddSuccess() {
		// if the indicator is showing, only add that specific file.
		// otherwise, add all files matching the given glob
		if (this.showingIndicator) {
			this.addFiles = [this.getIndicatedFile()]
		} else {
			let glob = keypress.input()
			this.addFiles = this.getGitFilesMatching(glob)
		}

		jumper.reset()

		jumper.block(chalk.green('Added files:'), 'found')
		for (let i = 0; i < this.addFiles.length; i++) {
			let file = this.addFiles[i]
			let id = `addedFile${i}`
			jumper.block(`${chalk.red(file)}  ${chalk.green('✓')}`, id)
		}
		jumper.break()
		jumper.block('---------------------------------------------')
		jumper.break()
		jumper.block(chalk.green('Enter commit message: "'), 'commit')
		jumper.render()

		jumper.jumpTo('commit', -1)
		process.stdout.write(chalk.green('"'))
		jumper.jumpTo('commit', -1)
	}

	startCommit() {
		keypress.color(letter => chalk.green(letter))
		keypress.beginInput()

		let onKeypress = () => {
			process.stdout.write(`${chalk.green('"')}`)
			process.stdout.write(ansiEscapes.cursorBackward(1))
		}
		keypress.on('keypress', onKeypress)

		keypress.once('return', () => {
			keypress.removeListener('keypress', onKeypress)
			this.commitMessage = keypress.input()

			let content = jumper.find('commit').text
			content = `${content}${keypress.input(true)}${chalk.green('"')}`
			jumper.find('commit').content(content)
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
		// remove previous search
		jumper.removeAllMatching(/gitFile\d+/)

		let allMatches = {
			untracked: gitFiles.untracked('relative').filter(file => new RegExp(glob, 'i').test(file)),
			modified: gitFiles.modified('relative').filter(file => new RegExp(glob, 'i').test(file)),
			deleted: gitFiles.deleted('relative').filter(file => new RegExp(glob, 'i').test(file))
		}

		let counter = 0

		for (let group of Object.keys(allMatches)) {
			for (let file of allMatches[group]) {
				let text = `  ${chalk.bold.gray(`(${group})`)} ${chalk.red(file)}`
				jumper.block(text, `gitFile${counter}`)
				counter += 1
			}
		}
		jumper.render()
	}

	getGitFilesMatching(glob) {
		let files = gitFiles.all('relative').sort()
		let regex = new RegExp(glob, 'i')
		return files.filter(file => regex.test(file))
	}

	exitBeforeAdd() {
		jumper.erase()
	}

	exitAfterAdd() {
		process.stdout.write(ansiEscapes.cursorSavePosition)

		for (let i = 0; i < this.addFiles.length; i++) {
			let id = `addedFile${i}`
			jumper.jumpTo(id, -2)
			process.stdout.write(chalk.red('✗'))
		}

		process.stdout.write(ansiEscapes.cursorRestorePosition)
		console.log()
		console.log()
		console.log('Aborting -- no files added.')
	}
}

module.exports = Interactive
