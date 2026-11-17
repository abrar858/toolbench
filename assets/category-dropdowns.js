// Accessible category menus, populated from existing footer tool directory.
(() => {
  const nav = document.querySelector('.site-head .top nav[aria-label="Categories"]');
  const directory = document.querySelector('.tool-directory');
  if (!nav || !directory) return;
  const sections = [...directory.querySelectorAll(':scope > div')];
  nav.classList.add('category-dropdown-nav');
  nav.innerHTML = sections.map((section, index) => {
    const title = (section.querySelector('h2')?.textContent || 'Tools').replace(/ tools$/, '');
    const links = section.querySelector('ul')?.innerHTML || '';
    return '<details class="category-dropdown"><summary>' + title + '<span aria-hidden="true">⌄</span></summary><ul aria-label="' + title + '">' + links + '</ul></details>';
  }).join('') + '<details class="category-dropdown"><summary>Automations<span aria-hidden="true">⌄</span></summary><ul aria-label="Automation tools"><li><a href="automation-builder.html">Automation Builder</a></li></ul></details>';
  const style = document.createElement('style');
  style.textContent = `
    .site-head .top nav.category-dropdown-nav {overflow:visible;gap:3px;flex:1;justify-content:center}
    .category-dropdown {position:relative;flex:0 0 auto}
    .category-dropdown summary {cursor:pointer;list-style:none;display:flex;align-items:center;gap:6px;padding:9px 11px;border-radius:999px;color:var(--muted);font-weight:600;white-space:nowrap;font-size:.9rem}
    .category-dropdown summary::-webkit-details-marker {display:none}
    .category-dropdown summary:hover,.category-dropdown[open] summary {background:var(--surface);color:var(--ink)}
    .category-dropdown summary:focus-visible {outline:3px solid var(--ring);outline-offset:2px}
    .category-dropdown summary span {font-size:1.1rem;transition:transform .15s}
    .category-dropdown[open] summary span {transform:rotate(180deg)}
    .category-dropdown ul {position:absolute;z-index:100;top:calc(100% + 8px);left:0;list-style:none;margin:0;padding:8px;min-width:235px;max-width:min(320px,calc(100vw - 32px));max-height:min(65vh,480px);overflow-y:auto;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-md)}
    .category-dropdown:nth-last-child(-n+2) ul {left:auto;right:0}
    .site-head .top nav.category-dropdown-nav ul a {display:block;border-radius:7px;padding:9px 12px;white-space:normal;color:var(--ink);font-weight:500;text-decoration:none}
    .site-head .top nav.category-dropdown-nav ul a:hover,.site-head .top nav.category-dropdown-nav ul a:focus-visible {background:var(--tint);color:var(--tint-ink)}
    @media(max-width:800px) {
      .site-head .top {flex-wrap:wrap}
      .site-head .top nav.category-dropdown-nav {order:3;flex-basis:100%;justify-content:flex-start;flex-wrap:wrap;gap:0}
      .category-dropdown summary {padding:7px 10px;font-size:.85rem}
      .category-dropdown ul {position:fixed;top:auto;left:16px!important;right:16px!important;width:auto;max-width:none;max-height:55vh}
    }
  `;
  document.head.appendChild(style);
  const menus = [...nav.querySelectorAll('details')];
  menus.forEach(menu => menu.addEventListener('toggle', () => {
    if (menu.open) menus.forEach(other => { if (other !== menu) other.open = false; });
  }));
  document.addEventListener('click', event => {
    if (!nav.contains(event.target)) menus.forEach(menu => { menu.open = false; });
  });
  nav.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = menus.find(menu => menu.open);
    if (open) { open.open = false; open.querySelector('summary').focus(); event.preventDefault(); }
  });
})();
