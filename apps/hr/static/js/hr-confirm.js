/**
 * In-app confirmation dialogs — replaces window.confirm() for branded UX.
 *
 * Usage on a button inside a form:
 *   <button type="button" data-hr-confirm
 *           data-hr-confirm-title="Confirm exit"
 *           data-hr-confirm-message="Mark employee on notice?"
 *           data-hr-confirm-ok="Yes, continue"
 *           data-hr-confirm-tone="danger">Submit</button>
 *
 * Or programmatically: SapttaConfirm.ask({ title, message, confirmText, tone }).then(ok => ...)
 */
(function () {
  var dialog, titleEl, msgEl, iconEl, okBtn, cancelBtn;
  var resolver = null;
  var pendingForm = null;

  function init() {
    dialog = document.getElementById('hr-confirm-dialog');
    if (!dialog) return false;
    titleEl = document.getElementById('hr-confirm-title');
    msgEl = document.getElementById('hr-confirm-message');
    iconEl = document.getElementById('hr-confirm-icon');
    okBtn = document.getElementById('hr-confirm-ok');
    cancelBtn = document.getElementById('hr-confirm-cancel');

    cancelBtn.addEventListener('click', function () {
      finish(false);
    });

    okBtn.addEventListener('click', function () {
      finish(true);
    });

    dialog.addEventListener('close', function () {
      if (resolver) {
        var r = resolver;
        resolver = null;
        r(false);
      }
    });

    dialog.addEventListener('cancel', function (e) {
      e.preventDefault();
      finish(false);
    });

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-hr-confirm]');
      if (!btn) return;
      e.preventDefault();

      var formId = btn.getAttribute('data-hr-confirm-form');
      var form = formId ? document.getElementById(formId) : btn.closest('form');
      if (!form) return;

      ask({
        title: btn.getAttribute('data-hr-confirm-title') || 'Confirm',
        message:
          btn.getAttribute('data-hr-confirm-message') ||
          btn.getAttribute('data-hr-confirm') ||
          'Are you sure you want to continue?',
        confirmText: btn.getAttribute('data-hr-confirm-ok') || 'Continue',
        cancelText: btn.getAttribute('data-hr-confirm-cancel-text') || 'Cancel',
        tone: btn.getAttribute('data-hr-confirm-tone') || 'primary',
      }).then(function (ok) {
        if (ok) {
          if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
          } else {
            form.submit();
          }
        }
      });
    });

    return true;
  }

  function setTone(tone) {
    okBtn.classList.remove('btn-primary', 'btn-error', 'btn-warning');
    iconEl.classList.remove('is-danger', 'is-warning', 'is-primary');

    if (tone === 'danger') {
      okBtn.classList.add('btn-error');
      iconEl.classList.add('is-danger');
      iconEl.textContent = '!';
    } else if (tone === 'warning') {
      okBtn.classList.add('btn-warning');
      iconEl.classList.add('is-warning');
      iconEl.textContent = '⚠';
    } else {
      okBtn.classList.add('btn-primary');
      iconEl.classList.add('is-primary');
      iconEl.textContent = '?';
    }
  }

  function finish(confirmed) {
    if (!dialog) return;
    if (resolver) {
      var r = resolver;
      resolver = null;
      r(!!confirmed);
    }
    if (dialog.open) dialog.close();
    pendingForm = null;
  }

  function ask(opts) {
    if (!dialog && !init()) {
      return Promise.resolve(window.confirm(opts.message || 'Continue?'));
    }

    titleEl.textContent = opts.title || 'Confirm';
    msgEl.textContent = opts.message || '';
    okBtn.textContent = opts.confirmText || 'Continue';
    cancelBtn.textContent = opts.cancelText || 'Cancel';
    setTone(opts.tone || 'primary');
    pendingForm = opts.form || null;

    return new Promise(function (resolve) {
      resolver = resolve;
      dialog.showModal();
      setTimeout(function () {
        okBtn.focus();
      }, 50);
    });
  }

  window.SapttaConfirm = { ask: ask };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
