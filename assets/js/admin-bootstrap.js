(() => {
  let preference = 'auto';
  try { preference = localStorage.getItem('portfolio-theme') || 'auto'; } catch {}
  document.documentElement.dataset.theme = preference === 'dark' || preference === 'light'
    ? preference : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTimeout(() => {
    if (document.documentElement.dataset.adminReady !== 'true') {
      document.getElementById('login-message').textContent = 'Sign-in could not connect. Check your connection and reload.';
    }
  }, 10000);
})();
