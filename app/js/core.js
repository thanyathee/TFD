/* ส่วนกลาง: ข้อมูล, การเก็บสถานะ, ตัวช่วยแสดงผล, การเปลี่ยนหน้า, หน้าเลือกบทบาท */
'use strict';

const STORE_KEY = 'tfd-scholarship-demo-v1';

const STATUS = {
  draft:               {label: 'กำลังกรอก',          tone: 'idle'},
  waiting_teacher:     {label: 'รอครูตรวจ',          tone: 'warn'},
  returned_to_student: {label: 'ส่งกลับให้แก้ไข',     tone: 'bad'},
  waiting_staff:       {label: 'รอเจ้าหน้าที่',        tone: 'info'},
  need_more_info:      {label: 'รอข้อมูลเพิ่มเติม',    tone: 'warn'},
  waiting_manager:     {label: 'รอผู้จัดการพิจารณา',   tone: 'violet'},
  decided:             {label: 'พิจารณาแล้ว',         tone: 'ok'},
};
const DECISION = {
  approved:   {label: 'อนุมัติทุน',   tone: 'ok'},
  rejected:   {label: 'ไม่ผ่าน',     tone: 'bad'},
  reserve:    {label: 'สำรอง',      tone: 'warn'},
  ineligible: {label: 'ไม่เข้าเกณฑ์', tone: 'bad'},
};
const TYPE = {NEW: 'ทุนใหม่', CONT: 'ทุนต่อเนื่อง'};
const SCHOOL_CLASSES = ['ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5'];
const COLLEGE_CLASSES = ['ปวช.1', 'ปวช.2', 'ปวส.1'];
const NEXT_CLASS = {'ป.4': 'ป.5', 'ป.5': 'ป.6', 'ป.6': 'ม.1', 'ม.1': 'ม.2', 'ม.2': 'ม.3', 'ม.3': 'ม.4', 'ม.4': 'ม.5', 'ม.5': 'ม.6',
  'ปวช.1': 'ปวช.2', 'ปวช.2': 'ปวช.3', 'ปวส.1': 'ปวส.2'};
const RATE_OF_NEXT = c => c === 'ป.6' ? 'P6' : /^ม\.[123]$/.test(c) ? 'M_LOWER' : /^ม\./.test(c) ? 'M_UPPER'
  : /^ปวช/.test(c) ? 'PVC' : /^ปวส/.test(c) ? 'PVS' : null;
const DOCS_NEW = ['บัตรประจำตัวประชาชน', 'หนังสือรับรองสถานภาพนักเรียน', 'ใบแสดงผลการเรียน', 'รูปสภาพที่อยู่อาศัย (2–4 รูป)'];
const DOCS_CONT = ['บัตรประจำตัวประชาชน', 'หนังสือรับรองสถานภาพนักเรียน', 'ใบแสดงผลการเรียน', 'สำเนาสมุดบัญชีหน้าแรก',
  'สำเนาสมุดบัญชีหน้ารายการเบิกถอนเงินทุน', 'ใบรายงานค่าใช้จ่าย', 'หลักฐานการใช้จ่าย / ใบเสร็จ'];

