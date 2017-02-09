const fs = require('fs')
const chalk = require('chalk')

const outputFile = 'help.txt'
const B = (text) => chalk.bold(text)

let text = `\
${B('DESCRIPTION')}
	This command quickens the commit process for individual files. Files can be
	added by providing a list of file globs. For example, ${B('"src/**/*"')} will match
	all files of all subfolders of ${B('"src/"')}. If the given glob is a substring of
	a filename, a match will always be made. By default, all matches are made
	case-insensitively.

	You can specify which type of git files to match by using the ${B('--only')} and
	${B('--except')} options. Git types must be ${B('deleted')}, ${B('modified')}, ${B('staged')}, or ${B('untracked')}
	(${B('d')}, ${B('m')}, ${B('s')}, ${B('u')}), and separated by commas.


${B('USAGE')}
	gac [options]
	gac [options] <path> <message>


${B('OPTIONS')}
	-c, --case-sensitive          Match files case-sensitively.
	-e, --except=<type1,type2>    Specify which type of git files to ignore.
	-h, --help                    Display this help screen.
	-i, --interactive             Interactively find and commit files.
	-o, --only=<type1,type2>      Specify which type of git files to look for.
	-s, --silent                  Suppress success messages.


${B('EXAMPLES')}
	gac README "Add README" --case-sensitive
	gac ind "Modify index.js"
	gac --only modified,staged * "Commit all modified and staged files"
	gac -e=d,u * "Commit all files that are not deleted or untracked"
`

fs.writeFile(outputFile, text)
