(() => {
  if (window.TaskBeeTheme) return;
  const config = JSON.parse(document.getElementById('taskbee-appearance').textContent);
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: dark)');
  const known = new Map(config.themes.map(theme => [theme.id, theme]));
  const storageKey = `taskbee:theme:${config.userId}`;
  function stored() { try { return localStorage.getItem(storageKey); } catch { return null; } }
  function apply(choice) {
    if (choice !== 'system' && !known.has(choice)) choice = 'system';
    const resolved = choice === 'system' ? (media.matches ? 'dark' : 'light') : choice;
    const theme = known.get(resolved);
    root.dataset.theme = resolved;
    root.dataset.themeChoice = choice;
    root.dataset.mode = theme.mode;
    root.dataset.pattern = theme.pattern;
    root.classList.toggle('dark-mode',theme.mode === 'dark');
    document.body?.classList.remove('dark-mode');
    document.querySelectorAll('[data-current-theme]').forEach(el => { el.textContent = theme.name; });
    document.querySelectorAll('.theme-switch [data-theme]').forEach(el => el.setAttribute('aria-pressed',el.dataset.theme === choice));
    document.querySelectorAll('[data-theme-select]').forEach(el => { el.value = choice; });
    document.dispatchEvent(new CustomEvent('taskbee:themechange',{ detail:{choice,theme} }));
    return theme;
  }
  let saving = false;
  async function select(choice) {
    if (saving) return;
    const previous = root.dataset.themeChoice;
    saving = true;
    document.querySelectorAll('[data-theme-select],.theme-switch button').forEach(el => { el.disabled = true; });
    apply(choice);
    try {
      if (config.authenticated) {
        const response = await fetch('/api/atualizar-tema',{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':config.csrf},body:JSON.stringify({tema:choice})});
        if (!response.ok) throw new Error('Não foi possível salvar esse tema. Tente novamente.');
      }
      try { localStorage.setItem(storageKey,choice); localStorage.setItem('tema',choice); } catch { /* Navegação privada permite usar o tema nesta página. */ }
      document.querySelectorAll('[data-theme-feedback]').forEach(el => { el.textContent = 'Aparência salva.'; });
    } catch (error) {
      apply(previous);
      document.querySelectorAll('[data-theme-feedback]').forEach(el => { el.textContent = error.message; });
    } finally {
      saving = false;
      document.querySelectorAll('[data-theme-select],.theme-switch button').forEach(el => { el.disabled = false; });
    }
  }
  window.TaskBeeTheme = {config,apply,select};
  apply(config.saved || stored() || 'system');
  media.addEventListener('change',() => { if(root.dataset.themeChoice === 'system') apply('system'); });
  document.addEventListener('DOMContentLoaded',() => {
    apply(root.dataset.themeChoice);
    document.querySelectorAll('[data-theme-select]').forEach(el => el.addEventListener('change',event => select(event.target.value)));
    document.querySelectorAll('.theme-switch [data-theme]').forEach(el => el.addEventListener('click',() => select(el.dataset.theme)));
  });
})();