const App = {
  data: null,      // ข้อมูลตั้งต้นจากไฟล์ (สถานศึกษา, ครู, อัตราทุน, พื้นที่)
  db: null,        // ข้อมูลที่แก้ไขได้ระหว่างทดลอง (นักเรียน, การย้าย, สถานศึกษาที่เพิ่ม)
  session: {role: null},
  view: {name: 'home', params: {}},
  views: {},

  async start() {
    try {
      const [geo, mock] = await Promise.all(['data/geo.json', 'data/mock.json'].map(u => fetch(u).then(r => {
        if (!r.ok) throw new Error(u);
        return r.json();
      })));
      this.data = {geo, rates: mock.rates, teachers: mock.teachers, seed: mock};
      this.db = this.load() || this.fresh();
      this.index();
    } catch (e) {
      document.getElementById('main').innerHTML = '<div class="card"><h2>โหลดข้อมูลไม่สำเร็จ</h2><p class="muted">กรุณารีเฟรชหน้าอีกครั้ง</p></div>';
      return;
    }
    document.addEventListener('click', e => this.onClick(e));
    document.addEventListener('input', e => this.onInput(e));
    document.addEventListener('change', e => this.onChange(e));
    document.addEventListener('submit', e => { e.preventDefault(); this.dispatch(e.target.dataset.submit, e.target, e); });
    const fromHash = () => {
      const h = (location.hash || '').slice(1);
      this.go(['student', 'teacher', 'staff'].includes(h) ? h + '-entry' : 'home');
    };
    window.addEventListener('hashchange', fromHash);
    fromHash();
  },

  fresh() {
    const s = this.data.seed;
    return {
      students: s.students.map(x => ({...x, history: seedHistory(x), docs: x.teacher_review ? docsFor(x.type).map(() => true) : []})),
      schools: s.schools.map(x => ({...x})),
      transfers: [],
      cycle: {year: 2570, open: '2026-11-01', close: '2027-01-31', status: 'open'},
      rates: s.rates.map(x => ({...x})),
    };
  },
  load() {
    try { const v = localStorage.getItem(STORE_KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  },
  save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.db)); } catch (e) { /* ทดลองต่อได้ แม้บันทึกในเครื่องไม่ได้ */ }
    this.index();
  },
  reset() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ไม่มีอะไรต้องลบ */ }
    this.db = this.fresh();
    this.index();
    this.session = {role: null};
    this.toast('ล้างข้อมูลทดลองแล้ว กลับไปใช้ข้อมูลตัวอย่างตั้งต้น');
    this.go('home');
  },
  index() {
    this.schoolById = Object.fromEntries(this.db.schools.map(s => [s.id, s]));
    this.studentByCode = Object.fromEntries(this.db.students.map(s => [s.code, s]));
  },

  /* ---------- การเปลี่ยนหน้า ---------- */
  go(name, params = {}) {
    this.view = {name, params};
    this.render();
    window.scrollTo({top: 0});
  },
  render() {
    const v = this.views[this.view.name];
    const out = v.call(this, this.view.params);
    document.getElementById('topbar').innerHTML = this.topbar(out.nav);
    document.getElementById('main').innerHTML = out.html;
    if (out.after) out.after.call(this);
  },
  topbar(nav) {
    const r = this.session.role;
    const roleName = {student: 'นักเรียน', teacher: 'ครู / สถานศึกษา', staff: 'เจ้าหน้าที่มูลนิธิฯ'}[r];
    const who = this.session.who ? `<div class="whoami">${esc(roleName)}<b>${esc(this.session.who)}</b></div>` : '';
    const right = r ? `${who}<button class="btn sm" data-action="logout">ออกจากระบบ</button>` : '';
    const tabs = nav ? `<nav class="nav" aria-label="เมนู">${nav.map(n =>
      `<button data-go="${n[0]}" ${n[0] === this.view.name ? 'aria-current="page"' : ''}>${esc(n[1])}</button>`).join('')}</nav>` : '';
    return `<div class="topbar-in">
      <button class="brand" data-action="home" aria-label="กลับหน้าแรก"><span class="logo">TF</span>
        <span class="brand-text"><b>ทุนการศึกษามูลนิธิทิสโก้</b><span>ปีการศึกษา ${this.db.cycle.year} · ต้นแบบทดลองใช้งาน</span></span></button>
      <div class="topbar-right">${right}</div></div>${tabs}`;
  },

  /* ---------- เหตุการณ์ ---------- */
  handlers: {},
  on(name, fn) { this.handlers[name] = fn; },
  dispatch(name, el, e) { if (name && this.handlers[name]) this.handlers[name].call(this, el, e); },
  onClick(e) {
    const go = e.target.closest('[data-go]');
    if (go) { this.go(go.dataset.go, {...go.dataset}); return; }
    const a = e.target.closest('[data-action]');
    if (a) this.dispatch(a.dataset.action, a, e);
  },
  onInput(e) { if (e.target.dataset.oninput) this.dispatch(e.target.dataset.oninput, e.target, e); },
  onChange(e) { if (e.target.dataset.onchange) this.dispatch(e.target.dataset.onchange, e.target, e); },

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(this._t);
    this._t = setTimeout(() => { t.hidden = true; }, 3200);
  },

  /* ---------- ข้อมูลพื้นที่ / สถานศึกษา ---------- */
  provincesOf(region) {
    const r = this.data.geo.regions.find(x => x.code === region);
    return r ? this.data.geo.provinces.filter(p => p.r === r.id).map(p => p.th).sort((a, b) => a.localeCompare(b, 'th')) : [];
  },
  districtsOf(province) {
    const p = this.data.geo.provinces.find(x => x.th === province);
    return p ? this.data.geo.districts.filter(d => d.p === p.id).map(d => d.th).sort((a, b) => a.localeCompare(b, 'th')) : [];
  },
  regionOfProvince(province) {
    const p = this.data.geo.provinces.find(x => x.th === province);
    return p ? this.data.geo.regions.find(r => r.id === p.r).code : '';
  },
  regionName(code) { return (this.data.geo.regions.find(r => r.code === code) || {}).name || ''; },
  schoolName(id) { return (this.schoolById[id] || {}).name || '—'; },
  teachersOf(schoolId) { return this.data.teachers.filter(t => t.school === schoolId); },
  rateAmount(code) { return (this.db.rates.find(r => r.code === code) || {}).amount || 0; },

  /* ตัวเลือก ภาค → จังหวัด → อำเภอ → สถานศึกษา ใช้ร่วมกันทุกบทบาท */
  areaPicker(prefix, v = {}, opts = {}) {
    const regions = this.data.geo.regions.map(r => [r.code, r.name]);
    const provs = v.region ? this.provincesOf(v.region) : [];
    const dists = v.province ? this.districtsOf(v.province) : [];
    const schools = v.district ? this.db.schools.filter(s => s.province === v.province && s.district === v.district) : [];
    const ph = opts.any ? ['ทุกภาค', 'ทุกจังหวัด', 'ทุกอำเภอ / เขต'] : ['เลือกภาค', 'เลือกจังหวัด', 'เลือกอำเภอ / เขต'];
    const sel = (key, label, items, placeholder, disabled) => `<div class="field"><label for="${prefix}-${key}">${label}</label>
      <select class="input" id="${prefix}-${key}" data-onchange="area" data-prefix="${prefix}" data-key="${key}" ${disabled ? 'disabled' : ''}>
      <option value="">${placeholder}</option>${items.map(i => { const [val, txt] = Array.isArray(i) ? i : [i, i];
        return `<option value="${esc(val)}" ${val === v[key] ? 'selected' : ''}>${esc(txt)}</option>`; }).join('')}</select></div>`;
    let html = sel('region', 'ภาค', regions, ph[0], false) + sel('province', 'จังหวัด', provs, ph[1], !v.region)
      + sel('district', 'อำเภอ / เขต', dists, ph[2], !v.province);
    if (opts.school) {
      const empty = v.district && !schools.length;
      html += sel('school', 'สถานศึกษา' + (opts.required ? ' <span class="req">*</span>' : ''), schools.map(s => [s.id, s.name]),
        empty ? 'ไม่พบสถานศึกษาในอำเภอนี้' : 'เลือกสถานศึกษา', !schools.length);
    }
    return html;
  },
  readArea(prefix) {
    const g = k => (document.getElementById(`${prefix}-${k}`) || {}).value || '';
    return {region: g('region'), province: g('province'), district: g('district'), school: g('school')};
  },
};

