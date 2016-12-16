const execSync = require('child_process').execSync
const spawnSync = require('child_process').spawnSync
const chalk = require('chalk')
const ansiEscapes = require('ansi-escapes')
const debounce = require('lodash.debounce')
const keypress = require('terminal-keypress')
// const jumper = require('terminal-jumper')
const jumper = require('../../terminal-jumper')

class Interactive {
	constructor() {
		this.showingDiff = false
		this.gitAddPrompt = `${chalk.green('Enter a file glob')} ${chalk.gray('(press tab to toggle diff)')}${chalk.green(': ')}`

		this.onType = debounce(this.onType.bind(this), 200)
		this.onTab = this.onTab.bind(this)
		this.exitBeforeAdd = this.exitBeforeAdd.bind(this)
		this.exitAfterAdd = this.exitAfterAdd.bind(this)

		keypress.init()
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
		jumper.block('', 'files')
		this.renderFoundGitFiles()

		jumper.jumpTo('enter', -1)
		keypress.beginInput()

		keypress.on('keypress', this.onType)
		keypress.on('tab', this.onTab)

		keypress.once('return', () => {
			keypress.removeListener('keypress', this.onType)
			keypress.removeListener('tab', this.onTab)
			this.renderAddSuccess()
			this.startCommit()
		})
	}

	onType() {
		let glob = keypress.input()
		let input = keypress.input(true)
		jumper.find('enter').content(this.gitAddPrompt + input)

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

	showOriginalScreen() {
		// remove scrollback so that scrolling up on the original screen doesn't show the diff
		process.stdout.write(execSync( "clear && printf \'\\e[3J\'", { encoding: "utf8" }))
		// switch to original screen
		spawnSync('tput', ['rmcup'], { stdio: 'inherit' })

		jumper.jumpTo('enter', -1)
		keypress.enable()
	}

	showAlternateScreen() {
		// prevent rendering on each keypress
		keypress.disable()

		// show diff on alternate screen
		spawnSync('tput', ['smcup'], { stdio: 'inherit' })
		let glob = keypress.input()
		let diff = execSync(`git -c color.ui=always diff -- *${glob}*`).toString('utf8')
		jumper.cursorTo(0, 0)
		console.log(diff)

		// make sure to enable a second tab after disabling all events
		keypress.once('tab', this.onTab)
	}

	renderAddSuccess() {
		jumper.reset()
		let glob = keypress.input()

		this.addFiles = this.getGitFilesMatching(glob).split('\n').filter(file => file !== '')

		jumper.block(chalk.green('Added files:'), 'found')
		for (let i = 0; i < this.addFiles.length; i++) {
			let file = this.addFiles[i]
			let id = `addedFile${i}`
			jumper.block(`${chalk.red(file)}  ${chalk.green('✓')}`, id)
		}
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
			this.commitMessage = keypress.input()
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
		let getModified = 'git diff --name-only'
		let getUntracked = 'git ls-files --other --exclude-standard'
		let command = `{ ${getModified}; ${getUntracked}; } | sort | uniq | grep '${glob}' 2> /dev/null`

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
