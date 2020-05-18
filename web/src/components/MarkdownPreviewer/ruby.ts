import all from 'mdast-util-to-hast/lib/all';
import u from 'unist-builder';
import {Parent, Point} from 'unist';
import {Processor} from 'unified';
import {Tokenizer, Eat} from 'remark-parse';
import {H} from 'mdast-util-to-hast';

// remark
function locateMention(value: string, fromIndex: number) {
  return value.indexOf('{', fromIndex);
}

tokenizeRuby.notInLink = true;
tokenizeRuby.locator = locateMention;

interface TokenizerFunction extends Tokenizer {
  tokenizeBlock: (value: string) => Node | void;
  tokenizeInline: (value: string, location: Point) => Node | void;
}

function tokenizeRuby(
  this: TokenizerFunction,
  eat: Eat & {now: () => Point},
  value: string,
  silent: boolean,
) {
  const match = /^{(.+?)\|(.+?)}/.exec(value);

  if (match) {
    if (silent) {
      return true;
    }

    const now = eat.now();
    now.column += 1;
    now.offset! += 1;

    return eat(match[0])({
      type: 'ruby',
      rubyText: match[2],
      children: this.tokenizeInline(match[1], now),
      data: {hName: 'ruby'},
    });
  }
}

export function rubyParser(this: Processor) {
  if (!this.Parser) {
    return;
  }
  const {inlineTokenizers, inlineMethods} = this.Parser.prototype;
  inlineTokenizers.ruby = tokenizeRuby;
  inlineMethods.splice(inlineMethods.indexOf('text'), 0, 'ruby');
}

// rehype
export function rubyHandler(h: H, node: Parent & {rubyText: string}) {
  const rtStart =
    node.children.length > 0
      ? node.children[node.children.length - 1].position!.end
      : node.position!.start;

  const rtNode = h(
    {
      type: 'element',
      start: rtStart,
      end: node.position!.end,
    },
    'rt',
    [u('text', node.rubyText)],
  );

  return h(node, 'ruby', [...all(h, node), rtNode]);
}