/* ---------- ตัวช่วย ---------- */
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}
function badge(status, decision) {
  if (status === 'decided' && decision) { const d = DECISION[decision.result]; return `<span class="badge t-${d.tone}">${d.label}</span>`; }
  const s = STATUS[status] || {label: status, tone: 'idle'};
  return `<span class="badge t-${s.tone}">${s.label}</span>`;
}
function fullName(s) { return `${s.title || ''}${s.first_name} ${s.last_name}`; }
function baht(n) { return n == null ? '—' : Number(n).toLocaleString('th-TH') + ' บาท'; }
function thDate(iso, time) {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  const o = {day: 'numeric', month: 'short', year: '2-digit'};
  if (time) { o.hour = '2-digit'; o.minute = '2-digit'; }
  return d.toLocaleString('th-TH', o);
}
function nowIso() { return new Date().toISOString().slice(0, 16); }
function docsFor(type) { return type === 'CONT' ? DOCS_CONT : DOCS_NEW; }
function validThaiId(id) {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - sum % 11) % 10 === Number(id[12]);
}
function seedHistory(x) {
  const h = [];
  if (x.submitted_at) h.push({at: x.submitted_at, text: 'นักเรียนส่งใบสมัคร'});
  if (x.teacher_review) h.push({at: x.teacher_review.sent_at, text: 'ครูตรวจและส่งมูลนิธิฯ'});
  if (x.staff_review) h.push({at: x.teacher_review.sent_at, text: x.staff_review.result === 'need_more_info'
    ? 'เจ้าหน้าที่ขอข้อมูลเพิ่มเติม' : 'เจ้าหน้าที่ตรวจแล้ว ส่งผู้จัดการ'});
  if (x.decision) h.push({at: x.teacher_review.sent_at, text: 'ผู้จัดการบันทึกผล: ' + DECISION[x.decision.result].label});
  return h;
}
function field(id, label, input, o = {}) {
  return `<div class="field ${o.err ? 'invalid' : ''}" ${o.attrs || ''}><label for="${id}">${label}${o.req ? ' <span class="req">*</span>' : ''}</label>
    ${input}${o.hint ? `<div class="hint">${o.hint}</div>` : ''}${o.err ? `<div class="err">${esc(o.err)}</div>` : ''}</div>`;
}
function input(id, value, attrs = '') { return `<input class="input" id="${id}" name="${id}" value="${esc(value)}" ${attrs}>`; }
function textarea(id, value, attrs = '') { return `<textarea class="input" id="${id}" name="${id}" ${attrs}>${esc(value)}</textarea>`; }
function select(id, items, value, placeholder, attrs = '') {
  return `<select class="input" id="${id}" name="${id}" ${attrs}>${placeholder != null ? `<option value="">${esc(placeholder)}</option>` : ''}${items.map(i => {
    const [v, t] = Array.isArray(i) ? i : [i, i]; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select>`;
}
function radios(name, items, value) {
  return `<div class="choices" role="radiogroup">${items.map(([v, t]) =>
    `<label class="choice"><input type="radio" name="${name}" value="${esc(v)}" ${v === value ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div>`;
}
function formData(form) {
  const o = {};
  new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  return o;
}
function table(cols, rows, o = {}) {
  if (!rows.length) return `<div class="table-wrap"><div class="empty">${o.empty || 'ไม่มีรายการ'}</div></div>`;
  return `<div class="table-wrap"><table class="list"><thead><tr>${cols.map(c => `<th class="${c.r ? 'r' : ''}">${esc(c.t)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr ${r.attrs || ''}>${cols.map((c, i) => `<td class="${c.r ? 'r' : ''}" data-label="${esc(c.t)}">${r.cells[i]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* ---------- หน้าเลือกบทบาท ---------- */
App.views.home = function () {
  this.session = {role: null};
  return {html: `
    <section class="hero">
      <h1>ระบบทุนการศึกษา ปีการศึกษา ${this.db.cycle.year}</h1>
      <p class="muted">เลือกบทบาทเพื่อทดลองใช้งาน ข้อมูลทั้งหมดเป็นข้อมูลจำลอง</p>
    </section>
    <div class="flow" aria-label="ลำดับการทำงาน"><b>นักเรียนกรอกใบสมัคร</b><span>→</span><b>ครูตรวจและส่งมูลนิธิฯ</b><span>→</span><b>เจ้าหน้าที่พิจารณา</b></div>
    <div class="roles">
      <button class="role" data-go="student-entry"><span class="who">นักเรียน / นักศึกษา</span><h2>สมัครขอรับทุน</h2>
        <p>กรอกใบสมัคร ตรวจสอบสถานะ และดูเอกสารที่ต้องเตรียมส่งครู</p><span class="btn primary go">เข้าสู่ระบบนักเรียน</span></button>
      <button class="role" data-go="teacher-entry"><span class="who">ครู / สถานศึกษา</span><h2>ตรวจและส่งใบสมัคร</h2>
        <p>ดูนักเรียนของโรงเรียน แนบเอกสาร ให้ความเห็น และส่งต่อมูลนิธิฯ</p><span class="btn primary go">เข้าสู่ระบบครู</span></button>
      <button class="role" data-go="staff-entry"><span class="who">เจ้าหน้าที่มูลนิธิฯ</span><h2>จัดการและพิจารณาทุน</h2>
        <p>ภาพรวม พิจารณาใบสมัคร บันทึกการย้ายสถานศึกษา และรายงาน</p><span class="btn primary go">เข้าสู่ระบบเจ้าหน้าที่</span></button>
    </div>
    <div class="note info small">การกระทำในบทบาทหนึ่งจะเห็นผลในบทบาทอื่นทันที เช่น นักเรียนส่งใบสมัคร แล้วครูเห็นในรายชื่อ ข้อมูลที่ทดลองเก็บไว้ในเบราว์เซอร์นี้เท่านั้น
      <button class="btn ghost sm" data-action="reset">ล้างข้อมูลทดลอง</button></div>`};
};
App.on('home', function () { this.go('home'); });
App.on('logout', function () { this.go('home'); });
App.on('reset', function () { this.reset(); });

/* ตัวเลือกพื้นที่: เปลี่ยนค่าแล้วล้างระดับที่ต่ำกว่า และวาดตัวเลือกใหม่ในที่เดิม */
App.on('area', function (el) {
  const prefix = el.dataset.prefix, key = el.dataset.key;
  const v = this.readArea(prefix);
  const order = ['region', 'province', 'district', 'school'];
  order.slice(order.indexOf(key) + 1).forEach(k => { v[k] = ''; });
  const box = el.closest('[data-area]');
  box.innerHTML = this.areaPicker(prefix, v, JSON.parse(box.dataset.area || '{}'));
  const next = document.getElementById(`${prefix}-${order[order.indexOf(key) + 1]}`);
  if (next && !next.disabled) next.focus();
  this.dispatch(box.dataset.after, box);
});
