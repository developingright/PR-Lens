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

test('action-linked images are excluded at every depth, including outside the markdown body', () => {
  for (const depth of [0, 1, 5, 50, 250]) {
    const nested = `${'<span>'.repeat(depth)}<img src="https://example.com/fix.png" />${'</span>'.repeat(depth)}`;
    for (const href of [
      '',
      'href="#fix-issue"',
      'href="https://example.com/fix"',
      'href="https://example.com/fix.png?signature=preserved"',
    ]) {
      for (const linked of [
        `<div class="markdown-body"><a ${href}>${nested}</a></div>`,
        `<a ${href}><div class="markdown-body">${nested}</div></a>`,
      ]) {
        assert.equal(discover(linked).length, 0, `depth=${depth}, ${href}`);
      }
    }
  }
});

test('self-image links and unlinked pictures qualify while mixed and multi-image links do not', () => {
  const signed = 'https://example.com/image.png?token=fixture&signature=keep%2Bme';
  const images = discover(`<div class="markdown-body">
    <a href="${signed}"><picture><source srcset="${signed}" /><img src="${signed}" /></picture></a>
    <a href="#fix">Fix issue <span><img src="${signed}" /></span></a>
    <a href="#many"><img src="${signed}" /><img src="${signed}" /></a>
    <picture><img src="${signed}" alt="Standalone screenshot" /></picture>
  </div>`);
  assert.equal(images.length, 2);
  assert.equal(images[1]?.title, 'Standalone screenshot');
  assert.equal(images[0]?.src, signed);
  assert.equal(images[0]?.originalUrl, signed);
});

test('GitHub image-only wrappers qualify at every depth with signed URLs intact', () => {
  const signed = 'https://github.com/user-attachments/assets/fixture?signature=keep%2Bme';
  for (const depth of [0, 1, 5, 50, 250]) {
    const [image] = discover(
      `<div class="markdown-body"><a target="_blank" rel="noopener noreferrer" href="${signed}">${'<span>'.repeat(depth)}<picture><img src="${signed}" /></picture>${'</span>'.repeat(depth)}</a></div>`,
    );
    assert.equal(image?.src, signed, `depth=${depth}`);
    assert.equal(image?.originalUrl, signed);
  }
});

test('proxied images can link to their canonical original without replacing their display source', () => {
  const display = 'https://camo.githubusercontent.com/fixture/proxy';
  const original = 'https://example.com/original.png?signature=keep%2Bme';
  const [image] = discover(
    `<div class="markdown-body"><a href="${original}"><img src="${display}" data-canonical-src="${original}" /></a></div>`,
  );
  assert.equal(image?.src, display);
  assert.equal(image?.originalUrl, original);
});

test('image-looking action destinations and changed query parameters do not qualify', () => {
  const src = 'https://github.com/assets/fixture.svg?signature=keep';
  for (const href of [
    'https://github.com/assets/fix.svg',
    'https://github.com/user-attachments/assets/action',
    'https://github.com/assets/fixture.svg?signature=keep&action=fix',
    'javascript:alert(1)',
  ]) {
    assert.equal(
      discover(`<div class="markdown-body"><a href="${href}"><img src="${src}" /></a></div>`)
        .length,
      0,
    );
  }
});

test('image controls and ARIA links/buttons are excluded on the image itself or an ancestor', () => {
  for (const control of [
    '<button><span>IMAGE</span></button>',
    '<span role="link"><span>IMAGE</span></span>',
    '<div role="button"><picture>IMAGE</picture></div>',
    '<div role="unsupported link">IMAGE</div>',
    '<div role="link"><div class="markdown-body">IMAGE</div></div>',
  ]) {
    assert.equal(
      discover(
        `<div class="markdown-body">${control.replace('IMAGE', '<img src="https://example.com/action.png" />')}</div>`,
      ).length,
      0,
    );
  }
  for (const role of ['link', 'button']) {
    assert.equal(
      discover(
        `<div class="markdown-body"><img role="${role}" src="https://example.com/action.png" /></div>`,
      ).length,
      0,
    );
  }
});

test('wrapping and unwrapping an existing image updates eligibility without changing its identity', () => {
  const dom = new JSDOM(screenshot, { url: base });
  try {
    const doc = dom.window.document;
    const element = doc.querySelector('img')!;
    const [original] = discoverImages(doc);
    const anchor = doc.createElement('a');
    element.before(anchor);
    anchor.append(element);
    assert.equal(discoverImages(doc).length, 0);
    anchor.replaceWith(element);
    assert.equal(discoverImages(doc)[0]?.image.id, original?.image.id);
    element.parentElement!.setAttribute('role', 'link');
    assert.equal(discoverImages(doc).length, 0);
    element.parentElement!.removeAttribute('role');
    assert.equal(discoverImages(doc)[0]?.image.id, original?.image.id);
  } finally {
    dom.window.close();
  }
});
