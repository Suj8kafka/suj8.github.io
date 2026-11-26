import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const attributes = source => Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2].replaceAll('&amp;', '&')]));
const actions = new Map([...html.matchAll(/(<a\b[^>]*data-cta-id="[^"]+"[^>]*>)([\s\S]*?)<\/a>/g)].map(([, opening, body]) => {
  const attrs = attributes(opening);
  return [attrs['data-cta-id'], { attrs, opening, label:body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() }];
}));

test('experience puts current work first and records Aama Cure as completed employment', () => {
  const section = html.match(/<section[^>]*id="experience"[\s\S]*?<\/section>/)[0];
  const roles = [...section.matchAll(/<li\b[\s\S]*?<\/li>/g)].map(([role]) => role);
  assert.match(roles[0], /Upwork · webapex\.com\.au/);
  assert.match(roles[0], /Current · Freelance/);
  assert.match(roles[0], /datetime="2025-08">Aug 2025<\/time>/);
  assert.doesNotMatch(roles[0], /Aug 2026|datetime="2026-08"/);
  assert.match(roles[1], /Neptune TechZone · Aama Cure/);
  assert.match(roles[1], /datetime="2026-06">Jun 2026/);
  assert.doesNotMatch(roles[1], /Present|Current/);
  assert.match(roles[2], /KMAG Pvt\. Ltd\./);
  assert.match(roles[3], /Okay Journey Pvt\. Ltd\./);
});

test('the homepage leads with selected work and keeps a distinct contact route', () => {
  assert.equal(actions.size, 7);
  const inquiry = actions.get('hero-inquiry'), work = actions.get('hero-work');
  assert.equal(inquiry.label, 'Get in touch');
  assert.equal(inquiry.attrs.href, '#contact');
  assert.doesNotMatch(inquiry.attrs.class, /button-dark/);
  assert.match(inquiry.opening, /\bdata-contact-scroll\b/);
  assert.equal(work.label, 'Explore selected work');
  assert.equal(work.attrs.href, '#work');
  assert.match(work.attrs.class, /button-dark/);
  assert.equal(actions.get('nav-inquiry').attrs.href, '#contact');
  assert.ok(html.indexOf(work.opening) < html.indexOf(inquiry.opening));
  assert.match(html, /<h2 id="contact-title">A product challenge,/);
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
  for (const prompt of ['Project or opportunity:', 'What I need help with:', 'Timeline:']) assert.ok(body.includes(prompt));
  assert.match(html, /This opens an email draft with a few prompts/);
  assert.match(html, /Or write to <a href="mailto:email@sujeetkhadka.com.np">email@sujeetkhadka.com.np<\/a>/);
});

test('one project contact card also welcomes opportunities on a team', () => {
  const contact = html.match(/<section\b[^>]*id="contact"[\s\S]*?<\/section>/)[0];
  assert.equal([...contact.matchAll(/<article\b/g)].length, 1);
  assert.match(contact, /<h3 id="project-contact-title">I have a project<\/h3>/);
  assert.match(contact, /Tell me about your project, product challenge, or an opportunity on your team/);
  assert.equal(actions.has('contact-hiring'), false);
});

test('supporting resource labels match their destinations and measurement hooks contain no visitor data', () => {
  const cv = actions.get('about-cv'), notes = actions.get('about-notes');
  assert.match(cv.label, /resume \(PDF\)/);
  assert.ok(existsSync(new URL(`../${cv.attrs.href}`, import.meta.url)));
  assert.equal(notes.label, 'Browse my project notebook');
  assert.equal(notes.attrs.href, '/blog/');
  for (const action of actions.values()) {
    assert.equal(action.attrs['data-cta-version'], 'portfolio-home-v2');
    assert.ok(['inquiry', 'work', 'background', 'notes', 'email-draft'].includes(action.attrs['data-cta-intent']));
    assert.equal(action.attrs['aria-label'], undefined, 'Use the visible wording as the accessible name');
  }
  assert.equal(actions.get('nav-cv').attrs.href, cv.attrs.href);
});

test('the simplified navigation, proof links and skip link all reach real resources', () => {
  const nav = html.match(/<nav class="nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
  const destinations = [...nav.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(destinations, ['#work', '#about', '#writing', actions.get('about-cv').attrs.href]);
  for (const [, id] of html.matchAll(/<a\b[^>]*href="#([^"]+)"/g)) {
    assert.match(html, new RegExp(`\\bid="${id}"`), `Missing anchor destination: ${id}`);
  }
  assert.match(html, /<a class="skip-link" href="#top">Skip to content<\/a>/);
  assert.match(html, /<main id="top" tabindex="-1">/);
  const grid = html.match(/<div class="featured-work-grid">([\s\S]*?)<div class="more-projects">/)[1];
  assert.equal([...grid.matchAll(/class="featured-work-card\b/g)].length, 3);
  assert.match(grid, /Independent redesign · Proposal/);
  assert.match(grid, /Visit live product/);
  assert.doesNotMatch(grid, /nakka/);
});
