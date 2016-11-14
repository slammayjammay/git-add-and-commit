var chalk = require('chalk');
var ansi = require('ansi-escapes');
var readline = require('readline');
var execSync = require('child_process').execSync;

function Interactive() {
	this.prompt = 'Enter a file glob: ';
	this.input = '';
	this.getGitFiles = true;
	this.getCommitMessage = false;
	this.inputColor = 'red';

	this.setup();
};

var proto = Interactive.prototype;

proto.setup = function() {
	readline.emitKeypressEvents(process.stdin);
	process.stdin.setRawMode(true);
	process.stdin.resume();

	process.stdin.on('keypress', function(char, key) {
		if (key.ctrl && key.name === 'c') {
	    process.exit();
	  }
	});

	process.stdin.on('keypress', function(char, key) {
		if (key.name === 'backspace') {
			this.onBackspace();
		} else if (key.name === 'return') {
			this.onReturn();
		} else {
			this.onType(char, key);
		}

		if (this.getGitFiles) {
			this.renderGitFiles();
		}
	}.bind(this));

	process.on('exit', function() {
		this.eraseBelow();
		console.log();
	}.bind(this));
};

proto.onReturn = function() {
	if (this.getGitFiles) {
		this.getGitFiles = false;
		this.getCommitMessage = true;
		this.renderAddSuccess();

		this.prompt = 'Commit message: ' + chalk.green('"');
		this.input = '';
		this.inputColor = 'green';

		this.renderLine();
	} else if (this.getCommitMessage) {
		var message = this.input;
		execSync('git commit -m "' + message + '"');

		console.log();
		console.log();
		console.log('----------------');
		console.log();
		console.log('Files committed successfully.');
		process.exit();
	}
};

proto.onBackspace = function() {
	this.input = this.input.slice(0, this.input.length - 1);

	if (this.input.length !== 0) {
		process.stdout.write(ansi.cursorMove(-1));
	}
	this.renderLine();
};

proto.onType = function(char, key) {
	if (typeof char !== 'undefined') {
		this.input += char + ''
	}
	this.renderLine();
};

proto.colorInput = function(input) {
	return chalk[this.inputColor](input);
};

proto.run = function() {
	this.renderLine();
	let files = this.getAllGitFiles();
	this.printBelow(files);
};

proto.renderLine = function() {
	var string = this.prompt + this.colorInput(this.input);
	if (this.getCommitMessage) {
		string += chalk.green('"');
	}

	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	process.stdout.write(string);

	if (this.getCommitMessage) {
		process.stdout.write(ansi.cursorMove(-1));
	}
};

proto.renderGitFiles = function() {
	this.eraseBelow();
	var glob = this.input;
	var files = this.getAllGitFiles(glob);
	this.printBelow(files);
};

proto.renderAddSuccess = function() {
	this.eraseBelow();
	process.stdout.clearLine();
	process.stdout.write(ansi.cursorLeft);

	var glob = this.input;
	var files = this.getAllGitFiles(glob);

	try {
		execSync('git add *' + glob + '* &> /dev/null');
	} catch (e) {

	}

	console.log('Files added: ');
	console.log(chalk.green(files));
	console.log('----------------');
	console.log();
};

proto.getAllGitFiles = function(glob) {
	if (typeof glob === 'undefined') {
		glob = '';
	}

	try {
		var files = execSync("{ git diff --name-only; git ls-files --other --exclude-standard; } | sort | uniq | grep '" + glob +  "' 2> /dev/null");
		return files.toString('utf8');
	} catch (e) {
		return '';
	}
};

proto.eraseBelow = function() {
	process.stdout.write(ansi.eraseDown);
};

proto.printBelow = function(files) {
	process.stdout.write(ansi.cursorSavePosition);
	console.log();
	console.log();
	console.log(chalk.green('Files found: '));
	console.log(chalk.red(files));
	process.stdout.write(ansi.cursorRestorePosition);
};

module.exports = Interactive;
