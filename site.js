/* DREKO — site behaviour. Every block is independent, so one failure never stops the rest. */
(function () {
  'use strict';

  // Where form submissions are sent. To switch providers later, change this one line.
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/info@dreko.ca';
  var CONTACT_EMAIL = 'info@dreko.ca';
  var CONTACT_PHONE = '(647) 982-5358';

  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.warn('[dreko]', e); } }

  /* ---- Navigation background + mobile action bar ---- */
  safe(function () {
    var nav = document.querySelector('.nav');
    var bar = document.querySelector('.mbar');
    var ticking = false;
    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (nav) nav.classList.toggle('is-solid', y > 40);
      if (bar) bar.classList.toggle('is-on', y > 560);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  });

  /* ---- Mobile menu ---- */
  safe(function () {
    var toggle = document.querySelector('.nav__toggle');
    var menu = document.getElementById('menu');
    if (!toggle || !menu) return;
    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.style.overflow = open ? 'hidden' : '';
      var nav = document.querySelector('.nav');
      if (nav && open) nav.classList.add('is-solid');
    }
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
  });

  /* ---- Gallery lightbox ---- */
  safe(function () {
    var galleries = document.querySelectorAll('[data-gallery]');
    var box = document.getElementById('lightbox');
    if (!galleries.length || !box || typeof box.showModal !== 'function') return;
    var img = box.querySelector('.lightbox__stage img');
    var cap = box.querySelector('.lightbox__caption');
    var count = box.querySelector('.lightbox__count');
    var items = [];
    var index = 0;

    function show(i) {
      index = (i + items.length) % items.length;
      var item = items[index];
      img.src = item.src;
      img.alt = item.alt;
      cap.textContent = item.alt;
      count.textContent = (index + 1) + ' of ' + items.length;
    }
    galleries.forEach(function (g) {
      var buttons = g.querySelectorAll('button[data-src]');
      buttons.forEach(function (b, i) {
        b.addEventListener('click', function () {
          items = Array.prototype.map.call(buttons, function (x) {
            var im = x.querySelector('img');
            return { src: x.getAttribute('data-src'), alt: im ? im.alt : '' };
          });
          show(i);
          box.showModal();
          document.body.style.overflow = 'hidden';
        });
      });
    });
    box.querySelector('[data-lb="close"]').addEventListener('click', function () { box.close(); });
    box.querySelector('[data-lb="prev"]').addEventListener('click', function () { show(index - 1); });
    box.querySelector('[data-lb="next"]').addEventListener('click', function () { show(index + 1); });
    box.addEventListener('close', function () { document.body.style.overflow = ''; });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('lightbox__stage')) box.close(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(index + 1);
      if (e.key === 'ArrowLeft') show(index - 1);
    });
    var startX = null;
    box.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  });

  /* ---- Forms ---- */
  safe(function () {
    var forms = document.querySelectorAll('form[data-form]');
    forms.forEach(function (form) {
      var status = form.querySelector('.form__status');
      var button = form.querySelector('button[type="submit"]');
      var idleLabel = button ? button.textContent : '';

      function collect() {
        var data = {};
        var lines = [];
        form.querySelectorAll('input, select, textarea').forEach(function (el) {
          if (!el.name || el.name.charAt(0) === '_' || el.type === 'submit') return;
          var label = el.getAttribute('data-label') || el.name;
          var value = (el.value || '').trim() || 'Not provided';
          data[label] = value;
          lines.push(label + ': ' + value);
        });
        return { data: data, lines: lines };
      }

      function mailtoHref(subject, lines) {
        return 'mailto:' + CONTACT_EMAIL +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(lines.join('\n'));
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (typeof form.checkValidity === 'function' && !form.checkValidity()) { form.reportValidity(); return; }

        var subject = form.getAttribute('data-subject') || 'Website enquiry';
        var honey = form.querySelector('input[name="_honey"]');
        var done = form.getAttribute('data-done') || 'Thank you. We reply within one business day.';
        var collected = collect();

        function succeed() {
          var wrap = document.createElement('div');
          wrap.className = 'form-done';
          wrap.setAttribute('role', 'status');
          wrap.setAttribute('tabindex', '-1');
          var h = document.createElement('h3'); h.textContent = form.getAttribute('data-done-title') || 'Message sent.';
          var p = document.createElement('p'); p.textContent = done;
          wrap.appendChild(h); wrap.appendChild(p);
          form.replaceWith(wrap);
          wrap.focus();
        }

        if (honey && honey.value) { succeed(); return; }

        var payload = Object.assign({
          _subject: subject,
          _template: 'table',
          _captcha: 'false'
        }, collected.data);
        var email = form.querySelector('input[type="email"]');
        if (email && email.value) payload._replyto = email.value.trim();

        if (status) { status.textContent = ''; status.className = 'form__status'; }
        if (button) { button.disabled = true; button.textContent = 'Sending…'; }

        fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (json) {
              if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || ('HTTP ' + res.status));
            });
          })
          .then(succeed)
          .catch(function (err) {
            if (window.console) console.warn('[dreko] form', err);
            if (button) { button.disabled = false; button.textContent = idleLabel; }
            if (!status) return;
            status.className = 'form__status form__status--error';
            status.setAttribute('role', 'alert');
            status.innerHTML = '';
            var t = document.createElement('span');
            t.textContent = 'Your message did not send. ';
            var a = document.createElement('a');
            a.href = mailtoHref(subject, collected.lines);
            a.textContent = 'Send it from your email app';
            var t2 = document.createElement('span');
            t2.textContent = ' (we have filled it in for you), or call ' + CONTACT_PHONE + '.';
            status.appendChild(t); status.appendChild(a); status.appendChild(t2);
          });
      });
    });
  });
})();
