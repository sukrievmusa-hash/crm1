/* Грант CRM — рассылки, настройки, публичная форма заявки */
(function () {
  'use strict';
  const App = window.App;
  const { $, $$, esc, money, fmtDate, fmtDT, isoDate, uid, sum, plural, digits } = App.u;
  const { badge, opt, field, formData, toast, modal, closeModal, copy, empty } = App.ui;
  const C = App.C;
  const icon = App.icon;

  /* ================= РАССЫЛКИ ================= */
  const mf = { seg: 'debtors', tpl: '' };
  const VARS = ['имя', 'ученик', 'родитель', 'менеджер', 'куратор', 'профиль', 'специальность', 'дата', 'сумма', 'балл', 'посещаемость'];

  function segments() {
    const st = App.S(); const me = App.get.me();
    const leads = App.calc.visibleLeads(); const studs = App.calc.visibleStudents().filter((s) => s.status === 'active');
    const next = st.mockExams.find((e) => e.date > Date.now());
    const curOf = (s) => (App.get.user((App.get.group(s.groupId) || {}).curatorId) || {}).name || '';
    const sCtx = (s, extra = {}) => Object.assign({ lang: s.lang, to: `${s.parentName} (${s.parentRole} · ${s.name.split(' ')[0]})`, phone: s.parentPhone, ref: { student: s.id }, 'имя': s.name.split(' ')[0], 'ученик': s.name.split(' ')[0], 'родитель': s.parentName.split(' ')[0], 'куратор': curOf(s), 'посещаемость': s.attendance + '%' }, extra);
    const lCtx = (l) => ({ lang: l.lang, to: l.name, phone: l.phone, ref: { lead: l.id }, 'имя': l.name.split(' ')[0], 'менеджер': (App.get.user(l.managerId) || {}).name, 'профиль': App.get.combo(l.combo).name, 'специальность': (App.get.spec(l.target) || {}).name, 'дата': next ? fmtDate(next.date) : '' });
    const segs = [
      { id: 'debtors', name: 'Родители с просроченной оплатой', tpl: 'tpl3', roles: ['director', 'sales'],
        list: () => App.calc.visibleStudents().map((s) => { const od = st.payments.filter((p) => p.studentId === s.id && p.status === 'overdue'); return od.length ? sCtx(s, { 'сумма': money(sum(od, (p) => p.amount)) }) : null; }).filter(Boolean) },
      { id: 'new', name: 'Новые заявки без ответа', tpl: 'tpl1', roles: ['director', 'sales'], list: () => leads.filter((l) => l.stage === 'new').map(lCtx) },
      { id: 'invite', name: 'Пригласить на пробный ЕНТ (лиды)', tpl: 'tpl2', roles: ['director', 'sales'], list: () => leads.filter((l) => ['contacted', 'trial', 'lost'].includes(l.stage) && (l.stage !== 'lost' || l.lostReason !== 'Неактуально')).map(lCtx) },
      { id: 'risk', name: 'Родители учеников с риском ухода', tpl: 'tpl4', roles: ['director', 'curator'], list: () => studs.filter((s) => App.calc.risk(s).level === 'crit').map((s) => sCtx(s)) },
      { id: 'results', name: 'Результаты последнего пробного — всем родителям', tpl: 'tpl5', roles: ['director', 'curator'], list: () => studs.map((s) => { const l = App.calc.last(s); return l ? sCtx(s, { 'балл': l.total }) : null; }).filter(Boolean) },
    ];
    return segs.filter((s) => s.roles.includes(st.role));
  }

  App.views.messages = {
    render(el, arg) {
      const st = App.S();
      const segs = segments();
      if (arg && segs.some((s) => s.id === arg)) { mf.seg = arg; mf.tpl = ''; }
      if (!segs.some((s) => s.id === mf.seg)) mf.seg = segs[0].id;
      const seg = segs.find((s) => s.id === mf.seg);
      if (!mf.tpl) mf.tpl = seg.tpl;
      const tpl = st.templates.find((t) => t.id === mf.tpl) || st.templates[0];
      const rec = seg.list();
      const msgs = rec.map((r) => ({ r, text: App.calc.fill(tpl[r.lang] || tpl.ru, r) }));
      const kzN = rec.filter((r) => r.lang === 'kz').length;
      el.innerHTML = `
        <div class="grid2 wide-right">
          <section class="card"><div class="card-h"><div><h3>Шаблоны</h3><p>Каждый — на русском и казахском</p></div></div>
            <ul class="tpl-list">${st.templates.map((t) => `<li><button class="${t.id === tpl.id ? 'on' : ''}" data-tpl="${t.id}"><b>${esc(t.name)}</b><small>${t.aud === 'lead' ? 'для заявок' : 'для родителей'}</small></button></li>`).join('')}</ul>
            <div class="tpl-edit">
              ${field('Текст (рус)', `<textarea id="tRu" rows="5">${esc(tpl.ru)}</textarea>`)}
              ${field('Текст (қаз)', `<textarea id="tKz" rows="5">${esc(tpl.kz)}</textarea>`)}
              <div class="vars">${VARS.map((v) => `<code>{${v}}</code>`).join(' ')}</div>
              <button class="btn" id="tSave">Сохранить шаблон</button>
            </div>
          </section>
          <section class="card"><div class="card-h"><div><h3>Рассылка</h3><p>Язык сообщения подбирается под каждую семью автоматически</p></div></div>
            <div class="form2">${field('Кому', `<select id="mSeg">${segs.map((s) => opt(s.id, s.name, mf.seg)).join('')}</select>`)}${field('Шаблон', `<select id="mTpl">${st.templates.map((t) => opt(t.id, t.name, tpl.id)).join('')}</select>`)}</div>
            <div class="seg-sum"><b>${rec.length}</b> ${plural(rec.length, ['получатель', 'получателя', 'получателей'])}${rec.length ? ` · ${rec.length - kzN} на русском, ${kzN} на казахском` : ''}</div>
            ${rec.length ? `<ul class="previews">${msgs.slice(0, 6).map((m) => `<li><div class="pv-h"><b>${esc(m.r.to)}</b>${badge(m.r.lang === 'kz' ? 'info' : 'neutral', m.r.lang === 'kz' ? 'қаз' : 'рус')}</div><p>${esc(m.text)}</p></li>`).join('')}</ul>${msgs.length > 6 ? `<p class="muted small">…и ещё ${msgs.length - 6}</p>` : ''}
              <div class="row-actions"><button class="btn" id="mCopy">${icon('copy', 16)} Скопировать все</button><button class="btn primary" id="mSend">${icon('send', 16)} Отправить в WhatsApp</button></div>` : empty('В этом сегменте сейчас никого нет')}
          </section>
        </div>
        <section class="card"><div class="card-h"><div><h3>История рассылок</h3></div></div>
          ${st.campaigns.length ? `<ul class="hist">${st.campaigns.map((c) => `<li><span>${fmtDT(c.at)}</span><b>${esc(c.tpl)}</b> → ${esc(c.seg)} · ${c.n} ${plural(c.n, ['получатель', 'получателя', 'получателей'])}<small> · ${esc(c.by)}</small></li>`).join('')}</ul>` : empty('Рассылок ещё не было')}
        </section>`;
      $$('[data-tpl]', el).forEach((b) => (b.onclick = () => { mf.tpl = b.dataset.tpl; App.render(true); }));
      $('#mSeg', el).onchange = (e) => { mf.seg = e.target.value; mf.tpl = segs.find((s) => s.id === mf.seg).tpl; App.render(true); };
      $('#mTpl', el).onchange = (e) => { mf.tpl = e.target.value; App.render(true); };
      $('#tSave', el).onclick = () => { tpl.ru = $('#tRu', el).value; tpl.kz = $('#tKz', el).value; App.refresh(); toast('Шаблон сохранён', 'good'); };
      const cp = $('#mCopy', el); if (cp) cp.onclick = () => copy(msgs.map((m) => `${m.r.to} · ${m.r.phone}\n${m.text}`).join('\n\n'), `Скопировано ${msgs.length} ${plural(msgs.length, ['сообщение', 'сообщения', 'сообщений'])}`);
      const sd = $('#mSend', el); if (sd) sd.onclick = () => {
        modal({
          title: 'Отправка через WhatsApp',
          body: `<p>В рабочей версии CRM отправит <b>${msgs.length}</b> ${plural(msgs.length, ['сообщение', 'сообщения', 'сообщений'])} через WhatsApp Business API (или Telegram-бота), а ответы родителей придут сюда же, в карточку ученика.</p><p class="muted">В демо отправка не выполняется — рассылка будет записана в историю и в карточки получателей.</p>`,
          foot: '<button class="btn ghost" data-close>Отмена</button><button class="btn primary" id="mOk">Записать как отправленную</button>',
          onMount(box) {
            $('#mOk', box).onclick = () => {
              const me = App.get.me();
              msgs.forEach((m) => {
                const t = m.r.ref.lead ? App.get.lead(m.r.ref.lead) : App.get.student(m.r.ref.student);
                if (t) t.notes.unshift({ at: Date.now(), text: 'Рассылка: «' + tpl.name + '»', by: me.id });
                if (m.r.ref.student && tpl.id === 'tpl3') st.payments.forEach((p) => { if (p.studentId === m.r.ref.student && p.status === 'overdue') p.reminded = Date.now(); });
              });
              st.campaigns.unshift({ at: Date.now(), tpl: tpl.name, seg: seg.name, n: msgs.length, by: me.name });
              closeModal(); App.refresh(); toast('Рассылка записана: ' + msgs.length + ' ' + plural(msgs.length, ['получатель', 'получателя', 'получателей']), 'good');
            };
          },
        });
      };
    },
  };

  /* ================= НАСТРОЙКИ ================= */
  function csv(rows) { return '﻿' + rows.map((r) => r.map((c) => { const v = String(c ?? ''); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\n'); }
  function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

  App.views.settings = {
    render(el) {
      const st = App.S(); const dir = st.role === 'director';
      const INTEG = [
        ['Kaspi Pay', 'Счёт на оплату и рассрочка Kaspi Red прямо из карточки — оплата отмечается автоматически.'],
        ['WhatsApp Business API', 'Отправка сообщений и рассылок из CRM, переписка сохраняется в карточке.'],
        ['Telegram-бот', 'Напоминания ученикам о занятиях и пробных ЕНТ, отчёты родителям.'],
        ['Instagram и TikTok', 'Заявки из Lead Ads и директа падают в «Новые» с источником.'],
        ['Форма на сайте', 'Готовая форма заявки: вставляется на сайт школы одним скриптом.'],
        ['Google Таблицы', 'Импорт результатов пробных ЕНТ и выгрузка отчётов.'],
      ];
      el.innerHTML = `
        <div class="grid2">
          <section class="card"><div class="card-h"><div><h3>Профиль и интерфейс</h3></div></div>
            <div class="form2">
              ${field('Роль в демо', `<select id="stRole">${['director', 'sales', 'curator'].map((r) => opt(r, App.t(r) + ' — ' + App.get.user(App.C.ROLE_USER[r]).name, st.role)).join('')}</select>`)}
              ${field('Язык интерфейса', `<select id="stLang">${opt('ru', 'Русский', st.lang)}${opt('kz', 'Қазақша (меню)', st.lang)}</select>`)}
              ${field('Тема', `<select id="stTheme">${opt('light', 'Светлая', st.theme)}${opt('dark', 'Тёмная', st.theme)}</select>`)}
            </div>
            <p class="muted small">Каждая роль видит своё: директор — деньги и аналитику, менеджер — свои заявки, куратор — свои группы и успеваемость.</p>
          </section>
          <section class="card"><div class="card-h"><div><h3>Проходные баллы на грант</h3><p>Демо-значения — школа задаёт свои по специальностям</p></div></div>
            <div class="spec-grid">${st.specialties.map((s) => `<label class="spec"><span>${esc(s.name)}</span><input type="number" min="50" max="140" value="${s.pass}" data-spec="${s.id}" ${dir ? '' : 'disabled'} aria-label="${esc(s.name)}"></label>`).join('')}</div>
            ${field('Дата основного ЕНТ (для прогноза)', `<input type="date" id="stEnt" value="${isoDate(st.entDate)}" ${dir ? '' : 'disabled'}>`)}
            ${dir ? '<button class="btn" id="stSave">Сохранить</button>' : '<p class="muted small">Изменять может директор.</p>'}
          </section>
        </div>
        <div class="grid2">
          <section class="card"><div class="card-h"><div><h3>Продажи</h3></div></div>
            <label class="switch"><input type="checkbox" id="stAuto" ${st.autoAssign ? 'checked' : ''} ${dir ? '' : 'disabled'}><span></span> Автораспределение заявок по менеджерам (по очереди)</label>
            <p class="muted small">Норматив первого ответа — 15 минут. Нарушения подсвечиваются красным на канбане и дашборде.</p>
            <h4 class="d-h4">Тарифы</h4>
            <ul class="glist">${C.TARIFFS.map((t) => `<li><div><b>${esc(t.name)}</b></div><span>${money(t.price)}/мес</span></li>`).join('')}</ul>
          </section>
          <section class="card"><div class="card-h"><div><h3>Интеграции</h3><p>В демо не подключены — показывают, как CRM встраивается в работу школы</p></div></div>
            <ul class="integ">${INTEG.map(([n, d]) => `<li><div><b>${esc(n)}</b><small>${esc(d)}</small></div>${n === 'Форма на сайте' ? `<a class="btn sm" href="#/form" target="_blank" rel="noopener">Открыть ${icon('ext', 14)}</a>` : badge('neutral', 'в рабочей версии')}</li>`).join('')}</ul>
          </section>
        </div>
        <section class="card"><div class="card-h"><div><h3>Данные</h3><p>Всё хранится в этом браузере (localStorage). В рабочей версии — облачная база с доступами по ролям.</p></div></div>
          <div class="row-actions">
            <button class="btn" id="exLeads">${icon('download', 16)} Заявки, CSV</button>
            <button class="btn" id="exStud">${icon('download', 16)} Ученики, CSV</button>
            <button class="btn" id="exPay">${icon('download', 16)} Оплаты, CSV</button>
            <div class="grow"></div>
            <button class="btn danger" id="stReset">Сбросить демо-данные</button>
          </div>
        </section>`;
      $('#stRole', el).onchange = (e) => { st.role = e.target.value; App.refresh(); };
      $('#stLang', el).onchange = (e) => { st.lang = e.target.value; App.refresh(); };
      $('#stTheme', el).onchange = (e) => { st.theme = e.target.value; App.refresh(); };
      const sv = $('#stSave', el); if (sv) sv.onclick = () => {
        $$('[data-spec]', el).forEach((i) => { const s = App.get.spec(i.dataset.spec); const v = Math.round(+i.value); if (v >= 50 && v <= 140) s.pass = v; });
        const d = new Date($('#stEnt', el).value + 'T09:00').getTime(); if (d) st.entDate = d;
        App.refresh(); toast('Настройки сохранены — прогнозы пересчитаны', 'good');
      };
      $('#stAuto', el).onchange = (e) => { st.autoAssign = e.target.checked; App.store.save(); toast(e.target.checked ? 'Автораспределение включено' : 'Автораспределение выключено', 'info'); };
      $('#exLeads', el).onclick = () => download('zayavki.csv', csv([['Имя', 'Телефон', 'Родитель', 'Телефон родителя', 'Город', 'Профиль', 'Источник', 'Этап', 'Менеджер', 'Создана', 'Пробный ЕНТ'], ...st.leads.map((l) => [l.name, l.phone, l.parentName, l.parentPhone, l.city, App.get.combo(l.combo).name, l.source, App.leads.stageName(l.stage), (App.get.user(l.managerId) || {}).name, fmtDT(l.createdAt), l.trialScore || ''])]));
      $('#exStud', el).onclick = () => download('ucheniki.csv', csv([['Имя', 'Телефон', 'Родитель', 'Группа', 'Тариф', 'Статус', 'Посещаемость', 'ДЗ', 'Последний пробный', 'Прогноз', 'Шанс на грант'], ...st.students.map((s) => { const l = App.calc.last(s); const c = App.calc.chance(s); return [s.name, s.phone, s.parentName, (App.get.group(s.groupId) || {}).name, App.get.tariff(s.tariff).name, s.status, s.attendance + '%', s.homework + '%', l ? l.total : '', App.calc.forecast(s) ?? '', c ? App.calc.pctLabel(c.p) : '']; })]));
      $('#exPay', el).onclick = () => download('oplaty.csv', csv([['Дата', 'Ученик', 'Сумма', 'Способ', 'Статус'], ...st.payments.slice().sort((a, b) => b.date - a.date).map((p) => [fmtDT(p.date), (App.get.student(p.studentId) || {}).name, p.amount, C.METHODS[p.method] || '', p.status])]));
      $('#stReset', el).onclick = () => modal({
        title: 'Сбросить демо-данные?', body: '<p>Все изменения (новые заявки, оплаты, заметки) будут удалены, данные сгенерируются заново.</p>',
        foot: '<button class="btn ghost" data-close>Отмена</button><button class="btn danger" id="rsOk">Сбросить</button>',
        onMount(box) { $('#rsOk', box).onclick = () => { App.store.reset(); closeModal(); App.render(); toast('Демо-данные обновлены', 'good'); }; },
      });
    },
  };

  /* ================= ПУБЛИЧНАЯ ФОРМА ================= */
  App.views.form = {
    render(root) {
      const st = App.S(); const next = st.mockExams.find((e) => e.date > Date.now());
      root.innerHTML = `<div class="pub">
        <div class="pub-demo">${icon('zap', 14)} Демо: так выглядит форма на сайте школы. Заявка сразу появится в CRM — откройте CRM в соседней вкладке этого же браузера. <a href="#/leads">Перейти в CRM →</a></div>
        <div class="pub-card">
          <div class="pub-logo"><span class="logo-mark">140</span> Онлайн-школа ЕНТ</div>
          <h1>Бесплатный пробный ЕНТ</h1>
          <p class="pub-sub">Узнай свой балл и шансы на грант по выбранной специальности${next ? ` — ближайший пробник ${fmtDate(next.date)}` : ''}.</p>
          <form id="pubForm" novalidate>
            ${field('Имя и фамилия', '<input name="name" required autocomplete="name" placeholder="Аружан Серикбаева">')}
            ${field('Телефон (WhatsApp)', '<input name="phone" required inputmode="tel" autocomplete="tel" placeholder="+7 7__ ___ __ __">')}
            <div class="form2">
              ${field('Класс', `<select name="grade">${['11', '10', 'выпускник'].map((g) => opt(g, g === 'выпускник' ? 'Выпускник' : g + ' класс', '11')).join('')}</select>`)}
              ${field('Язык обучения', `<select name="lang">${opt('ru', 'Русский', 'ru')}${opt('kz', 'Қазақ тілі', 'ru')}</select>`)}
            </div>
            ${field('Профильные предметы', `<select name="combo">${C.COMBOS.map((c) => opt(c.id, c.name, 'mi')).join('')}</select>`)}
            ${field('Город', `<select name="city">${C.CITIES.map((c) => opt(c, c, 'Алматы')).join('')}</select>`)}
            <button class="btn primary big" type="submit">Записаться бесплатно</button>
            <p class="pub-note">Нажимая кнопку, вы соглашаетесь на обработку персональных данных. Менеджер свяжется в течение 15 минут.</p>
          </form>
        </div></div>`;
      $('#pubForm', root).onsubmit = (e) => {
        e.preventDefault();
        const d = formData(e.target);
        if (d.name.length < 2 || digits(d.phone).length < 10) { toast('Укажите имя и телефон', 'crit'); return; }
        App.store.load();
        const l = App.leads.addLead(Object.assign(d, { source: 'Сайт', managerId: App.S().autoAssign ? '' : 'u2' }));
        App.store.save();
        $('.pub-card', root).innerHTML = `<div class="pub-ok"><div class="ok-mark">✓</div><h1>Заявка принята!</h1><p class="pub-sub">${esc(d.name.split(' ')[0])}, менеджер ${esc(App.get.user(l.managerId).name.split(' ')[0])} напишет вам в WhatsApp в течение 15 минут.</p><button class="btn" id="pubAgain">Отправить ещё одну</button> <a class="btn primary" href="#/leads">Посмотреть в CRM</a></div>`;
        $('#pubAgain', root).onclick = () => App.views.form.render(root);
      };
    },
  };
})();
