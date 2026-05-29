// Simple C-like lexical analyzer for React

const DEFAULT_KEYWORDS = new Set([
  'if',
  'else',
  'while',
  'for',
  'do',
  'return',
  'break',
  'continue',
  'switch',
  'case',
  'default',
  'int',
  'float',
  'double',
  'char',
  'void',
  'bool',
  'true',
  'false',
  'struct',
  'typedef',
  'const',
  'static',
  'unsigned',
  'signed',
  'long',
  'short',
  'enum',
  'goto',
]);

// Operators/punctuators ordered by length (longest first)
const OPERATORS = [
  '>>=',
  '<<=',
  '++',
  '--',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '<<',
  '>>',
  '->',
  '##',
  '+',
  '-',
  '*',
  '/',
  '%',
  '=',
  '<',
  '>',
  '!',
  '~',
  '&',
  '|',
  '^',
  '?',
  ':',
  '.',
];

const PUNCTUATORS = new Set([';', ',', '(', ')', '{', '}', '[', ']']);

function isWhitespace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';
}

function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}

function isAlpha(ch) {
  const code = ch.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || ch === '_';
}

function isAlphaNum(ch) {
  return isAlpha(ch) || isDigit(ch);
}

function findMaxOperatorAt(source, idx) {
  for (const op of OPERATORS) {
    if (source.startsWith(op, idx)) return op;
  }
  return null;
}

function tokenize(input, options = {}) {
  const keywords = options.keywords ? new Set(options.keywords) : DEFAULT_KEYWORDS;

  const tokens = [];
  const errors = [];
  const symbols = new Map(); // identifier -> {lexeme, firstLine, firstCol}

  let i = 0;
  let line = 1;
  let col = 1;

  function currentChar() {
    return input[i];
  }

  function advance(n = 1) {
    for (let k = 0; k < n; k++) {
      const ch = input[i++];
      if (ch === '\n') {
        line += 1;
        col = 1;
      } else {
        col += 1;
      }
    }
  }

  function addError(startLine, startCol, message, lexeme = '') {
    errors.push({ line: startLine, col: startCol, message, lexeme });
  }

  function addToken(type, lexeme, startLine, startCol) {
    tokens.push({ type, lexeme, line: startLine, col: startCol });
  }

  while (i < input.length) {
    const ch = currentChar();

    // Whitespace
    if (isWhitespace(ch)) {
      advance(1);
      continue;
    }

    // Comments: //... or /* ... */
    if (ch === '/' && input[i + 1] === '/') {
      // ignore //... comment
      while (i < input.length && currentChar() !== '\n') {
        advance(1);
      }
      continue;
    }

    if (ch === '/' && input[i + 1] === '*') {
      const startLine = line;
      const startCol = col;
      advance(2); // consume /*

      while (i < input.length) {
        if (currentChar() === '*' && input[i + 1] === '/') {
          advance(2);
          break;
        }
        advance(1);
      }

      if (i >= input.length) {
        addError(startLine, startCol, 'Unterminated block comment');
      }
      continue;
    }

    // String literals: "..." with simple escapes
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startLine = line;
      const startCol = col;
      let lexeme = quote;
      advance(1);

      let closed = false;
      while (i < input.length) {
        const c = currentChar();
        if (c === '\\') {
          // escape sequence
          lexeme += c;
          advance(1);
          if (i < input.length) {
            lexeme += currentChar();
            advance(1);
          }
          continue;
        }
        if (c === quote) {
          lexeme += quote;
          advance(1);
          closed = true;
          break;
        }
        if (c === '\n' || c === '\r') {
          break;
        }
        lexeme += c;
        advance(1);
      }

      if (!closed) {
        addError(startLine, startCol, 'Unterminated string literal', lexeme);
      } else {
        addToken('STRING_LITERAL', lexeme, startLine, startCol);
      }
      continue;
    }

    // Numbers: integer or decimal (basic)
    if (isDigit(ch) || (ch === '.' && isDigit(input[i + 1]))) {
      const startLine = line;
      const startCol = col;
      let lexeme = '';

      // leading digits or '.'
      if (ch === '.') {
        lexeme += '.';
        advance(1);
      }

      while (i < input.length && isDigit(currentChar())) {
        lexeme += currentChar();
        advance(1);
      }

      // optional decimal part
      if (currentChar() === '.' && isDigit(input[i + 1])) {
        lexeme += '.';
        advance(1);
        while (i < input.length && isDigit(currentChar())) {
          lexeme += currentChar();
          advance(1);
        }
      }

      // optional exponent (e/E with optional sign)
      const c = currentChar();
      if (c === 'e' || c === 'E') {
        const next = input[i + 1];
        const next2 = input[i + 2];
        if (isDigit(next) || next === '+' || next === '-' ? isDigit(next2) : false) {
          lexeme += c;
          advance(1);
          if (currentChar() === '+' || currentChar() === '-') {
            lexeme += currentChar();
            advance(1);
          }
          while (i < input.length && isDigit(currentChar())) {
            lexeme += currentChar();
            advance(1);
          }
        }
      }

      addToken('NUMBER', lexeme, startLine, startCol);
      continue;
    }

    // Identifiers / keywords
    if (isAlpha(ch)) {
      const startLine = line;
      const startCol = col;
      let lexeme = '';
      while (i < input.length && isAlphaNum(currentChar())) {
        lexeme += currentChar();
        advance(1);
      }

      if (keywords.has(lexeme)) {
        addToken('KEYWORD', lexeme, startLine, startCol);
      } else {
        addToken('IDENTIFIER', lexeme, startLine, startCol);
        if (!symbols.has(lexeme)) {
          symbols.set(lexeme, { lexeme, firstLine: startLine, firstCol: startCol });
        }
      }
      continue;
    }

    // Punctuators
    if (PUNCTUATORS.has(ch)) {
      const startLine = line;
      const startCol = col;
      addToken('PUNCTUATOR', ch, startLine, startCol);
      advance(1);
      continue;
    }

    // Operators
    const op = findMaxOperatorAt(input, i);
    if (op) {
      const startLine = line;
      const startCol = col;
      addToken('OPERATOR', op, startLine, startCol);
      advance(op.length);
      continue;
    }

    // Unknown character
    addError(line, col, 'Unrecognized character', ch);
    advance(1);
  }

  return {
    tokens,
    errors,
    symbolTable: Array.from(symbols.values()).sort((a, b) => a.firstLine - b.firstLine || a.firstCol - b.firstCol),
  };
}

export { tokenize };

