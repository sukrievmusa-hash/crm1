/* Грант CRM — справочники и генератор демо-данных */
(function () {
  'use strict';
  const App = (window.App = window.App || {});

  App.C = {
    STAGES: [
      { id: 'new', ru: 'Новая', kz: 'Жаңа' },
      { id: 'contacted', ru: 'Связались', kz: 'Байланыс болды' },
      { id: 'trial', ru: 'Пробный урок', kz: 'Сынақ сабақ' },
      { id: 'mock', ru: 'Пробный ЕНТ', kz: 'Сынақ ҰБТ' },
      { id: 'waiting', ru: 'Ждёт оплату', kz: 'Төлем күтуде' },
      { id: 'paid', ru: 'Оплачено', kz: 'Төленді' },
      { id: 'lost', ru: 'Отказ', kz: 'Бас тартты' },
    ],
    SOURCES: ['Instagram', 'TikTok', 'Сайт', 'WhatsApp', 'Рекомендация', 'Вебинар «Пробный ЕНТ»', 'Kaspi Объявления'],
    COMBOS: [
      { id: 'mi', name: 'Математика + Информатика', short: 'МАТ-ИНФ', p1: 'Математика', p2: 'Информатика', spec: 'it' },
      { id: 'mf', name: 'Математика + Физика', short: 'МАТ-ФИЗ', p1: 'Математика', p2: 'Физика', spec: 'eng' },
      { id: 'bc', name: 'Биология + Химия', short: 'БИО-ХИМ', p1: 'Биология', p2: 'Химия', spec: 'med' },
      { id: 'mg', name: 'Математика + География', short: 'МАТ-ГЕО', p1: 'Математика', p2: 'География', spec: 'econ' },
      { id: 'wh', name: 'Всемирная история + Основы права', short: 'ИСТ-ПРАВО', p1: 'Всемирная история', p2: 'Основы права', spec: 'law' },
      { id: 'fl', name: 'Иностранный язык + Всемирная история', short: 'АНГЛ-ИСТ', p1: 'Иностранный язык', p2: 'Всемирная история', spec: 'ir' },
      { id: 'kz', name: 'Казахский язык + Казахская литература', short: 'КАЗ-ЛИТ', p1: 'Казахский язык', p2: 'Казахская литература', spec: 'ped' },
      { id: 'bg', name: 'Биология + География', short: 'БИО-ГЕО', p1: 'Биология', p2: 'География', spec: 'eco' },
    ],
    SUBJ_KZ: {
      'Математика': 'Математика', 'Информатика': 'Информатика', 'Физика': 'Физика', 'Биология': 'Биология', 'Химия': 'Химия', 'География': 'География',
      'Всемирная история': 'Дүниежүзі тарихы', 'Основы права': 'Құқық негіздері', 'Иностранный язык': 'Шет тілі', 'Казахский язык': 'Қазақ тілі', 'Казахская литература': 'Қазақ әдебиеті',
    },
    SPECIALTIES: [
      { id: 'it', name: 'IT и программирование', pass: 115 },
      { id: 'eng', name: 'Инженерия', pass: 104 },
      { id: 'med', name: 'Медицина', pass: 118 },
      { id: 'econ', name: 'Экономика и финансы', pass: 108 },
      { id: 'law', name: 'Юриспруденция', pass: 112 },
      { id: 'ir', name: 'Международные отношения', pass: 116 },
      { id: 'ped', name: 'Педагогика', pass: 95 },
      { id: 'eco', name: 'Экология', pass: 92 },
    ],
    TARIFFS: [
      { id: 'std', name: 'Стандарт · 2 профильных', price: 29900 },
      { id: 'pro', name: 'Про · все 5 предметов', price: 44900 },
      { id: 'int', name: 'Интенсив + личный куратор', price: 59900 },
      { id: 'ind', name: 'Индивидуальный', price: 89900 },
    ],
    METHODS: { kaspi_pay: 'Kaspi Pay', kaspi_red: 'Kaspi Рассрочка', transfer: 'Kaspi перевод', card: 'Банковская карта' },
    LOST_REASONS: ['Дорого', 'Выбрал другую школу', 'Не отвечает', 'Готовится сам', 'Неактуально'],
    ROLE_USER: { director: 'u1', sales: 'u2', curator: 'u5' },
    CITIES: ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Атырау', 'Павлодар', 'Усть-Каменогорск', 'Тараз', 'Костанай', 'Кызылорда', 'Семей', 'Актау', 'Туркестан'],
  };

  const M_FIRST = ['Алихан', 'Нурсултан', 'Ерасыл', 'Данияр', 'Арман', 'Темирлан', 'Бекзат', 'Ислам', 'Мирас', 'Санжар', 'Ильяс', 'Тимур', 'Артём', 'Даниил', 'Нурасыл', 'Әділет', 'Айбек', 'Расул', 'Аслан', 'Максим'];
  const F_FIRST = ['Айгерим', 'Аружан', 'Дана', 'Камила', 'Асель', 'Мадина', 'Жансая', 'Томирис', 'Амина', 'Алина', 'Дильназ', 'Сабина', 'Ангелина', 'Айлин', 'Акбота', 'Інжу', 'Аяулым', 'Милана', 'Зарина', 'Арина'];
  const SURN = ['Ахметов', 'Нурланов', 'Серикбаев', 'Жумабеков', 'Оспанов', 'Касымов', 'Абдрахманов', 'Тулегенов', 'Ибраев', 'Муканов', 'Сагинтаев', 'Бекмуханов', 'Алиев', 'Исабеков', 'Есенов', 'Каримов', 'Иванов', 'Смагулов', 'Кенжебаев', 'Утегенов', 'Петренко', 'Ким'];
  const PARENT_F = ['Гульнара', 'Сауле', 'Айжан', 'Динара', 'Елена', 'Жанна', 'Гульмира', 'Салтанат', 'Ольга', 'Мариям'];
  const PARENT_M = ['Нурлан', 'Серик', 'Ержан', 'Болат', 'Алексей', 'Марат', 'Канат', 'Бахыт'];
  const NOTES = ['Родитель спрашивает про рассрочку', 'Интересует только профильная математика', 'Перезвонить после 18:00', 'Сравнивает с другой школой', 'Хочет в группу на казахском', 'Нужен грант, платное не рассматривают', 'Просит запись пробного урока', 'Решение принимает папа'];

  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  App.seed = function () {
    const R = rng(20261106);
    const ri = (a, b) => Math.floor(a + R() * (b - a + 1));
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const wpick = (pairs) => { const tot = pairs.reduce((s, p) => s + p[1], 0); let x = R() * tot; for (const p of pairs) { x -= p[1]; if (x <= 0) return p[0]; } return pairs[pairs.length - 1][0]; };
    const { DAY, MIN, HOUR, clamp, startOfDay } = App.u;
    const now = Date.now();
    let n = 0; const id = (p) => p + (++n).toString(36);

    const phone = () => `+7 7${pick(['00', '01', '02', '05', '07', '08', '47', '71', '75', '76', '77', '78'])} ${ri(100, 999)} ${ri(10, 99)} ${ri(10, 99)}`;
    const used = new Set();
    function person() {
      let p, guard = 0;
      do { p = person1(); } while (used.has(p.name) && ++guard < 50);
      used.add(p.name);
      return p;
    }
    function person1() {
      const f = R() < 0.52;
      let sn = pick(SURN);
      if (f && /(ов|ев|ин)$/.test(sn)) sn += 'а';
      const first = f ? pick(F_FIRST) : pick(M_FIRST);
      const pf = R() < 0.7;
      let psn = sn.replace(/а$/, '');
      if (pf && /(ов|ев|ин)$/.test(psn)) psn += 'а';
      return { name: first + ' ' + sn, phone: phone(), parentName: (pf ? pick(PARENT_F) : pick(PARENT_M)) + ' ' + psn, parentRole: pf ? 'мама' : 'папа', parentPhone: phone(), female: f };
    }

    const staff = [
      { id: 'u1', name: 'Жанар Бекова', role: 'director' },
      { id: 'u2', name: 'Айдана Касымова', role: 'sales' },
      { id: 'u3', name: 'Ерлан Муканов', role: 'sales' },
      { id: 'u4', name: 'Диана Сергеева', role: 'sales' },
      { id: 'u5', name: 'Асем Тулегенова', role: 'curator' },
      { id: 'u6', name: 'Руслан Нурланов', role: 'curator' },
      { id: 'u7', name: 'Мадина Жумабекова', role: 'curator' },
    ];

    // основной ЕНТ — ближайший май
    const nd = new Date(now);
    const entDate = new Date(nd.getMonth() >= 6 ? nd.getFullYear() + 1 : nd.getFullYear(), 4, 20, 9, 0).getTime();

    // пробные ЕНТ: три прошедших и один запланированный
    const mockExams = [-80, -50, -20, 9].map((d, i) => {
      const date = startOfDay(now + d * DAY) + 10 * HOUR;
      return { id: 'ex' + (i + 1), date, title: 'Пробный ЕНТ №' + (i + 1) };
    });

    const groupDefs = [
      ['mi', 'ru', 'Пн/Ср/Пт · 19:00', 20, 19, 'u5'], ['mi', 'kz', 'Вт/Чт/Сб · 18:00', 25, 10, 'u5'],
      ['mf', 'ru', 'Вт/Чт · 19:30', 25, 12, 'u6'], ['bc', 'ru', 'Пн/Ср/Пт · 17:00', 15, 14, 'u7'],
      ['bc', 'kz', 'Вт/Чт/Сб · 17:00', 25, 9, 'u7'], ['mg', 'kz', 'Пн/Ср · 18:30', 20, 7, 'u6'],
      ['wh', 'ru', 'Вт/Чт · 18:00', 25, 9, 'u5'], ['fl', 'ru', 'Сб/Вс · 11:00', 20, 6, 'u6'],
      ['kz', 'kz', 'Пн/Ср/Пт · 16:00', 20, 6, 'u7'],
    ];
    const groups = groupDefs.map((g, i) => {
      const c = App.C.COMBOS.find((x) => x.id === g[0]);
      return { id: 'g' + (i + 1), name: `${c.short} · ${g[1].toUpperCase()}`, combo: g[0], lang: g[1], schedule: g[2], capacity: g[3], curatorId: g[5], _n: g[4] };
    });

    const students = [], payments = [], leads = [], tasks = [];
    const salesIds = ['u2', 'u3', 'u4'];

    groups.forEach((g) => {
      for (let k = 0; k < g._n; k++) {
        const p = person();
        const joinedDays = R() < 0.26 ? ri(1, 40) : ri(41, 190);
        const joinedAt = startOfDay(now - joinedDays * DAY) + ri(9, 20) * HOUR;
        const ability = ri(48, 104);
        const s = {
          id: id('s'), name: p.name, phone: p.phone, parentName: p.parentName, parentRole: p.parentRole, parentPhone: p.parentPhone,
          city: R() < 0.35 ? 'Алматы' : pick(App.C.CITIES), lang: g.lang === 'kz' ? 'kz' : (R() < 0.15 ? 'kz' : 'ru'),
          combo: g.combo, groupId: g.id, target: App.C.COMBOS.find((c) => c.id === g.combo).spec,
          tariff: wpick([['std', 35], ['pro', 40], ['int', 20], ['ind', 5]]), plan: R() < 0.25 ? 'red' : 'monthly',
          status: 'active', joinedAt, managerId: pick(salesIds), grade: wpick([['11', 85], ['выпускник', 15]]),
          attendance: 0, homework: 0, exams: [], notes: [],
        };
        // успеваемость коррелирует с уровнем
        const disc = clamp(ability / 104 + (R() - 0.5) * 0.5, 0, 1);
        s.attendance = clamp(Math.round(58 + disc * 40 + ri(-6, 6)), 45, 100);
        s.homework = clamp(Math.round(40 + disc * 55 + ri(-8, 8)), 30, 100);
        // пробные ЕНТ
        let level = ability;
        // у каждого ученика свои сильные и слабые разделы; в среднем мат. грамотность и 2-й профильный — слабее
        const apt = { hist: 1.14 + (R() - 0.5) * 0.3, ml: 0.86 + (R() - 0.5) * 0.3, rl: 1.06 + (R() - 0.5) * 0.3, p1: 1.0 + (R() - 0.5) * 0.3, p2: 0.92 + (R() - 0.5) * 0.3 };
        mockExams.filter((e) => e.date < now).forEach((e, i, arr) => {
          if (e.date < joinedAt - 12 * DAY && !(i === arr.length - 1)) return;
          if (s.exams.length) level += ri(-1, 10) + (s.homework > 80 ? 2 : 0);
          const T = clamp(level, 25, 136);
          const share = (k, max) => clamp(Math.round(((max * T) / 140) * apt[k] * (1 + (R() - 0.5) * 0.16)), 0, max);
          s.exams.push({ examId: e.id, hist: share('hist', 20), ml: share('ml', 10), rl: share('rl', 10), p1: share('p1', 50), p2: share('p2', 50) });
        });
        students.push(s);
      }
      delete g._n;
    });

    // статусы: несколько заморозок и выбывших среди слабо посещающих
    students.slice().sort((a, b) => a.attendance - b.attendance).slice(0, 9).forEach((s, i) => { s.status = i < 5 ? 'left' : 'frozen'; });

    // платежи
    const tariffPrice = (tid) => App.C.TARIFFS.find((t) => t.id === tid).price;
    const method = () => wpick([['kaspi_pay', 50], ['transfer', 32], ['card', 18]]);
    students.forEach((s) => {
      const price = tariffPrice(s.tariff);
      let k = 0;
      if (s.plan === 'red') {
        payments.push({ id: id('p'), studentId: s.id, amount: price * 4, method: 'kaspi_red', date: s.joinedAt + ri(0, 3) * HOUR, status: 'paid', note: 'Рассрочка Kaspi на 4 месяца — школа получает всю сумму сразу' });
        k = 4;
      }
      for (; ; k++) {
        const due = s.joinedAt + k * 30 * DAY;
        if (due > now + 7 * DAY) break;
        if (s.status === 'left' && due > s.joinedAt + 45 * DAY) break;
        if (s.status === 'frozen' && due > now - 15 * DAY) break;
        if (due <= now) {
          if (due > now - 12 * DAY && s.status === 'active' && R() < 0.3) payments.push({ id: id('p'), studentId: s.id, amount: price, method: '', date: due, status: 'overdue' });
          else payments.push({ id: id('p'), studentId: s.id, amount: price, method: method(), date: Math.min(now - 10 * MIN, due + ri(0, 40) * HOUR), status: 'paid' });
        } else payments.push({ id: id('p'), studentId: s.id, amount: price, method: '', date: due, status: 'due' });
      }
    });

    // заявки, которые уже стали учениками (последние 40 дней)
    const SRC_W_CONV = [['Instagram', 22], ['TikTok', 10], ['Сайт', 16], ['WhatsApp', 9], ['Рекомендация', 26], ['Вебинар «Пробный ЕНТ»', 15], ['Kaspi Объявления', 2]];
    const SRC_W = [['Instagram', 27], ['TikTok', 33], ['Сайт', 13], ['WhatsApp', 8], ['Рекомендация', 8], ['Вебинар «Пробный ЕНТ»', 8], ['Kaspi Объявления', 3]];
    const note = (at, text, by) => ({ at, text, by });
    students.filter((s) => now - s.joinedAt < 40 * DAY).forEach((s) => {
      const created = s.joinedAt - ri(2, 12) * DAY - ri(0, 8) * HOUR;
      const fc = created + (R() < 0.15 ? ri(35, 90) : ri(2, 12)) * MIN;
      const l = {
        id: id('l'), name: s.name, phone: s.phone, parentName: s.parentName, parentRole: s.parentRole, parentPhone: s.parentPhone, grade: s.grade,
        city: s.city, lang: s.lang, combo: s.combo, target: s.target, source: wpick(SRC_W_CONV), stage: 'paid', maxStage: 5, managerId: s.managerId,
        createdAt: created, firstContactAt: fc, trialScore: s.exams.length ? App.calc.total(s.exams[0]) : null, studentId: s.id, lostReason: '',
        notes: [note(s.joinedAt, 'Оплата получена, ученик добавлен в группу', s.managerId), note(fc, 'Первый звонок, договорились о пробном уроке', s.managerId), note(created, 'Заявка создана', null)],
      };
      leads.push(l);
    });

    // остальные заявки
    function mkLead(createdAt, stage, extra = {}) {
      const p = person();
      const combo = wpick([['mi', 26], ['bc', 20], ['mf', 14], ['mg', 12], ['wh', 9], ['fl', 9], ['kz', 6], ['bg', 4]]);
      const si = App.C.STAGES.findIndex((x) => x.id === stage);
      const lostFrom = stage === 'lost' ? ri(0, 4) : null;
      const maxStage = stage === 'lost' ? lostFrom : si;
      const mgr = pick(salesIds);
      const slow = stage === 'lost' ? ri(15, 140) : mgr === 'u2' ? ri(2, 9) : ri(4, 45);
      const fc = maxStage >= 1 ? Math.min(now - MIN, createdAt + slow * MIN) : null;
      const l = Object.assign({
        id: id('l'), name: p.name, phone: p.phone, parentName: p.parentName, parentRole: p.parentRole, parentPhone: p.parentPhone,
        grade: wpick([['11', 75], ['10', 15], ['выпускник', 10]]), city: R() < 0.35 ? 'Алматы' : pick(App.C.CITIES), lang: R() < 0.42 ? 'kz' : 'ru',
        combo, target: App.C.COMBOS.find((c) => c.id === combo).spec, source: wpick(SRC_W), stage, maxStage, managerId: mgr,
        createdAt, firstContactAt: fc, trialScore: maxStage >= 3 ? ri(52, 116) : null, studentId: null,
        lostReason: stage === 'lost' ? pick(App.C.LOST_REASONS) : '', notes: [],
      }, extra);
      l.notes.push(note(createdAt, 'Заявка создана', null));
      if (fc) l.notes.unshift(note(fc, 'Первый контакт: ' + pick(['звонок', 'WhatsApp']), mgr));
      if (maxStage >= 2 && R() < 0.7) l.notes.unshift(note(Math.min(now - MIN, fc + ri(1, 3) * DAY), pick(NOTES), mgr));
      if (stage === 'lost') l.notes.unshift(note(Math.min(now - MIN, createdAt + ri(2, 6) * DAY), 'Отказ: ' + l.lostReason, mgr));
      leads.push(l);
      return l;
    }
    for (let i = 0; i < 78; i++) {
      const age = Math.pow(R(), 1.25) * 34 * DAY + 6 * HOUR;
      const created = now - age;
      const d = age / DAY;
      const stage = d < 1.2 ? wpick([['contacted', 6], ['trial', 1]])
        : wpick([['contacted', 18], ['trial', 14], ['mock', 15], ['waiting', 11], ['lost', 32]]);
      mkLead(created, stage);
    }
    // свежие заявки: две — с просроченным ответом (SLA 15 минут)
    [[4, 'new', 'Сайт'], [11, 'new', 'TikTok'], [27, 'new', 'Instagram'], [43, 'new', 'TikTok'], [80, 'contacted', 'WhatsApp'], [150, 'contacted', 'Instagram'], [230, 'trial', 'Рекомендация']]
      .forEach(([m, st, src]) => mkLead(now - m * MIN, st, { source: src }));

    leads.sort((a, b) => b.createdAt - a.createdAt);

    // задачи
    const T = (title, due, assigneeId, extra = {}) => tasks.push(Object.assign({ id: id('t'), title, due, assigneeId, done: false, priority: 'normal', leadId: null, studentId: null }, extra));
    leads.filter((l) => l.stage === 'new').forEach((l) => T('Позвонить: новая заявка', l.createdAt + 15 * MIN, l.managerId, { leadId: l.id, priority: 'high' }));
    leads.filter((l) => l.stage === 'waiting').slice(0, 6).forEach((l, i) => T('Дожать оплату, предложить рассрочку Kaspi', startOfDay(now) + (12 + i) * HOUR, l.managerId, { leadId: l.id }));
    leads.filter((l) => l.stage === 'mock').slice(0, 5).forEach((l) => T('Напомнить о пробном ЕНТ ' + App.u.fmtDate(mockExams[3].date), mockExams[3].date - DAY, l.managerId, { leadId: l.id }));
    payments.filter((p) => p.status === 'overdue').slice(0, 6).forEach((p, i) => { const s = students.find((x) => x.id === p.studentId); T('Напомнить родителю об оплате', startOfDay(now) + (10 + i) * HOUR - (i < 2 ? DAY : 0), s.managerId, { studentId: s.id, priority: i < 2 ? 'high' : 'normal' }); });
    students.filter((s) => s.status === 'active' && s.attendance < 68).slice(0, 6).forEach((s, i) => { const g = groups.find((x) => x.id === s.groupId); T('Созвониться с родителями: посещаемость ' + s.attendance + '%', startOfDay(now) + (i < 3 ? 11 : 35) * HOUR, g.curatorId, { studentId: s.id, priority: i < 2 ? 'high' : 'normal' }); });
    groups.slice(0, 5).forEach((g, i) => T('Разбор ошибок пробного ЕНТ №3 с группой ' + g.name, startOfDay(now) + (i < 2 ? -1 : 1) * DAY + 15 * HOUR, g.curatorId));
    T('Утвердить расписание нового потока МАТ-ИНФ', startOfDay(now) + 17 * HOUR, 'u1', { priority: 'high' });
    T('Согласовать бюджет на рекламу в TikTok', startOfDay(now) + 2 * DAY + 12 * HOUR, 'u1');
    T('Провести планёрку с отделом продаж', startOfDay(now) - DAY + 10 * HOUR, 'u1', { done: true });
    T('Отчёт по выручке за прошлый месяц', startOfDay(now) - 3 * DAY + 12 * HOUR, 'u1', { done: true });

    const templates = [
      { id: 'tpl1', name: 'Первое касание', aud: 'lead',
        ru: 'Здравствуйте, {имя}! Это {менеджер} из онлайн-школы подготовки к ЕНТ. Вы оставили заявку на подготовку по направлению «{профиль}». Удобно созвониться сегодня?',
        kz: 'Сәлеметсіз бе, {имя}! Бұл ҰБТ-ға дайындық онлайн-мектебінен {менеджер}. Сіз «{профиль}» бағыты бойынша өтінім қалдырдыңыз. Бүгін қоңырау шалуға ыңғайлы ма?' },
      { id: 'tpl2', name: 'Приглашение на пробный ЕНТ', aud: 'lead',
        ru: '{имя}, приглашаем на бесплатный пробный ЕНТ {дата}. Покажем ваш текущий балл и шансы на грант по специальности «{специальность}».',
        kz: '{имя}, {дата} күні тегін сынақ ҰБТ-ға шақырамыз. Қазіргі балыңызды және «{специальность}» мамандығы бойынша грантқа түсу мүмкіндігіңізді көрсетеміз.' },
      { id: 'tpl3', name: 'Напоминание об оплате', aud: 'parent',
        ru: 'Здравствуйте, {родитель}! Напоминаем об оплате обучения: {ученик}, {сумма}. Оплатить можно через Kaspi — в том числе в рассрочку. Спасибо!',
        kz: 'Сәлеметсіз бе, {родитель}! {ученик} оқуы үшін төлем мерзімі келді: {сумма}. Kaspi арқылы, оның ішінде бөліп төлеуге болады. Рахмет!' },
      { id: 'tpl4', name: 'Пропуски занятий', aud: 'parent',
        ru: '{родитель}, добрый день! {ученик} пропустил(а) несколько занятий — посещаемость {посещаемость}. Давайте вместе вернём темп: куратор {куратор} готов(а) созвониться в удобное время.',
        kz: '{родитель}, сәлеметсіз бе! {ученик} бірнеше сабақты жіберіп алды — қатысу {посещаемость}. Қарқынды бірге қалпына келтірейік: куратор {куратор} ыңғайлы уақытта хабарласуға дайын.' },
      { id: 'tpl5', name: 'Результат пробного ЕНТ', aud: 'parent',
        ru: '{родитель}, результаты пробного ЕНТ: {ученик} — {балл}/140. Разбор ошибок проведём на ближайшем занятии. Куратор: {куратор}.',
        kz: '{родитель}, сынақ ҰБТ нәтижесі: {ученик} — {балл}/140. Қателерді жақын сабақта талдаймыз. Куратор: {куратор}.' },
    ];

    return {
      version: App.VERSION, seededAt: now, role: 'director', lang: 'ru', theme: 'light', rr: 0, autoAssign: true,
      entDate, specialties: App.C.SPECIALTIES.map((x) => Object.assign({}, x)),
      staff, groups, students, payments, leads, tasks, templates, mockExams, campaigns: [], activity: [],
    };
  };
})();
