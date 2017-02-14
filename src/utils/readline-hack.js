/**
 * The behavior for readline.createInterface's backspace functionality is not
 * good, at least for this project. On each backspace, _refreshLine is called
 * which actually clears all output beneath the current line, as well as the
 * current line itself. This hack redefines the _refreshLine method and
 * substitutes clearing all output beneath with just a simple clearLine().
 */

const readline = require('readline')

/**
 * copy pasted from https://github.com/nodejs/node/blob/master/lib/readline.js#L271-L309
 */
readline.Interface.prototype._refreshLine = function() {
  // line length
  var line = this._prompt + this.line;
  var dispPos = this._getDisplayPos(line);
  var lineCols = dispPos.cols;
  var lineRows = dispPos.rows;

  // cursor position
  var cursorPos = this._getCursorPos();

  // first move to the bottom of the current line, based on cursor pos
  var prevRows = this.prevRows || 0;
  if (prevRows > 0) {
    exports.moveCursor(this.output, 0, -prevRows);
  }

  // Cursor to left edge.
  exports.cursorTo(this.output, 0);
  // erase data
  // exports.clearScreenDown(this.output); // <-- Substitute this line
	exports.clearLine(process.stdout, 1)     // <-- with this one.

  // Write the prompt and the current buffer content.
  this._writeToOutput(line);

  // Force terminal to allocate a new line
  if (lineCols === 0) {
    this._writeToOutput(' ');
  }

  // Move cursor to original position.
  exports.cursorTo(this.output, cursorPos.cols);

  var diff = lineRows - cursorPos.rows;
  if (diff > 0) {
    exports.moveCursor(this.output, 0, -diff);
  }

  this.prevRows = cursorPos.rows;
};

// ----------------
// Helper functions
// ----------------
//
// _refreshLine relies on other methods, so I just copy-pasted the relevant ones
// here.

function moveCursor(stream, dx, dy) {
  if (stream === null || stream === undefined)
    return;

  if (dx < 0) {
    stream.write('\x1b[' + (-dx) + 'D');
  } else if (dx > 0) {
    stream.write('\x1b[' + dx + 'C');
  }

  if (dy < 0) {
    stream.write('\x1b[' + (-dy) + 'A');
  } else if (dy > 0) {
    stream.write('\x1b[' + dy + 'B');
  }
}
exports.moveCursor = moveCursor;

function clearLine(stream, dir) {
  if (stream === null || stream === undefined)
    return;

  if (dir < 0) {
    // to the beginning
    stream.write('\x1b[1K');
  } else if (dir > 0) {
    // to the end
    stream.write('\x1b[0K');
  } else {
    // entire line
    stream.write('\x1b[2K');
  }
}
exports.clearLine = clearLine;


function clearScreenDown(stream) {
  if (stream === null || stream === undefined)
    return;

  stream.write('\x1b[0J');
}
exports.clearScreenDown = clearScreenDown;


function cursorTo(stream, x, y) {
  if (stream === null || stream === undefined)
    return;

  if (typeof x !== 'number' && typeof y !== 'number')
    return;

  if (typeof x !== 'number')
    throw new Error('Can\'t set cursor row without also setting it\'s column');

  if (typeof y !== 'number') {
    stream.write('\x1b[' + (x + 1) + 'G');
  } else {
    stream.write('\x1b[' + (y + 1) + ';' + (x + 1) + 'H');
  }
}
exports.cursorTo = cursorTo;
