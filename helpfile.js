const execSync = require('child_process').execSync
const chalk = require('chalk')

const outputFile = 'src/help.txt'

let txt = `\
${chalk.bold('DESCRIPTION')}
  This command quickens the commit process for individual files. Files can be
  added by giving globs, or substrings of the desired file. For example, the
  glob "ind" would find all files that contain "ind" in them. Files will be
  matched case-insensitively by default.

${chalk.bold('USAGE')}
  gac [options]
  gac <path> <message>

${chalk.bold('OPTIONS')}
  -c, --case-sensitive    Match files case-sensitively.
  -h, --help              Display this help screen.
  -i, --interactive       Interactively find and commit files.

${chalk.bold('EXAMPLES')}
  gac README.md "Add README"
  gac ind "Modify index.js"
`

execSync(`echo "${txt}" > ${outputFile}`)
