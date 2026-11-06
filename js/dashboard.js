/* Грант CRM — дашборд (разный для директора, менеджера и куратора) */
(function () {
  'use strict';
  const App = window.App;
  const { esc, num, money, moneyShort, pct, DAY, MIN, startOfDay, startOfMonth, addMonths, sum, avg, median, plural, ago, MON_S, shortName } = App.u;
  const { kpi, delta, badge, empty } = App.ui;
  const C = App.C;
  const icon = App.icon;

  function funnelData(leads) {
    const stages = C.STAGES.slice(0, 6);
    return stages.map((s, i) => ({ label: s.ru, value: leads.filter((l) => l.maxStage >= i).length }));
  }

  function attentionList(st, { leads, students }) {
    const items = [];
    leads.filter(App.calc.slaBreached).forEach((l) => items.push({ lvl: 'crit', w: 3, html: `<b>${esc(l.name)}</b> — заявка без ответа ${App.ui.waitLabel(l.createdAt)}`, sub: `${l.source} · ${App.get.combo(l.combo).short}`, attr: `data-lead="${l.id}"`, tag: 'SLA 15 мин' }));
    students.forEach((s) => {
      const od = st.payments.filter((p) => p.studentId === s.id && p.status === 'overdue');
      if (od.length) items.push({ lvl: 'serious', w: 2, html: `<b>${esc(s.name)}</b> — просрочена оплата ${money(sum(od, (p) => p.amount))}`, sub: `${s.parentRole}: ${s.parentName}`, attr: `data-student="${s.id}"`, tag: 'оплата' });
    });
    students.filter((s) => s.status === 'active').forEach((s) => {
      const r = App.calc.risk(s);
      if (r.level === 'crit') items.push({ lvl: 'warn', w: 1, html: `<b>${esc(s.name)}</b> — риск ухода`, sub: r.reasons.join(', '), attr: `data-student="${s.id}"`, tag: 'удержание' });
    });
    items.sort((a, b) => b.w - a.w);
    if (!items.length) return empty('Всё под контролем — срочных дел нет');
    return `<ul class="att">${items.slice(0, 8).map((i) => `<li class="att-i" ${i.attr} tabindex="0" role="button">${badge(i.lvl, i.tag)}<div><div>${i.html}</div><small>${esc(i.sub)}</small></div>${icon('arrowR', 16)}</li>`).join('')}</ul>${items.length > 8 ? `<div class="muted small pad-t">и ещё ${items.length - 8}</div>` : ''}`;
  }

  /* «Умные подсказки»: выводы из данных, у каждой — действие */
  function insights(st) {
    const out = [];
    const now = Date.now();
    const leads = st.leads.filter((l) => l.createdAt > now - 45 * DAY && l.stage !== 'new');
    // 1. скорость ответа
    const fast = leads.filter((l) => l.firstContactAt && l.firstContactAt - l.createdAt <= 10 * MIN);
    const slow = leads.filter((l) => l.firstContactAt && l.firstContactAt - l.createdAt > 30 * MIN);
    const cr = (arr) => (arr.length ? arr.filter((l) => l.stage === 'paid').length / arr.length : 0);
    if (fast.length > 5 && slow.length > 5 && cr(fast) > cr(slow) * 1.5) {
      out.push({ t: `Заявки, на которые ответили за 10 минут, оплачивают в <b>${pct(cr(fast))}</b> случаев, а с ответом позже 30 минут — в <b>${pct(cr(slow))}</b>. Скорость ответа — главный рычаг продаж.`, a: 'Открыть новые заявки', go: '#/leads' });
    }
    // 2. источники
    const bySrc = C.SOURCES.map((s) => { const a = st.leads.filter((l) => l.source === s && l.stage !== 'new'); return { s, n: a.length, c: cr(a) }; }).filter((x) => x.n >= 5);
    if (bySrc.length > 2) {
      const big = bySrc.slice().sort((a, b) => b.n - a.n)[0];
      const best = bySrc.slice().sort((a, b) => b.c - a.c)[0];
      if (big.s !== best.s) out.push({ t: `<b>${esc(big.s)}</b> приносит больше всего заявок (${big.n}), но в оплату доходит только ${pct(big.c)}. Лучше всех конвертирует источник <b>${esc(best.s)}</b> — ${pct(best.c)}. Стоит вложиться в него: реферальный бонус или ещё один вебинар.`, a: 'Сравнить источники', go: '#/dashboard' });
    }
    // 3. допродажа интенсива
    const act = st.students.filter((s) => s.status === 'active' && (s.tariff === 'std' || s.tariff === 'pro'));
    const near = act.filter((s) => { const c = App.calc.chance(s); return c && c.gap > 0 && c.gap <= 15; });
    if (near.length) {
      const extra = sum(near, (s) => 59900 - App.get.tariff(s.tariff).price);
      out.push({ t: `<b>${near.length} ${plural(near.length, ['ученику', 'ученикам', 'ученикам'])}</b> не хватает до 15 баллов до гранта по прогнозу. Предложите тариф «Интенсив + личный куратор» — это <b>+${moneyShort(extra)}</b> в месяц и реальный шанс на грант для них.`, a: 'Показать учеников', go: '#/students/near' });
    }
    // 4. загрузка групп
    const full = st.groups.filter((g) => App.calc.groupStudents(g.id).length / g.capacity >= 0.9);
    if (full.length) out.push({ t: `Группы <b>${full.map((g) => esc(g.name)).join(', ')}</b> заполнены на 90%+. Откройте новый поток, пока заявки по этим направлениям не начали уходить конкурентам.`, a: 'К группам', go: '#/groups' });
    // 5. долги
    const od = st.payments.filter((p) => p.status === 'overdue');
    if (od.length) out.push({ t: `${od.length} ${plural(od.length, ['платёж просрочен', 'платежа просрочены', 'платежей просрочено'])} на <b>${money(sum(od, (p) => p.amount))}</b>. Напоминание родителям на их языке — в один клик.`, a: 'Напомнить всем', go: '#/messages/debtors' });
    return out;
  }

  function hintsCard(list) {
    if (!list.length) return '';
    return `<section class="card hints"><div class="card-h"><div><h3>${icon('zap', 16)} Умные подсказки</h3><p>Выводы из ваших данных — обновляются автоматически</p></div></div>
      <ul class="hint-list">${list.map((h) => `<li><p>${h.t}</p><button class="btn ghost sm" data-go="${h.go}">${esc(h.a)} ${icon('arrowR', 14)}</button></li>`).join('')}</ul></section>`;
  }

  function revenueByMonth(st, months = 6) {
    const now = Date.now();
    const out = [];
    for (let k = months - 1; k >= 0; k--) {
      const a = startOfMonth(addMonths(startOfMonth(now), -k));
      const b = startOfMonth(addMonths(a, 1));
      const d = new Date(a);
      const v = sum(st.payments.filter((p) => p.status === 'paid' && p.date >= a && p.date < b), (p) => p.amount);
      out.push({ label: MON_S[d.getMonth()], value: v, tip: `${MON_S[d.getMonth()]} ${d.getFullYear()}${k === 0 ? ' (текущий)' : ''}\n${money(v)}`, cls: k === 0 ? 'cur' : '' });
    }
    return out;
  }

  function managersTable(st) {
    const now = Date.now();
    const rows = st.staff.filter((u) => u.role === 'sales').map((u) => {
      const ls = st.leads.filter((l) => l.managerId === u.id && l.createdAt > now - 30 * DAY);
      const paid = ls.filter((l) => l.stage === 'paid').length;
      const resp = median(ls.filter((l) => l.firstContactAt).map((l) => (l.firstContactAt - l.createdAt) / MIN));
      const ms = startOfMonth(now);
      const rev = sum(st.payments.filter((p) => p.status === 'paid' && p.date >= ms && (App.get.student(p.studentId) || {}).managerId === u.id), (p) => p.amount);
      return { u, n: ls.length, paid, conv: ls.length ? paid / ls.length : 0, resp, rev };
    }).sort((a, b) => b.rev - a.rev);
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Менеджер</th><th class="r">Заявки 30 дн</th><th class="r">Оплаты</th><th class="r">Конверсия</th><th class="r">Ответ (медиана)</th><th class="r">Выручка, мес</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td><div class="who">${App.ui.avatar(r.u)}${esc(r.u.name)}</div></td><td class="r">${r.n}</td><td class="r">${r.paid}</td><td class="r">${pct(r.conv)}</td><td class="r">${r.resp <= 10 ? badge('good', Math.round(r.resp) + ' мин') : r.resp <= 20 ? badge('warn', Math.round(r.resp) + ' мин') : badge('crit', Math.round(r.resp) + ' мин')}</td><td class="r"><b>${money(r.rev)}</b></td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function sourcesCard(st) {
    const rows = C.SOURCES.map((s) => {
      const a = st.leads.filter((l) => l.source === s);
      const done = a.filter((l) => l.stage !== 'new');
      const c = done.length ? done.filter((l) => l.stage === 'paid').length / done.length : 0;
      return { label: s, value: a.length, sub: 'конверсия ' + pct(c), tip: `${s}\nЗаявок: ${a.length}\nКонверсия в оплату: ${pct(c)}`, c };
    }).sort((a, b) => b.value - a.value);
    return App.charts.card('Источники заявок', App.charts.hbars(rows), { head: ['Источник', 'Заявок', 'Конверсия'], rows: rows.map((r) => [r.label, r.value, pct(r.c)]) }, { sub: 'Все заявки в базе' });
  }

  function director(st) {
    const now = Date.now();
    const ms = startOfMonth(now), pms = startOfMonth(ms - 1);
    const paid = st.payments.filter((p) => p.status === 'paid');
    const rev = sum(paid.filter((p) => p.date >= ms), (p) => p.amount);
    const l7 = st.leads.filter((l) => l.createdAt > now - 7 * DAY).length;
    const l7p = st.leads.filter((l) => l.createdAt > now - 14 * DAY && l.createdAt <= now - 7 * DAY).length;
    const l30 = st.leads.filter((l) => l.createdAt > now - 30 * DAY);
    const conv = l30.length ? l30.filter((l) => l.stage === 'paid').length / l30.length : 0;
    const active = st.students.filter((s) => s.status === 'active');
    const newSt = active.filter((s) => s.joinedAt >= ms).length;
    const od = st.payments.filter((p) => p.status === 'overdue');
    const past = st.mockExams.filter((e) => e.date < now);
    const lastEx = past[past.length - 1], prevEx = past[past.length - 2];
    const avgFor = (ex) => { const r = active.map((s) => s.exams.find((e) => e.examId === ex.id)).filter(Boolean); return r.length ? avg(r, App.calc.total) : null; };
    const a1 = lastEx ? avgFor(lastEx) : null;
    const pd = App.calc.pairedDelta(active, prevEx, lastEx);
    const dim = new Date(new Date(now).getFullYear(), new Date(now).getMonth() + 1, 0).getDate();
    const elapsed = Math.max(1, (now - ms) / DAY);
    const runRate = elapsed >= 3 ? (rev / elapsed) * dim : null;
    const revPrevFull = sum(paid.filter((p) => p.date >= pms && p.date < ms), (p) => p.amount);
    const dRev = runRate ? { txt: 'темп месяца: ' + moneyShort(runRate) + ' · в прошлом ' + moneyShort(revPrevFull), cls: '' } : { txt: 'прошлый месяц: ' + moneyShort(revPrevFull), cls: '' };
    const dL = delta(l7, l7p, { suffix: ' к прошлой неделе' });
    const dA = pd ? { txt: (pd.v >= 0 ? '▲ +' : '▼ −') + Math.abs(pd.v).toFixed(1).replace('.', ',') + ' за пробник у тех же учеников', cls: pd.v >= 0 ? 'up' : 'down' } : { txt: '', cls: '' };
    const funnel = funnelData(l30);
    const revM = revenueByMonth(st);

    return `
      <div class="kpis">
        ${kpi('Выручка за месяц', moneyShort(rev), dRev.txt, dRev.cls)}
        ${kpi('Заявки за 7 дней', num(l7), dL.txt, dL.cls)}
        ${kpi('Конверсия в оплату', pct(conv), '30 дней · ' + l30.length + ' ' + plural(l30.length, ['заявка', 'заявки', 'заявок']))}
        ${kpi('Активные ученики', num(active.length), '+' + newSt + ' в этом месяце', 'up')}
        ${kpi('Просрочено оплат', money(sum(od, (p) => p.amount)), od.length + ' ' + plural(od.length, ['платёж', 'платежа', 'платежей']), od.length ? 'down' : '')}
        ${kpi('Средний балл пробного ЕНТ', a1 != null ? a1.toFixed(1).replace('.', ',') : '—', dA.txt, dA.cls)}
      </div>
      ${hintsCard(insights(st))}
      <div class="grid2">
        ${App.charts.card('Воронка продаж', App.charts.funnel(funnel), { head: ['Этап', 'Заявок'], rows: funnel.map((f) => [f.label, f.value]) }, { sub: 'Заявки за 30 дней: сколько дошло до каждого этапа' })}
        ${App.charts.card('Выручка по месяцам', App.charts.vbars(revM, { fmt: money, axisFmt: (v) => moneyShort(v).replace(' ₸', '') }), { head: ['Месяц', 'Выручка'], rows: revM.map((r) => [r.label, money(r.value)]) }, { sub: 'Поступившие оплаты, ₸' })}
      </div>
      <div class="grid2">
        <section class="card"><div class="card-h"><div><h3>Требуют внимания</h3><p>Срочное по заявкам, оплатам и ученикам</p></div></div>${attentionList(st, { leads: st.leads, students: st.students })}</section>
        ${sourcesCard(st)}
      </div>
      <section class="card"><div class="card-h"><div><h3>Отдел продаж</h3><p>Скорость ответа — норматив 15 минут</p></div></div>${managersTable(st)}</section>`;
  }

  function taskMini(tasks) {
    if (!tasks.length) return empty('На сегодня задач нет');
    const now = Date.now();
    return `<ul class="tasks mini">${tasks.slice(0, 7).map((t) => {
      const link = t.leadId ? App.get.lead(t.leadId) : t.studentId ? App.get.student(t.studentId) : null;
      const attr = t.leadId ? `data-lead="${t.leadId}"` : t.studentId ? `data-student="${t.studentId}"` : '';
      return `<li ${attr} class="${attr ? 'clickable' : ''}"><span class="t-dot ${t.due < now ? 'over' : ''}"></span><div><div>${esc(t.title)}${link ? ` — <b>${esc(link.name)}</b>` : ''}</div><small class="${t.due < now ? 'txt-crit' : ''}">${t.due < now ? '⚠ просрочено · ' : ''}${App.u.dueLabel(t.due)}</small></div></li>`;
    }).join('')}</ul>`;
  }

  function sales(st) {
    const me = App.get.me(); const now = Date.now();
    const my = st.leads.filter((l) => l.managerId === me.id);
    const newL = my.filter((l) => l.stage === 'new');
    const sla = newL.filter(App.calc.slaBreached);
    const eod = startOfDay(now) + DAY;
    const tasks = st.tasks.filter((t) => t.assigneeId === me.id && !t.done && t.due < eod).sort((a, b) => a.due - b.due);
    const ms = startOfMonth(now);
    const rev = sum(st.payments.filter((p) => p.status === 'paid' && p.date >= ms && (App.get.student(p.studentId) || {}).managerId === me.id), (p) => p.amount);
    const m30 = my.filter((l) => l.createdAt > now - 30 * DAY);
    const fd = funnelData(m30);
    return `
      <div class="hello">Сәлем, ${esc(me.name.split(' ')[0])}! Сегодня в работе ${my.filter((l) => !['paid', 'lost'].includes(l.stage)).length} ${plural(my.filter((l) => !['paid', 'lost'].includes(l.stage)).length, ['заявка', 'заявки', 'заявок'])}.</div>
      <div class="kpis">
        ${kpi('Новые заявки', newL.length, newL.length ? 'ответить в течение 15 мин' : 'все обработаны')}
        ${kpi('Просрочен ответ', sla.length, sla.length ? '⚠ нарушен норматив' : '✓ норматив соблюдён', sla.length ? 'down' : 'up')}
        ${kpi('Задачи на сегодня', tasks.length, tasks.filter((t) => t.due < now).length + ' просрочено', tasks.some((t) => t.due < now) ? 'down' : '')}
        ${kpi('Мои оплаты за месяц', moneyShort(rev), 'по моим ученикам')}
      </div>
      <div class="grid2">
        <section class="card"><div class="card-h"><div><h3>Требуют внимания</h3><p>Ваши заявки и должники</p></div></div>${attentionList(st, { leads: my, students: st.students.filter((s) => s.managerId === me.id) })}</section>
        <section class="card"><div class="card-h"><div><h3>Мои задачи на сегодня</h3></div><a class="btn ghost sm" href="#/tasks">Все задачи</a></div>${taskMini(tasks)}</section>
      </div>
      ${App.charts.card('Моя воронка', App.charts.funnel(fd), { head: ['Этап', 'Заявок'], rows: fd.map((f) => [f.label, f.value]) }, { sub: 'Мои заявки за 30 дней' })}`;
  }

  function curator(st) {
    const me = App.get.me(); const now = Date.now();
    const groups = st.groups.filter((g) => g.curatorId === me.id);
    const studs = st.students.filter((s) => groups.some((g) => g.id === s.groupId) && s.status === 'active');
    const lasts = studs.map((s) => App.calc.last(s)).filter(Boolean);
    const risky = studs.filter((s) => App.calc.risk(s).level === 'crit');
    const past = st.mockExams.filter((e) => e.date < now);
    const byExam = past.map((e) => { const r = studs.map((s) => s.exams.find((x) => x.examId === e.id)).filter(Boolean); return { label: e.title.replace('Пробный ЕНТ ', ''), value: r.length ? Math.round(avg(r, App.calc.total) * 10) / 10 : 0, tip: `${e.title} · ${App.u.fmtDate(e.date)}\nСредний балл: ${r.length ? (avg(r, App.calc.total)).toFixed(1).replace('.', ',') : '—'}\nУчастников: ${r.length}` }; });
    const eod = startOfDay(now) + DAY;
    const tasks = st.tasks.filter((t) => t.assigneeId === me.id && !t.done && t.due < eod).sort((a, b) => a.due - b.due);
    return `
      <div class="hello">Сәлем, ${esc(me.name.split(' ')[0])}! У вас ${groups.length} ${plural(groups.length, ['группа', 'группы', 'групп'])} и ${studs.length} ${plural(studs.length, ['ученик', 'ученика', 'учеников'])}.</div>
      <div class="kpis">
        ${kpi('Мои ученики', studs.length, groups.map((g) => g.name).join(' · '))}
        ${kpi('Средний балл', lasts.length ? avg(lasts, (e) => e.total).toFixed(1).replace('.', ',') : '—', 'последний пробный ЕНТ')}
        ${kpi('Высокий риск ухода', risky.length, risky.length ? 'нужен звонок родителям' : 'нет', risky.length ? 'down' : 'up')}
        ${kpi('Выполнение ДЗ', pct(avg(studs, (s) => s.homework) / 100), 'посещаемость ' + pct(avg(studs, (s) => s.attendance) / 100))}
      </div>
      <div class="grid2">
        <section class="card"><div class="card-h"><div><h3>Требуют внимания</h3><p>Ученики с риском ухода и долгами</p></div></div>${attentionList(st, { leads: [], students: studs })}</section>
        <section class="card"><div class="card-h"><div><h3>Мои задачи на сегодня</h3></div><a class="btn ghost sm" href="#/tasks">Все задачи</a></div>${taskMini(tasks)}</section>
      </div>
      <div class="grid2">
        ${App.charts.card('Средний балл по пробникам', App.charts.vbars(byExam, { max: 140, fmt: (v) => String(v).replace('.', ','), axisFmt: (v) => String(Math.round(v)) }), { head: ['Пробный ЕНТ', 'Средний балл'], rows: byExam.map((b) => [b.label, b.value]) }, { sub: 'Мои ученики, из 140' })}
        <section class="card"><div class="card-h"><div><h3>Мои группы</h3></div><a class="btn ghost sm" href="#/groups">Открыть</a></div>
          <ul class="glist">${groups.map((g) => { const n = App.calc.groupStudents(g.id).length; return `<li><div><b>${esc(g.name)}</b><small>${esc(g.schedule)}</small></div><span class="muted">${n}/${g.capacity}</span></li>`; }).join('')}</ul></section>
      </div>`;
  }

  App.views.dashboard = {
    render(el) {
      const st = App.S();
      el.innerHTML = st.role === 'sales' ? sales(st) : st.role === 'curator' ? curator(st) : director(st);
    },
  };
  App.dash = { insights };
})();
