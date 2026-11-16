import { describe, expect, it } from 'vitest';
import { profile } from '../src/data/profile';
import { cardLines, cardToAnsi, cardToHtml } from '../src/lib/card';

describe('curl card', () => {
  const lines = cardLines(profile);

  it('matches the card shown on the page', () => {
    const plain = lines.map((l) => l.map((s) => s.text).join('')).join('\n');
    expect(plain).toBe(
      [
        '',
        '  akila induranga',
        '  senior software engineer, wso2 · maintainer, openchoreo',
        '  observability · kubernetes · platform engineering',
        '',
        '  github    github.com/akila-i',
        '  linkedin  linkedin.com/in/akila-i',
        '  medium    akila-i.medium.com',
        '  yaml      curl akila.dev/akila.yaml',
        '',
        '  ● Ready · OpenToConversations',
      ].join('\n'),
    );
  });

  it('colors terminals with ANSI and never leaks HTML', () => {
    const ansi = cardToAnsi(lines);
    expect(ansi).toContain('\x1b[1;33makila induranga\x1b[0m');
    expect(ansi).not.toMatch(/<span/);
  });

  it('escapes HTML output', () => {
    expect(cardToHtml([[{ text: '<b>', tone: 'acc' }]])).toBe('<span class="t-acc">&lt;b&gt;</span>');
  });
});
