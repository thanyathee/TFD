/* ส่วนกลาง: ข้อมูล, การเก็บสถานะ, ตัวช่วยแสดงผล, การเปลี่ยนหน้า, หน้าเลือกบทบาท
   เงื่อนไขทั้งหมดยึดตามต้นแบบ prototypes/…v28.html (นักเรียน/ครู) และ …Admin_HTML_Demo_v14.html (เจ้าหน้าที่) */
'use strict';

const STORE_KEY = 'tfd-scholarship-demo-v15';

/* สถานะการดำเนินงาน (ชุดเดียวกับ db/schema.sql) */
const STATUS = {
  draft:               {label: 'นักเรียนกำลังกรอกข้อมูล', tone: 'idle'},
  waiting_teacher:     {label: 'รอครูดำเนินการ',         tone: 'warn'},
  returned_to_student: {label: 'เปิดสิทธิ์ให้แก้ไข',        tone: 'bad'},
  waiting_transfer_proof: {label: 'รอหลักฐานการย้ายสถานศึกษา', tone: 'warn'},
  waiting_staff:       {label: 'รอเจ้าหน้าที่ดำเนินการ',    tone: 'info'},
  need_more_info:      {label: 'รอข้อมูลเพิ่มเติม',        tone: 'warn'},
  waiting_manager:     {label: 'รอผู้จัดการพิจารณา',      tone: 'violet'},
  decided:             {label: 'ดำเนินการเรียบร้อย',      tone: 'ok'},
};
const DECISION = {
  approved:   {label: 'อนุมัติทุน',   tone: 'ok'},
  rejected:   {label: 'ไม่ผ่าน',     tone: 'bad'},
  reserve:    {label: 'สำรอง',      tone: 'warn'},
  ineligible: {label: 'ไม่เข้าเกณฑ์', tone: 'bad'},
};
const TYPE = {NEW: 'ทุนใหม่', CONT: 'ทุนต่อเนื่อง'};

/* ช่วงชั้น → ระดับชั้นปัจจุบัน → ระดับชั้นปีถัดไป (v28: classGroups, normalMap, branchMap) */
const EDU_GROUPS = [['primary', 'ประถมศึกษา'], ['lowersec', 'มัธยมศึกษาตอนต้น'], ['uppersec', 'มัธยมศึกษาตอนปลาย'],
  ['voc', 'ประกาศนียบัตรวิชาชีพ (ปวช.)'], ['highvoc', 'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)'], ['bachelor', 'ปริญญาตรี']];
const GROUP_SHORT = {primary: 'ป.5–ป.6', lowersec: 'ม.ต้น', uppersec: 'ม.ปลาย', voc: 'ปวช.', highvoc: 'ปวส.', bachelor: 'ป.ตรี'};
const CLASS_GROUPS = {
  primary: ['ป.5', 'ป.6'], lowersec: ['ม.1', 'ม.2', 'ม.3'], uppersec: ['ม.4', 'ม.5', 'ม.6'],
  voc: ['ปวช.1', 'ปวช.2', 'ปวช.3'], highvoc: ['ปวส.1', 'ปวส.2'],
  bachelor: ['ปริญญาตรี ปี 1', 'ปริญญาตรี ปี 2', 'ปริญญาตรี ปี 3', 'ปริญญาตรี ปี 4', 'ปริญญาตรี ปี 5'],
};
const NEXT_NORMAL = {'ป.5': 'ป.6', 'ป.6': 'ม.1', 'ม.1': 'ม.2', 'ม.2': 'ม.3', 'ม.4': 'ม.5', 'ม.5': 'ม.6', 'ปวช.1': 'ปวช.2',
  'ปวช.2': 'ปวช.3', 'ปวส.1': 'ปวส.2', 'ปริญญาตรี ปี 1': 'ปริญญาตรี ปี 2', 'ปริญญาตรี ปี 2': 'ปริญญาตรี ปี 3',
  'ปริญญาตรี ปี 3': 'ปริญญาตรี ปี 4', 'ปริญญาตรี ปี 4': 'ปริญญาตรี ปี 5'};
