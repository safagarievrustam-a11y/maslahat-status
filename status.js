/* status.maslahat.ai — читает status.json (пишет status/checker.py по расписанию) и incidents.json (ведём руками). */
(function () {
  'use strict';
  var T = {
    ru: {
      label: '// Статус сервисов', support: 'Поддержка в Telegram', help: 'Поддержка', loading: 'Проверяем…',
      services: 'Сервисы', ok: 'Работает', warn: 'Задержки', down: 'Сбой', ago: '{n} дней назад', today: 'Сегодня',
      incidents: 'История инцидентов', noInc: 'За последние 90 дней инцидентов не было.',
      updated: 'Обновлено {t}', justNow: 'только что', minAgo: '{n} мин назад', hAgo: '{n} ч назад',
      allOk: 'Все системы работают', someWarn: 'Есть задержки', someDown: 'Есть сбой', stale: 'Нет свежих данных',
      subOk: 'Сова спокойно спит — значит, всё в порядке.', subWarn: 'Сервисы отвечают медленнее обычного: {list}. Следим.',
      subDown: 'Не отвечает: {list}. Уже разбираемся.', subStale: 'Проверки давно не приходили — возможен сбой связи. Напишите в поддержку, если что-то не работает.',
      norm: 'Норма', uptime: '[{p} %] за 90 дней', noData: 'данных пока нет',
      watch: 'Наблюдаем', resolved: 'Решено', done: 'Завершено',
      c: { chat: 'Чат с Маслахатом', docs: 'Составление документов', voice: 'Голосовой ввод', sms: 'Вход по СМС', payme: 'Оплата Payme', click: 'Оплата Click', site: 'Сайт maslahat.ai', app: 'Приложение Android · iOS' },
      theme: 'Сменить тему',
    },
    uz: {
      label: '// Xizmatlar holati', support: 'Telegram’da yordam', help: 'Yordam', loading: 'Tekshirmoqdamiz…',
      services: 'Xizmatlar', ok: 'Ishlayapti', warn: 'Kechikishlar', down: 'Nosozlik', ago: '{n} kun oldin', today: 'Bugun',
      incidents: 'Hodisalar tarixi', noInc: 'So‘nggi 90 kunda hodisalar bo‘lmadi.',
      updated: 'Yangilandi: {t}', justNow: 'hozirgina', minAgo: '{n} daqiqa oldin', hAgo: '{n} soat oldin',
      allOk: 'Barcha tizimlar ishlayapti', someWarn: 'Kechikishlar bor', someDown: 'Nosozlik bor', stale: 'Yangi ma’lumot yo‘q',
      subOk: 'Boyqush xotirjam uxlayapti — demak, hammasi joyida.', subWarn: 'Odatdagidan sekinroq javob beryapti: {list}. Kuzatyapmiz.',
      subDown: 'Javob bermayapti: {list}. Allaqachon hal qilyapmiz.', subStale: 'Tekshiruvlar anchadan beri kelmadi — aloqa uzilgan bo‘lishi mumkin. Biror narsa ishlamasa, yordamga yozing.',
      norm: 'Me’yor', uptime: '90 kunda [{p} %]', noData: 'hali ma’lumot yo‘q',
      watch: 'Kuzatyapmiz', resolved: 'Hal qilindi', done: 'Yakunlandi',
      c: { chat: 'Maslahat bilan chat', docs: 'Hujjat tuzish', voice: 'Ovozli kiritish', sms: 'SMS orqali kirish', payme: 'Payme orqali to‘lov', click: 'Click orqali to‘lov', site: 'maslahat.ai sayti', app: 'Android · iOS ilovasi' },
      theme: 'Mavzuni almashtirish',
    },
    en: {
      label: '// Service status', support: 'Support on Telegram', help: 'Support', loading: 'Checking…',
      services: 'Services', ok: 'Operational', warn: 'Delays', down: 'Outage', ago: '{n} days ago', today: 'Today',
      incidents: 'Incident history', noInc: 'No incidents in the last 90 days.',
      updated: 'Updated {t}', justNow: 'just now', minAgo: '{n} min ago', hAgo: '{n} h ago',
      allOk: 'All systems operational', someWarn: 'Some delays', someDown: 'Partial outage', stale: 'No fresh data',
      subOk: 'The owl is sound asleep — all is well.', subWarn: 'Slower than usual: {list}. We are watching.',
      subDown: 'Not responding: {list}. We are on it.', subStale: 'Checks have not arrived for a while — possibly a network issue. Contact support if something does not work.',
      norm: 'Normal', uptime: '[{p} %] over 90 days', noData: 'no data yet',
      watch: 'Monitoring', resolved: 'Resolved', done: 'Completed',
      c: { chat: 'Chat with Maslahat', docs: 'Document drafting', voice: 'Voice input', sms: 'SMS sign-in', payme: 'Payme payments', click: 'Click payments', site: 'maslahat.ai website', app: 'Android · iOS app' },
      theme: 'Switch theme',
    },
  };
  var qs = /[?&]lang=(ru|uz|en)/.exec(location.search);
  var nav = (navigator.language || 'ru').slice(0, 2);
  var lang = qs ? qs[1] : T[nav] ? nav : 'ru';
  var t = T[lang];
  document.documentElement.lang = lang;
  var fmt = function (s, v) { return s.replace(/\{(\w+)\}/g, function (_, k) { return v[k]; }); };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); };
  var phone = window.matchMedia('(max-width: 640px)');
  var KIND = { ok: 'ok', warn: 'warn', down: 'down' }; // классы только из этого списка

  document.querySelectorAll('[data-t]').forEach(function (el) {
    var k = el.getAttribute('data-t');
    if (k === 'ago') el.textContent = fmt(t.ago, { n: phone.matches ? 45 : 90 });
    else if (t[k]) el.textContent = t[k];
  });
  $('theme').setAttribute('aria-label', t.theme);
  $('theme').addEventListener('click', function () {
    var root = document.documentElement;
    var dark = root.getAttribute('data-theme') ? root.getAttribute('data-theme') === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', dark ? 'light' : 'dark');
    try { localStorage.setItem('maslahat.status.theme', dark ? 'light' : 'dark'); } catch (e) {}
  });

  var ago = function (iso) {
    var min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    return min < 1 ? t.justNow : min < 60 ? fmt(t.minAgo, { n: min }) : fmt(t.hAgo, { n: Math.round(min / 60) });
  };

  var render = function (st) {
    var stale = (Date.now() - Date.parse(st.updated_at)) / 60000 > 20;
    var down = st.components.filter(function (c) { return c.status === 'down'; });
    var warn = st.components.filter(function (c) { return c.status === 'warn'; });
    var state = stale ? 'stale' : down.length ? 'down' : warn.length ? 'warn' : 'ok';
    var names = function (list) { return list.map(function (c) { return t.c[c.id]; }).join(', '); };
    $('summary').setAttribute('data-state', state);
    $('updated').textContent = fmt(t.updated, { t: ago(st.updated_at) });
    $('headline').textContent = { ok: t.allOk, warn: t.someWarn, down: t.someDown, stale: t.stale }[state];
    $('sub').textContent = { ok: t.subOk, warn: fmt(t.subWarn, { list: names(warn) }), down: fmt(t.subDown, { list: names(down) }), stale: t.subStale }[state];
    $('state-label').textContent = { ok: t.norm, warn: t.warn, down: t.down, stale: t.down }[state];
    $('list').innerHTML = st.components.map(function (c) {
      var bars = c.days.map(function (d) { return '<i class="' + (KIND[d] || 'none') + '"></i>'; }).join('');
      var up = c.uptime === null ? t.noData : fmt(t.uptime, { p: String(c.uptime).replace('.', lang === 'en' ? '.' : ',') });
      var s = stale ? null : KIND[c.status] || null;
      return '<div class="row"><div class="row-name"><b>' + esc(t.c[c.id]) + '</b><span class="mono muted">' + esc(up) + '</span></div>' +
        '<div class="bars" role="img" aria-label="' + esc(t.c[c.id]) + '">' + bars + '</div>' +
        '<div class="row-state">' + (s ? '<i class="d ' + s + '" style="width:8px;height:8px;border-radius:50%;display:inline-block"></i><span class="st-t">' + esc(t[s]) + '</span>' : '') + '</div></div>';
    }).join('');
  };

  var renderInc = function (list) {
    var cutoff = Date.now() - 90 * 864e5;
    list = (list || []).filter(function (i) { return Date.parse(i.date) >= cutoff; });
    $('inc').innerHTML = list.length ? list.map(function (i) {
      var d = i.date.split('-').reverse().join('.');
      var pick = function (v) { return typeof v === 'string' ? v : v[lang] || v.ru; };
      return '<div class="inc"><div class="inc-date mono muted">' + esc(d) + '</div><div class="inc-body"><b>' + esc(pick(i.title)) + '</b><p class="muted">' +
        esc(pick(i.text)) + '</p></div><span class="badge' + (i.state === 'watch' ? ' watch' : '') + '">' + esc(t[i.state] || i.state) + '</span></div>';
    }).join('') : '<p class="empty">' + esc(t.noInc) + '</p>';
  };

  var load = function () {
    fetch('status.json?' + Date.now()).then(function (r) { return r.json(); }).then(render).catch(function () {
      $('summary').setAttribute('data-state', 'stale');
      $('headline').textContent = t.stale;
      $('sub').textContent = t.subStale;
    });
  };
  load();
  setInterval(load, 60000);
  fetch('incidents.json?' + Date.now()).then(function (r) { return r.json(); }).then(renderInc).catch(function () { renderInc([]); });
})();
