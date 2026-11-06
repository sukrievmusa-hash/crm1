/* Грант CRM — заявки: канбан, список, карточка, конвертация в ученика */
(function () {
  'use strict';
  const App = window.App;
  const { $, $$, esc, money, DAY, MIN, HOUR, ago, fmtDT, fmtDate, uid, shortName, digits } = App.u;
  const { badge, chip, avatar, opt, field, formData, toast, modal, closeModal, drawer, copy, empty } = App.ui;
  const C = App.C;
  const icon = App.icon;
  const f = { q: '', source: '', manager: '', mode: 'kanban' };

  const stageName = (id) => (C.STAGES.find((s) => s.id === id) || {}).ru || id;
  const langLbl = (l) => (l === 'kz' ? 'каз' : 'рус');

  function filtered() {
    const q = f.q.toLowerCase(), qd = digits(f.q);
    return App.calc.visibleLeads().filter((l) =>
      (!q || l.name.toLowerCase().includes(q) || (qd.length >= 3 && digits(l.phone).includes(qd))) &&
      (!f.source || l.source === f.source) && (!f.manager || l.managerId === f.manager));
  }

  function card(l) {
    const sla = App.calc.slaBreached(l);
    return `<article class="lcard ${sla ? 'sla' : ''}" draggable="true" data-lead="${l.id}" tabindex="0" role="button" aria-label="${esc(l.name)}">
      <div class="lc-top"><b>${esc(l.name)}</b>${avatar(App.get.user(l.managerId))}</div>
      <div class="lc-meta">${esc(App.get.combo(l.combo).short)} · ${esc(l.grade)}${/^\d+$/.test(l.grade) ? ' кл' : ''} · ${langLbl(l.lang)}</div>
      ${sla ? `<div class="lc-sla">${badge('crit', 'Нет ответа ' + App.ui.waitLabel(l.createdAt))}</div>` : ''}
      <div class="lc-foot">${chip(l.source)}${l.trialScore ? `<span class="score" title="Балл пробного ЕНТ">${l.trialScore}<small>/140</small></span>` : `<span class="muted small">${ago(l.createdAt)}</span>`}</div>
    </article>`;
  }

  function kanban(list) {
    const cutoff = Date.now() - 30 * DAY;
    return `<div class="kanban">${C.STAGES.map((s, i) => {
      let items = list.filter((l) => l.stage === s.id);
      if (s.id === 'paid' || s.id === 'lost') items = items.filter((l) => l.createdAt > cutoff);
      return `<section class="kcol" data-stage="${s.id}"><header><span class="kdot k-${s.id}"></span>${esc(s.ru)}<em>${items.length}</em></header>
        <div class="kbody">${items.map(card).join('') || '<div class="kempty">Перетащите сюда</div>'}</div></section>`;
    }).join('')}</div><p class="muted small pad-t">«Оплачено» и «Отказ» — за последние 30 дней. На телефоне этап меняется в карточке заявки.</p>`;
  }

  function listView(list) {
    if (!list.length) return empty('Заявок не найдено');
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Имя</th><th>Этап</th><th>Источник</th><th>Профиль</th><th>Менеджер</th><th>Создана</th><th class="r">Пробный</th></tr></thead><tbody>
      ${list.slice(0, 150).map((l) => `<tr data-lead="${l.id}" tabindex="0" class="clickable ${App.calc.slaBreached(l) ? 'row-crit' : ''}"><td><b>${esc(l.name)}</b><div class="muted small">${esc(l.phone)}</div></td>
      <td><select class="inline-stage" data-id="${l.id}" aria-label="Этап">${C.STAGES.map((s) => opt(s.id, s.ru, l.stage)).join('')}</select></td>
      <td>${esc(l.source)}</td><td>${esc(App.get.combo(l.combo).short)}</td><td>${esc(shortName((App.get.user(l.managerId) || {}).name))}</td><td>${ago(l.createdAt)}</td><td class="r">${l.trialScore ? l.trialScore + '/140' : '—'}</td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function renderBody(el) {
    const list = filtered();
    $('#lbody', el).innerHTML = f.mode === 'kanban' ? kanban(list) : listView(list);
    bindBody(el);
  }

  function bindBody(el) {
    // drag & drop
    let dragId = null;
    $$('.lcard', el).forEach((c) => {
      c.addEventListener('dragstart', (e) => { dragId = c.dataset.lead; c.classList.add('dragging'); e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; });
      c.addEventListener('dragend', () => { c.classList.remove('dragging'); $$('.kcol.over', el).forEach((x) => x.classList.remove('over')); });
    });
    $$('.kcol', el).forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
      col.addEventListener('drop', (e) => { e.preventDefault(); col.classList.remove('over'); const id = e.dataTransfer.getData('text/plain') || dragId; const l = App.get.lead(id); if (l && l.stage !== col.dataset.stage) move(l, col.dataset.stage); });
    });
    $$('.inline-stage', el).forEach((s) => s.addEventListener('change', () => { const l = App.get.lead(s.dataset.id); move(l, s.value); }));
  }

  function addNote(l, text, by) { l.notes.unshift({ at: Date.now(), text, by: by === undefined ? App.get.me().id : by }); }

  function setStage(l, stage) {
    const prev = l.stage;
    const idx = App.calc.stageIdx(stage);
    if (prev === 'new' && !l.firstContactAt && stage !== 'lost') l.firstContactAt = Date.now();
    l.stage = stage;
    if (stage !== 'lost') l.maxStage = Math.max(l.maxStage || 0, idx);
    if (stage !== 'lost') l.lostReason = '';
    addNote(l, `Этап: ${stageName(prev)} → ${stageName(stage)}`);
    App.S().tasks.forEach((t) => { if (t.leadId === l.id && !t.done && t.title.startsWith('Позвонить') && stage !== 'new') t.done = true; });
  }

  function move(l, stage, after) {
    if (stage === 'paid') return convert(l, after);
    if (stage === 'lost') return lose(l, after);
    setStage(l, stage);
    if (stage === 'mock') scheduleMock(l, true);
    App.refresh();
    toast(`${l.name}: ${stageName(stage)}`, 'good');
    if (after) after();
  }

  function scheduleMock(l, silent) {
    const next = App.S().mockExams.find((e) => e.date > Date.now());
    if (!next) return;
    App.S().tasks.push({ id: uid('t'), title: 'Напомнить о пробном ЕНТ ' + fmtDate(next.date), due: next.date - DAY, assigneeId: l.managerId, done: false, priority: 'normal', leadId: l.id, studentId: null });
    addNote(l, 'Записан(а) на ' + next.title + ' · ' + fmtDT(next.date));
    if (!silent) toast('Записали на ' + next.title + ', напоминание создано', 'good');
  }

  function lose(l, after) {
    modal({
      title: 'Причина отказа',
      body: `<p class="muted">${esc(l.name)} — почему заявка не превратилась в ученика? Это попадёт в аналитику.</p>
        <div class="reasons">${C.LOST_REASONS.map((r, i) => `<label class="radio"><input type="radio" name="reason" value="${esc(r)}" ${i === 0 ? 'checked' : ''}> ${esc(r)}</label>`).join('')}</div>`,
      foot: '<button class="btn ghost" data-close>Отмена</button><button class="btn danger" id="lostOk">Перевести в «Отказ»</button>',
      onMount(box) {
        $('#lostOk', box).onclick = () => {
          const r = ($('input[name=reason]:checked', box) || {}).value || C.LOST_REASONS[0];
          setStage(l, 'lost'); l.lostReason = r; addNote(l, 'Отказ: ' + r);
          closeModal(); App.refresh(); toast('Заявка закрыта: ' + r, 'info'); if (after) after();
        };
      },
    });
  }

  function convert(l, after) {
    const st = App.S();
    const groups = st.groups.filter((g) => g.combo === l.combo).sort((a, b) => (b.lang === l.lang) - (a.lang === l.lang));
    const allGroups = groups.length ? groups : st.groups;
    modal({
      title: 'Оформить оплату',
      wide: true,
      body: `<p class="muted">${esc(l.name)} · ${esc(App.get.combo(l.combo).name)} · обучение на ${l.lang === 'kz' ? 'казахском' : 'русском'}</p>
        <div class="form2">
          ${field('Тариф', `<select name="tariff">${C.TARIFFS.map((t) => opt(t.id, `${t.name} — ${money(t.price)}/мес`, 'pro')).join('')}</select>`)}
          ${field('Группа', `<select name="group">${allGroups.map((g) => { const n = App.calc.groupStudents(g.id).length; return opt(g.id, `${g.name} · ${g.schedule} · ${n}/${g.capacity}${n >= g.capacity ? ' (мест нет)' : ''}`, allGroups[0].id); }).join('')}</select>`)}
          ${field('Схема оплаты', `<select name="plan">${opt('monthly', 'Помесячно', 'monthly')}${opt('red', 'Kaspi Рассрочка на 4 месяца', 'monthly')}</select>`)}
          ${field('Способ', `<select name="method">${Object.entries(C.METHODS).filter(([k]) => k !== 'kaspi_red').map(([k, v]) => opt(k, v, 'kaspi_pay')).join('')}</select>`)}
        </div>
        <div class="sumbox"><span>К оплате сейчас</span><b id="cvSum"></b><small id="cvNote"></small></div>`,
      foot: '<button class="btn ghost" data-close>Отмена</button><button class="btn primary" id="cvOk">Оплата получена — создать ученика</button>',
      onMount(box) {
        const upd = () => {
          const d = formData(box); const t = App.get.tariff(d.tariff);
          const red = d.plan === 'red';
          $('#cvSum', box).textContent = money(red ? t.price * 4 : t.price);
          $('#cvNote', box).textContent = red ? 'Клиент платит банку частями, школа получает всю сумму сразу' : 'Следующий платёж — через 30 дней, напоминание создастся автоматически';
          $('[name=method]', box).disabled = red;
        };
        $$('select', box).forEach((s) => s.addEventListener('change', upd)); upd();
        $('#cvOk', box).onclick = () => {
          const d = formData(box); const t = App.get.tariff(d.tariff); const now = Date.now();
          const g = App.get.group(d.group);
          const s = {
            id: uid('s'), name: l.name, phone: l.phone, parentName: l.parentName, parentRole: l.parentRole, parentPhone: l.parentPhone, city: l.city, lang: l.lang,
            combo: g.combo, groupId: g.id, target: l.target, tariff: t.id, plan: d.plan, status: 'active', joinedAt: now, managerId: l.managerId, grade: l.grade,
            attendance: 100, homework: 100, exams: [], notes: [{ at: now, text: 'Перешёл(ла) из заявки, источник: ' + l.source, by: App.get.me().id }],
          };
          st.students.push(s);
          st.payments.push({ id: uid('p'), studentId: s.id, amount: d.plan === 'red' ? t.price * 4 : t.price, method: d.plan === 'red' ? 'kaspi_red' : d.method, date: now, status: 'paid' });
          st.payments.push({ id: uid('p'), studentId: s.id, amount: t.price, method: '', date: now + (d.plan === 'red' ? 120 : 30) * DAY, status: 'due' });
          st.tasks.push({ id: uid('t'), title: 'Приветственный звонок и доступ в личный кабинет', due: now + 20 * HOUR, assigneeId: g.curatorId, done: false, priority: 'high', leadId: null, studentId: s.id });
          setStage(l, 'paid'); l.studentId = s.id; addNote(l, `Оплата ${money(d.plan === 'red' ? t.price * 4 : t.price)} · ${t.name} · группа ${g.name}`);
          App.log(`${l.name} оплатил(а) ${t.name}`);
          closeModal(); App.refresh();
          toast(`${l.name} — в группе ${g.name}. Куратору поставлена задача.`, 'good');
          if (after) after();
        };
      },
    });
  }

  function nextStep(l) {
    const st = App.S();
    const spec = App.get.spec(l.target);
    const next = st.mockExams.find((e) => e.date > Date.now());
    switch (l.stage) {
      case 'new': return `Позвоните в течение 15 минут — дальше вероятность оплаты резко падает. Первое сообщение уже готово на ${l.lang === 'kz' ? 'казахском' : 'русском'} языке.`;
      case 'contacted': return `Пригласите на бесплатный пробный ЕНТ${next ? ' ' + fmtDate(next.date) : ''}: ученик увидит свой балл и шансы на грант по «${spec ? spec.name : ''}» — лучший аргумент для покупки.`;
      case 'trial': return 'После пробного урока отправьте родителю короткий итог и предложите рассрочку Kaspi — так снимается возражение «дорого».';
      case 'mock': {
        if (!l.trialScore) return 'Дождитесь результата пробного ЕНТ и сразу покажите разбор: сильные и слабые темы.';
        const c = App.calc.chanceFor(l.trialScore, l.target);
        if (c.gap > 0) return `Балл ${l.trialScore}. До гранта по «${spec.name}» не хватает ${c.gap}. Покажите план «+${c.gap} баллов к маю» и предложите тариф «Интенсив + личный куратор».`;
        return `Балл ${l.trialScore} — уже выше прохода на грант (${c.pass}). Акцент на удержании результата: тариф «Про», все 5 предметов.`;
      }
      case 'waiting': return 'Отправьте ссылку на оплату Kaspi и напомните о рассрочке. Если молчит 2 дня — звонок родителю, решение часто принимает он.';
      case 'paid': return 'Ученик оформлен. Проверьте, что куратор сделал приветственный звонок в первые сутки.';
      case 'lost': return `Причина: ${l.lostReason || '—'}. Через 30 дней можно вернуть: пригласите на следующий пробный ЕНТ.`;
      default: return '';
    }
  }

  function messageModal(l) {
    const st = App.S();
    const tpls = st.templates.filter((t) => t.aud === 'lead');
    const next = st.mockExams.find((e) => e.date > Date.now());
    const ctx = { 'имя': l.name.split(' ')[0], 'менеджер': (App.get.user(l.managerId) || {}).name, 'профиль': App.get.combo(l.combo).name, 'специальность': (App.get.spec(l.target) || {}).name, 'дата': next ? fmtDate(next.date) : '' };
    const def = l.stage === 'new' ? 'tpl1' : 'tpl2';
    modal({
      title: 'Сообщение: ' + l.name,
      body: `<div class="form2">${field('Шаблон', `<select id="mt">${tpls.map((t) => opt(t.id, t.name, def)).join('')}</select>`)}${field('Язык', `<select id="ml">${opt('ru', 'Русский', l.lang)}${opt('kz', 'Қазақша', l.lang)}</select>`)}</div>
        ${field('Текст', '<textarea id="mtext" rows="5"></textarea>')}
        <p class="muted small">В демо сообщение копируется. В рабочей версии — отправка через WhatsApp Business API прямо из CRM.</p>`,
      foot: '<button class="btn ghost" data-close>Отмена</button><button class="btn primary" id="msend">' + icon('copy', 16) + ' Скопировать и отметить</button>',
      onMount(box) {
        const upd = () => { const t = tpls.find((x) => x.id === $('#mt', box).value); $('#mtext', box).value = App.calc.fill(t[$('#ml', box).value], ctx); };
        $('#mt', box).onchange = upd; $('#ml', box).onchange = upd; upd();
        $('#msend', box).onclick = () => {
          copy($('#mtext', box).value, 'Сообщение скопировано');
          addNote(l, 'Отправлено сообщение: «' + $('#mt', box).selectedOptions[0].textContent + '»');
          if (l.stage === 'new') setStage(l, 'contacted');
          closeModal(); App.refresh(); open(l.id);
        };
      },
    });
  }

  function open(id) {
    const l = App.get.lead(id); if (!l) return;
    const st = App.S();
    const combo = App.get.combo(l.combo); const spec = App.get.spec(l.target);
    const sla = App.calc.slaBreached(l);
    const idx = App.calc.stageIdx(l.stage);
    const ch = l.trialScore ? App.calc.chanceFor(l.trialScore, l.target) : null;
    const salesStaff = st.staff.filter((u) => u.role === 'sales');
    drawer(`
      <div class="d-head"><div><div class="d-kicker">Заявка · ${esc(l.source)} · ${ago(l.createdAt)}</div><h2>${esc(l.name)}</h2></div><button class="icon-btn" data-dclose aria-label="Закрыть">${icon('x')}</button></div>
      <div class="stepper" role="group" aria-label="Этап">${C.STAGES.slice(0, 6).map((s, i) => `<button class="${l.stage === s.id ? 'on' : ''} ${l.stage !== 'lost' && i < idx ? 'past' : ''}" data-stage="${s.id}">${esc(s.ru)}</button>`).join('')}<button class="lost ${l.stage === 'lost' ? 'on' : ''}" data-stage="lost">Отказ</button></div>
      ${sla ? `<div class="alert crit">${icon('alert', 16)} Заявка ждёт ответа ${App.ui.waitLabel(l.createdAt)} — норматив 15 минут.</div>` : ''}
      <div class="hint">${icon('zap', 16)}<div><b>Следующий шаг</b><p>${esc(nextStep(l))}</p></div></div>
      <div class="d-actions">
        <button class="btn primary" id="aMsg">${icon('msg', 16)} Написать</button>
        <button class="btn" id="aCall">${icon('phone', 16)} Позвонил(а)</button>
        ${['new', 'contacted', 'trial'].includes(l.stage) ? `<button class="btn" id="aMock">${icon('target', 16)} На пробный ЕНТ</button>` : ''}
        ${l.stage !== 'paid' ? `<button class="btn good" id="aPay">${icon('card', 16)} Оформить оплату</button>` : ''}
        ${l.studentId ? `<button class="btn" data-student="${l.studentId}">${icon('users', 16)} Карточка ученика</button>` : ''}
      </div>
      ${ch ? `<div class="chance"><div><small>Пробный ЕНТ</small><b>${l.trialScore}<span>/140</span></b></div><div><small>Грант «${esc(spec.name)}»</small><b>${ch.pass}</b></div><div><small>Шанс сейчас</small>${badge(ch.level, ch.label + ' · ' + App.calc.pctLabel(ch.p))}</div></div>` : ''}
      <dl class="kv">
        <dt>Телефон</dt><dd>${esc(l.phone)}</dd>
        <dt>Родитель</dt><dd>${esc(l.parentName)} (${esc(l.parentRole)}) · ${esc(l.parentPhone)}</dd>
        <dt>Класс</dt><dd>${esc(l.grade)}${/^\d+$/.test(l.grade) ? ' класс' : ''}</dd>
        <dt>Город</dt><dd>${esc(l.city)}</dd>
        <dt>Язык обучения</dt><dd>${l.lang === 'kz' ? 'Казахский' : 'Русский'}</dd>
        <dt>Профиль</dt><dd>${esc(combo.name)}</dd>
        <dt>Цель</dt><dd>${esc(spec ? spec.name : '—')}</dd>
        <dt>Менеджер</dt><dd><select id="aMgr" aria-label="Менеджер">${salesStaff.map((u) => opt(u.id, u.name, l.managerId)).join('')}</select></dd>
        ${l.lostReason ? `<dt>Причина отказа</dt><dd>${esc(l.lostReason)}</dd>` : ''}
      </dl>
      <h4 class="d-h4">История</h4>
      <div class="note-add"><input id="nText" placeholder="Заметка: о чём договорились…" aria-label="Заметка"><button class="btn" id="nAdd">Добавить</button></div>
      <ul class="timeline">${l.notes.map((n) => `<li><span>${fmtDT(n.at)}${n.by ? ' · ' + esc(shortName((App.get.user(n.by) || {}).name || '')) : ''}</span>${esc(n.text)}</li>`).join('')}</ul>
    `, (p) => {
      $$('.stepper button', p).forEach((b) => (b.onclick = () => { if (b.dataset.stage !== l.stage) move(l, b.dataset.stage, () => open(l.id)); }));
      $('#aMsg', p).onclick = () => messageModal(l);
      $('#aCall', p).onclick = () => { addNote(l, 'Звонок: дозвонились'); if (l.stage === 'new') setStage(l, 'contacted'); App.refresh(); open(l.id); toast('Звонок записан', 'good'); };
      const m = $('#aMock', p); if (m) m.onclick = () => { setStage(l, 'mock'); scheduleMock(l); App.refresh(); open(l.id); };
      const pay = $('#aPay', p); if (pay) pay.onclick = () => convert(l, () => open(l.id));
      $('#aMgr', p).onchange = (e) => { l.managerId = e.target.value; addNote(l, 'Передана менеджеру: ' + App.get.user(l.managerId).name); App.refresh(); open(l.id); };
      const addN = () => { const v = $('#nText', p).value.trim(); if (!v) return; addNote(l, v); App.refresh(); open(l.id); };
      $('#nAdd', p).onclick = addN; $('#nText', p).onkeydown = (e) => { if (e.key === 'Enter') addN(); };
    });
  }

  function create() {
    const st = App.S();
    modal({
      title: 'Новая заявка',
      wide: true,
      body: `<div class="form2">
        ${field('Имя ученика *', '<input name="name" required placeholder="Аружан Серикбаева">')}
        ${field('Телефон *', '<input name="phone" required placeholder="+7 7__ ___ __ __" inputmode="tel">')}
        ${field('Родитель', '<input name="parentName" placeholder="Гульнара Серикбаева">')}
        ${field('Телефон родителя', '<input name="parentPhone" inputmode="tel">')}
        ${field('Класс', `<select name="grade">${['11', '10', 'выпускник'].map((g) => opt(g, g, '11')).join('')}</select>`)}
        ${field('Город', `<select name="city">${C.CITIES.map((c) => opt(c, c, 'Алматы')).join('')}</select>`)}
        ${field('Профильные предметы', `<select name="combo">${C.COMBOS.map((c) => opt(c.id, c.name, 'mi')).join('')}</select>`)}
        ${field('Язык обучения', `<select name="lang">${opt('ru', 'Русский', 'ru')}${opt('kz', 'Казахский', 'ru')}</select>`)}
        ${field('Источник', `<select name="source">${C.SOURCES.map((s) => opt(s, s, 'Instagram')).join('')}</select>`)}
        ${field('Менеджер', `<select name="managerId"><option value="">Автоматически (по очереди)</option>${st.staff.filter((u) => u.role === 'sales').map((u) => opt(u.id, u.name, st.role === 'sales' ? App.get.me().id : '')).join('')}</select>`)}
      </div>`,
      foot: '<button class="btn ghost" data-close>Отмена</button><button class="btn primary" id="nlOk">Создать заявку</button>',
      onMount(box) {
        $('#nlOk', box).onclick = () => {
          const d = formData(box);
          if (!d.name || digits(d.phone).length < 10) { toast('Укажите имя и телефон (10+ цифр)', 'crit'); return; }
          const l = addLead(d);
          closeModal(); App.refresh(); toast('Заявка создана и назначена: ' + shortName(App.get.user(l.managerId).name), 'good');
        };
      },
    });
  }

  function addLead(d) {
    const st = App.S(); const now = Date.now();
    const managerId = d.managerId || App.calc.nextSalesManager();
    const l = {
      id: uid('l'), name: d.name, phone: d.phone, parentName: d.parentName || '', parentRole: 'родитель', parentPhone: d.parentPhone || '', grade: d.grade || '11', city: d.city || 'Алматы',
      lang: d.lang || 'ru', combo: d.combo || 'mi', target: App.get.combo(d.combo || 'mi').spec, source: d.source || 'Сайт', stage: 'new', maxStage: 0, managerId,
      createdAt: now, firstContactAt: null, trialScore: null, studentId: null, lostReason: '', notes: [{ at: now, text: 'Заявка создана' + (d.source === 'Сайт' ? ' через форму на сайте' : ''), by: null }],
    };
    st.leads.unshift(l);
    st.tasks.push({ id: uid('t'), title: 'Позвонить: новая заявка', due: now + 15 * MIN, assigneeId: managerId, done: false, priority: 'high', leadId: l.id, studentId: null });
    App.log('Новая заявка: ' + l.name + ' (' + l.source + ')');
    return l;
  }

  App.leads = { open, create, addLead, move, stageName };

  App.views.leads = {
    render(el) {
      const st = App.S();
      el.innerHTML = `<div class="toolbar">
        <div class="search-in">${icon('search', 16)}<input id="lq" placeholder="Имя или телефон" value="${esc(f.q)}" aria-label="Поиск заявок"></div>
        <select id="lsrc" aria-label="Источник"><option value="">Все источники</option>${C.SOURCES.map((s) => opt(s, s, f.source)).join('')}</select>
        ${st.role !== 'sales' ? `<select id="lmgr" aria-label="Менеджер"><option value="">Все менеджеры</option>${st.staff.filter((u) => u.role === 'sales').map((u) => opt(u.id, u.name, f.manager)).join('')}</select>` : ''}
        <div class="seg" role="group"><button data-mode="kanban" class="${f.mode === 'kanban' ? 'on' : ''}">Канбан</button><button data-mode="list" class="${f.mode === 'list' ? 'on' : ''}">Список</button></div>
        <div class="grow"></div>
        <a class="btn ghost" href="#/form" target="_blank" rel="noopener">${icon('ext', 16)} Форма с сайта</a>
        <button class="btn primary" id="lAdd">${icon('plus', 16)} Новая заявка</button>
      </div><div id="lbody"></div>`;
      $('#lq', el).addEventListener('input', (e) => { f.q = e.target.value; renderBody(el); });
      $('#lsrc', el).addEventListener('change', (e) => { f.source = e.target.value; renderBody(el); });
      const m = $('#lmgr', el); if (m) m.addEventListener('change', (e) => { f.manager = e.target.value; renderBody(el); });
      $$('.seg button', el).forEach((b) => b.addEventListener('click', () => { f.mode = b.dataset.mode; $$('.seg button', el).forEach((x) => x.classList.toggle('on', x === b)); renderBody(el); }));
      $('#lAdd', el).onclick = create;
      renderBody(el);
    },
  };
})();
