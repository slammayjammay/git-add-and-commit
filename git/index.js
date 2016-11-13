var chalk = require('chalk');
var readline = require('readline');
var execSync = require('child_process').execSync;
var ansi = require('ansi-escapes');
var add = require('./add');

var PROMPT = 'Enter a file glob: ';
var INPUT = [];
var GET_GIT_FILES = true;
var GET_COMMIT_MESSAGE = false;

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

process.stdin.on('keypress', function(char, key) {
	if (key.ctrl && key.name === 'c') {
    process.exit();
  }
});

function renderLine() {
	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	process.stdout.write(PROMPT);
	process.stdout.write(chalk.red(INPUT.join('')));
}

function onBackspace() {
	if (INPUT.pop()) {
		process.stdout.write(ansi.cursorMove(-1));
	}
	renderLine();
}

function onReturn() {
	if (GET_GIT_FILES) {
		GET_GIT_FILES = false;
		GET_COMMIT_MESSAGE = true;
		renderAddedFiles();

		console.log('----------------');
		console.log();

		PROMPT = 'Commit message: ';
		INPUT = [];
		renderLine();
	} else if (GET_COMMIT_MESSAGE) {
		var message = INPUT.join('')
		execSync('git commit -m "' + message + '"');

		console.log();
		console.log('Success!');
		process.exit();
	}
}

function onType(char, key) {
	if (typeof char !== 'undefined') {
		INPUT.push(char + '');
	}
	renderLine();
}

function getAllGitFiles(glob) {
	if (typeof glob === 'undefined') glob = '';

	var files;
	try {
		files = execSync("{ git diff --name-only; git ls-files --other --exclude-standard; } | sort | uniq | grep '" + glob +  "'");
	} catch (e) {
		return '';
	}
	return files.toString('utf8');
}

function printBelow(files) {
	process.stdout.write(ansi.cursorSavePosition);
	console.log()
	console.log()
	console.log(chalk.green('Files found: '));
	console.log(chalk.red(files))
	process.stdout.write(ansi.cursorRestorePosition);
}

function eraseBelow() {
	process.stdout.write(ansi.eraseDown);
}

function renderGitFiles() {
	eraseBelow();
	glob = INPUT.join('')
	files = getAllGitFiles(glob);
	printBelow(files);
}

function renderAddedFiles() {
	eraseBelow();

	var glob = INPUT.join('')
	var files = getAllGitFiles(glob)
	execSync('git add -- *' + glob + '*');

	console.log();
	console.log();
	console.log('Files added: ');
	console.log(chalk.green(files));
}

process.stdin.on('keypress', function(char, key) {
 if (key.name === 'backspace') {
		onBackspace();
	} else if (key.name === 'return') {
		onReturn();
	} else {
		onType(char, key);
	}

	if (GET_GIT_FILES) {
		renderGitFiles();
	}
});

renderLine();
var files = getAllGitFiles();
printBelow(files);