const NEXT_BRANCH = {'ม.3': ['ม.4', 'ปวช.1'], 'ม.6': ['ปวส.1', 'ปริญญาตรี ปี 1'], 'ปวช.3': ['ปวส.1', 'ปริญญาตรี ปี 1'],
  'ปวส.2': ['ปริญญาตรี ปี 1', 'ปริญญาตรี ปี 3']};
const nextOptions = c => NEXT_BRANCH[c] || (NEXT_NORMAL[c] ? [NEXT_NORMAL[c]] : []);
const groupOfClass = c => (Object.entries(CLASS_GROUPS).find(([, l]) => l.includes(c)) || [''])[0];
/* ปวส.: ประเภทวิชา ทั่วไป / อุตสาหกรรม (อุตสาหกรรมใช้อัตราทุนต่างจาก ปวส. ทั่วไป) */
const PVS_TYPES = [['other', 'ทั่วไป'], ['industry', 'อุตสาหกรรม']];
const STUDY_MODES = [['regular', 'ภาคปกติ'], ['special', 'ภาคพิเศษ (เรียนวันเสาร์–อาทิตย์ / ภาคค่ำ)'],
  ['dual', 'ทวิภาคี (เรียนและฝึกงานตามหลักสูตร)'], ['other', 'อื่น ๆ']];
/* อัตราทุนอ้างอิงระดับชั้นปีที่ได้รับทุน (ปีถัดไป) — v14 */
function rateOf(next, pvsType) {
  if (!next) return null;
  if (next === 'ป.6') return 'P6';
  if (/^ม\.[123]$/.test(next)) return 'M_LOWER';
  if (/^ม\./.test(next)) return 'M_UPPER';
  if (/^ปวช/.test(next)) return 'PVC';
  if (/^ปวส/.test(next)) return pvsType === 'industry' ? 'PVS_IND' : 'PVS';
  if (/^ปริญญาตรี/.test(next)) return 'BACHELOR';
  return null;
}
/* teacherNeedsScholarCert (v28) */
/* แบบฟอร์มรับรองสถานะการกู้ยืม กยศ./กรอ.: สำหรับ ม.ปลาย อาชีวศึกษา และปริญญาตรี (ตามแบบฟอร์มกระดาษ) */
const needsLoanCert = s => ['uppersec', 'voc', 'highvoc', 'bachelor'].includes(s.group || groupOfClass(s.class));
/* เอกสารประกอบตามแบบฟอร์มกระดาษ — [รหัส, ชื่อ, แนบได้หลายไฟล์, ไม่บังคับ] */
function docsFor(s) {
  const bachelor = (s.group || groupOfClass(s.class)) === 'bachelor';
  const d = [['01_IDCARD', 'สำเนาบัตรประจำตัวประชาชนของนักเรียน / นักศึกษา'], ['03_STUDENTCERT', 'หนังสือรับรองสถานภาพการเป็นนักเรียน / นักศึกษา'],
    ['04_TRANSCRIPT', 'สำเนาผลการศึกษาเทอมล่าสุด']];
  const loan = ['07_OTHERSCHOLAR', 'แบบฟอร์มรับรองสถานะการกู้ยืม กยศ./กรอ. และการได้รับทุนการศึกษาอื่น'];
  if (s.type === 'CONT') {
    if (needsLoanCert(s)) d.push(loan);
    d.push(['08_BANKFRONT', 'สำเนาสมุดบัญชีเงินฝาก หน้าที่แสดงชื่อเจ้าของบัญชี'],
      ['09_BANKTXN', 'สำเนาสมุดบัญชีเงินฝาก หน้าที่แสดงรายการเดินบัญชีจำนวนเงินทุนในปีล่าสุดที่เข้าบัญชีจนถึงรายการปัจจุบัน', true],
      ['10_EXPENSEREPORT', 'แบบฟอร์มรายการใช้จ่ายเงินทุนการศึกษา'],
      ['12_TUITION', 'ใบเสร็จรับเงินค่าธรรมเนียมการศึกษา / ค่าบำรุงการศึกษา (กรณีใช้เงินทุนชำระ)', true, true],
      ['13_INTERNET', 'หลักฐานการใช้จ่ายค่าอินเทอร์เน็ต (กรณีมีการใช้จ่าย)', true, true],
      ['11_RECEIPT', 'ใบเสร็จรับเงินค่าใช้จ่ายที่เบิกถอน (เบิกจากบัญชีตั้งแต่ 500 บาทขึ้นไป)', true]);
  } else {
    d.push(['05_HOUSEPHOTO', 'รูปถ่ายสภาพบ้านที่อยู่อาศัยของนักเรียน / นักศึกษา', true]);
    if (needsLoanCert(s)) d.push(loan);
    if (bachelor) d.push(['06_ADVISORCERT', 'จดหมายรับรองความเห็นจากอาจารย์ที่ปรึกษา']);
  }
  return d.map(x => [x[0], x[1], !!x[2], !!x[3]]);
}

