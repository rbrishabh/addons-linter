import * as messages from 'messages';
import { VALIDATION_WARNING } from 'const';
import { oneLine } from 'common-tags';
import CSSScanner from 'scanners/css';


describe('CSS Rule InvalidNesting', () => {
  it('should detect invalid nesting', () => {
    const code = oneLine`/* I'm a comment */
      #something {
        .bar {
          height: 100px;
        }
      }`;
    const cssScanner = new CSSScanner(code, 'fakeFile.css');

    return cssScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.INVALID_SELECTOR_NESTING.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });

  it('should not detect invalid nesting', () => {
    const code = oneLine`/* I'm a comment */
      @media only screen and (max-width: 959px) {
          .something-else {
              height: 100px;
          }
      }`;
    const cssScanner = new CSSScanner(code, 'fakeFile.css');

    return cssScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should detect invalid nesting in @media block', () => {
    const code = oneLine`/* I'm a comment */
      @media only screen and (max-width: 959px) {
        .foo {
          .something-else {
              height: 100px;
          }
        }
      }`;
    const cssScanner = new CSSScanner(code, 'fakeFile.css');

    return cssScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.INVALID_SELECTOR_NESTING.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });
});
