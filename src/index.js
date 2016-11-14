var execSync = require('child_process').execSync;
var Interactive = require('./interactive');

function GitAddAndCommit(options) {
	if (options.help) {
		console.log('help screen');
	} else if (options.interactive) {
		new Interactive().run();
	} else {
		this.normal();
	}
}

var proto = GitAddAndCommit.prototype;

proto.normal = function() {
	try {
		var args = process.argv.slice(2);
		var fileGlob = args[0];
		var commitMessage = args[1];

		execSync('git add -- *' + fileGlob + '*');
		execSync('git commit -m "' + commitMessage + '"')
	} catch (e) {
		console.log(e);
		console.log('Resetting added files...');
		execSync('git reset .');
	}
};

module.exports = GitAddAndCommit;