const ICONS = {
  student: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  teacher: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  staff: '<path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/>',
  chev: '<path d="m9 6 6 6-6 6"/>', back: '<path d="m15 6-6 6 6 6"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 20h16"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

const App = {
  data: null, db: null, session: {role: null}, view: {name: 'home', params: {}}, views: {}, handlers: {},

  async start() {
    try {
      const [geo, mock] = await Promise.all(['data/geo.json', 'data/mock.json'].map(u => fetch(u).then(r => {
        if (!r.ok) throw new Error(u);
        return r.json();
      })));
      this.data = {geo, seed: mock};
      this.subByDistrict = {};
      geo.subdistricts.forEach(x => (this.subByDistrict[x.d] = this.subByDistrict[x.d] || []).push(x));
      this.db = this.load() || this.fresh();
      this.index();
    } catch (e) {
      document.getElementById('main').innerHTML = '<div class="card"><h2>โหลดข้อมูลไม่สำเร็จ</h2><p class="muted">กรุณารีเฟรชหน้าอีกครั้ง</p></div>';
      return;
    }
    document.addEventListener('click', e => this.onClick(e));
    document.addEventListener('input', e => { if (e.target.dataset.oninput) this.dispatch(e.target.dataset.oninput, e.target, e); });
    document.addEventListener('change', e => { if (e.target.dataset.onchange) this.dispatch(e.target.dataset.onchange, e.target, e); });
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
    const copy = o => JSON.parse(JSON.stringify(o));
    const sent = ['waiting_transfer_proof', 'waiting_staff', 'need_more_info', 'waiting_manager', 'decided'];
    return {
      students: s.students.map(x => x.school_next === 'transfer' && x.status === 'waiting_staff' ? {...x, status: 'waiting_transfer_proof'} : x).map(x => {
        /* เอกสารตัวอย่าง: ส่งแล้ว = ครบ, รอครู = ตาม demo_docs (none / partial / full) */
        const docs = docsFor(x).filter(d => !d[3]);
        const n = sent.includes(x.status) || x.demo_docs === 'full' ? docs.length : x.demo_docs === 'partial' ? Math.ceil(docs.length / 2) : 0;
        return {...copy(x), docFiles: Object.fromEntries(docs.slice(0, n).map(d => [d[0], [`${x.code}_${d[0]}.pdf`]]))};
      }),
      /* โรงเรียนตัวอย่างที่ได้อัตราพิเศษ ม.ต้น (ใช้ทดลอง) */
      schools: copy(s.schools).map(x => ({...x, special_rate: ['SCH-003', 'SCH-004', 'SCH-018', 'SCH-020'].includes(x.id),
        /* รูปแบบหลักสูตรตัวอย่าง: วิทยาลัย = ปกติ + ทวิภาคี, มหาวิทยาลัย = ปกติ + ภาคพิเศษ, โรงเรียน = ปกติ */
        modes: x.type === 'college' ? ['regular', 'dual'] : x.type === 'university' ? ['regular', 'special'] : ['regular']})),
      teachers: copy(s.teachers),
      /* ข้อมูลตัวอย่าง: นักเรียนที่ติ๊กย้าย ถ้าผ่าน จนท. ไปแล้ว ถือว่าบันทึกการย้ายแล้ว (เรียนที่เดิม) */
      transfers: s.students.filter(x => x.school_next === 'transfer' && ['need_more_info', 'waiting_manager', 'decided'].includes(x.status))
        .map(x => ({code: x.code, from: x.school, to: x.school, cls: x.next_class, date: '2027-05-10', note: 'ข้อมูลตัวอย่าง', by: 'จนท. 01', at: '2027-05-10T10:00'})),
      cycle: {year: 2570, history_year: 2569, status: 'open', open: '2026-11-01', close: '2027-01-31',
        transfer_open: '2027-03-01', first_cutoff: '2027-05-15', transfer_close: '2027-07-31'},
      pdpa: {version: '2026-08', effective: '2026-08-01', url: 'https://tiscofoundation.org/wp-content/uploads/pdpa_privacy_notice_tiscof.pdf'},
      rates: copy(s.rates),
    };
  },
  load() { try { const v = localStorage.getItem(STORE_KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.db)); } catch (e) { /* ทดลองต่อได้แม้บันทึกในเครื่องไม่ได้ */ }
    this.index();
  },
  reset() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ไม่มีอะไรต้องลบ */ }
    this.db = this.fresh();
    this.index();
    this.toast('ล้างข้อมูลทดลองแล้ว');
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
    let out;
    try { out = this.views[this.view.name].call(this, this.view.params); } catch (err) {
      console.error(err);
      out = {html: `<section class="card"><h2>เปิดหน้านี้ไม่สำเร็จ</h2><p class="muted">ข้อมูลทดลองในเบราว์เซอร์อาจเป็นรุ่นเก่า กด “ล้างข้อมูลทดลอง” แล้วลองใหม่</p>
        <p class="small muted">${esc(err.message)}</p><div class="row"><button class="btn primary" data-action="reset">ล้างข้อมูลทดลอง</button><button class="btn" data-action="home">กลับหน้าแรก</button></div></section>`};
    }
    document.getElementById('topbar').innerHTML = this.topbar(out.nav);
    const duo = document.querySelector('.tabs.duo');
    if (duo) {
      /* แถบสีเริ่มที่ปุ่มเดิม แล้วเลื่อนไปปุ่มใหม่ */
      const i = [...duo.querySelectorAll('button')].findIndex(b => b.hasAttribute('aria-current'));
      const from = this._duoIdx != null ? this._duoIdx : i;
      duo.style.setProperty('--i', from);
      duo.dataset.at = from;
      requestAnimationFrame(() => requestAnimationFrame(() => { duo.style.setProperty('--i', i); duo.dataset.at = i; }));
      this._duoIdx = i;
    } else this._duoIdx = null;
    document.getElementById('main').innerHTML = out.html;
    if (out.after) out.after.call(this);
  },
  topbar(nav) {
    const r = this.session.role;
    const roleName = {student: 'นักเรียน', teacher: 'ครู / สถานศึกษา', staff: 'เจ้าหน้าที่มูลนิธิฯ'}[r];
    const right = r ? `<div class="whoami">${esc(roleName)}<b>${esc(this.session.who || '')}</b></div>
      <button class="btn sm" data-action="home">ออกจากระบบ</button>` : '';
    const duo = nav && nav.length === 2;   // เมนู 2 ปุ่ม (ครู): ปุ่มกว้างเท่ากัน มีแถบสีเลื่อนไปมา
    const tabs = nav ? `<nav class="tabs ${duo ? 'duo' : ''}" aria-label="เมนู">${duo ? '<span class="ind" aria-hidden="true"></span>' : ''}${nav.map(n =>
      `<button data-go="${n[0]}" ${n[0] === this.view.name || (n[2] || []).includes(this.view.name) ? 'aria-current="page"' : ''}>${esc(n[1])}</button>`).join('')}</nav>` : '';
    return `<div class="topbar-in">
      <button class="brand" data-action="home" aria-label="กลับหน้าแรก"><span class="logo">TF</span>
        <span class="brand-text"><b>ทุนการศึกษามูลนิธิทิสโก้</b><span>ปีการศึกษา ${this.db.cycle.year} · ต้นแบบทดลองใช้งาน</span></span></button>
      <div class="topbar-right">${right}</div></div>${tabs}`;
  },

  /* ---------- เหตุการณ์ ---------- */
  on(name, fn) { this.handlers[name] = fn; },
  dispatch(name, el, e) { if (name && this.handlers[name]) this.handlers[name].call(this, el, e); },
  onClick(e) {
    const go = e.target.closest('[data-go]');
    if (go) { const {go: name, ...rest} = go.dataset; this.go(name, rest); return; }
    const a = e.target.closest('[data-action]');
    if (a) this.dispatch(a.dataset.action, a, e);
  },
  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(this._t);
    this._t = setTimeout(() => { t.hidden = true; }, 3400);
  },
  print() {
    let shown = false;
    const mark = () => { shown = true; };
    window.addEventListener('beforeprint', mark, {once: true});
    try { window.print(); } catch (e) { /* ไม่รองรับการพิมพ์ */ }
    setTimeout(() => { window.removeEventListener('beforeprint', mark); if (!shown) this.toast('การพิมพ์ / บันทึก PDF ใช้ได้เมื่อเปิดไฟล์บนเครื่องโดยตรง'); }, 400);
  },

  /* ---------- พื้นที่ / สถานศึกษา ---------- */
  provincesOf(region) {
    const r = this.data.geo.regions.find(x => x.code === region);
    return r ? this.data.geo.provinces.filter(p => p.r === r.id).map(p => p.th).sort((a, b) => a.localeCompare(b, 'th')) : [];
  },
  districtObjs(province) {
    const p = this.data.geo.provinces.find(x => x.th === province);
    return p ? this.data.geo.districts.filter(d => d.p === p.id).sort((a, b) => a.th.localeCompare(b.th, 'th')) : [];
  },
  districtsOf(province) { return this.districtObjs(province).map(d => d.th); },
  subdistrictsOf(province, district) {
    const d = this.districtObjs(province).find(x => x.th === district);
    return d ? (this.subByDistrict[d.id] || []).slice().sort((a, b) => a.th.localeCompare(b.th, 'th')) : [];
  },
  regionName(code) { return (this.data.geo.regions.find(r => r.code === code) || {}).name || ''; },
  schoolName(id) { return (this.schoolById[id] || {}).name || '—'; },
  teacherOf(schoolId) { return this.db.teachers.find(t => t.school === schoolId); },
  rateAmount(code) { return (this.db.rates.find(r => r.code === code) || {}).amount || 0; },
  /* อัตรามาตรฐานของนักเรียน: ม.ต้น ที่โรงเรียนปีหน้าได้อัตราพิเศษ → ใช้อัตราพิเศษ (โรงเรียนปีหน้า = หลังบันทึกย้ายแล้ว) */
  stdRate(s) {
    const base = this.rateAmount(s.rate);
    const special = s.rate === 'M_LOWER' && !!(this.schoolById[s.school] || {}).special_rate;
    return {amount: special ? this.rateAmount('SPECIAL') : base, special, base};
  },
  rateName(code) { return (this.db.rates.find(r => r.code === code) || {}).name || '—'; },

  /* ภาค → จังหวัด → อำเภอ/เขต (→ ตำบล) (→ สถานศึกษา) ใช้ร่วมกันทุกบทบาท */
  areaPicker(prefix, v = {}, o = {}) {
    const regions = this.data.geo.regions.map(r => [r.code, r.name]);
    const provs = v.region ? this.provincesOf(v.region) : [];
    const dists = v.province ? this.districtsOf(v.province) : [];
    const subs = o.sub && v.district ? this.subdistrictsOf(v.province, v.district).map(x => x.th) : [];
    const schools = o.school && v.district ? this.db.schools.filter(s => s.province === v.province && s.district === v.district)
      .sort((a, b) => a.name.localeCompare(b.name, 'th')) : [];
    const ph = o.any ? ['ทุกภาค', 'ทุกจังหวัด', 'ทุกอำเภอ / เขต', 'ทุกตำบล / แขวง', 'ทุกสถานศึกษา']
      : ['กรุณาเลือกภาค', v.region ? 'กรุณาเลือกจังหวัด' : 'กรุณาเลือกภาคก่อน', 'กรุณาเลือกอำเภอ / เขต', 'กรุณาเลือกตำบล / แขวง', 'กรุณาเลือกสถานศึกษา'];
    const req = o.required ? ' <span class="req">*</span>' : '';
    const err = o.err || {};
    const sel = (key, label, items, placeholder, disabled) => `<div class="field ${err[key] ? 'invalid' : ''}">
      <label class="label" for="${prefix}-${key}">${label}${req}</label>
      <select class="input" id="${prefix}-${key}" data-onchange="area" data-prefix="${prefix}" data-key="${key}" ${disabled ? 'disabled' : ''}>
      <option value="">${placeholder}</option>${items.map(i => { const [val, txt] = Array.isArray(i) ? i : [i, i];
        return `<option value="${esc(val)}" ${val === v[key] ? 'selected' : ''}>${esc(txt)}</option>`; }).join('')}</select>
      ${err[key] ? `<div class="err">${esc(err[key])}</div>` : ''}</div>`;
    let html = sel('region', 'ภาค', regions, ph[0], false) + sel('province', 'จังหวัด', provs, ph[1], !v.region)
      + sel('district', 'อำเภอ / เขต', dists, ph[2], !v.province);
    if (o.sub) html += sel('sub', 'ตำบล / แขวง', subs, ph[3], !v.district);
    if (o.school) {
      const none = v.district && !schools.length;
      html += sel('school', o.schoolLabel || 'ชื่อสถานศึกษา', schools.map(s => [s.id, s.name]),
        none ? '— ยังไม่มีสถานศึกษาในระบบสำหรับพื้นที่นี้ —' : ph[4], !schools.length);
    }
    return html;
  },
  readArea(prefix) {
    const g = k => (document.getElementById(`${prefix}-${k}`) || {}).value || '';
    return {region: g('region'), province: g('province'), district: g('district'), sub: g('sub'), school: g('school')};
  },
};

