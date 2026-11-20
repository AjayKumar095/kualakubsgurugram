/**
 * enquiry-form.js
 * Finds every <form data-enquiry-form> on the page, adds a country-flag
 * phone input, validates, and posts to the Google Apps Script web app.
 */
(function () {
  'use strict';

  var CONFIG = {
    scriptURL: 'https://script.google.com/macros/s/AKfycbyMEafuYXPJFzzb6I5tewPFIarb2-jrWjmLFZBkRl4JH6nsnK9W8chSUEkJurvGrH3p/exec',
    cdn: 'https://cdn.jsdelivr.net/npm/intl-tel-input@25/build/',
    defaultCountry: 'in',
    countryOrder: ['in', 'ae', 'us', 'gb', 'ca', 'au'],
    closeModalAfterMs: 2500
  };

  // ---------- helpers ----------
  function loadCSS(href) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function setError(field, show) {
    var box = field.closest('.mb-1, .mb-3');
    var fb = box && box.querySelector('.invalid-feedback');
    field.classList.toggle('is-invalid', show);
    if (fb) fb.classList.toggle('d-block', show);   // needed because input-group / .iti wrap the input
  }

  function showStatus(form, type, msg) {
    var el = form.querySelector('.enquiry-status');
    var icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
    el.className = 'enquiry-status mt-3 alert alert-' + type + ' d-flex align-items-center mb-0';
    el.innerHTML = '<i class="fa ' + icon + ' me-2"></i>';
    el.appendChild(document.createTextNode(msg));
  }

  function clearStatus(form) {
    var el = form.querySelector('.enquiry-status');
    el.className = 'enquiry-status mt-3';
    el.textContent = '';
  }

  // ---------- one form ----------
  function setupForm(form) {
    if (form.dataset.ready) return;
    form.dataset.ready = '1';

    var f = form.elements;
    var btn = form.querySelector('.enquiry-submit');
    var btnHTML = btn.innerHTML;
    var iti = null;

    // phone input with flags (attached once the library has loaded)
    form._attachPhone = function () {
      if (iti || !window.intlTelInput) return;
      iti = window.intlTelInput(f.mobile, {
        initialCountry: CONFIG.defaultCountry,
        countryOrder: CONFIG.countryOrder,
        separateDialCode: true,
        nationalMode: false,
        dropdownContainer: document.body     // stops the dropdown being clipped inside the modal
      });
    };

    function getMobile() {
      if (iti) return { valid: iti.isValidNumber(), value: iti.getNumber() };
      // fallback if the CDN is blocked: accept digits, default to +91
      var raw = f.mobile.value.replace(/[\s-]/g, '');
      var valid = /^\+?\d{8,15}$/.test(raw);
      return { valid: valid, value: raw.charAt(0) === '+' ? raw : '+91' + raw };
    }

    function validate() {
      var child  = f.child_name.value.trim();
      var father = f.father_name.value.trim();
      var email  = f.email.value.trim();

      var childOk  = child.length >= 2;
      var fatherOk = father.length >= 2;
      var mobileOk = getMobile().valid;
      var emailOk  = !email || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

      setError(f.child_name, !childOk);
      setError(f.father_name, !fatherOk);
      setError(f.mobile, !mobileOk);
      setError(f.email, !emailOk);

      return childOk && fatherOk && mobileOk && emailOk;
    }

    // clear an error as soon as the user edits the field
    ['child_name', 'father_name', 'mobile', 'email'].forEach(function (n) {
      f[n].addEventListener('input', function () { setError(f[n], false); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearStatus(form);
      if (!validate()) return;

      var body = new URLSearchParams({
        child_name:  f.child_name.value.trim(),
        father_name: f.father_name.value.trim(),
        mobile:      getMobile().value,
        email:       f.email.value.trim(),
        class:       f.class.value,
        source:      form.dataset.source || 'Website',
        website:     f.website.value            // honeypot
      });

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Sending...';

      fetch(CONFIG.scriptURL, { method: 'POST', body: body })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.result !== 'success') throw new Error(data.error || 'Unknown error');
          form.reset();
          if (iti) iti.setCountry(CONFIG.defaultCountry);
          showStatus(form, 'success', 'Thank you! We have received your enquiry and will contact you soon.');

          var modalEl = form.closest('.modal');
          if (modalEl && window.bootstrap) {
            setTimeout(function () {
              bootstrap.Modal.getOrCreateInstance(modalEl).hide();
            }, CONFIG.closeModalAfterMs);
          }
        })
        .catch(function (err) {
          console.error('Enquiry form error:', err);
          showStatus(form, 'danger', 'Something went wrong. Please try again or call us.');
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML = btnHTML;
        });
    });

    // reset the message when the modal is reopened
    var modalEl = form.closest('.modal');
    if (modalEl) modalEl.addEventListener('hidden.bs.modal', function () { clearStatus(form); });
  }

  // ---------- boot ----------
  function init() {
    var forms = document.querySelectorAll('form[data-enquiry-form]');
    if (!forms.length) return;

    forms.forEach(setupForm);                     // forms work immediately

    loadCSS(CONFIG.cdn + 'css/intlTelInput.css');
    loadScript(CONFIG.cdn + 'js/intlTelInputWithUtils.min.js')
      .then(function () { forms.forEach(function (f) { f._attachPhone(); }); })
      .catch(function () { console.warn('Phone flag library failed to load; using plain input.'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();