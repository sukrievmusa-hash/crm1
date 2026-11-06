/* Грант CRM — группы, оплаты, пробные ЕНТ, задачи */
(function () {
  'use strict';
  const App = window.App;
  const { $, $$, esc, num, money, moneyShort, pct, DAY, HOUR, fmtDate, fmtDT, isoDate, isoDT, startOfDay, startOfMonth, uid, shortName, avg, sum, median, plural, dueLabel } = App.u;
  const { badge, opt, field, formData, toast, modal, closeModal, kpi, delta, empty, avatar } = App.ui;
  const C = App.C;
  const icon = App.icon;

  /* ================= ГРУППЫ ================= */
  App.views.groups = {
    render(el) {
      const st = App.S(); const me = App.get.me();
      const groups = st.role === 'curator' ? st.groups.filter((g) => g.curatorId === me.id) : st.groups;
      el.innerHTML = `<div class="toolbar"><span class="muted">${groups.length} ${plural(groups.length, ['группа', 'группы', 'групп'])} · ${sum(groups, (g) => App.calc.groupStudents(g.id).length)} учеников</span><div class="grow"></div>${st.role === 'director' ? `<button class="btn primary" id="gAdd">${icon('plus', 16)} Новая группа</button>` : ''}</div>
        <div class="gcards">${groups.map((g) => {
          const studs = App.calc.groupStudents(g.id).filter((s) => s.status === 'active');
          const n = App.calc.groupStudents(g.id).length; const fill = n / g.capacity;
          const lasts = studs.map((s) => App.calc.last(s)).filter(Boolean);
          const risky = studs.filter((s) => App.calc.risk(s).level === 'crit').length;
          return `<article class="gcard" data-g="${g.id}" tabindex="0" role="button">
            <header><div><b>${esc(g.name)}</b><small>${esc(App.get.combo(g.combo).name)}</small></div>${g.lang === 'kz' ? badge('info', 'қазақша') : badge('neutral', 'русский')}</header>
            <div class="gc-row">${icon('calendar', 14)} ${esc(g.schedule)}</div>
            <div class="gc-row">${avatar(App.get.user(g.curatorId))} ${esc(App.get.user(g.curatorId).name)}</div>
            <div class="fill"><div class="fill-bar ${fill >= 0.9 ? 'hot' : ''}" style="width:${Math.min(100, fill * 100)}%"></div></div>
            <div class="gc-foot"><span><b>${n}</b>/${g.capacity} мест${fill >= 0.9 ? ' · ' + badge('warn', 'почти заполнена') : ''}</span></div>
            <div class="gc-stats"><div><small>Средний балл</small><b>${lasts.length ? Math.round(avg(lasts, (e) => e.total)) : '—'}</b></div><div><small>Посещаемость</small><b>${studs.length ? Math.round(avg(studs, (s) => s.attendance)) + '%' : '—'}</b></div><div><small>Риск ухода</small><b class="${risky ? 'txt-crit' : ''}">${risky}</b></div></div>
          </article>`;
        }).join('')}</div>`;
      $$('.gcard', el).forEach((c) => (c.onclick = () => groupModal(App.get.group(c.dataset.g))));
      const a = $('#gAdd', el); if (a) a.onclick = newGroup;
    },
  };

  function groupModal(g) {
    const studs = App.calc.groupStudents(g.id).map((s) => ({ s, last: App.calc.last(s), risk: App.calc.risk(s) })).sort((a, b) => (b.last ? b.last.total : 0) - (a.last ? a.last.total : 0));
    modal({
      title: g.name + ' · ' + g.schedule, wide: true,
      body: studs.length ? `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>#</th><th>Ученик</th><th class="r">Пробный</th><th class="r">Посещ.</th><th class="r">ДЗ</th><th>Риск</th></tr></thead><tbody>
        ${studs.map((x, i) => `<tr class="clickable" data-student="${x.s.id}"><td>${i + 1}</td><td>${esc(x.s.name)}${x.s.status === 'frozen' ? ' ' + badge('warn', 'заморозка') : ''}</td><td class="r">${x.last ? x.last.total : '—'}</td><td class="r">${x.s.attendance}%</td><td class="r">${x.s.homework}%</td><td>${badge(x.risk.level, x.risk.label)}</td></tr>`).join('')}
        </tbody></table></div>` : empty('В группе пока нет учеников'),
      onMount(box) { box.addEventListener('click', (e) => { if (e.target.closest('[data-student]')) closeModal(); }); },
    });
  }

  function newGroup() {
    const st = App.S();
    modal({
      title: 'Новая группа',
      body: `<div class="form2">
        ${field('Профиль', `<select name="combo">${C.COMBOS.map((c) => opt(c.id, c.name, 'mi')).join('')}</select>`)}
        ${field('Язык', `<select name="lang">${opt('ru', 'Русский', 'ru')}${opt('kz', 'Казахский', 'ru')}</select>`)}
        ${field('Расписание', '<input name="schedule" value="Пн/Ср/Пт · 20:00">')}
        ${field('Мест', '<input name="capacity" type="number" min="5" max="60" value="25">')}
        ${field('Куратор', `<select name="curatorId">${st.staff.filter((u) => u.role === 'curator').map((u) => opt(u.id, u.name, 'u5')).join('')}</select>`)}
      </div>`,
      foot: '<button class="btn ghost" data-close>Отмена</button><button class="btn primary" id="ngOk">Создать</button>',
      onMount(box) {
        $('#ngOk', box).onclick = () => {
          const d = formData(box); const c = App.get.combo(d.combo);
          const n = st.groups.filter((g) => g.combo === d.combo && g.lang === d.lang).length + 1;
          st.groups.push({ id: uid('g'), name: `${c.short} · ${d.lang.toUpperCase()}${n > 1 ? ' · поток ' + n : ''}`, combo: d.combo, lang: d.lang, schedule: d.schedule, capacity: +d.capacity || 25, curatorId: d.curatorId });
          closeModal(); App.refresh(); toast('Группа создана', 'good');
        };
      },
    });
  }

  /* ================= ОПЛАТЫ ================= */
  const pf = { tab: 'all' };
  function markPaid(p, method = 'kaspi_pay') {
    const s = App.get.student(p.studentId);
    p.status = 'paid'; p.method = method; p.paidLate = p.date < Date.now(); p.date = Date.now();
    if (s) {
      s.notes.unshift({ at: Date.now(), text: 'Оплата получена: ' + money(p.amount), by: App.get.me().id });
      const st = App.S();
      if (!st.payments.some((x) => x.studentId === s.id && x.status !== 'paid')) st.payments.push({ id: uid('p'), studentId: s.id, amount: App.get.tariff(s.tariff).price, method: '', date: Date.now() + 30 * DAY, status: 'due' });
      st.tasks.forEach((t) => { if (t.studentId === s.id && !t.done && /оплат/i.test(t.title)) t.done = true; });
    }
    App.refresh(); toast('Оплата отмечена: ' + money(p.amount), 'good');
  }
  App.payments = { markPaid };

  App.views.payments = {
    render(el) {
      const st = App.S(); const now = Date.now();
      const me = App.get.me();
      const mine = (p) => st.role !== 'sales' || (App.get.student(p.studentId) || {}).managerId === me.id;
      const all = st.payments.filter(mine);
      const ms = startOfMonth(now);
      const paidM = all.filter((p) => p.status === 'paid' && p.date >= ms);
      const due7 = all.filter((p) => p.status === 'due' && p.date < now + 7 * DAY);
      const od = all.filter((p) => p.status === 'overdue');
      const last90 = all.filter((p) => p.status === 'paid' && p.date > now - 90 * DAY);
      const tot90 = sum(last90, (p) => p.amount);
      const methods = Object.entries(C.METHODS).map(([k, v]) => { const a = sum(last90.filter((p) => p.method === k), (p) => p.amount); return { label: v, value: tot90 ? a / tot90 : 0, display: pct(tot90 ? a / tot90 : 0), sub: money(a), tip: `${v}\n${money(a)} · ${pct(tot90 ? a / tot90 : 0)}` }; }).sort((a, b) => b.value - a.value);
      const kaspiShare = sum(methods.filter((m) => m.label.startsWith('Kaspi')), (m) => m.value);
      let list = all.slice();
      if (pf.tab === 'due') list = list.filter((p) => p.status === 'due');
      if (pf.tab === 'overdue') list = list.filter((p) => p.status === 'overdue');
      if (pf.tab === 'paid') list = list.filter((p) => p.status === 'paid');
      const rank = { overdue: 0, due: 1, paid: 2 };
      list.sort((a, b) => rank[a.status] - rank[b.status] || (a.status === 'due' ? a.date - b.date : b.date - a.date));
      const shown = list.slice(0, 80);
      el.innerHTML = `
        <div class="kpis">
          ${kpi('Получено в этом месяце', moneyShort(sum(paidM, (p) => p.amount)), paidM.length + ' ' + plural(paidM.length, ['платёж', 'платежа', 'платежей']))}
          ${kpi('Ожидается за 7 дней', moneyShort(sum(due7, (p) => p.amount)), due7.length + ' ' + plural(due7.length, ['платёж', 'платежа', 'платежей']))}
          ${kpi('Просрочено', money(sum(od, (p) => p.amount)), od.length ? '⚠ ' + od.length + ' ' + plural(od.length, ['ученик', 'ученика', 'учеников']) : '✓ долгов нет', od.length ? 'down' : 'up')}
          ${kpi('Через Kaspi', pct(kaspiShare), 'доля выручки за 90 дней')}
        </div>
        ${App.charts.card('Способы оплаты', App.charts.hbars(methods, { max: 1 }), { head: ['Способ', 'Доля', 'Сумма'], rows: methods.map((m) => [m.label, m.display, m.sub]) }, { sub: 'Доля выручки за 90 дней', cls: 'narrow' })}
          <section class="card"><div class="card-h"><div><h3>Платежи</h3></div>${st.role !== 'curator' ? `<button class="btn primary sm" id="pAdd">${icon('plus', 14)} Платёж</button>` : ''}</div>
            <div class="tabs" role="tablist">${[['all', 'Все'], ['overdue', 'Просрочено · ' + od.length], ['due', 'Ожидаются'], ['paid', 'Оплачено']].map(([k, l]) => `<button role="tab" data-tab="${k}" class="${pf.tab === k ? 'on' : ''}" aria-selected="${pf.tab === k}">${l}</button>`).join('')}</div>
            ${shown.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Дата</th><th>Ученик</th><th class="r">Сумма</th><th>Способ</th><th>Статус</th><th></th></tr></thead><tbody>
            ${shown.map((p) => { const s = App.get.student(p.studentId); return `<tr data-student="${p.studentId}" class="clickable"><td class="nowrap">${fmtDate(p.date)}</td><td class="nowrap">${esc(s ? s.name : '—')}</td><td class="r"><b>${money(p.amount)}</b></td><td class="nowrap">${p.method ? esc(C.METHODS[p.method]) : '—'}</td>
              <td>${p.status === 'paid' ? badge('good', 'оплачено') : p.status === 'overdue' ? badge('crit', 'просрочено ' + Math.max(1, Math.floor((now - p.date) / DAY)) + ' дн') : badge('warn', 'ожидается')}</td>
              <td class="r nowrap">${p.status !== 'paid' ? `<button class="btn sm" data-remind="${p.id}">Напомнить</button> <button class="btn sm good" data-paid="${p.id}">Оплачено</button>` : ''}</td></tr>`; }).join('')}
            </tbody></table></div>${list.length > shown.length ? `<p class="muted small pad-t">Показаны последние ${shown.length} из ${list.length}</p>` : ''}` : empty('Нет платежей в этой вкладке')}
          </section>`;
      $$('.tabs button', el).forEach((b) => (b.onclick = () => { pf.tab = b.dataset.tab; App.render(true); }));
      $$('[data-remind]', el).forEach((b) => (b.onclick = () => App.students.remindPay(st.payments.find((x) => x.id === b.dataset.remind))));
      $$('[data-paid]', el).forEach((b) => (b.onclick = () => markPaid(st.payments.find((x) => x.id === b.dataset.paid))));
      const a = $('#pAdd', el); if (a) a.onclick = addPayment;
    },
  };

  function addPayment() {
    const st = App.S();
    const studs = App.calc.visibleStudents().filter((s) => s.status !== 'left').sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    modal({
      title: 'Новый платёж',
      body: `<div class="form2">${field('Ученик', `<select name="sid">${studs.map((s) => opt(s.id, s.name, studs[0].id)).join('')}</select>`)}${field('Сумма, ₸', `<input name="amount" type="number" min="0" step="100" value="${App.get.tariff(studs[0].tariff).price}">`)}${field('Способ', `<select name="method">${Object.entries(C.METHODS).map(([k, v]) => opt(k, v, 'kaspi_pay')).join('')}</select>`)}</div>`,
      foot: '<button class="btn ghost" data-close>Отмена</button><button class="btn primary" id="paOk">Добавить</button>',
      onMount(box) {
        $('[name=sid]', box).onchange = (e) => { $('[name=amount]', box).value = App.get.tariff(App.get.student(e.target.value).tariff).price; };
        $('#paOk', box).onclick = () => {
          const d = formData(box); const amt = +d.amount;
          if (!(amt > 0)) { toast('Укажите сумму', 'crit'); return; }
          st.payments.push({ id: uid('p'), studentId: d.sid, amount: amt, method: d.method, date: Date.now(), status: 'paid' });
          closeModal(); App.refresh(); toast('Платёж добавлен', 'good');
        };
      },
    });
  }

  /* ================= ПРОБНЫЕ ЕНТ ================= */
  const ef = { exam: '' };
  App.views.exams = {
    render(el) {
      const st = App.S(); const now = Date.now();
      const past = st.mockExams.filter((e) => e.date < now).sort((a, b) => a.date - b.date);
      const upcoming = st.mockExams.filter((e) => e.date >= now).sort((a, b) => a.date - b.date);
      if (!ef.exam || !App.get.exam(ef.exam)) ef.exam = past.length ? past[past.length - 1].id : (upcoming[0] || {}).id;
      const ex = App.get.exam(ef.exam);
      const studs = App.calc.visibleStudents().filter((s) => s.status !== 'left');
      const res = studs.map((s) => { const r = s.exams.find((e) => e.examId === ex.id); return r ? { s, r, total: App.calc.total(r) } : null; }).filter(Boolean).sort((a, b) => b.total - a.total);
      const idx = past.findIndex((e) => e.id === ex.id);
      const prev = idx > 0 ? past[idx - 1] : null;
            const a1 = res.length ? avg(res, (x) => x.total) : null;
      const pd = App.calc.pairedDelta(studs, prev, ex);
      const dA = pd ? { txt: (pd.v >= 0 ? '▲ +' : '▼ −') + Math.abs(pd.v).toFixed(1).replace('.', ',') + ' к ' + prev.title.replace('Пробный ЕНТ ', '') + ' у тех же ' + pd.n, cls: pd.v >= 0 ? 'up' : 'down' } : { txt: prev ? '' : 'первый пробник', cls: '' };
      const highChance = res.filter((x) => x.total >= App.calc.pass(x.s.target)).length;
      const bins = []; for (let b = 30; b < 140; b += 10) { const hi = b === 130 ? 140 : b + 9; bins.push({ label: String(b), value: res.filter((x) => x.total >= b && x.total <= hi).length, rng: b + '–' + hi }); }
      bins.forEach((b) => (b.tip = `${b.rng} баллов\n${b.value} ${plural(b.value, ['ученик', 'ученика', 'учеников'])}`));
      const secs = [['hist', 'История Казахстана', 20], ['ml', 'Мат. грамотность', 10], ['rl', 'Грамотность чтения', 10], ['p1', 'Профильный предмет 1', 50], ['p2', 'Профильный предмет 2', 50]].map(([k, n, m]) => ({ label: n, value: res.length ? avg(res, (x) => x.r[k]) / m : 0 }));
      const weakIdx = secs.reduce((w, s, i) => (s.value < secs[w].value ? i : w), 0);
      secs.forEach((s, i) => { s.display = pct(s.value); s.sub = i === weakIdx ? 'самый слабый раздел' : ''; s.cls = i === weakIdx ? 'weak' : ''; });
      const groups = st.groups.filter((g) => res.some((x) => x.s.groupId === g.id)).map((g) => {
        const r = res.filter((x) => x.s.groupId === g.id);
        const gp = App.calc.pairedDelta(studs.filter((s) => s.groupId === g.id), prev, ex);
        return { g, n: r.length, a: avg(r, (x) => x.total), d: gp ? gp.v : null };
      }).sort((a, b) => b.a - a.a);
      const isPast = ex.date < now;

      el.innerHTML = `
        <div class="toolbar">
          <select id="exSel" aria-label="Пробный ЕНТ">${st.mockExams.slice().sort((a, b) => b.date - a.date).map((e) => opt(e.id, `${e.title} · ${fmtDate(e.date)}${e.date >= now ? ' (запланирован)' : ''}`, ex.id)).join('')}</select>
          <div class="grow"></div>
          ${isPast ? `<button class="btn" id="exImp">${icon('upload', 16)} Импорт результатов</button>` : ''}
          ${st.role === 'director' || st.role === 'curator' ? `<button class="btn primary" id="exNew">${icon('plus', 16)} Назначить пробный ЕНТ</button>` : ''}
        </div>
        ${!isPast ? `<div class="alert info">${icon('calendar', 16)} ${esc(ex.title)} пройдёт ${fmtDT(ex.date)}. Записано: ${st.leads.filter((l) => l.stage === 'mock').length} ${plural(st.leads.filter((l) => l.stage === 'mock').length, ['заявка', 'заявки', 'заявок'])} и ${studs.filter((s) => s.status === 'active').length} учеников. Результаты появятся здесь после импорта.</div>` : `
        <div class="kpis">
          ${kpi('Участников', res.length)}
          ${kpi('Средний балл', a1 != null ? a1.toFixed(1).replace('.', ',') : '—', dA.txt, dA.cls)}
          ${kpi('Медиана', res.length ? Math.round(median(res.map((x) => x.total))) : '—', 'из 140')}
          ${kpi('Уже на уровне гранта', highChance, res.length ? pct(highChance / res.length) + ' участников' : '')}
        </div>
        <div class="grid2">
          ${App.charts.card('Распределение баллов', App.charts.vbars(bins, { height: 170 }), { head: ['Баллы', 'Учеников'], rows: bins.map((b) => [b.label, b.value]) }, { sub: 'Сколько учеников в каждом диапазоне' })}
          ${App.charts.card('Разделы ЕНТ', App.charts.hbars(secs, { max: 1 }), { head: ['Раздел', 'Средний % от максимума'], rows: secs.map((s) => [s.label, s.display]) }, { sub: 'Средний % от максимального балла' })}
        </div>
        <div class="grid2">
          <section class="card"><div class="card-h"><div><h3>Топ-10</h3></div></div>
            <ol class="lb">${res.slice(0, 10).map((x) => `<li data-student="${x.s.id}" class="clickable"><span>${esc(x.s.name)}<small>${esc((App.get.group(x.s.groupId) || {}).name || '')}</small></span><b>${x.total}</b></li>`).join('')}</ol></section>
          <section class="card"><div class="card-h"><div><h3>По группам</h3></div></div>
            <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Группа</th><th class="r">Участников</th><th class="r">Средний</th><th class="r">Прирост</th></tr></thead><tbody>
            ${groups.map((x) => `<tr><td>${esc(x.g.name)}</td><td class="r">${x.n}</td><td class="r"><b>${x.a.toFixed(1).replace('.', ',')}</b></td><td class="r">${x.d == null ? '—' : `<span class="${x.d >= 0 ? 'txt-good' : 'txt-crit'}">${x.d >= 0 ? '▲ +' : '▼ −'}${Math.abs(x.d).toFixed(1).replace('.', ',')}</span>`}</td></tr>`).join('')}
            </tbody></table></div></section>
        </div>`}`;
      $('#exSel', el).onchange = (e) => { ef.exam = e.target.value; App.render(true); };
      const imp = $('#exImp', el); if (imp) imp.onclick = () => importModal(ex);
      const nw = $('#exNew', el); if (nw) nw.onclick = newExam;
    },
  };

  function importModal(ex) {
    const st = App.S();
    const sample = App.calc.visibleStudents().filter((s) => s.status === 'active').slice(0, 2).map((s) => `${s.name};18;8;9;41;37`).join('\n');
    modal({
      title: 'Импорт результатов · ' + ex.title, wide: true,
      body: `<p class="muted">Вставьте строки из Excel или Google Таблиц: <code>ФИО;История;Мат.грам;Грам.чтения;Профиль1;Профиль2</code>. Разделитель — «;», «,» или табуляция. Существующие результаты перезапишутся.</p>
        <textarea id="impT" rows="8" placeholder="${esc(sample)}"></textarea><div id="impR" class="muted small"></div>`,
      foot: '<button class="btn ghost" data-close>Отмена</button><button class="btn primary" id="impOk">Импортировать</button>',
      onMount(box) {
        $('#impOk', box).onclick = () => {
          const lines = $('#impT', box).value.split(/\n+/).map((l) => l.trim()).filter(Boolean);
          let ok = 0; const miss = [], bad = [];
          lines.forEach((line) => {
            const p = line.split(/[;\t]|,(?=\s*\d)/).map((x) => x.trim());
            const name = p[0]; const v = p.slice(1, 6).map(Number);
            const s = st.students.find((x) => x.name.toLowerCase() === name.toLowerCase());
            if (!s) { miss.push(name); return; }
            const lim = [20, 10, 10, 50, 50];
            if (v.length < 5 || v.some((x, i) => !(x >= 0 && x <= lim[i]))) { bad.push(name); return; }
            const rec = { examId: ex.id, hist: v[0], ml: v[1], rl: v[2], p1: v[3], p2: v[4] };
            const i = s.exams.findIndex((e) => e.examId === ex.id);
            if (i >= 0) s.exams[i] = rec; else s.exams.push(rec);
            ok++;
          });
          if (!ok) { $('#impR', box).innerHTML = 'Ничего не импортировано.' + (miss.length ? ' Не найдены: ' + esc(miss.join(', ')) : '') + (bad.length ? ' Ошибки в баллах: ' + esc(bad.join(', ')) : ''); return; }
          closeModal(); App.refresh();
          toast(`Импортировано: ${ok}` + (miss.length ? `, не найдено: ${miss.length}` : '') + (bad.length ? `, с ошибками: ${bad.length}` : ''), miss.length || bad.length ? 'warn' : 'good');
        };
      },
    });
  }

  function newExam() {
    const st = App.S();
    const def = startOfDay(Date.now() + 21 * DAY) + 10 * HOUR;
    modal({
      title: 'Назначить пробный ЕНТ',
      body: field('Дата и время', `<input type="datetime-local" name="dt" value="${isoDT(def)}">`) + '<p class="muted small">Кураторам придёт задача «Провести пробный ЕНТ», заявки на этапе «Пробный ЕНТ» получат приглашение через рассылки.</p>',
      foot: '<button class="btn ghost" data-close>Отмена</button><button class="btn primary" id="neOk">Назначить</button>',
      onMount(box) {
        $('#neOk', box).onclick = () => {
          const ts = new Date($('[name=dt]', box).value).getTime();
          if (!ts || ts < Date.now()) { toast('Выберите дату в будущем', 'crit'); return; }
          const e = { id: uid('ex'), date: ts, title: 'Пробный ЕНТ №' + (st.mockExams.length + 1) };
          st.mockExams.push(e);
          st.staff.filter((u) => u.role === 'curator').forEach((u) => st.tasks.push({ id: uid('t'), title: 'Провести ' + e.title, due: ts, assigneeId: u.id, done: false, priority: 'normal', leadId: null, studentId: null }));
          ef.exam = e.id; closeModal(); App.refresh(); toast(e.title + ' назначен на ' + fmtDT(ts), 'good');
        };
      },
    });
  }

  /* ================= ЗАДАЧИ ================= */
  const tf = { scope: '' };
  App.views.tasks = {
    render(el) {
      const st = App.S(); const me = App.get.me(); const now = Date.now();
      if (!tf.scope) tf.scope = st.role === 'director' ? 'all' : 'mine';
      if (st.role !== 'director' && tf.scope === 'all') tf.scope = 'mine';
      const base = tf.scope === 'all' ? st.tasks : st.tasks.filter((t) => t.assigneeId === me.id);
      const sod = startOfDay(now), eod = sod + DAY;
      const open = base.filter((t) => !t.done).sort((a, b) => a.due - b.due);
      const sections = [
        ['Просрочено', open.filter((t) => t.due < now), 'over'],
        ['Сегодня', open.filter((t) => t.due >= now && t.due < eod), ''],
        ['Позже', open.filter((t) => t.due >= eod), ''],
        ['Выполнено', base.filter((t) => t.done).slice(-8).reverse(), 'done'],
      ];
      const row = (t) => {
        const ref = t.leadId ? App.get.lead(t.leadId) : t.studentId ? App.get.student(t.studentId) : null;
        const attr = t.leadId ? `data-lead="${t.leadId}"` : t.studentId ? `data-student="${t.studentId}"` : '';
        return `<li class="${t.done ? 'is-done' : ''}"><label class="cb"><input type="checkbox" data-task="${t.id}" ${t.done ? 'checked' : ''} aria-label="Выполнено"><span></span></label>
          <div class="t-main"><div>${t.priority === 'high' && !t.done ? '<span class="prio" title="Высокий приоритет">!</span> ' : ''}${esc(t.title)}${ref ? ` — <button class="linkish" ${attr}>${esc(ref.name)}</button>` : ''}</div>
          <small class="${!t.done && t.due < now ? 'txt-crit' : ''}">${!t.done && t.due < now ? '⚠ ' : ''}${dueLabel(t.due)}${tf.scope === 'all' ? ' · ' + esc(shortName((App.get.user(t.assigneeId) || {}).name || '')) : ''}</small></div></li>`;
      };
      el.innerHTML = `<div class="toolbar">${st.role === 'director' ? `<div class="seg"><button data-sc="all" class="${tf.scope === 'all' ? 'on' : ''}">Все сотрудники</button><button data-sc="mine" class="${tf.scope === 'mine' ? 'on' : ''}">Мои</button></div>` : '<span class="muted">Мои задачи</span>'}<div class="grow"></div><button class="btn primary" id="tAdd">${icon('plus', 16)} Задача</button></div>
        <div class="tcols">${sections.map(([n, list, cls]) => `<section class="card tsec ${cls}"><div class="card-h"><h3>${n} <em>${list.length}</em></h3></div>${list.length ? `<ul class="tasks">${list.map(row).join('')}</ul>` : empty(cls === 'over' ? 'Просроченных задач нет 👍' : 'Пусто')}</section>`).join('')}</div>`;
      $$('[data-sc]', el).forEach((b) => (b.onclick = () => { tf.scope = b.dataset.sc; App.render(true); }));
      $$('[data-task]', el).forEach((c) => (c.onchange = () => { const t = st.tasks.find((x) => x.id === c.dataset.task); t.done = c.checked; App.refresh(); if (c.checked) toast('Задача выполнена', 'good'); }));
      $('#tAdd', el).onclick = addTask;
    },
  };

  function addTask() {
    const st = App.S(); const me = App.get.me();
    const def = Date.now() + 2 * HOUR;
    modal({
      title: 'Новая задача',
      body: `${field('Что сделать', '<input name="title" placeholder="Например: созвониться с родителями группы МАТ-ИНФ">')}
        <div class="form2">${field('Срок', `<input name="due" type="datetime-local" value="${isoDT(def - (def % (15 * 60000)))}">`)}
        ${field('Исполнитель', `<select name="who">${st.staff.map((u) => opt(u.id, `${u.name} · ${App.t(u.role)}`, me.id)).join('')}</select>`)}
        ${field('Приоритет', `<select name="prio">${opt('normal', 'Обычный', 'normal')}${opt('high', 'Высокий', 'normal')}</select>`)}</div>`,
      foot: '<button class="btn ghost" data-close>Отмена</button><button class="btn primary" id="taOk">Создать</button>',
      onMount(box) {
        $('#taOk', box).onclick = () => {
          const d = formData(box);
          if (!d.title) { toast('Опишите задачу', 'crit'); return; }
          st.tasks.push({ id: uid('t'), title: d.title, due: new Date(d.due).getTime() || def, assigneeId: d.who, done: false, priority: d.prio, leadId: null, studentId: null });
          closeModal(); App.refresh(); toast('Задача создана', 'good');
        };
      },
    });
  }
})();
