var Interactive = require('./interactive');

function GitAddAndCommit(options) {
	if (options.help) {
		console.log('help screen');
	}

	if (options.interactive) {
		new Interactive().run();
	}
}

module.exports = GitAddAndCommit;
