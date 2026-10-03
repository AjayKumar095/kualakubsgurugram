/**
 * /js/admin-dashboard.js
 * All dashboard behaviour lives here so the page needs no inline event handlers
 * (works with CSP `script-src-attr 'none'`).
 */
(function () {
  'use strict';

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ── Per-type element ids ───────────────────────────────────────────────────
  var IDS = {
    image: {
      deleteForm: 'deleteImagesForm', deleteInputs: 'imageDeleteInputs',
      moveForm: 'moveImagesForm',     moveInputs: 'imageMoveInputs',
      actions: 'imageSelectionActions', count: 'imageSelectedCount', deleteBtn: 'btnDeleteImages'
    },
    video: {
      deleteForm: 'deleteVideosForm', deleteInputs: 'videoDeleteInputs',
      moveForm: 'moveVideosForm',     moveInputs: 'videoMoveInputs',
      actions: 'videoSelectionActions', count: 'videoSelectedCount', deleteBtn: 'btnDeleteVideos'
    }
  };

  var selected = { image: new Set(), video: new Set() };

  // ── Tabs ───────────────────────────────────────────────────────────────────
  function showTab(tab) {
    if (!document.getElementById('section-' + tab)) return;
    $$('.tab-content-section').forEach(function (s) { s.classList.remove('active'); });
    $$('.tab-pill').forEach(function (p) { p.classList.toggle('active', p.dataset.tab === tab); });
    $$('.nav-item-s[data-tab]').forEach(function (n) { n.classList.toggle('active', n.dataset.tab === tab); });
    document.getElementById('section-' + tab).classList.add('active');
    location.hash = tab;
  }

  // ── Session timer ──────────────────────────────────────────────────────────
  function initSessionTimer() {
    var el = document.getElementById('sessionTimer');
    if (!el) return;
    var start = new Date(el.dataset.loginTime).getTime();
    if (isNaN(start)) return;
    var minEl = document.getElementById('sessionMin');

    function tick() {
      var elapsed = Math.floor((Date.now() - start) / 1000);
      el.textContent = Math.floor(elapsed / 60) + 'm ' + (elapsed % 60) + 's';
      var remaining = Math.max(0, Math.floor((3600 - elapsed) / 60));
      if (minEl) minEl.textContent = remaining;
      if (remaining <= 0) window.location.href = '/admin/login';
    }
    tick();
    setInterval(tick, 1000);
  }

  // ── "Create new section" input toggle ──────────────────────────────────────
  function toggleNewSection(select) {
    var input = document.getElementById(select.dataset.newInput);
    if (!input) return;
    var wrap = input.closest('.new-section-wrap') || input;
    var isNew = select.value === '';
    wrap.style.display = isNew ? '' : 'none';
    if (!isNew) input.value = '';        // an old typed name must not override the dropdown
  }

  // ── Upload progress (visual) ───────────────────────────────────────────────
  function startProgress(wrapId, barId) {
    var wrap = document.getElementById(wrapId);
    var bar  = document.getElementById(barId);
    if (!wrap || !bar) return;
    wrap.style.display = 'block';
    var pct = 0;
    var iv = setInterval(function () {
      pct += Math.random() * 18;
      if (pct >= 90) { pct = 90; clearInterval(iv); }
      bar.style.width = pct + '%';
    }, 200);
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  function setSelected(item, type, on) {
    var file = item.dataset.file;
    var cb = item.querySelector('.select-cb');
    if (on) selected[type].add(file); else selected[type].delete(file);
    item.classList.toggle('selected', on);
    if (cb) cb.checked = on;
  }

  function updateSelectionUI(type) {
    var ids = IDS[type];
    var count = selected[type].size;
    var actions = document.getElementById(ids.actions);
    var btn = document.getElementById(ids.deleteBtn);
    var countEl = document.getElementById(ids.count);
    if (actions) actions.classList.toggle('show', count > 0);
    if (btn) btn.innerHTML = '<i class="fas fa-trash"></i> Delete ' + count + ' file' + (count > 1 ? 's' : '');
    if (countEl) countEl.textContent = count > 0 ? count + ' selected' : '';
  }

  function itemsOf(type, section) {
    var sel = '.media-item[data-type="' + type + '"]';
    if (section) sel += '[data-section="' + section + '"]';
    return $$(sel);
  }

  function fillHiddenInputs(containerId, type) {
    var container = document.getElementById(containerId);
    container.innerHTML = '';
    selected[type].forEach(function (file) {
      var inp = document.createElement('input');
      inp.type = 'hidden';
      inp.name = 'files';
      inp.value = file;
      container.appendChild(inp);
    });
  }

  function deleteSelected(type) {
    var count = selected[type].size;
    if (!count) return;
    if (!confirm('Are you sure you want to permanently delete ' + count + ' file' + (count > 1 ? 's' : '') + '? This cannot be undone.')) return;
    fillHiddenInputs(IDS[type].deleteInputs, type);
    document.getElementById(IDS[type].deleteForm).submit();
  }

  function moveSelected(type) {
    if (!selected[type].size) return;
    var form = document.getElementById(IDS[type].moveForm);
    var target = form.querySelector('select[name="target"]');
    var newName = form.querySelector('input[name="new_section"]');
    if (!target.value && !newName.value.trim()) {
      alert('Choose a target section or type a new section name.');
      return;
    }
    fillHiddenInputs(IDS[type].moveInputs, type);
    form.submit();
  }

  // ── Click delegation ───────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var t = e.target;

    // data-action buttons
    var actionEl = t.closest('[data-action]');
    if (actionEl) {
      var type = actionEl.dataset.type;
      switch (actionEl.dataset.action) {
        case 'toggle-sidebar':
          document.getElementById('sidebar').classList.toggle('open');
          return;
        case 'close-flash':
          actionEl.parentElement.remove();
          return;
        case 'select-all':
          itemsOf(type).forEach(function (it) { setSelected(it, type, true); });
          updateSelectionUI(type);
          return;
        case 'deselect-all':
          itemsOf(type).forEach(function (it) { setSelected(it, type, false); });
          updateSelectionUI(type);
          return;
        case 'select-section':
          itemsOf(type, actionEl.dataset.section).forEach(function (it) { setSelected(it, type, true); });
          updateSelectionUI(type);
          return;
        case 'delete-selected':
          deleteSelected(type);
          return;
        case 'move-selected':
          moveSelected(type);
          return;
      }
    }

    // tab buttons (pills + sidebar)
    var tabEl = t.closest('[data-tab]');
    if (tabEl) { e.preventDefault(); showTab(tabEl.dataset.tab); return; }

    // media item select / deselect
    var item = t.closest('.media-item');
    if (item) {
      var itemType = item.dataset.type;
      var on = t.classList.contains('select-cb') ? t.checked : !selected[itemType].has(item.dataset.file);
      setSelected(item, itemType, on);
      updateSelectionUI(itemType);
    }
  });

  // ── Change delegation ──────────────────────────────────────────────────────
  document.addEventListener('change', function (e) {
    var t = e.target;

    if (t.matches('input[type="file"][data-display]')) {
      var out = document.getElementById(t.dataset.display);
      if (!out) return;
      if (t.files && t.files.length > 1) out.textContent = '📎 ' + t.files.length + ' files selected';
      else out.textContent = t.files && t.files[0] ? '📎 ' + t.files[0].name : '';
    }

    if (t.matches('.js-section-select')) toggleNewSection(t);
  });

  // ── Submit delegation ──────────────────────────────────────────────────────
  document.addEventListener('submit', function (e) {
    var form = e.target;

    if (form.dataset.confirm && !confirm(form.dataset.confirm)) {
      e.preventDefault();
      return;
    }

    if (form.classList.contains('js-upload-form')) {
      var fileInput = form.querySelector('input[type="file"]');
      var select = form.querySelector('select[name="section"]');
      var newInput = form.querySelector('input[name="new_section"]');

      if (!fileInput.files || !fileInput.files.length) {
        e.preventDefault();
        alert('Please choose a file to upload.');
        return;
      }
      if (!select.value && !newInput.value.trim()) {
        e.preventDefault();
        alert('Choose a section or type a name for a new one.');
        newInput.focus();
        return;
      }
      startProgress(form.dataset.progress, form.dataset.bar);
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading…'; }
    }
  });

  // ── Drag & drop styling ────────────────────────────────────────────────────
  document.addEventListener('dragover', function (e) {
    var zone = e.target.closest('.upload-zone');
    if (zone) { e.preventDefault(); zone.classList.add('drag-over'); }
  });
  document.addEventListener('dragleave', function (e) {
    var zone = e.target.closest('.upload-zone');
    if (zone) zone.classList.remove('drag-over');
  });
  document.addEventListener('drop', function (e) {
    var zone = e.target.closest('.upload-zone');
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove('drag-over');
    var input = zone.querySelector('input[type="file"]');
    if (input && e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    showTab(location.hash.replace('#', '') === 'videos' ? 'videos' : 'images');
    $$('.js-section-select').forEach(toggleNewSection);
    initSessionTimer();
  });
})();
