# `git-add-and-commit`
> Quickly add and commit multiple files with one command.

```shell
$ npm install -g git-add-and-commit
$ gac --help
```

## Usage
Provide a list of file globs to match and a commit message. Matching is done via `minimatch` and done case-insensitively by default.

```shell
# Add and commit all files under src/js/ and src/css/
$ gac src/js/**/* src/css/**/* "Commit all js and css files"

# this will also work...
$ gac .js .css "Commit all js and css files"
# ...and also matches any .js and .css files under
# the git root -- see disclaimer
```

## DISCLAIMER
I made this thing so that I could quickly type a substring of a file and it would match. So if a given glob doesn't match any files at first, it tries to match a massaged version of the glob and see if that matches anything. For instance, providing `module` will actually match something like `root/some-child/js/modules/something/index.js`. It will also match anything and everything containing `module` in the filename, so be careful!


## Interactive
Because of this dangerous blindly-commit-any-goddamn-file attitude, there's an interactive version to help you see which files will be added by the given globs. Pressing tab will show a diff for all selected files. You can select a single file by using the arrow keys.

<img src="https://raw.githubusercontent.com/slammayjammay/git-add-and-commit/master/demos/demo.gif" width="800"></img>
