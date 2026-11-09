import { forceWebSockets } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js';

// Configure once, before any consumer creates a database reference. Long polling
// injects an iframe with a deprecated unload listener into the public page.
forceWebSockets();

export * from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js';
