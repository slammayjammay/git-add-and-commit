const readline = require('readline')
const execSync = require('child_process').execSync
const chalk = require('chalk')
const ansiEscapes = require('ansi-escapes')
const debounce = require('debounce-promise')
const gitFiles = require('git-files')
const gitDiffGlob = require('git-diff-glob')
const jumper = require('terminal-jumper')
const pager = require('node-pager')
const utils = require('./utils')
require('./utils/readline-hack')

class Interactive {
	constructor(options = {}) {
		this.options = options
		this.fileIndex = 0
		this.showingIndicator = false
		this.showingDiff = false

		this.instructions = `${chalk.gray('Arrow keys to navigate')}\n${chalk.gray('Tab to show diff of selected file(s)')}`
		this.gitAddPrompt = `${chalk.green('Enter a file glob: ')}`

		this.render = debounce(this.render, 200)
		this.onType = this.onType.bind(this)
		this.onTab = this.onTab.bind(this)
		this.onArrow = this.onArrow.bind(this)
		this.exitBeforeAdd = this.exitBeforeAdd.bind(this)
		this.exitAfterAdd = this.exitAfterAdd.bind(this)

		process.on('exit', this.exitBeforeAdd)
	}

	run() {
		readline.emitKeypressEvents(process.stdin)
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			terminal: true,
			prompt: this.gitAddPrompt
		})

		let stagedFiles = gitFiles.staged()

		if (stagedFiles.length > 0) {
			this.showAlreadyAddedFilesWarning(stagedFiles)
		} else {
			this.showGlobPrompt()
		}
	}

	showAlreadyAddedFilesWarning(stagedFiles) {
		jumper.block('There are file(s) already staged for commit.')
		for (let file of stagedFiles) {
			jumper.block(chalk.red(file))
		}
		jumper.break()
		jumper.block(chalk.bold('These file(s) will be committed. Continue? (y/n) '), 'warning')

		this.render()
		jumper.jumpTo('warning', -1)

		this.rl.once('line', line => {
			let answer = line.trim().toLowerCase()
			jumper.erase()

			if (['y', 'yes'].includes(answer)) {
				jumper.reset()
				this.showGlobPrompt()
			} else {
				process.exit()
			}
		})
	}

	showGlobPrompt() {
		// show prompt and available files
		jumper.block(this.instructions, 'instructions')
		jumper.break()
		jumper.block(this.gitAddPrompt, 'enter')
		jumper.break()
		jumper.block(chalk.green('Files found:'), 'found')

		this.findGitFiles()
		jumper.render()
		this.jumpToEnter()

		this.rl.input.on('keypress', this.onType)

		this.rl.once('line', line => {
			this.showCursor()
			this.rl.input.removeListener('keypress', this.onType)
			this.renderAddSuccess(line)
			this.startCommit()
		})
	}

	/**
	 * Wrapper for jumper.render(). Returns a promise when complete.
	 */
	render(block) {
		return new Promise(resolve => {
			jumper.render(block)
			resolve()
		})
	}

	jumpToEnter() {
		jumper.jumpTo('enter', -1)
		this.rl.setPrompt(this.gitAddPrompt)
	}

	onType(char, key) {
		if (key.name === 'tab') {
			return this.onTab(char, key)
		} else if (['up', 'down'].includes(key.name)) {
			return this.onArrow(char, key)
		} else if (['left', 'right'].includes(key.name)) {
			return
		} else if (key.name === 'return') {
			// I guess the onType listener hasn't been removed yet
			return
		}

		let glob = this.rl.line

		// if the indicator is showing, jump to the enter prompt.
		// this.onType is called after the letter is printed, so immediately
		// "delete" it and then write it on the enter prompt
		if (this.showingIndicator) {
			process.stdout.write(ansiEscapes.cursorBackward(1))
			process.stdout.write(' ')

			jumper.find('enter').content(this.gitAddPrompt)
			this.jumpToEnter()

			process.stdout.write(glob)
			this.showCursor()
			this.fileIndex = 0
			this.showingIndicator = false
		}

		jumper.find('enter').content(this.gitAddPrompt + glob)
		this.findGitFiles(glob)
		this.render('found').then(() => this.jumpToEnter())
	}

	onTab(char, key) {
		if (this.showingDiff) {
			return
		}

		// the user just typed a tab. We don't want tabs to be printed. What to do?
		// the _deleteLeft method works as a backspace, but _refreshLine is called.
		// this is only bad for when the indicator is showing.

		if (this.showingIndicator) {
			// straight from the source, without _refreshLine()
			this.rl.line = this.rl.line.slice(0, this.rl.cursor - 1) +
										 this.rl.line.slice(this.rl.cursor, this.rl.line.length);
			this.rl.cursor--;
		} else {
			this.rl._deleteLeft()
		}

		this.showingDiff = true

		let file = this.showingIndicator ? this.getIndicatedFile() : this.rl.line
		let diff = gitDiffGlob(file, {
			caseSensitive: this.options.caseSensitive
		})

		pager(diff).then(() => this.showingDiff = false)
	}

	onArrow(char, key) {
		if (!this.showingIndicator && key.name === 'up') {
			return
		}

		let files = utils.getUniqueFilesOfTypes(this.options.find)
		let matches = utils.matchGlobsAgainstFiles(files, [this.rl.line], {
			caseSensitive: this.options.caseSensitive,
			strict: this.options.strict
		})
		let numFiles = matches.length

		if (numFiles < 2) {
			return
		}

		this.prevIndex = this.fileIndex

		// go to the correct file based on input direction
		if (!this.showingIndicator) {
			this.fileIndex = 0
			this.hideCursor()
		} else if (key.name === 'up') {
			this.fileIndex -= 1
		} else if (key.name === 'down') {
			this.fileIndex += 1
		}

		// if the cursor is at the last file, return
		if (this.fileIndex > numFiles - 1) {
			this.fileIndex = numFiles - 1
			return
		}

		let goToEnter = this.fileIndex < 0
		this.fileIndex = Math.max(this.fileIndex, 0)

		// at this point the file indicator will change positions and the cursor
		// right next to the printed indicator. So erase it.
		jumper.jumpTo(`gitFile${this.prevIndex}`, -1)
		process.stdout.write(ansiEscapes.eraseEndLine)

		// if the cursor is moving from the first file up to the prompt area, return
		if (goToEnter) {
			this.fileIndex = 0
			this.jumpToEnter()
			this.showCursor()
			this.showingIndicator = false
			return
		}

		// otherwise, print the indicator at the new position
		jumper.jumpTo(`gitFile${this.fileIndex}`, -1)
		process.stdout.write(ansiEscapes.cursorForward(2))
		process.stdout.write(chalk.bold.blue('⬅'))

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

	renderAddSuccess(line) {
		// if the indicator is showing, only add that specific file.
		// otherwise, add all files matching the given glob
		if (this.showingIndicator) {
			this.addFiles = [this.getIndicatedFile()]
		} else {
			this.addFiles = this.getGitFilesMatching(line)
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

		// need to update readline's prompt for _refreshLine calls
		this.rl.setPrompt(jumper.find('commit').text)

		this.render().then(() => {
			jumper.jumpTo('commit', -1)
			process.stdout.write(chalk.green('"'))
			jumper.jumpTo('commit', -1)
		})
	}

	startCommit() {
		let onKeypress = () => {
			process.stdout.write(`${chalk.green('"')}`)
			process.stdout.write(ansiEscapes.cursorBackward(1))
		}
		this.rl.input.on('keypress', onKeypress)

		this.rl.once('line', (line) => {
			this.commitMessage = line

			this.rl.input.removeListener('keypress', onKeypress)

			let content = jumper.find('commit').text
			content = `${content}${chalk.green(this.commitMessage)}${chalk.green('"')}`
			jumper.find('commit').content(content)

			this.commit()
			this.complete()
		})

		process.removeListener('exit', this.exitBeforeAdd)
		process.on('exit', this.exitAfterAdd)
	}

	commit() {
		process.removeListener('exit', this.exitAfterAdd)

		for (let file of this.addFiles) {
			execSync(`git add ${file}`)
		}
		execSync(`git commit -m "${this.commitMessage}"`)
	}

	complete() {

		if (this.options.silent) {
			jumper.erase()
		} else {
			jumper.break()
			jumper.block('---------------------------------------------')
			jumper.break()
			jumper.block('Files committed successfully.')
			jumper.render()
		}

		process.exit()
	}

	/**
	 * Finds all files that match the given glob and prints them to the screen,
	 * along with their git file type, e.g. 'staged', 'modified', etc.
	 * @param {string} [glob] - The glob to match against files.
	 */
	findGitFiles(glob) {
		glob = glob || '*'

		// remove previous search
		jumper.removeAllMatching(/gitFile\d+/)

		let fileMap = utils.getFilesOfTypes(this.options.find)
		let types = Object.keys(fileMap)
		let counter = 0

		for (let type of types) {
			let matches = utils.matchGlobsAgainstFiles(fileMap[type], [glob], {
				caseSensitive: this.options.caseSensitive,
				strict: this.options.strict
			})

			for (let file of matches) {
				let text = `  ${chalk.bold.gray(`(${type})`)} ${chalk.red(file)}`
				jumper.block(text, `gitFile${counter}`)
				counter += 1
			}
		}
	}

	getGitFilesMatching(glob) {
		let files = utils.getUniqueFilesOfTypes(this.options.find)
		return utils.matchGlobsAgainstFiles(files, [glob], {
			caseSensitive: this.options.caseSensitive,
			strict: this.options.strict
		})
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
