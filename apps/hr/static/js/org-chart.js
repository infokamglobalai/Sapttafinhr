(function () {
  var dialog = document.getElementById('org-reassign-dialog');
  var formHost = document.getElementById('org-reassign-form-host');
  var searchInput = document.getElementById('org-chart-search');
  var manageToggle = document.getElementById('org-chart-manage-toggle');

  if (!dialog || !formHost) return;

  function csrfToken() {
    var el = document.querySelector('[name=csrfmiddlewaretoken]');
    return el ? el.value : '';
  }

  function openReassign(employeeId) {
    formHost.innerHTML = '<p class="text-sm text-base-content/60 p-4">Loading…</p>';
    dialog.showModal();
    fetch('/employees/org-chart/reassign/' + employeeId + '/', {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then(function (r) { return r.text(); })
      .then(function (html) { formHost.innerHTML = html; })
      .catch(function () {
        formHost.innerHTML = '<p class="text-sm text-error p-4">Could not load form.</p>';
      });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.org-card__edit');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      openReassign(btn.getAttribute('data-employee-id'));
    }

    var moreBtn = e.target.closest('.org-more-btn');
    if (moreBtn) {
      e.preventDefault();
      var wrap = moreBtn.closest('.org-children-wrap');
      if (wrap) {
        wrap.classList.add('is-expanded');
        var overflow = wrap.querySelector('.org-children--overflow');
        if (overflow) overflow.hidden = false;
        moreBtn.remove();
      }
    }
  });

  formHost.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.matches('form.org-reassign-form')) return;
    e.preventDefault();
    var fd = new FormData(form);
    fetch(form.action, {
      method: 'POST',
      body: fd,
      headers: {
        'X-CSRFToken': csrfToken(),
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          window.location.reload();
          return;
        }
        var err = form.querySelector('.org-reassign-error');
        if (err) err.textContent = data.error || 'Could not save.';
      })
      .catch(function () {
        var err = form.querySelector('.org-reassign-error');
        if (err) err.textContent = 'Network error. Try again.';
      });
  });

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = (searchInput.value || '').trim().toLowerCase();
      document.querySelectorAll('.org-card').forEach(function (card) {
        var name = (card.getAttribute('data-search-name') || '').toLowerCase();
        var match = !q || name.indexOf(q) !== -1;
        card.classList.toggle('org-card--dimmed', !!q && !match);
        card.classList.toggle('org-card--highlight', !!q && match);
      });
    });
  }

  if (manageToggle) {
    manageToggle.addEventListener('change', function () {
      document.body.classList.toggle('org-chart--manage', manageToggle.checked);
    });
  }
})();
