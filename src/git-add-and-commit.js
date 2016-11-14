var join = require('path').join;
var execSync = require('child_process').execSync;
var Interactive = require('./interactive');

/**
 * Reads a file glob and a commit message, and commits to git.
 * @class
 */
function GitAddAndCommit(options) {
	if (options.help) {
		this.showHelpScreen();
	} else if (options.interactive) {
		new Interactive().run();
	} else {
		this.normal();
	}
}

var proto = GitAddAndCommit.prototype;

/**
 * Attempts to add and commit. Errors out in a non-ugly way.
 */
proto.normal = function() {
	try {
		var args = process.argv.slice(2);
		var fileGlob = args[0];
		var commitMessage = args[1];

		execSync('git add -- *' + fileGlob + '*');
		execSync('git commit -m "' + commitMessage + '"')
	} catch (e) {
		console.log('Encountered error -- aborting.');
		process.stdin.write('Reset added files...');
		execSync('git reset .');
		process.stdin.write('Done.');
		console.log();
	}
};

/**
 * Shows the help screen.
 */
proto.showHelpScreen = function() {
	var helpFile = join(__dirname, './help.txt');
	var helpScreen = execSync('cat ' + helpFile);
	console.log(helpScreen.toString('utf8'));
};

module.exports = GitAddAndCommit;
