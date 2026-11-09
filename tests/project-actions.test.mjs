import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const attributes = source => Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2].replaceAll('&amp;', '&')]));
const actions = new Map([...html.matchAll(/(<a\b[^>]*data-cta-id="[^"]+"[^>]*>)([\s\S]*?)<\/a>/g)].map(([, opening, body]) => {
  const attrs = attributes(opening);
  return [attrs['data-cta-id'], { attrs, opening, label:body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() }];
}));

test('the six core actions prioritize inquiries and provide a distinct secondary work route', () => {
  assert.equal(actions.size, 6);
  const inquiry = actions.get('hero-inquiry'), work = actions.get('hero-work');
  assert.equal(inquiry.label, 'Discuss your project');
  assert.equal(inquiry.attrs.href, '#contact');
  assert.match(inquiry.attrs.class, /button-dark/);
  assert.match(inquiry.opening, /\bdata-contact-scroll\b/);
  assert.equal(work.label, 'See selected work');
  assert.equal(work.attrs.href, '#work');
  assert.doesNotMatch(work.attrs.class, /button-dark/);
  assert.equal(actions.get('nav-inquiry').attrs.href, '#contact');
  assert.match(html, /<h2 id="contact-title">Let’s discuss/);
  assert.match(html, /<section[^>]*id="work"/);
});

test('the inquiry action creates an honest email draft with a valid address and project prompts', () => {
  const action = actions.get('contact-email');
  const url = new URL(action.attrs.href);
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, 'email@sujeetkhadka.com.np');
  assert.equal(action.label, 'Email your project brief');
  assert.equal(action.attrs['data-cta-intent'], 'email-draft');
  assert.match(url.searchParams.get('subject'), /Project inquiry/);
  const body = url.searchParams.get('body');
  for (const prompt of ['Project:', 'What I need help with:', 'Timeline:']) assert.ok(body.includes(prompt));
  assert.match(html, /Opens an email draft with a few prompts/);
  assert.match(html, /Or write to <span>email@sujeetkhadka.com.np<\/span>/);
});

test('supporting resource labels match their destinations and measurement hooks contain no visitor data', () => {
  const cv = actions.get('about-cv'), notes = actions.get('about-notes');
  assert.match(cv.label, /CV \(PDF\)/);
  assert.ok(existsSync(new URL(`../${cv.attrs.href}`, import.meta.url)));
  assert.equal(notes.label, 'Read my design notes');
  assert.equal(notes.attrs.href, 'https://blog.sujeetkhadka.com.np');
  for (const action of actions.values()) {
    assert.equal(action.attrs['data-cta-version'], 'project-inquiry-v1');
    assert.ok(['inquiry', 'work', 'background', 'notes', 'email-draft'].includes(action.attrs['data-cta-intent']));
    assert.equal(action.attrs['aria-label'], undefined, 'Use the visible wording as the accessible name');
  }
});
