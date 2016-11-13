var fs = require('fs');
var chalk = require('chalk');
var readline = require('readline');
var inquirer = require('inquirer');
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
	process.stdout.write(INPUT.join(''));
}

function backspace() {
	INPUT.pop();
	INPUT.pop();
	process.stdout.write(ansi.cursorMove(-2) + ' ' + ansi.eraseEndLine + ' ' + ansi.cursorMove(-2));
}

function getAllGitFiles() {
	var files = execSync('{ git diff --name-only; git ls-files --other --exclude-standard; } | sort | uniq');
	return files.toString('utf8');
}

function onEnter(answer) {
	var allFiles = getAllGitFiles();
	console.log();
	console.log(allFiles);
	renderLine();
}

process.stdin.on('keypress', function(char, key) {
	if (key.ctrl && key.name === 'c') {
    process.exit();
  }

	if (key.name === 'return') {
		process.stdin.write(ansi.cursorSavePosition);
		var glob = INPUT.join('')
		var files = getAllGitFiles();
		console.log()
		console.log()
		console.log(chalk.red(files))
		// renderLine();
		process.stdin.write(ansi.cursorRestorePosition);
		return;
	}

	INPUT.push(chalk.red(char + ''));
	renderLine();

	if (key.name === 'backspace') {
		backspace();
	}
});

renderLine();

process.on('exit', function() {
	process.stdout.clearLine();
	console.log();
});
