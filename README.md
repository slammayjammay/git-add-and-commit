### git-add-and-commit
A simple CLI tool to add and commit files in a single step.

```shell
$ npm install -g git-add-and-commit
$ gac --help
```

### Usage
Provide the file glob you want to commit, followed by the commit message. Note
that `git-add-and-commit` will add all files that match the given glob.

```shell
$ gac index "Commit all 'index' files"
```
There's also an interactive version, that will show all git files matching a given glob. Pressing tab will show a diff for all selected files. You can select a single file by using the arrow keys.

<img src="./demos/demo.gif" width="800"></img>
