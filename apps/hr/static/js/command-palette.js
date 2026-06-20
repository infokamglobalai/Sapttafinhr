/**
 * ⌘K / Ctrl+K command palette — filterable quick links from server context.
 */
document.addEventListener('alpine:init', () => {
  Alpine.data('commandPalette', () => {
    const el = document.getElementById('command-palette-data');
    const links = el ? JSON.parse(el.textContent) : [];

    return {
      open: false,
      query: '',
      selected: 0,
      links,

      get filtered() {
        const q = (this.query || '').trim().toLowerCase();
        if (!q) return this.links;
        return this.links.filter((item) => {
          const hay = `${item.label} ${item.group} ${item.keys || ''}`.toLowerCase();
          return hay.includes(q);
        });
      },

      onGlobalKeydown(e) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          this.toggle();
        }
      },

      toggle() {
        if (this.open) this.close();
        else this.show();
      },

      show() {
        this.open = true;
        this.query = '';
        this.selected = 0;
        document.body.classList.add('cmd-palette-open');
        this.$nextTick(() => {
          if (this.$refs.paletteInput) this.$refs.paletteInput.focus();
        });
      },

      close() {
        this.open = false;
        document.body.classList.remove('cmd-palette-open');
      },

      move(delta) {
        const n = this.filtered.length;
        if (!n) return;
        this.selected = (this.selected + delta + n) % n;
      },

      goSelected() {
        const item = this.filtered[this.selected];
        if (item && item.url) window.location.href = item.url;
      },
    };
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('command-palette-root');

  document.querySelectorAll('.topbar-search__kbd').forEach((kbd) => {
    kbd.addEventListener('click', (e) => {
      e.preventDefault();
      if (root && root._x_dataStack) root._x_dataStack[0].show();
    });
  });
});
