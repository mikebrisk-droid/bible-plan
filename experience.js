(function () {
  const isHome = window.stillwordHome;
  document.body.classList.toggle('home-active', isHome);
  document.body.classList.toggle('planner-active', !isHome);
  if (!isHome) {
    const settings = document.querySelector('#settings');
    ['section-books', 'section-time', 'section-days', 'section-format', 'section-options'].forEach(id => settings.appendChild(document.getElementById(id)));
    const names = ['01  What to read', '02  Your schedule', '03  Reading days', '04  Plan layout', '05  More options'];
    const intro = document.createElement('div');
    intro.className = 'settings-intro';
    intro.innerHTML = '<strong>Customize plan</strong><span>Changes update your preview</span>';
    settings.prepend(intro);
    const preview = document.createElement('div');
    preview.className = 'preview-heading';
    preview.innerHTML = '<div><span class="eyebrow">LIVE PREVIEW</span><h2>Your plan</h2></div><a href="#settings">Edit plan</a>';
    document.querySelector('#output').before(preview);
    const exportBar = document.createElement('div');
    exportBar.className = 'export-bar';
    exportBar.setAttribute('aria-label', 'Export plan');
    ['action-print', 'download-ics', 'download-csv'].forEach(id => exportBar.appendChild(document.getElementById(id)));
    preview.appendChild(exportBar);
    if (document.body.classList.contains('settings-collapsed')) document.querySelector('#toggle-settings').click();
    document.querySelectorAll('#settings .decision').forEach((section, index) => {
      const heading = section.querySelector('header h2');
      const body = section.querySelector('.decision-body');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'decision-toggle';
      button.textContent = names[index];
      button.setAttribute('aria-expanded', index < 2 ? 'true' : 'false');
      body.hidden = index >= 2;
      heading.replaceChildren(button);
      button.addEventListener('click', () => {
        body.hidden = !body.hidden;
        button.setAttribute('aria-expanded', String(!body.hidden));
      });
    });
  }
  if (isHome && window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.from('.home-heading > :not(.hero-art), .section-heading, .plan-card', { y: 16, opacity: 0, duration: .65, stagger: .08, ease: 'power2.out' });
    gsap.from('.hero-art', { scale: .95, opacity: 0, duration: 1, ease: 'power2.out' });
  }
})();
