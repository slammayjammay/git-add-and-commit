var chalk = require('chalk');
var readline = require('readline');
var execSync = require('child_process').execSync;
var ansi = require('ansi-escapes');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

var PROMPT = 'Enter a file glob: ';
var INPUT = [];

function printGitStatus() {
	var output = execSync('git -c color.ui=always status');
}

function renderLine() {
	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	process.stdout.write(PROMPT);
	process.stdout.write(chalk.red(INPUT.join('')));
}

function backspace() {
	if (INPUT.pop()) {
		process.stdout.write(ansi.cursorMove(-1));
	}
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

function eraseLinesBelow() {
	process.stdout.write(ansi.eraseDown);
}

process.stdin.on('keypress', function(char, key) {
	if (key.ctrl && key.name === 'c') {
    process.exit();
  } else if (key.name === 'backspace') {
		backspace();
	} else if (key.name === 'return') {
		return
	} else {
		if (typeof char !== 'undefined') {
			INPUT.push(char + '');
		}
		renderLine();
	}

	process.stdout.write(ansi.cursorSavePosition);

	eraseLinesBelow();
	var glob = INPUT.join('')
	var files = getAllGitFiles(glob);
	console.log()
	console.log()
	console.log(chalk.red(files))

	process.stdout.write(ansi.cursorRestorePosition);
});

renderLine();
process.stdout.write(ansi.cursorSavePosition);
var files = getAllGitFiles();
console.log();
console.log();
console.log(chalk.red(files));
process.stdout.write(ansi.cursorRestorePosition);

process.on('exit', function() {
	process.stdout.clearLine();
	eraseLinesBelow();
	console.log();
});
