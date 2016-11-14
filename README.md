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
$ gac index "Commit all files with 'index' in their name."
```
There's also an interactive version, that will show all found files matching a
given glob.

```shell
$ gac -i
Enter a file glob: ind

Files Added:
index.html
src/js/index.js
src/css/index.css

----------------

Commit message: "Commit all 'index' files."

----------------

Files committed successfully.

$
```