/* ---------- ตัวช่วย ---------- */
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}
function badge(s) {
  if (s.status === 'decided' && s.decision) { const d = DECISION[s.decision.result]; return `<span class="badge t-${d.tone}">${d.label}</span>`; }
  const st = STATUS[s.status] || {label: s.status, tone: 'idle'};
  return `<span class="badge t-${st.tone}">${st.label}</span>`;
}
/* ป้ายอัตราทุน: ปกติ = ฟ้า, พิเศษ = ส้ม */
function rateBadge(r) { return `<span class="badge ${r.special ? 't-warn' : 't-info'}">${r.special ? 'อัตราพิเศษ' : 'อัตราปกติ'} · ${baht(r.amount)}</span>`; }
function fullName(s) { return [s.title, s.first_name, s.last_name].filter(Boolean).join(' ') || '(ยังไม่กรอกชื่อ)'; }
function baht(n) { return n == null || n === '' ? '—' : Number(n).toLocaleString('th-TH') + ' บาท'; }
function thDate(iso, time) {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  const o = {day: 'numeric', month: 'short', year: 'numeric'};
  if (time) { o.hour = '2-digit'; o.minute = '2-digit'; }
  return d.toLocaleString('th-TH', o) + (time ? ' น.' : '');
}
/* วันเกิดแบบ วว/ดด/ปปปป (พ.ศ.) ตาม v28 */
function beDate(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${Number(y) + 543}`; }
function parseBeDate(t) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t || '');
  if (!m) return null;
  let y = Number(m[3]);
  if (y > 2400) y -= 543;
  const iso = `${y}-${m[2]}-${m[1]}`;
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) || d.getDate() !== Number(m[1]) || d > new Date() ? null : iso;
}
function maskBeDate(v) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length <= 2 ? d : d.length <= 4 ? d.slice(0, 2) + '/' + d.slice(2) : d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
}
function ageAt(iso, at = new Date()) {
  if (!iso) return '';
  const b = new Date(iso + 'T00:00:00');
  let a = at.getFullYear() - b.getFullYear();
  if (at.getMonth() < b.getMonth() || (at.getMonth() === b.getMonth() && at.getDate() < b.getDate())) a--;
  return a >= 0 ? a : '';
}
function nowIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function validThaiId(id) {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - sum % 11) % 10 === Number(id[12]);
}
/* ใบสมัครถึงมูลนิธิฯ: ติ๊กย้ายและยังไม่บันทึกการย้าย → รอหลักฐานการย้ายสถานศึกษา */
function arrivalStatus(s, transfers) {
  return s.school_next === 'transfer' && !(transfers || []).some(t => t.code === s.code) ? 'waiting_transfer_proof' : 'waiting_staff';
}
function addHistory(s, text, kind) { (s.history = s.history || []).push({at: nowIso(), text, kind}); }

function field(id, label, control, o = {}) {
  return `<div class="field ${o.err ? 'invalid' : ''}" ${o.attrs || ''}>${label ? `<label class="label" for="${id}">${label}${o.req ? ' <span class="req">*</span>' : ''}</label>` : ''}
    ${control}${o.hint ? `<div class="hint">${o.hint}</div>` : ''}${o.err ? `<div class="err">${esc(o.err)}</div>` : ''}</div>`;
}
function input(id, value, attrs = '') { return `<input class="input" id="${id}" name="${id}" value="${esc(value)}" ${attrs}>`; }
function textarea(id, value, attrs = '') { return `<textarea class="input" id="${id}" name="${id}" ${attrs}>${esc(value)}</textarea>`; }
function select(id, items, value, placeholder, attrs = '') {
  return `<select class="input" id="${id}" name="${id}" ${attrs}>${placeholder != null ? `<option value="">${esc(placeholder)}</option>` : ''}${items.map(i => {
    const [v, t] = Array.isArray(i) ? i : [i, i]; return `<option value="${esc(v)}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select>`;
}
function radios(name, items, value, attrs = '', col) {
  return `<div class="choices ${col ? 'col' : ''}" role="radiogroup">${items.map(([v, t, sub]) =>
    `<label class="choice"><input type="radio" name="${name}" value="${esc(v)}" ${String(v) === String(value ?? '') ? 'checked' : ''} ${attrs}>
      ${sub ? `<span class="opt"><b>${esc(t)}</b><small>${esc(sub)}</small></span>` : esc(t)}</label>`).join('')}</div>`;
}
function checks(name, items, values = [], attrs = '') {
  return `<div class="choices col">${items.map(([v, t]) =>
    `<label class="choice"><input type="checkbox" name="${name}" value="${esc(v)}" ${values.includes(v) ? 'checked' : ''} ${attrs}> ${esc(t)}</label>`).join('')}</div>`;
}
function radioField(name, label, items, value, o = {}) {
  return `<div class="field ${o.err ? 'invalid' : ''} ${o.cls || ''}"><span class="label">${label}${o.req ? ' <span class="req">*</span>' : ''}</span>
    ${radios(name, items, value, o.attrs || '', o.col)}${o.hint ? `<div class="hint">${o.hint}</div>` : ''}${o.err ? `<div class="err">${esc(o.err)}</div>` : ''}</div>`;
}
function formData(form) {
  const o = {};
  new FormData(form).forEach((v, k) => {
    v = typeof v === 'string' ? v.trim() : v;
    if (k in o) o[k] = [].concat(o[k], v); else o[k] = v;
  });
  return o;
}
const arr = v => v == null || v === '' ? [] : [].concat(v);
function listRows(rows, empty) {
  if (!rows.length) return `<div class="list"><div class="empty">${empty || 'ไม่มีรายการ'}</div></div>`;
  return `<div class="list">${rows.join('')}</div>`;
}
function studentRow(s, attrs, sub, end) {
  return `<button class="li" ${attrs}><span class="av">${esc((s.first_name || '?').slice(0, 1))}</span>
    <span class="main"><span class="t">${esc(fullName(s))}</span><span class="s">${sub}</span>${end != null ? end : `<span>${badge(s)}</span>`}</span>
    <span class="end">${icon('chev', 'chev')}</span></button>`;
}
function tbl(cols, rows, foot) {
  return `<div class="table-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th class="${c.r ? 'r' : ''}">${esc(c.t)}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.map(r => `<tr>${r.map((v, i) => `<td class="${cols[i].r ? 'r' : ''}">${v}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length}" class="empty">ไม่มีข้อมูล</td></tr>`}</tbody>
    ${foot ? `<tfoot><tr>${foot.map((v, i) => `<td class="${cols[i].r ? 'r' : ''}">${v}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
}
function errNote(e) {
  const n = Object.keys(e || {}).length;
  return n ? '<div class="note bad" role="alert"><b>ยังกรอกข้อมูลไม่ครบ</b> — กรุณากรอกช่องที่เป็นสีแดงให้ครบ แล้วกดอีกครั้ง</div>' : '';
}
function focusFirstError() { const el = document.querySelector('.field.invalid .input, .field.invalid input'); if (el) el.focus(); }

/* กรอกช่องที่เป็นสีแดงแล้ว เอาสีแดงออกทันที ไม่ต้องรอกดถัดไปอีกครั้ง */
function clearInvalid(e) {
  const el = e.target;
  const box = el.closest('.field.invalid, .check.invalid');
  if (!box) return;
  const filled = el.type === 'checkbox' || el.type === 'radio' ? el.checked : String(el.value || '').trim() !== '';
  if (!filled) return;
  box.classList.remove('invalid');
  const msg = box.classList.contains('check') ? box.nextElementSibling : box.querySelector(':scope > .err');
  if (msg && msg.classList.contains('err')) msg.remove();
}
document.addEventListener('input', clearInvalid);
document.addEventListener('change', clearInvalid);

/* ---------- หน้าเลือกบทบาท ---------- */
App.views.home = function () {
  this.session = {role: null};
  return {html: `
    <section class="hero"><h1>ระบบทุนการศึกษา<br>ปีการศึกษา ${this.db.cycle.year}</h1>
      <p class="muted">เลือกบทบาทเพื่อทดลองใช้งาน ข้อมูลทั้งหมดเป็นข้อมูลจำลอง</p></section>
    <div class="flow" aria-label="ลำดับการทำงาน"><b>นักเรียนกรอกใบสมัคร</b><span>→</span><b>ครูตรวจและส่งมูลนิธิฯ</b><span>→</span><b>เจ้าหน้าที่พิจารณา</b></div>
    <div class="roles">
      <button class="role" data-go="student-entry"><span class="ico">${icon('student')}</span><h2>นักเรียน / นักศึกษา</h2>
        <p>สมัครขอรับทุน กรอกข้อมูลต่อ ตรวจสอบใบสมัคร และดูขั้นตอนหลังส่งข้อมูล</p><span class="btn primary go">เข้าสู่ระบบนักเรียน</span></button>
      <button class="role" data-go="teacher-entry"><span class="ico">${icon('teacher')}</span><h2>ครู / สถานศึกษา</h2>
        <p>ตรวจสอบรายชื่อนักเรียน อัปโหลดเอกสาร และส่งใบสมัครมายังมูลนิธิฯ</p><span class="btn primary go">เข้าสู่ระบบครู</span></button>
      <button class="role" data-go="staff-entry"><span class="ico">${icon('staff')}</span><h2>เจ้าหน้าที่มูลนิธิฯ</h2>
        <p>พิจารณาใบสมัคร จัดการสถานศึกษา และรายงาน</p><span class="btn primary go">เข้าสู่ระบบเจ้าหน้าที่</span></button>
    </div>
    <div class="note info small row between"><span>ทำในบทบาทหนึ่งแล้วเห็นผลในบทบาทอื่นทันที ข้อมูลทดลองเก็บไว้ในเบราว์เซอร์นี้เท่านั้น</span>
      <button class="btn ghost sm" data-action="reset">ล้างข้อมูลทดลอง</button></div>`};
};
App.on('home', function () { this.go('home'); });
App.on('reset', function () { this.reset(); });

/* ตัวเลือกพื้นที่: เปลี่ยนแล้วล้างระดับที่ต่ำกว่า และวาดใหม่ในที่เดิม */
App.on('area', function (el) {
  const prefix = el.dataset.prefix, key = el.dataset.key;
  const v = this.readArea(prefix);
  const order = ['region', 'province', 'district', 'sub', 'school'];
  order.slice(order.indexOf(key) + 1).forEach(k => { if (!(key === 'sub' && k === 'school')) v[k] = ''; });
  const box = el.closest('[data-area]');
  box.innerHTML = this.areaPicker(prefix, v, JSON.parse(box.dataset.area || '{}'));
  const next = order.slice(order.indexOf(key) + 1).map(k => document.getElementById(`${prefix}-${k}`)).find(x => x && !x.disabled);
  if (next) next.focus();
  this.dispatch(box.dataset.after, box);
});
