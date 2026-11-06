/* Грант CRM — ученики: таблица, карточка, прогноз и шанс на грант, отчёт родителю */
(function () {
  'use strict';
  const App = window.App;
  const { $, $$, esc, money, DAY, fmtDate, fmtDT, uid, shortName, digits, avg, pct } = App.u;
  const { badge, opt, field, formData, toast, modal, closeModal, drawer, copy, empty } = App.ui;
  const C = App.C;
  const icon = App.icon;
  const f = { q: '', group: '', status: 'active', risk: '', pay: '', sort: 'name', dir: 1, near: false };

  const STATUS = { active: ['good', 'учится'], frozen: ['warn', 'заморозка'], left: ['neutral', 'выбыл'] };
  const PAY = { ok: ['good', 'оплачено'], due: ['warn', 'скоро оплата'], overdue: ['crit', 'просрочка'] };

  function rows() {
    const q = f.q.toLowerCase(), qd = digits(f.q);
    let list = App.calc.visibleStudents().filter((s) =>
      (!q || s.name.toLowerCase().includes(q) || (qd.length >= 3 && (digits(s.phone).includes(qd) || digits(s.parentPhone).includes(qd)))) &&
      (!f.group || s.groupId === f.group) && (!f.status || s.status === f.status));
    let r = list.map((s) => {
      const last = App.calc.last(s);
      return { s, last: last ? last.total : null, d: App.calc.delta(s), fc: App.calc.forecast(s), ch: App.calc.chance(s), risk: App.calc.risk(s), pay: App.calc.payStatus(s), g: App.get.group(s.groupId) };
    });
    if (f.risk) r = r.filter((x) => x.risk.level === f.risk);
    if (f.pay) r = r.filter((x) => x.pay === f.pay);
    if (f.near) r = r.filter((x) => x.ch && x.ch.gap > 0 && x.ch.gap <= 15 && (x.s.tariff === 'std' || x.s.tariff === 'pro'));
    const key = {
      name: (x) => x.s.name, group: (x) => (x.g ? x.g.name : ''), last: (x) => x.last ?? -1, fc: (x) => x.fc ?? -1, ch: (x) => (x.ch ? x.ch.p : -1),
      att: (x) => x.s.attendance, hw: (x) => x.s.homework, risk: (x) => x.risk.score, pay: (x) => ({ overdue: 2, due: 1, ok: 0 }[x.pay]),
    }[f.sort];
    r.sort((a, b) => { const A = key(a), B = key(b); return (typeof A === 'string' ? A.localeCompare(B, 'ru') : A - B) * f.dir; });
    return r;
  }

  function table(r) {
    if (!r.length) return empty('Учеников не найдено — измените фильтры');
    const th = (k, l, cls = '') => `<th class="sortable ${cls}" data-sort="${k}" aria-sort="${f.sort === k ? (f.dir > 0 ? 'ascending' : 'descending') : 'none'}">${l}${f.sort === k ? (f.dir > 0 ? ' ↑' : ' ↓') : ''}</th>`;
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${th('name', 'Ученик')}${th('group', 'Группа')}${th('last', 'Пробный', 'r')}${th('fc', 'Прогноз', 'r')}${th('ch', 'Шанс на грант')}${th('att', 'Посещ.', 'r')}${th('hw', 'ДЗ', 'r')}${th('pay', 'Оплата')}${th('risk', 'Риск ухода')}</tr></thead><tbody>
      ${r.map((x) => `<tr data-student="${x.s.id}" tabindex="0" class="clickable">
        <td><b>${esc(x.s.name)}</b><div class="muted small">${esc(x.s.city)} · ${x.s.lang === 'kz' ? 'каз' : 'рус'}</div></td>
        <td>${esc(x.g ? x.g.name : '—')}</td>
        <td class="r">${x.last != null ? `<b>${x.last}</b>${x.d != null ? ` <small class="${x.d >= 0 ? 'txt-good' : 'txt-crit'}">${x.d >= 0 ? '▲' : '▼'}${Math.abs(x.d)}</small>` : ''}` : '—'}</td>
        <td class="r">${x.fc ?? '—'}</td>
        <td>${x.ch ? badge(x.ch.level, Math.round(x.ch.p * 100) + '% · ' + x.ch.label) : '—'}</td>
        <td class="r">${x.s.attendance}%</td><td class="r">${x.s.homework}%</td>
        <td>${badge(...PAY[x.pay])}</td>
        <td>${x.s.status === 'left' ? badge('neutral', 'выбыл') : badge(x.risk.level, x.risk.label)}</td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function renderBody(el) {
    const r = rows();
    $('#scount', el).textContent = r.length + ' ' + App.u.plural(r.length, ['ученик', 'ученика', 'учеников']);
    $('#sbody', el).innerHTML = table(r);
    $$('th.sortable', el).forEach((t) => (t.onclick = () => { const k = t.dataset.sort; if (f.sort === k) f.dir = -f.dir; else { f.sort = k; f.dir = k === 'name' || k === 'group' ? 1 : -1; } renderBody(el); }));
  }

  /* --- карточка ученика --- */
  function weakest(e, combo) { return App.calc.sections(e, combo).slice().sort((a, b) => a.v / a.max - b.v / b.max)[0]; }
  function strongest(e, combo) { return App.calc.sections(e, combo).slice().sort((a, b) => b.v / b.max - a.v / a.max)[0]; }

  function advice(s) {
    const last = App.calc.last(s); if (!last) return 'Запишите ученика на ближайший пробный ЕНТ — без диагностики прогноз невозможен.';
    const w = weakest(last, s.combo); const ch = App.calc.chance(s); const r = App.calc.risk(s);
    const parts = [];
    parts.push(`Слабое место — ${w.name}: ${w.v}/${w.max} (${Math.round((w.v / w.max) * 100)}%). Самый быстрый резерв баллов — 2 дополнительных практикума в неделю по этой теме.`);
    if (ch && ch.gap > 0 && ch.gap <= 15 && (s.tariff === 'std' || s.tariff === 'pro')) parts.push(`До гранта по прогнозу не хватает ${ch.gap} ${App.u.plural(ch.gap, ['балла', 'баллов', 'баллов'])} — предложите тариф «Интенсив + личный куратор».`);
    if (r.level === 'crit') parts.push('Высокий риск ухода: позвоните родителю на этой неделе.');
    return parts.join(' ');
  }

  function parentReport(s) {
    const last = App.calc.last(s); const d = App.calc.delta(s); const fc = App.calc.forecast(s); const ch = App.calc.chance(s);
    const cur = App.get.user((App.get.group(s.groupId) || {}).curatorId);
    const kz = s.lang === 'kz';
    const st = last ? strongest(last, s.combo) : null, w = last ? weakest(last, s.combo) : null;
    const nm = (x) => (kz ? x.kz : x.name);
    if (kz) {
      return [`Сәлеметсіз бе, ${s.parentName.split(' ')[0]}! ${s.name.split(' ')[0]} бойынша апталық есеп:`,
        `• Сабаққа қатысу: ${s.attendance}%`, `• Үй тапсырмалары: ${s.homework}%`,
        last ? `• Соңғы сынақ ҰБТ: ${last.total}/140${d != null ? ` (${d >= 0 ? '+' : ''}${d})` : ''}` : '',
        st ? `• Күшті жағы: ${nm(st)} (${st.v}/${st.max})` : '', w ? `• Назар аударатын пән: ${nm(w)} (${w.v}/${w.max})` : '',
        fc != null ? `• ҰБТ болжамы: ${fc} балл` : '', `Куратор: ${cur ? cur.name : ''}`].filter(Boolean).join('\n');
    }
    return [`Здравствуйте, ${s.parentName.split(' ')[0]}! Еженедельный отчёт: ${s.name.split(' ')[0]}`,
      `• Посещаемость: ${s.attendance}%`, `• Домашние задания: ${s.homework}%`,
      last ? `• Последний пробный ЕНТ: ${last.total}/140${d != null ? ` (${d >= 0 ? '+' : ''}${d} к прошлому)` : ''}` : '',
      st ? `• Сильная сторона: ${st.name} (${st.v}/${st.max})` : '', w ? `• Над чем работаем: ${w.name} (${w.v}/${w.max})` : '',
      fc != null ? `• Прогноз к ЕНТ: ${fc} — шанс на грант «${(App.get.spec(s.target) || {}).name}»: ${ch ? ch.label : '—'}` : '', `Куратор: ${cur ? cur.name : ''}`].filter(Boolean).join('\n');
  }

  function reportModal(s) {
    modal({
      title: 'Отчёт родителю',
      body: `<p class="muted">Собирается автоматически из посещаемости, ДЗ и пробных ЕНТ — на языке семьи (${s.lang === 'kz' ? 'қазақша' : 'русский'}).</p><textarea id="rep" rows="10">${esc(parentReport(s))}</textarea>`,
      foot: `<button class="btn ghost" data-close>Закрыть</button><button class="btn primary" id="repCopy">${icon('copy', 16)} Скопировать</button>`,
      onMount(box) { $('#repCopy', box).onclick = () => { copy($('#rep', box).value, 'Отчёт скопирован — вставьте в WhatsApp'); s.notes.unshift({ at: Date.now(), text: 'Отправлен отчёт родителю', by: App.get.me().id }); App.store.save(); closeModal(); }; },
    });
  }

  function remindPay(p) {
    const s = App.get.student(p.studentId); const st = App.S();
    const t = st.templates.find((x) => x.id === 'tpl3');
    const text = App.calc.fill(t[s.lang] || t.ru, { 'родитель': s.parentName.split(' ')[0], 'ученик': s.name.split(' ')[0], 'сумма': money(p.amount) });
    modal({
      title: 'Напоминание об оплате',
      body: `<p class="muted">${esc(s.parentName)} · ${esc(s.parentPhone)}</p><textarea id="rp" rows="5">${esc(text)}</textarea>`,
      foot: `<button class="btn ghost" data-close>Отмена</button><button class="btn primary" id="rpOk">${icon('copy', 16)} Скопировать и отметить</button>`,
      onMount(box) { $('#rpOk', box).onclick = () => { copy($('#rp', box).value, 'Напоминание скопировано'); p.reminded = Date.now(); s.notes.unshift({ at: Date.now(), text: 'Напоминание об оплате ' + money(p.amount), by: App.get.me().id }); App.refresh(); closeModal(); }; },
    });
  }

  function changeGroup(s) {
    const st = App.S();
    modal({
      title: 'Перевести в группу',
      body: field('Группа', `<select id="ng">${st.groups.map((g) => opt(g.id, `${g.name} · ${g.schedule} · ${App.calc.groupStudents(g.id).length}/${g.capacity}`, s.groupId)).join('')}</select>`),
      foot: '<button class="btn ghost" data-close>Отмена</button><button class="btn primary" id="ngOk">Перевести</button>',
      onMount(box) { $('#ngOk', box).onclick = () => { const g = App.get.group($('#ng', box).value); s.groupId = g.id; s.notes.unshift({ at: Date.now(), text: 'Переведён(а) в группу ' + g.name, by: App.get.me().id }); closeModal(); App.refresh(); open(s.id); toast('Переведён(а) в ' + g.name, 'good'); }; },
    });
  }

  function open(id) {
    const s = App.get.student(id); if (!s) return;
    const st = App.S();
    const g = App.get.group(s.groupId); const t = App.get.tariff(s.tariff); const spec = App.get.spec(s.target);
    const ex = App.calc.exams(s); const last = ex[ex.length - 1];
    const fc = App.calc.forecast(s); const ch = App.calc.chance(s); const risk = App.calc.risk(s);
    const pays = App.calc.payments(s);
    const cur = g ? App.get.user(g.curatorId) : null;
    const pts = ex.map((e, i) => ({ label: e.title + ' · ' + fmtDate(e.date), short: '№' + (st.mockExams.findIndex((m) => m.id === e.examId) + 1), value: e.total }));
    const canPay = st.role !== 'curator';
    drawer(`
      <div class="d-head"><div><div class="d-kicker">Ученик · ${esc(g ? g.name : '—')} · ${esc(t.name)}</div><h2>${esc(s.name)}</h2><div class="d-badges">${badge(...STATUS[s.status])}${s.status !== 'left' ? badge(risk.level, 'риск ухода: ' + risk.label) : ''}</div></div><button class="icon-btn" data-dclose aria-label="Закрыть">${icon('x')}</button></div>
      <div class="mini-kpis">
        <div><small>Последний пробный</small><b>${last ? last.total : '—'}<span>/140</span></b></div>
        <div><small>Прогноз к ЕНТ</small><b>${fc ?? '—'}</b></div>
        <div><small>Грант «${esc(spec ? spec.name : '')}»</small><b>${App.calc.pass(s.target)}</b></div>
        <div><small>Шанс</small>${ch ? badge(ch.level, Math.round(ch.p * 100) + '% · ' + ch.label) : '—'}</div>
      </div>
      ${ex.length ? `<section class="d-sec"><h4 class="d-h4">Динамика пробных ЕНТ</h4>${App.charts.scoreLine(pts, { target: App.calc.pass(s.target), forecast: fc, forecastLabel: 'Прогноз к ЕНТ ' + fmtDate(st.entDate) })}<p class="muted small">Зелёный пунктир — проходной балл на грант (демо-значение, настраивается в настройках). Прогноз — по динамике пробников.</p></section>` : ''}
      ${last ? `<section class="d-sec"><h4 class="d-h4">Последний пробный по предметам</h4>${App.charts.hbars(App.calc.sections(last, s.combo).map((x) => ({ label: x.name, value: x.v / x.max, display: x.v + '/' + x.max, tip: `${x.name}: ${x.v} из ${x.max} (${Math.round((x.v / x.max) * 100)}%)` })), { max: 1 })}</section>` : ''}
      <div class="hint">${icon('zap', 16)}<div><b>Рекомендация</b><p>${esc(advice(s))}</p></div></div>
      ${risk.reasons.length ? `<div class="alert ${risk.level === 'crit' ? 'crit' : 'warn'}">${icon('alert', 16)} Факторы риска: ${esc(risk.reasons.join(', '))}</div>` : ''}
      <div class="d-actions">
        <button class="btn primary" id="sRep">${icon('file', 16)} Отчёт родителю</button>
        <button class="btn" id="sGrp">${icon('layers', 16)} Сменить группу</button>
        ${s.status === 'active' ? '<button class="btn" id="sFrz">Заморозить</button>' : '<button class="btn" id="sAct">Вернуть в обучение</button>'}
      </div>
      <dl class="kv">
        <dt>Телефон</dt><dd>${esc(s.phone)}</dd>
        <dt>Родитель</dt><dd>${esc(s.parentName)} (${esc(s.parentRole)}) · ${esc(s.parentPhone)}</dd>
        <dt>Город · язык</dt><dd>${esc(s.city)} · ${s.lang === 'kz' ? 'казахский' : 'русский'}</dd>
        <dt>Профиль</dt><dd>${esc(App.get.combo(s.combo).name)}</dd>
        <dt>Расписание</dt><dd>${esc(g ? g.schedule : '—')}</dd>
        <dt>Куратор</dt><dd>${esc(cur ? cur.name : '—')}</dd>
        <dt>Менеджер</dt><dd>${esc((App.get.user(s.managerId) || {}).name || '—')}</dd>
        <dt>Посещаемость · ДЗ</dt><dd>${s.attendance}% · ${s.homework}%</dd>
        <dt>С нами с</dt><dd>${App.u.fmtDateY(s.joinedAt)}</dd>
      </dl>
      <h4 class="d-h4">Оплаты <small class="muted">${s.plan === 'red' ? '· Kaspi Рассрочка' : '· помесячно'}</small></h4>
      <ul class="plist">${pays.map((p) => `<li><div><b>${money(p.amount)}</b><small>${fmtDate(p.date)}${p.method ? ' · ' + esc(C.METHODS[p.method]) : ''}${p.reminded ? ' · напомнили ' + fmtDate(p.reminded) : ''}</small></div>${p.status === 'paid' ? badge('good', 'оплачено') : `${badge(p.status === 'overdue' ? 'crit' : 'warn', p.status === 'overdue' ? 'просрочено' : 'ожидается')}${canPay ? ` <button class="btn sm" data-remind="${p.id}">Напомнить</button> <button class="btn sm good" data-paid="${p.id}">Оплачено</button>` : ''}`}</li>`).join('') || '<li class="muted">Платежей нет</li>'}</ul>
      <h4 class="d-h4">Заметки</h4>
      <div class="note-add"><input id="snText" placeholder="Заметка куратора…" aria-label="Заметка"><button class="btn" id="snAdd">Добавить</button></div>
      <ul class="timeline">${s.notes.map((n) => `<li><span>${fmtDT(n.at)}${n.by ? ' · ' + esc(shortName((App.get.user(n.by) || {}).name || '')) : ''}</span>${esc(n.text)}</li>`).join('') || '<li class="muted">Пока пусто</li>'}</ul>
    `, (p) => {
      $('#sRep', p).onclick = () => reportModal(s);
      $('#sGrp', p).onclick = () => changeGroup(s);
      const fz = $('#sFrz', p); if (fz) fz.onclick = () => { s.status = 'frozen'; s.notes.unshift({ at: Date.now(), text: 'Обучение заморожено', by: App.get.me().id }); App.refresh(); open(s.id); toast('Обучение заморожено', 'info'); };
      const ac = $('#sAct', p); if (ac) ac.onclick = () => { s.status = 'active'; s.notes.unshift({ at: Date.now(), text: 'Вернулся(ась) к обучению', by: App.get.me().id }); App.refresh(); open(s.id); toast('Ученик снова в обучении', 'good'); };
      $$('[data-remind]', p).forEach((b) => (b.onclick = () => remindPay(st.payments.find((x) => x.id === b.dataset.remind))));
      $$('[data-paid]', p).forEach((b) => (b.onclick = () => { App.payments.markPaid(st.payments.find((x) => x.id === b.dataset.paid)); open(s.id); }));
      const addN = () => { const v = $('#snText', p).value.trim(); if (!v) return; s.notes.unshift({ at: Date.now(), text: v, by: App.get.me().id }); App.refresh(); open(s.id); };
      $('#snAdd', p).onclick = addN; $('#snText', p).onkeydown = (e) => { if (e.key === 'Enter') addN(); };
    });
  }

  App.students = { open, remindPay, parentReport };

  App.views.students = {
    render(el, arg) {
      const st = App.S();
      f.near = arg === 'near';
      if (f.near) f.status = 'active';
      const groups = st.role === 'curator' ? st.groups.filter((g) => g.curatorId === App.get.me().id) : st.groups;
      const vis = App.calc.visibleStudents().filter((s) => s.status === 'active');
      el.innerHTML = `
        ${f.near ? `<div class="alert info">${icon('zap', 16)} Ученики, которым по прогнозу не хватает до 15 баллов до гранта, на тарифах «Стандарт» и «Про». <a href="#/students">Показать всех</a></div>` : ''}
        <div class="kpis small">
          ${App.ui.kpi('Учатся', vis.length)}
          ${App.ui.kpi('Средняя посещаемость', pct(avg(vis, (s) => s.attendance) / 100))}
          ${App.ui.kpi('Высокий шанс на грант', vis.filter((s) => { const c = App.calc.chance(s); return c && c.level === 'good'; }).length)}
          ${App.ui.kpi('Высокий риск ухода', vis.filter((s) => App.calc.risk(s).level === 'crit').length, '', 'down')}
        </div>
        <div class="toolbar">
          <div class="search-in">${icon('search', 16)}<input id="sq" placeholder="Имя или телефон" value="${esc(f.q)}" aria-label="Поиск учеников"></div>
          <select id="sg" aria-label="Группа"><option value="">Все группы</option>${groups.map((g) => opt(g.id, g.name, f.group)).join('')}</select>
          <select id="sst" aria-label="Статус">${opt('', 'Все статусы', f.status)}${opt('active', 'Учатся', f.status)}${opt('frozen', 'Заморозка', f.status)}${opt('left', 'Выбыли', f.status)}</select>
          <select id="srk" aria-label="Риск">${opt('', 'Любой риск', f.risk)}${opt('crit', 'Высокий риск', f.risk)}${opt('warn', 'Средний риск', f.risk)}${opt('good', 'Низкий риск', f.risk)}</select>
          <select id="spy" aria-label="Оплата">${opt('', 'Любая оплата', f.pay)}${opt('overdue', 'Просрочка', f.pay)}${opt('due', 'Скоро оплата', f.pay)}${opt('ok', 'Оплачено', f.pay)}</select>
          <div class="grow"></div><span class="muted" id="scount"></span>
        </div>
        <div id="sbody"></div>`;
      $('#sq', el).oninput = (e) => { f.q = e.target.value; renderBody(el); };
      $('#sg', el).onchange = (e) => { f.group = e.target.value; renderBody(el); };
      $('#sst', el).onchange = (e) => { f.status = e.target.value; renderBody(el); };
      $('#srk', el).onchange = (e) => { f.risk = e.target.value; renderBody(el); };
      $('#spy', el).onchange = (e) => { f.pay = e.target.value; renderBody(el); };
      renderBody(el);
    },
  };
})();
