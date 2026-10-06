import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { discoverImages } from '../../src/github/discovery';

// Only the DOM surface used by these tests needs a type; jsdom stays a dev dependency.
const { JSDOM } = createRequire(import.meta.url)('jsdom') as {
  JSDOM: new (
    html: string,
    options: { url: string },
  ) => {
    window: { document: Document; close: () => void };
  };
};
const screenshot = '<div class="markdown-body"><img src="https://example.com/image.png" /></div>';
const base = 'https://github.com/example/project/pull/9';

function discover(html: string, url = base) {
  const dom = new JSDOM(html, { url });
  try {
    return discoverImages(dom.window.document).map((entry) => entry.image);
  } finally {
    dom.window.close();
  }
}

test('description images link to the description rather than masquerading as comments', () => {
  const [image] = discover(`<article class="timeline-comment" id="issue-10">
    <header><span class="author">maya</span></header>${screenshot}</article>`);
  assert.equal(image?.sourceUrl, `${base}#issue-10`);
  assert.equal(image?.context, 'PR description');
});

test('quoted links in a comment body never become the source permalink', () => {
  const [image] = discover(`<article class="timeline-comment" id="issuecomment-22">
    <span class="author">alex</span>
    <div class="markdown-body"><a href="${base}#issuecomment-99">Quoted discussion</a>
    <img src="https://example.com/image.png" /></div></article>`);
  assert.equal(image?.sourceUrl, `${base}#issuecomment-22`);
});

test('a generic wrapper ID does not override the enclosing comment anchor', () => {
  const [image] = discover(`<section id="issuecomment-23">
    <article class="timeline-comment" id="internal-wrapper">${screenshot}</article></section>`);
  assert.equal(image?.sourceUrl, `${base}#issuecomment-23`);
});

test('review header permalinks preserve their conversation destination from the files route', () => {
  const [image] = discover(
    `<article class="review-comment">
    <header><a href="${base}#discussion_r99">Timestamp</a></header>${screenshot}</article>`,
    `${base}/files`,
  );
  assert.equal(image?.sourceUrl, `${base}#discussion_r99`);
});

test('unrelated or external comment links are not offered as source destinations', () => {
  for (const href of [
    'https://github.com/example/project/pull/10#issuecomment-22',
    'https://example.com/#issuecomment-22',
  ]) {
    const [image] = discover(`<article class="timeline-comment">
      <header><a href="${href}">Reference</a></header>${screenshot}</article>`);
    assert.equal(image?.sourceUrl, null);
  }
});

test('comments without a usable permalink omit the location action', () => {
  const [image] = discover(`<article class="timeline-comment" id="internal-wrapper">
    ${screenshot}</article>`);
  assert.equal(image?.sourceUrl, null);
});
