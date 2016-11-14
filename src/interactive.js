var chalk = require('chalk');
var ansi = require('ansi-escapes');
var readline = require('readline');
var execSync = require('child_process').execSync;

/**
 * Allows user to interactively search for and commit files.
 * @class
 */
class Interactive {
	constructor() {
		this.prompt = 'Enter a file glob: '
		this.input = ''
		this.getGitFiles = true
		this.getCommitMessage = false
		this.inputColor = 'red'
		this.done = false
		this.setup()
	}

	/**
	 * Sets up keypress events, sets raw mode to true, and exits nicely.
	 */
	setup() {
		readline.emitKeypressEvents(process.stdin)
		process.stdin.setRawMode(true)
		process.stdin.resume()

		process.stdin.on('keypress', (char, key) => {
			if (key.ctrl && key.name === 'c') {
				process.exit()
			}
		})

		process.stdin.on('keypress', (char, key) => {
			if (key.name === 'backspace') {
				this.onBackspace()
			} else if (key.name === 'return') {
				this.onReturn()
			} else {
				this.onType(char, key)
			}

			if (this.getGitFiles) {
				this.renderGitFiles()
			}
		})

		process.on('exit', () => {
			this.eraseBelow()
			console.log()

			if (!this.done) {
				process.stdin.write('Resetting all added files...')
				execSync('git reset .')
				process.stdin.write('Done.')
				console.log()
			}
		})
	}

	/**
	 * Callback for when 'enter' is pressed. If user was searching for files, adds
	 * them to git. If user was entering commit message, commits files.
	 */
	onReturn() {
		if (this.getGitFiles) {
			this.getGitFiles = false
			this.getCommitMessage = true
			this.renderAddSuccess()

			this.prompt = 'Commit message: ' + chalk.green('"')
			this.input = ''
			this.inputColor = 'green'

			this.renderLine()
		} else if (this.getCommitMessage) {
			var message = this.input
			execSync('git commit -m "' + message + '"')

			console.log()
			console.log()
			console.log('----------------')
			console.log()
			console.log('Files committed successfully.')

			this.done = true
			process.exit()
		}
	}

	/**
	 * Deletes previous letter from input and moves cursor appropriately.
	 */
	onBackspace() {
		this.input = this.input.slice(0, this.input.length - 1)

		if (this.input.length !== 0) {
			process.stdout.write(ansi.cursorMove(-1))
		}
		this.renderLine()
	}

	/**
	 * Adds the character to input string if not undefined.
	 */
	onType(char, key) {
		if (typeof char !== 'undefined') {
			this.input += char + ''
		}
		this.renderLine()
	}

	/**
	 * Colors a given string.
	 *
	 * @param {string} input - The input string.
	 * @return {string}
	 */
	colorInput(input) {
		return chalk[this.inputColor](input)
	}

	/**
	 * Prints out the starting prompt and any modified git files.
	 */
	run() {
		this.renderLine()
		let files = this.getAllGitFiles()
		this.printBelow(files)
	}

	/**
	 * Rewrites over the current line with the updated input string.
	 */
	renderLine() {
		var string = this.prompt + this.colorInput(this.input)
		if (this.getCommitMessage) {
			string += chalk.green('"')
		}

		process.stdout.clearLine()
		process.stdout.cursorTo(0)
		process.stdout.write(string)

		if (this.getCommitMessage) {
			process.stdout.write(ansi.cursorMove(-1))
		}
	}

	/**
	 * Prints out the retrieved git files from the saved user input.
	 */
	renderGitFiles() {
		this.eraseBelow()
		var glob = this.input
		var files = this.getAllGitFiles(glob)
		this.printBelow(files)
	}

	/**
	 * Lets the user know when files have been added.
	 */
	renderAddSuccess() {
		this.eraseBelow()
		process.stdout.clearLine()
		process.stdout.write(ansi.cursorLeft)

		var glob = this.input
		var files = this.getAllGitFiles(glob)

		try {
			execSync('git add *' + glob + '* &> /dev/null')
		} catch (e) {

		}

		console.log('Files added: ')
		console.log(chalk.green(files))
		console.log('----------------')
		console.log()
	}

	/**
	 * Retrieves all modified git files from a given glob. Supresses any error
	 * messages outputed by git (most times when the glob is an empty string git
	 * let the user know it ignored files in .gitignore -- hide this message).
	 *
	 * @param {string} glob - The given file glob.
	 */
	getAllGitFiles(glob) {
		if (typeof glob === 'undefined') {
			glob = ''
		}

		try {
			var files = execSync("{ git diff --name-only; git ls-files --other --exclude-standard; } | sort | uniq | grep '" + glob +  "' 2> /dev/null");
			return files.toString('utf8')
		} catch (e) {
			return ''
		}
	}

	/**
	 * Erases all retrieved git files.
	 */
	eraseBelow() {
		process.stdout.write(ansi.eraseDown)
	}

	/**
	 * Prints out the retrieved git files below the input line.
	 *
	 * @param {string} files - The retrieved git files.
	 */
	printBelow(files) {
		process.stdout.write(ansi.cursorSavePosition)
		console.log()
		console.log()
		console.log(chalk.green('Files found: '))
		console.log(chalk.red(files))
		process.stdout.write(ansi.cursorRestorePosition)
	}
}

module.exports = Interactive
