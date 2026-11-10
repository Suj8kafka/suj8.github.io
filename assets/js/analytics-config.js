// Public configuration only. Credentials belong in Cloudflare Worker secrets.
export const analyticsEndpoint = 'https://nameless-truth-99f0.sujeetkhadka00001.workers.dev';
export const pageLabels = { '/': 'Portfolio', '/privacy/': 'Analytics & privacy' };
export const sectionLabels = {
  hero: 'Introduction', work: 'Selected work', experience: 'Experience',
  skills: 'Skills', writing: 'Writing', about: 'About', contact: 'Contact'
};
export const interactionLabels = {
  'project-open': 'Project opened', 'resume-download': 'CV link clicked',
  'contact-email': 'Email link clicked', 'social-link': 'Social link clicked',
  'blog-open': 'Notebook link clicked', 'article-open': 'Article opened',
  'skill-open': 'Skill explored', 'theme-change': 'Theme selected'
};
export const depthLabels = { '25': 'Reached 25%', '50': 'Reached 50%', '75': 'Reached 75%', '100': 'Reached the bottom' };
