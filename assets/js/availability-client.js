import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getDatabase, ref, onValue } from './firebase-database.js';
import { firebaseConfig } from './firebase-config.js';
import { applyAvailability } from './availability.js';

// Separate app instance: public settings never change anonymous visitor authentication.
const app = initializeApp(firebaseConfig, 'portfolio-settings');
onValue(ref(getDatabase(app), 'siteSettings/availability'), snapshot => {
  if (!snapshot.exists()) return;
  try { applyAvailability(document, snapshot.val()); }
  catch (error) { console.warn('Availability settings are invalid; keeping the published status.', error); }
}, error => {
  console.warn('Availability updates could not be loaded; keeping the published status.', error);
});
