/* Грант CRM — ядро: утилиты, хранилище, расчёты, UI-примитивы, роутер */
(function () {
  'use strict';
  const App = (window.App = window.App || {});
  App.VERSION = 5;
  App.KEY = 'grant-crm-demo';
  App.views = {};

  /* ---------- утилиты ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
  const nf = new Intl.NumberFormat('ru-RU');
  const num = (n) => nf.format(Math.round(n || 0));
  const money = (n) => num(n) + ' ₸';
  const moneyShort = (n) => {
    n = Math.round(n || 0);
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(Math.abs(n) >= 1e7 ? 0 : 1).replace('.', ',') + ' млн ₸';
    if (Math.abs(n) >= 1e3) return Math.round(n / 1e3) + ' тыс ₸';
    return money(n);
  };
  const pct = (x, d = 0) => (isFinite(x) ? (x * 100).toFixed(d).replace('.', ',') : '0') + '%';
  const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const MON_S = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (ts) => { const d = new Date(ts); return d.getDate() + ' ' + MON[d.getMonth()]; };
  const fmtDateY = (ts) => fmtDate(ts) + ' ' + new Date(ts).getFullYear();
  const fmtTime = (ts) => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const fmtDT = (ts) => fmtDate(ts) + ', ' + fmtTime(ts);
  const isoDate = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const isoDT = (ts) => isoDate(ts) + 'T' + fmtTime(ts);
  const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const startOfMonth = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); d.setDate(1); return d.getTime(); };
  const addMonths = (ts, k) => { const d = new Date(ts); d.setMonth(d.getMonth() + k); return d.getTime(); };
  function ago(ts) {
    const m = Math.floor((Date.now() - ts) / MIN);
    if (m < 1) return 'только что';
    if (m < 60) return m + ' мин назад';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' ч назад';
    const d = Math.floor(h / 24);
    if (d < 31) return d + ' дн назад';
    return fmtDate(ts);
  }
  function dueLabel(ts) {
    const diff = Math.round((startOfDay(ts) - startOfDay(Date.now())) / DAY);
    if (diff === 0) return 'сегодня, ' + fmtTime(ts);
    if (diff === 1) return 'завтра, ' + fmtTime(ts);
    if (diff === -1) return 'вчера, ' + fmtTime(ts);
    return fmtDT(ts);
  }
  const uid = (p = '') => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
  const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const shortName = (name) => { const p = String(name || '').split(' '); return p.length > 1 ? p[0] + ' ' + p[1][0] + '.' : name; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + (+f(x) || 0), 0);
  const avg = (arr, f = (x) => x) => (arr.length ? sum(arr, f) / arr.length : 0);
  const median = (arr) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  function plural(n, f) { const a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return f[2]; if (b === 1) return f[0]; if (b >= 2 && b <= 4) return f[1]; return f[2]; }
  const digits = (s) => String(s || '').replace(/\D/g, '');

  App.u = { $, $$, esc, MIN, HOUR, DAY, num, money, moneyShort, pct, MON, MON_S, fmtDate, fmtDateY, fmtTime, fmtDT, isoDate, isoDT, startOfDay, startOfMonth, addMonths, ago, dueLabel, uid, initials, shortName, clamp, sum, avg, median, plural, digits };

  /* ---------- хранилище ---------- */
  App.store = {
    state: null,
    load() {
      let st = null;
      try { st = JSON.parse(localStorage.getItem(App.KEY) || 'null'); } catch (e) { st = null; }
      if (!st || st.version !== App.VERSION) { st = App.seed(); this.state = st; this.save(); }
      else this.state = st;
    },
    save() { try { localStorage.setItem(App.KEY, JSON.stringify(this.state)); } catch (e) { console.warn('save failed', e); } },
    reset() { const keep = this.state ? { role: this.state.role, lang: this.state.lang, theme: this.state.theme } : {}; this.state = Object.assign(App.seed(), keep); this.save(); },
  };
  const S = (App.S = () => App.store.state);

  App.get = {
    lead: (id) => S().leads.find((x) => x.id === id),
    student: (id) => S().students.find((x) => x.id === id),
    group: (id) => S().groups.find((x) => x.id === id),
    user: (id) => S().staff.find((x) => x.id === id),
    exam: (id) => S().mockExams.find((x) => x.id === id),
    combo: (id) => App.C.COMBOS.find((x) => x.id === id),
    tariff: (id) => App.C.TARIFFS.find((x) => x.id === id),
    spec: (id) => S().specialties.find((x) => x.id === id),
    me: () => S().staff.find((x) => x.id === App.C.ROLE_USER[S().role]),
  };

  /* ---------- предметная логика ---------- */
  App.calc = {
    total: (e) => e.hist + e.ml + e.rl + e.p1 + e.p2,
    exams(s) {
      return (s.exams || [])
        .map((e) => { const ex = App.get.exam(e.examId); return Object.assign({}, e, { date: ex ? ex.date : 0, title: ex ? ex.title : '', total: App.calc.total(e) }); })
        .sort((a, b) => a.date - b.date);
    },
    last(s) { const ex = this.exams(s); return ex.length ? ex[ex.length - 1] : null; },
    delta(s) { const ex = this.exams(s); return ex.length > 1 ? ex[ex.length - 1].total - ex[ex.length - 2].total : null; },
    pass(target) { const sp = App.get.spec(target); return sp ? sp.pass : 110; },
    forecast(s) {
      const ex = this.exams(s);
      if (!ex.length) return null;
      const last = ex[ex.length - 1];
      let rate = 0;
      if (ex.length > 1) { const days = Math.max(14, (last.date - ex[0].date) / DAY); rate = ((last.total - ex[0].total) / days) * 30; }
      rate = clamp(rate, -2, 7);
      const months = Math.max(0, (S().entDate - Date.now()) / (30 * DAY));
      const gain = rate > 0 ? rate * months * 0.55 : rate * months * 0.3;
      return Math.round(clamp(last.total + gain, 0, 140));
    },
    chanceFor(score, target) {
      if (score == null) return null;
      const pass = this.pass(target);
      const p = 1 / (1 + Math.exp(-(score - pass) / 6));
      const level = p >= 0.7 ? 'good' : p >= 0.4 ? 'warn' : 'crit';
      return { p, pass, gap: pass - score, level, label: p >= 0.7 ? 'высокий' : p >= 0.4 ? 'средний' : 'низкий' };
    },
    chance(s) { return this.chanceFor(this.forecast(s), s.target); },
    payments: (s) => S().payments.filter((p) => p.studentId === s.id).sort((a, b) => b.date - a.date),
    payStatus(s) {
      const ps = this.payments(s);
      if (ps.some((p) => p.status === 'overdue')) return 'overdue';
      if (ps.some((p) => p.status === 'due')) return 'due';
      return 'ok';
    },
    risk(s) {
      if (s.status === 'left') return { score: 0, level: 'neutral', label: 'выбыл', reasons: [] };
      let sc = 0; const r = [];
      if (s.attendance < 70) { sc += 2; r.push('посещаемость ' + s.attendance + '%'); } else if (s.attendance < 80) { sc += 1; r.push('посещаемость ' + s.attendance + '%'); }
      if (s.homework < 60) { sc += 2; r.push('ДЗ ' + s.homework + '%'); } else if (s.homework < 75) { sc += 1; r.push('ДЗ ' + s.homework + '%'); }
      if (this.payStatus(s) === 'overdue') { sc += 2; r.push('просрочена оплата'); }
      const d = this.delta(s); if (d !== null && d <= -3) { sc += 1; r.push('балл упал на ' + -d); }
      if (s.status === 'frozen') { sc += 1; r.push('заморозка'); }
      const level = sc >= 4 ? 'crit' : sc >= 2 ? 'warn' : 'good';
      return { score: sc, level, label: sc >= 4 ? 'высокий' : sc >= 2 ? 'средний' : 'низкий', reasons: r };
    },
    sections(e, comboId) {
      const c = App.get.combo(comboId) || App.C.COMBOS[0];
      return [
        { key: 'hist', name: 'История Казахстана', kz: 'Қазақстан тарихы', v: e.hist, max: 20 },
        { key: 'ml', name: 'Мат. грамотность', kz: 'Математикалық сауаттылық', v: e.ml, max: 10 },
        { key: 'rl', name: 'Грамотность чтения', kz: 'Оқу сауаттылығы', v: e.rl, max: 10 },
        { key: 'p1', name: c.p1, kz: App.C.SUBJ_KZ[c.p1] || c.p1, v: e.p1, max: 50 },
        { key: 'p2', name: c.p2, kz: App.C.SUBJ_KZ[c.p2] || c.p2, v: e.p2, max: 50 },
      ];
    },
    // средний прирост у одних и тех же учеников между двумя пробниками
    pairedDelta(students, exA, exB) {
      if (!exA || !exB) return null;
      const d = students.map((s) => { const a = s.exams.find((e) => e.examId === exA.id), b = s.exams.find((e) => e.examId === exB.id); return a && b ? App.calc.total(b) - App.calc.total(a) : null; }).filter((x) => x !== null);
      return d.length ? { v: avg(d), n: d.length } : null;
    },
    pctLabel: (p) => (p < 0.005 ? '<1%' : p > 0.995 ? '>99%' : Math.round(p * 100) + '%'),
    stageIdx: (id) => App.C.STAGES.findIndex((s) => s.id === id),
    slaBreached: (l) => l.stage === 'new' && Date.now() - l.createdAt > 15 * MIN,
    groupStudents: (gid) => S().students.filter((s) => s.groupId === gid && s.status !== 'left'),
    myTasks() {
      const st = S(); const me = App.get.me();
      return st.role === 'director' ? st.tasks : st.tasks.filter((t) => t.assigneeId === me.id);
    },
    visibleLeads() {
      const st = S(); const me = App.get.me();
      return st.role === 'sales' ? st.leads.filter((l) => l.managerId === me.id) : st.leads;
    },
    visibleStudents() {
      const st = S(); const me = App.get.me();
      if (st.role !== 'curator') return st.students;
      const gids = st.groups.filter((g) => g.curatorId === me.id).map((g) => g.id);
      return st.students.filter((s) => gids.includes(s.groupId));
    },
    nextSalesManager() {
      const st = S(); const sales = st.staff.filter((u) => u.role === 'sales');
      st.rr = ((st.rr || 0) + 1) % sales.length;
      return sales[st.rr].id;
    },
    fill(text, ctx) { return String(text).replace(/\{([^}]+)\}/g, (m, k) => (ctx[k] != null && ctx[k] !== '' ? ctx[k] : m)); },
  };

  App.log = function (text) { const st = S(); st.activity.unshift({ at: Date.now(), text }); st.activity = st.activity.slice(0, 60); };

  /* ---------- i18n (интерфейс) ---------- */
  const I18N = {
    ru: {
      dashboard: 'Дашборд', leads: 'Заявки', students: 'Ученики', groups: 'Группы', payments: 'Оплаты', exams: 'Пробные ЕНТ', tasks: 'Задачи', messages: 'Рассылки', settings: 'Настройки',
      searchPh: 'Поиск учеников и заявок…', newLead: 'Заявка', role: 'Роль', director: 'Директор', sales: 'Менеджер продаж', curator: 'Куратор',
      siteForm: 'Форма заявки с сайта', tagline: 'CRM для подготовки к ЕНТ', demoNote: 'Демо-данные. Сброс — в настройках.',
    },
    kz: {
      dashboard: 'Басқару тақтасы', leads: 'Өтінімдер', students: 'Оқушылар', groups: 'Топтар', payments: 'Төлемдер', exams: 'Сынақ ҰБТ', tasks: 'Тапсырмалар', messages: 'Хабарламалар', settings: 'Баптаулар',
      searchPh: 'Оқушылар мен өтінімдерден іздеу…', newLead: 'Өтінім', role: 'Рөл', director: 'Директор', sales: 'Сату менеджері', curator: 'Куратор',
      siteForm: 'Сайттағы өтінім формасы', tagline: 'ҰБТ-ға дайындыққа арналған CRM', demoNote: 'Демо-деректер. Тазалау — баптауларда.',
    },
  };
  const t = (App.t = (k) => ((I18N[S().lang] || I18N.ru)[k] ?? I18N.ru[k] ?? k));

  /* ---------- иконки ---------- */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    card: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    check: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    arrowR: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  };
  const icon = (App.icon = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`);

  /* ---------- UI-примитивы ---------- */
  const GLYPH = { good: '✓', warn: '!', serious: '!', crit: '✕', neutral: '·', info: 'i' };
  const badge = (level, label) => `<span class="badge b-${level}"><i aria-hidden="true">${GLYPH[level] || ''}</i>${esc(label)}</span>`;
  const chip = (label) => `<span class="chip">${esc(label)}</span>`;
  const avatar = (u) => (u ? `<span class="av" title="${esc(u.name)}">${esc(initials(u.name))}</span>` : '');
  const opt = (v, l, sel) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`;
  const field = (label, inner, cls = '') => `<label class="fld ${cls}"><span>${esc(label)}</span>${inner}</label>`;
  function formData(root) {
    const o = {};
    $$('[name]', root).forEach((el) => { o[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim(); });
    return o;
  }
  function toast(msg, kind = 'info') {
    const box = $('#toasts'); if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast t-' + kind; el.setAttribute('role', 'status');
    el.innerHTML = `<i aria-hidden="true">${GLYPH[kind] || 'i'}</i><span>${esc(msg)}</span>`;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, 3400);
  }
  function modal({ title, body, foot = '', wide = false, onMount }) {
    const root = $('#modal');
    root.innerHTML = `<div class="m-back" data-close></div><div class="m-box ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="m-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Закрыть">${icon('x')}</button></div><div class="m-body">${body}</div>${foot ? `<div class="m-foot">${foot}</div>` : ''}</div>`;
    root.classList.add('open');
    $$('[data-close]', root).forEach((b) => (b.onclick = closeModal));
    const box = $('.m-box', root);
    if (onMount) onMount(box);
    const f = $('.m-body input:not([type=checkbox]), .m-body textarea', root);
    if (f && !f.readOnly) setTimeout(() => f.focus(), 60);
    return box;
  }
  function closeModal() { const r = $('#modal'); r.classList.remove('open'); r.innerHTML = ''; }
  function drawer(html, onMount) {
    const d = $('#drawer');
    const keep = d.classList.contains('open') ? ($('.d-panel', d) || {}).scrollTop || 0 : 0;
    d.innerHTML = `<div class="d-back" data-dclose></div><aside class="d-panel" role="dialog" aria-modal="true">${html}</aside>`;
    d.classList.add('open');
    document.body.classList.add('locked');
    $$('[data-dclose]', d).forEach((b) => (b.onclick = closeDrawer));
    const p = $('.d-panel', d);
    if (onMount) onMount(p);
    p.scrollTop = keep;
  }
  function closeDrawer() { const d = $('#drawer'); d.classList.remove('open'); d.innerHTML = ''; document.body.classList.remove('locked'); }
  async function copy(text, msg = 'Текст скопирован') {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (_) { /* noop */ } ta.remove(); }
    toast(msg, 'good');
  }
  const kpi = (label, value, sub = '', cls = '') => `<div class="kpi"><div class="kpi-l">${label}</div><div class="kpi-v">${value}</div>${sub ? `<div class="kpi-s ${cls}">${sub}</div>` : ''}</div>`;
  function delta(cur, prev, { fmt = (x) => pct(x), suffix = '', goodUp = true, abs = false } = {}) {
    if (prev == null || (!abs && !prev)) return { txt: '—', cls: '' };
    const d = abs ? cur - prev : (cur - prev) / prev;
    if (Math.abs(d) < 1e-9) return { txt: '→ без изменений' + suffix, cls: '' };
    const up = d > 0; const good = up === goodUp;
    return { txt: (up ? '▲ +' : '▼ −') + fmt(Math.abs(d)) + suffix, cls: good ? 'up' : 'down' };
  }
  const waitLabel = (ts) => { const m = Math.floor((Date.now() - ts) / MIN); return m < 60 ? m + ' мин' : m < 1440 ? Math.floor(m / 60) + ' ч' : Math.floor(m / 1440) + ' дн'; };
  const empty = (txt) => `<div class="empty">${esc(txt)}</div>`;

  App.ui = { waitLabel, badge, chip, avatar, opt, field, formData, toast, modal, closeModal, drawer, closeDrawer, copy, kpi, delta, empty };

  /* ---------- tooltip (data-tip) ---------- */
  function initTip() {
    const tip = $('#tip');
    let cur = null;
    const show = (el, x, y) => {
      const txt = el.getAttribute('data-tip'); if (!txt) return;
      tip.innerHTML = esc(txt).replace(/\n/g, '<br>');
      tip.classList.add('on'); move(x, y);
    };
    const move = (x, y) => {
      const w = tip.offsetWidth, h = tip.offsetHeight;
      let L = x + 14, T = y - h - 12;
      if (L + w > window.innerWidth - 8) L = x - w - 14;
      if (T < 8) T = y + 18;
      tip.style.transform = `translate(${Math.max(8, L)}px, ${T}px)`;
    };
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el !== cur) { cur = el; if (el) show(el, e.clientX, e.clientY); else tip.classList.remove('on'); }
    });
    document.addEventListener('mousemove', (e) => { if (cur) move(e.clientX, e.clientY); });
    document.addEventListener('scroll', () => { cur = null; tip.classList.remove('on'); }, true);
  }

  /* ---------- навигация и роутер ---------- */
  const NAV = [
    { id: 'dashboard', icon: 'home', roles: ['director', 'sales', 'curator'] },
    { id: 'leads', icon: 'inbox', roles: ['director', 'sales'] },
    { id: 'students', icon: 'users', roles: ['director', 'curator'] },
    { id: 'groups', icon: 'layers', roles: ['director', 'curator'] },
    { id: 'payments', icon: 'card', roles: ['director', 'sales'] },
    { id: 'exams', icon: 'target', roles: ['director', 'curator'] },
    { id: 'tasks', icon: 'check', roles: ['director', 'sales', 'curator'] },
    { id: 'messages', icon: 'msg', roles: ['director', 'sales', 'curator'] },
    { id: 'settings', icon: 'sliders', roles: ['director', 'sales', 'curator'] },
  ];
  App.NAV = NAV;

  function renderChrome() {
    const st = S();
    const now = Date.now(); const eod = startOfDay(now) + DAY;
    const counts = {
      leads: App.calc.visibleLeads().filter((l) => l.stage === 'new').length,
      tasks: App.calc.myTasks().filter((x) => !x.done && x.due < eod).length,
    };
    $('#nav').innerHTML = NAV.filter((n) => n.roles.includes(st.role))
      .map((n) => `<a href="#/${n.id}" class="${App.route === n.id ? 'on' : ''}" ${App.route === n.id ? 'aria-current="page"' : ''}>${icon(n.icon)}<span>${t(n.id)}</span>${counts[n.id] ? `<em>${counts[n.id]}</em>` : ''}</a>`)
      .join('');
    const me = App.get.me();
    $('#roleSel').innerHTML = ['director', 'sales', 'curator'].map((r) => opt(r, t(r), st.role)).join('');
    $('#roleLbl').textContent = t('role');
    $('#meName').textContent = me.name;
    $('#meAv').textContent = initials(me.name);
    $('#tagline').textContent = t('tagline');
    $('#formLink span').textContent = t('siteForm');
    $('#demoNote').textContent = t('demoNote');
    $('#searchBtn span').textContent = t('searchPh');
    $('#addLeadBtn span').textContent = t('newLead');
    $('#addLeadBtn').style.display = st.role === 'curator' ? 'none' : '';
    $$('#langSw button').forEach((b) => b.classList.toggle('on', b.dataset.lang === st.lang));
    $('#themeBtn').innerHTML = icon(st.theme === 'dark' ? 'sun' : 'moon');
    $('#pageTitle').textContent = t(App.route);
    document.title = t(App.route) + ' · Грант CRM';
  }
  App.renderChrome = renderChrome;

  function parseHash() { const h = (location.hash || '#/dashboard').replace(/^#\/?/, '').split('/'); return { name: h[0] || 'dashboard', arg: h[1] ? decodeURIComponent(h[1]) : '' }; }

  App.render = function (keepScroll) {
    const st = S();
    document.documentElement.dataset.theme = st.theme;
    document.documentElement.lang = st.lang === 'kz' ? 'kk' : 'ru';
    let { name, arg } = parseHash();
    if (name === 'form') {
      document.body.classList.add('public');
      App.views.form.render($('#public'));
      return;
    }
    document.body.classList.remove('public');
    const item = NAV.find((n) => n.id === name);
    if (!item || !item.roles.includes(st.role)) { name = 'dashboard'; arg = ''; }
    App.route = name; App.routeArg = arg;
    renderChrome();
    const y = window.scrollY;
    const el = $('#view');
    el.innerHTML = '';
    App.views[name].render(el, arg);
    if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
    document.body.classList.remove('nav-open');
  };
  App.refresh = () => { App.store.save(); App.render(true); };
  App.go = (hash) => { if (location.hash === hash) App.render(); else location.hash = hash; };

  /* ---------- глобальный поиск ---------- */
  function openSearch() {
    App.ui.modal({
      title: 'Поиск',
      body: `<div class="search-in big">${icon('search', 18)}<input id="gq" placeholder="${esc(t('searchPh'))}" autocomplete="off"></div><div id="gres" class="sres"></div>`,
      onMount(box) {
        const inp = $('#gq', box), res = $('#gres', box);
        const run = () => {
          const q = inp.value.trim().toLowerCase(); const qd = digits(q);
          if (q.length < 2) { res.innerHTML = '<div class="muted pad">Введите имя или номер телефона</div>'; return; }
          const hit = (x) => x.name.toLowerCase().includes(q) || (qd.length >= 3 && (digits(x.phone).includes(qd) || digits(x.parentPhone).includes(qd)));
          const st = S();
          const ss = App.calc.visibleStudents().filter(hit).slice(0, 8);
          const ls = App.calc.visibleLeads().filter(hit).slice(0, 8);
          const canS = NAV.find((n) => n.id === 'students').roles.includes(st.role) || st.role === 'curator';
          const canL = NAV.find((n) => n.id === 'leads').roles.includes(st.role);
          let h = '';
          if (canS && ss.length) h += '<div class="sres-h">Ученики</div>' + ss.map((s) => `<button class="sres-i" data-student="${s.id}"><b>${esc(s.name)}</b><span>${esc((App.get.group(s.groupId) || {}).name || '')} · ${esc(s.phone)}</span></button>`).join('');
          if (canL && ls.length) h += '<div class="sres-h">Заявки</div>' + ls.map((l) => `<button class="sres-i" data-lead="${l.id}"><b>${esc(l.name)}</b><span>${esc(App.C.STAGES[App.calc.stageIdx(l.stage)].ru)} · ${esc(l.phone)}</span></button>`).join('');
          res.innerHTML = h || '<div class="muted pad">Ничего не найдено</div>';
        };
        inp.addEventListener('input', run); run();
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const f = $('.sres-i', res); if (f) f.click(); } });
        res.addEventListener('click', (e) => { if (e.target.closest('.sres-i')) closeModal(); });
      },
    });
  }
  App.openSearch = openSearch;

  /* ---------- инициализация ---------- */
  App.init = function () {
    App.store.load();
    initTip();
    window.addEventListener('hashchange', () => { closeDrawer(); closeModal(); App.render(); });

    // делегирование: открытие карточек
    document.addEventListener('click', (e) => {
      const act = e.target.closest('[data-lead],[data-student]');
      if (act) {
        const ctl = e.target.closest('button,input,select,textarea,a,label');
        if (ctl && ctl !== act && act.contains(ctl)) return;
        if (act.dataset.lead) App.leads.open(act.dataset.lead);
        else App.students.open(act.dataset.student);
        return;
      }
      const tg = e.target.closest('.js-viewtoggle');
      if (tg) { const card = tg.closest('.card'); const tbl = card.classList.toggle('show-table'); tg.textContent = tbl ? 'График' : 'Таблица'; tg.setAttribute('aria-pressed', tbl); return; }
      const go = e.target.closest('[data-go]');
      if (go) { closeDrawer(); closeModal(); App.go(go.dataset.go); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const act = e.target.closest && e.target.closest('[data-lead],[data-student]');
        if (act && act === e.target) { e.preventDefault(); act.click(); }
      }
      if (e.key === 'Escape') { if ($('#modal').classList.contains('open')) closeModal(); else if ($('#drawer').classList.contains('open')) closeDrawer(); else document.body.classList.remove('nav-open'); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    });

    $('#roleSel').addEventListener('change', (e) => { S().role = e.target.value; App.store.save(); closeDrawer(); App.render(); App.ui.toast('Вы вошли как: ' + t(S().role) + ' — ' + App.get.me().name, 'info'); });
    $('#langSw').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S().lang = b.dataset.lang; App.refresh(); });
    $('#themeBtn').addEventListener('click', () => { const st = S(); st.theme = st.theme === 'dark' ? 'light' : 'dark'; App.refresh(); });
    $('#searchBtn').addEventListener('click', openSearch);
    $('#addLeadBtn').addEventListener('click', () => App.leads.create());
    $('#burger').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    $('#navBack').addEventListener('click', () => document.body.classList.remove('nav-open'));

    // заявка с сайта, отправленная в другой вкладке, появляется сразу
    window.addEventListener('storage', (e) => {
      if (e.key !== App.KEY) return;
      const before = S().leads.length;
      App.store.load();
      const after = S().leads.length;
      if (!document.body.classList.contains('public')) {
        App.render(true);
        if (after > before) { const l = S().leads[0]; App.ui.toast('Новая заявка с сайта: ' + l.name, 'good'); }
      }
    });

    App.render();
  };
})();
