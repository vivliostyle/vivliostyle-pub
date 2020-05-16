const all = require('mdast-util-to-hast/lib/all');
const u = require('unist-builder');

// remark
function locateMention(value, fromIndex) {
  return value.indexOf('{', fromIndex);
}

tokenizeRuby.notInLink = true;
tokenizeRuby.locator = locateMention;

function tokenizeRuby(eat, value, silent) {
  const match = /^{(.+?)\|(.+?)}/.exec(value);

  if (match) {
    if (silent) {
      return true;
    }

    const now = eat.now();
    now.column += 1;
    now.offset += 1;

    return eat(match[0])({
      type: 'ruby',
      rubyText: match[2],
      children: this.tokenizeInline(match[1], now),
      data: {hName: 'ruby'},
    });
  }
}

function rubyParser() {
  if (!this.Parser) {
    return;
  }
  const {inlineTokenizers, inlineMethods} = this.Parser.prototype;
  inlineTokenizers.ruby = tokenizeRuby;
  inlineMethods.splice(inlineMethods.indexOf('text'), 0, 'ruby');
}

// rehype
function rubyHandler(h, node) {
  const rtStart =
    node.children.length > 0
      ? node.children[node.children.length - 1].position.end
      : node.position.start;

  const rtNode = h(
    {
      start: rtStart,
      end: node.position.end,
    },
    'rt',
    [u('text', node.rubyText)],
  );

  return h(node, 'ruby', [...all(h, node), rtNode]);
}

module.exports = {rubyParser, rubyHandler}