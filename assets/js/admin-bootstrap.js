(() => {
  let preference = 'mono';
  try {
    const stored = JSON.parse(localStorage.getItem('sk-a11y-prefs'));
    if (['mono', 'original', 'dark', 'auto'].includes(stored?.theme)) preference = stored.theme;
  } catch {}
  document.documentElement.dataset.theme = preference === 'auto'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'original') : preference;
  setTimeout(() => {
    if (document.documentElement.dataset.adminReady !== 'true') {
      document.getElementById('login-message').textContent = 'Sign-in could not connect. Check your connection and reload.';
    }
  }, 10000);
})();
