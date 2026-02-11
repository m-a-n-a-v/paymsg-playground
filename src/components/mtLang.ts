/**
 * CodeMirror 6 language support for SWIFT MT messages
 * Provides syntax highlighting for MT message structure
 */

import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * Stream parser for MT message syntax
 */
const mtLanguage = StreamLanguage.define({
  name: 'mt',
  startState: () => ({ inBlock: false, blockType: '' }),

  token: (stream, state) => {
    // Handle block delimiters: {1:, {2:, {3:, {4:, {5:
    if (stream.match(/^\{[1-5]:/)) {
      state.inBlock = true;
      state.blockType = stream.current()[1] ?? '';
      return 'keyword';
    }

    // Handle closing braces
    if (stream.match(/^-?\}/)) {
      state.inBlock = false;
      return 'keyword';
    }

    // Handle nested braces in Block 3 and Block 5: {TAG:VALUE}
    if (stream.match(/^\{[A-Z0-9]+:/)) {
      return 'keyword';
    }

    // Handle field tags: :NN: or :NNa:
    if (stream.match(/^:[0-9]{2,3}[A-Z]?:/)) {
      return 'propertyName';
    }

    // Handle amounts (numbers with comma decimal separator)
    if (stream.match(/^\d+,\d{2}/)) {
      return 'number';
    }

    // Handle plain numbers
    if (stream.match(/^\d+/)) {
      return 'number';
    }

    // Handle currency codes (3 uppercase letters)
    if (stream.match(/^[A-Z]{3}(?=\d|,|\s|$)/)) {
      return 'typeName';
    }

    // Handle dates (YYMMDD or YYYYMMDD)
    if (stream.match(/^\d{6}(?!\d)/) || stream.match(/^\d{8}(?!\d)/)) {
      return 'string';
    }

    // Handle BICs (8 or 11 uppercase letters/digits)
    if (stream.match(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?(?=\s|$|:)/)) {
      return 'className';
    }

    // Default: consume one character
    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: '//' },
  },
});

/**
 * MT language support with syntax highlighting
 */
export function mt(): LanguageSupport {
  return new LanguageSupport(mtLanguage);
}

/**
 * Syntax highlighting theme for MT messages
 * Maps token types to Lezer highlight tags
 */
export const mtHighlightStyle = [
  { tag: t.keyword, class: 'cm-mt-block' },           // Block delimiters
  { tag: t.propertyName, class: 'cm-mt-tag' },        // Field tags
  { tag: t.number, class: 'cm-mt-amount' },           // Amounts and numbers
  { tag: t.typeName, class: 'cm-mt-currency' },       // Currency codes
  { tag: t.string, class: 'cm-mt-date' },             // Dates
  { tag: t.className, class: 'cm-mt-bic' },           // BICs
];
