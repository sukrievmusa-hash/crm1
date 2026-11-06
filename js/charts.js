/* Грант CRM — графики (HTML/SVG, без библиотек). Цвета — из CSS-переменных. */
(function () {
  'use strict';
  const App = window.App;
  const { esc, num } = App.u;

  function niceMax(v) {
    if (v <= 0) return 1;
    const e = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / e;
    const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nice * e;
  }

  /* Вертикальные столбцы. data: [{label, value, tip?, cls?}] */
  function vbars(data, { height = 180, fmt = num, axisFmt = fmt, max } = {}) {
    const top = max || niceMax(Math.max(...data.map((d) => d.value), 0));
    const ticks = [0, 0.5, 1].map((k) => top * k);
    return `<div class="vb" style="--h:${height}px">
      <div class="vb-axis">${ticks.slice().reverse().map((v) => `<span>${esc(axisFmt(v))}</span>`).join('')}</div>
      <div class="vb-main">
        <div class="vb-plot">
          ${ticks.map((v) => `<i class="vb-grid" style="bottom:${(v / top) * 100}%"></i>`).join('')}
          ${data.map((d) => `<div class="vb-col" data-tip="${esc(d.tip || d.label + '\n' + fmt(d.value))}"><div class="vb-bar ${d.cls || ''}" style="height:${top ? Math.max(d.value > 0 ? 1.5 : 0, (d.value / top) * 100) : 0}%"></div></div>`).join('')}
        </div>
        <div class="vb-labels">${data.map((d) => `<span>${esc(d.label)}</span>`).join('')}</div>
      </div>
    </div>`;
  }

  /* Горизонтальные полосы. rows: [{label, value, display?, sub?, cls?, tip?}] */
  function hbars(rows, { max, fmt = num } = {}) {
    const top = max || Math.max(...rows.map((r) => r.value), 1);
    return `<div class="hb">${rows.map((r) => `
      <div class="hb-row" data-tip="${esc(r.tip || r.label + ': ' + (r.display || fmt(r.value)))}">
        <div class="hb-l">${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>
        <div class="hb-track"><div class="hb-bar ${r.cls || ''}" style="width:${Math.max(r.value > 0 ? 1 : 0, (r.value / top) * 100)}%"></div></div>
        <div class="hb-v">${esc(r.display || fmt(r.value))}</div>
      </div>`).join('')}</div>`;
  }

  /* Воронка. stages: [{label, value}] — упорядоченная шкала одного оттенка */
  function funnel(stages) {
    const top = Math.max(stages[0] ? stages[0].value : 0, 1);
    return `<div class="fn">${stages.map((s, i) => {
      const prev = i ? stages[i - 1].value : null;
      const conv = prev ? Math.round((s.value / prev) * 100) + '% от пред.' : '';
      return `<div class="fn-row" data-tip="${esc(s.label + ': ' + s.value + (conv ? '\n' + conv : ''))}">
        <div class="fn-l">${esc(s.label)}</div>
        <div class="fn-track"><div class="fn-bar fn-${i}" style="width:${Math.max(s.value ? 2 : 0, (s.value / top) * 100)}%"></div></div>
        <div class="fn-v"><b>${s.value}</b><small>${conv}</small></div>
      </div>`;
    }).join('')}</div>`;
  }

  /* Линия баллов ученика: points [{label, value}], target — проходной, forecast — прогноз */
  function scoreLine(points, { target, forecast, forecastLabel = 'Прогноз к ЕНТ' } = {}) {
    const W = 520, H = 210, L = 34, Rr = 30, T = 16, B = 30;
    const all = points.concat(forecast != null ? [{ label: forecastLabel, short: 'Прогноз', value: forecast, f: true }] : []);
    const lo = Math.max(0, Math.floor((Math.min(...all.map((p) => p.value), target || 140) - 15) / 10) * 10);
    const hi = 140;
    const x = (i) => L + (all.length === 1 ? (W - L - Rr) / 2 : (i * (W - L - Rr)) / (all.length - 1));
    const y = (v) => T + ((hi - v) * (H - T - B)) / (hi - lo);
    const ticks = [lo, Math.round((lo + hi) / 2 / 10) * 10, hi].filter((v) => !target || Math.abs(v - target) >= 8);
    let svg = `<svg class="sl" viewBox="0 0 ${W} ${H}" role="img" aria-label="Динамика баллов пробного ЕНТ">`;
    ticks.forEach((v) => { svg += `<line class="sl-grid" x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}"/><text class="sl-ax" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`; });
    if (target) svg += `<line class="sl-target" x1="${L}" x2="${W - Rr}" y1="${y(target)}" y2="${y(target)}"/><text class="sl-tl" x="${L - 6}" y="${y(target) + 4}" text-anchor="end">${target}</text>`;
    const real = all.filter((p) => !p.f);
    if (real.length > 1) svg += `<polyline class="sl-line" points="${real.map((p, i) => x(i) + ',' + y(p.value)).join(' ')}"/>`;
    if (forecast != null && real.length) { const i = real.length - 1; svg += `<line class="sl-fc" x1="${x(i)}" y1="${y(real[i].value)}" x2="${x(all.length - 1)}" y2="${y(forecast)}"/>`; }
    all.forEach((p, i) => {
      svg += `<g data-tip="${esc(p.label + '\n' + p.value + ' из 140')}"><circle class="sl-hit" cx="${x(i)}" cy="${y(p.value)}" r="14"/><circle class="${p.f ? 'sl-pf' : 'sl-pt'}" cx="${x(i)}" cy="${y(p.value)}" r="5"/></g>`;
      svg += `<text class="sl-val" x="${x(i)}" y="${y(p.value) - 11}" text-anchor="middle">${p.value}</text>`;
      svg += `<text class="sl-ax" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(p.short || p.label)}</text>`;
    });
    return svg + '</svg>';
  }

  /* Карточка с переключателем «График / Таблица» */
  function card(title, chartHtml, table, { sub = '', cls = '' } = {}) {
    const tbl = table ? `<div class="tbl-wrap card-table"><table class="tbl compact"><thead><tr>${table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
    return `<section class="card ${cls}"><div class="card-h"><div><h3>${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ''}</div>${table ? '<button class="btn ghost sm js-viewtoggle" aria-pressed="false">Таблица</button>' : ''}</div><div class="card-chart">${chartHtml}</div>${tbl}</section>`;
  }

  App.charts = { vbars, hbars, funnel, scoreLine, card, niceMax };
})();
