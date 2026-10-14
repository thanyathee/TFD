/* ส่วนใหม่: สมัครทางไปรษณีย์ — แยกจากนักเรียน / ครู / เจ้าหน้าที่ (ข้อมูลเก็บแยก ไม่แก้ข้อมูลของ 3 ส่วนเดิม)
   จนท. บันทึกแบบสรุปย่อทีละคน → พิมพ์ใบปะหน้าโรงเรียน → ผจก. อนุมัติทีละคน · แอดมินดูผลงานทุกคน */
'use strict';

const POSTAL_KEY = 'tfd-postal-demo-v5';
const P_ROLE = {
  clerk: ['จนท.บันทึกข้อมูล', 'บันทึกใบสมัครทางไปรษณีย์ พิมพ์ใบปะหน้า และดูผลงานของตัวเอง'],
  manager: ['ผจก.อนุมัติทุน', 'ดูทุกโรงเรียน และอนุมัติทุนทีละคน'],
  admin: ['แอดมิน', 'ดูผลงานทุกคน และจัดการผู้ใช้งาน'],
};
const P_STATUS = {
  doing: ['กำลังบันทึก', 'warn'], done: ['บันทึกเสร็จ', 'info'], printed: ['พิมพ์ใบปะหน้าแล้ว', 'violet'],
  reviewing: ['ผจก.กำลังพิจารณา', 'violet'], approved: ['ผจก.พิจารณาครบแล้ว', 'ok'],
};
/* ระดับในใบปะหน้า: นับตามชั้นปีหน้า (ชั้นที่ได้รับทุน) */
const P_LEVELS = [['primary', 'ประถม'], ['lowersec', 'ม.ต้น'], ['uppersec', 'ม.ปลาย'], ['voc', 'ปวช.'], ['highvoc', 'ปวส.'], ['bachelor', 'ปริญญาตรี']];
/* ประถม (ป.5 → ป.6) ผจก. พิจารณาที่ใบสมัครกระดาษ จึงไม่บันทึกรายคน — เริ่มที่ ป.6 */
const P_CLASSES = ['ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'ปวช.1', 'ปวช.2', 'ปวช.3', 'ปวส.1', 'ปวส.2',
  'ปริญญาตรี ปี 1', 'ปริญญาตรี ปี 2', 'ปริญญาตรี ปี 3', 'ปริญญาตรี ปี 4'];
const P_TITLES = ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว'];
const P_LAND = [['own', 'มีที่ดินของตนเอง'], ['rent', 'เช่าที่ดินผู้อื่น'], ['none', 'ไม่มีที่ดินทำกิน']];
const P_DOCS = [['cert', 'หนังสือรับรอง'], ['bank', 'รายการเดินบัญชี'], ['expense', 'ใบรายการใช้จ่าย'], ['receipt', 'ใบเสร็จ']];
const P_HOUSING = [['own', 'บ้านและที่ดินของครอบครัว'], ['own_other_land', 'บ้านของครอบครัว ที่ดินของผู้อื่น'], ['installment', 'กำลังผ่อนชำระ'],
  ['rent', 'บ้านเช่า / ห้องเช่า / หอพัก'], ['other', 'อื่น ๆ (บ้านญาติ / วัด / สถานสงเคราะห์)']];

/* ---------- ข้อมูล (เก็บแยกจากระบบออนไลน์) ---------- */
App.P = function () {
  if (!this.pdb) {
    try { const v = localStorage.getItem(POSTAL_KEY); this.pdb = v ? JSON.parse(v) : null; } catch (e) { this.pdb = null; }
    if (!this.pdb) this.pdb = this.pFresh();
  }
  return this.pdb;
};
App.pSave = function () { try { localStorage.setItem(POSTAL_KEY, JSON.stringify(this.pdb)); } catch (e) { /* ทดลองต่อได้ */ } };
const _coreReset = App.reset;
App.reset = function () {
  try { localStorage.removeItem(POSTAL_KEY); } catch (e) { /* ไม่มีอะไรต้องลบ */ }
  this.pdb = null;
  _coreReset.call(this);
};

/* รายชื่อผู้ได้รับทุนปีล่าสุด (จำลอง) — ทุนต่อเนื่องพิมพ์เลข 13 หลักแล้วดึงชื่อ / ชั้น จากที่นี่ */
function pMakeId(rand) {
  let d = String(1 + Math.floor(rand() * 8));
  for (let i = 0; i < 11; i++) d += Math.floor(rand() * 10);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d[i]) * (13 - i);
  return d + (11 - sum % 11) % 10;
}
App.pFresh = function () {
  let seed = 2569;
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const pick = a => a[Math.floor(rand() * a.length)];
  const FIRST_M = ['ธนากร', 'ภูมิพัฒน์', 'กิตติศักดิ์', 'ณัฐวุฒิ', 'อนุชา', 'ศุภชัย', 'วีรภัทร', 'พงศกร', 'ชยพล', 'ธีรเดช'];
  const FIRST_F = ['พิมพ์ชนก', 'กมลชนก', 'สุภาวดี', 'ณัฐธิดา', 'อรอุมา', 'ปวีณา', 'จิราพร', 'วราภรณ์', 'ศิริพร', 'ธัญญารัตน์'];
  const LAST = ['ใจดี', 'ทองคำ', 'แสงทอง', 'บุญมา', 'ศรีสุข', 'คำแก้ว', 'มีสุข', 'พรหมมา', 'จันทร์เพ็ญ', 'วงศ์ไทย', 'สายบุญ', 'ทองดี'];
  const used = new Set();
  const recipients = [];
  this.db.schools.forEach(sc => {
    const classes = (sc.levels || []).flatMap(g => CLASS_GROUPS[g] || []).filter(c => P_CLASSES.includes(c));
    if (!classes.length) return;
    for (let i = 0; i < (sc.id === 'SCH-007' ? 40 : 6); i++) {
      let cid; do { cid = pMakeId(rand); } while (used.has(cid)); used.add(cid);
      const f = rand() < 0.55, cls = pick(classes), adult = !/^ป\.|^ม\.[1-3]$/.test(cls);
      recipients.push({cid, title: f ? (adult ? 'นางสาว' : 'เด็กหญิง') : (adult ? 'นาย' : 'เด็กชาย'), first: pick(f ? FIRST_F : FIRST_M), last: pick(LAST),
        school: sc.id, cls, faculty: /^ปวช|^ปวส|^ปริญญา/.test(cls) ? pick(['ช่างยนต์', 'การบัญชี', 'ไฟฟ้ากำลัง', 'คอมพิวเตอร์ธุรกิจ', 'การตลาด']) : '',
        pvs_type: /^ปวส/.test(cls) ? pick(['other', 'industry']) : '', gpa: (2.4 + rand() * 1.55).toFixed(2), year: this.db.cycle.history_year});
    }
  });
  const recOf = id => recipients.filter(r => r.school === id);
  const teacher = id => this.teacherOf(id) || {};
  const entries = [];
  let n = 0;
  const add = (school, by, at, o) => entries.push({id: 'P' + String(++n).padStart(4, '0'), school, by, at, note: '', gpa: '', decision: null, ...o,
    next_class: o.next_class || nextOptions(o.cls)[0]});
  const cont = (school, r, by, at, o = {}) => add(school, by, at, {type: 'CONT', cid: r.cid, title: r.title, first: r.first, last: r.last, cls: r.cls,
    faculty: r.faculty, pvs_type: r.pvs_type, from_db: true, gpa_before: r.gpa, gpa: '3.12', use_money: 'ค่าเดินทางไปโรงเรียน ค่าอุปกรณ์การเรียน ชุดนักเรียน',
    docs: ['cert', 'bank', 'expense', 'receipt'], ...o});
  const nw = (school, by, at, o) => { let cid; do { cid = pMakeId(rand); } while (used.has(cid)); used.add(cid);
    add(school, by, at, {type: 'NEW', cid, family: 'อาศัยกับยาย บิดามารดาแยกทางกัน รายได้ครอบครัวไม่แน่นอน', equipment: ['pickup'], housing: 'own', land: 'none', ...o}); };
  /* โรงเรียนตัวอย่าง 3 แห่ง: พิมพ์แล้ว + ผจก. พิจารณาบางส่วน / บันทึกเสร็จ / กำลังบันทึก */
  const s1 = 'SCH-001', s2 = 'SCH-010', s3 = 'SCH-022';
  nw(s1, 'clerk01', '2027-06-03T09:10', {title: 'เด็กหญิง', first: 'กัญญารัตน์', last: 'ดวงดี', cls: 'ม.2', gpa: '3.45', decision: {result: 'approved', by: 'manager01', at: '2027-06-10T14:00'}});
  nw(s1, 'clerk01', '2027-06-03T09:14', {title: 'เด็กชาย', first: 'ปิยะพงษ์', last: 'ศรีวงศ์', cls: 'ม.3', next_class: 'ม.4', gpa: '2.98', equipment: [], housing: 'rent', land: 'rent',
    family: 'บิดาเสียชีวิต มารดารับจ้างทั่วไป มีน้อง 2 คน', decision: {result: 'rejected', by: 'manager01', at: '2027-06-10T14:05'}});
  nw(s1, 'clerk01', '2027-06-03T09:20', {title: 'นางสาว', first: 'สุนิสา', last: 'แก้วมณี', cls: 'ม.5', gpa: '3.80', housing: 'other', family: 'อาศัยกับป้า บิดามารดาทำงานต่างจังหวัด'});
  recOf(s1).slice(0, 2).forEach((r, i) => cont(s1, r, 'clerk01', `2027-06-03T09:${30 + i * 4}`, i ? {docs: ['cert', 'bank', 'expense'], note: 'ไม่มีใบเสร็จ ค่าใช้จ่ายต่ำกว่า 500 บาท'} : {}));
  nw(s2, 'clerk02', '2027-06-05T10:02', {title: 'นาย', first: 'อภิสิทธิ์', last: 'ทองใบ', cls: 'ปวช.3', next_class: 'ปวส.1', faculty: 'ช่างกลโรงงาน', pvs_type: 'industry', gpa: '3.05', land: 'own'});
  nw(s2, 'clerk02', '2027-06-05T10:08', {title: 'นางสาว', first: 'ศศิธร', last: 'พรมมา', cls: 'ปวช.1', faculty: 'การบัญชี', gpa: '3.62', equipment: [], housing: 'installment'});
  recOf(s2).slice(0, 1).forEach(r => cont(s2, r, 'clerk02', '2027-06-05T10:15'));
  nw(s3, 'clerk01', '2027-06-07T13:40', {title: 'นางสาว', first: 'อรทัย', last: 'สุขเจริญ', cls: 'ปริญญาตรี ปี 1', faculty: 'ครุศาสตร์', gpa: '3.21', housing: 'rent'});
  /* โรงเรียนตัวอย่างที่ส่งมาเยอะ: โรงเรียนจอมทองวิทยา (เชียงใหม่) — ใช้ลองดูว่า 1 แผ่นใส่ได้กี่คน */
  const s4 = 'SCH-007';
  const FAM = ['อาศัยกับยาย บิดามารดาแยกทางกัน มารดาไปทำงานกรุงเทพฯ ส่งเงินมาไม่แน่นอน ยายอายุมากรับจ้างเก็บลำไยตามฤดูกาล',
    'บิดาเสียชีวิต มารดารับจ้างทั่วไป รายได้วันละ 300 บาท มีน้อง 2 คนกำลังเรียน', 'บิดามารดาทำไร่ข้าวโพดบนที่เช่า มีหนี้ ธ.ก.ส. พี่น้อง 4 คน',
    'อาศัยกับป้า บิดาถูกจำคุก มารดาขาดการติดต่อ', 'บิดาพิการขาขวา มารดาขายของที่ตลาดนัด รายได้ไม่แน่นอน ต้องดูแลยายที่ป่วยติดเตียง'];
  const USE = ['ค่าเดินทางไปโรงเรียน ค่าอุปกรณ์การเรียน ชุดนักเรียน', 'ค่าบำรุงการศึกษา ค่าหนังสือ ค่าเดินทาง ค่าอาหารกลางวันบางส่วน และค่าอินเทอร์เน็ตสำหรับทำการบ้าน',
    'ค่ารถรับส่ง ค่าชุดพละ รองเท้า กระเป๋า', 'ค่าเทอม ค่าอุปกรณ์ ค่าเดินทาง ซื้อเครื่องคิดเลข'];
  recOf(s4).slice(0, 26).forEach((r, i) => cont(s4, r, 'clerk02', `2027-06-08T09:${String(i).padStart(2, '0')}`,
    {gpa: (2.5 + (i * 37 % 140) / 100).toFixed(2), use_money: USE[i % USE.length], docs: i % 5 ? ['cert', 'bank', 'expense', 'receipt'] : ['cert', 'bank', 'expense']}));
  for (let i = 0; i < 30; i++) {
    const cls = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5'][i % 5], adult = ['ม.4', 'ม.5'].includes(cls);
    nw(s4, 'clerk02', `2027-06-08T10:${String(i).padStart(2, '0')}`, {title: i % 2 ? (adult ? 'นางสาว' : 'เด็กหญิง') : (adult ? 'นาย' : 'เด็กชาย'), first: pick(i % 2 ? FIRST_F : FIRST_M), last: pick(LAST),
      cls, next_class: nextOptions(cls)[0], gpa: (2.6 + (i * 29 % 130) / 100).toFixed(2), family: FAM[i % FAM.length],
      equipment: [['pickup'], [], ['washer', 'pickup'], ['etan'], ['none']][i % 5], housing: ['own', 'rent', 'other', 'own_other_land'][i % 4], land: ['none', 'rent', 'own'][i % 3]});
  }
  const batch = (id, by, o) => { const t = teacher(id); return [id, {by, prim_new: 0, prim_cont: 0, wait_new: 0, wait_cont: 0, note: '', letter: '',
    teacher_name: t.name || '', teacher_phone: t.phone || '', teacher_email: t.email || '', done: false, printed: '', updated: '2027-06-07T13:40', ...o}]; };
  return {
    users: [
      {username: 'clerk01', name: 'จนท. บันทึก 01', role: 'clerk', active: true},
      {username: 'clerk02', name: 'จนท. บันทึก 02', role: 'clerk', active: true},
      {username: 'manager01', name: 'ผู้จัดการทุน', role: 'manager', active: true},
      {username: 'admin01', name: 'ผู้ดูแลระบบ', role: 'admin', active: true}],
    recipients, entries, prefs: {}, drafts: {},
    batches: Object.fromEntries([
      batch(s1, 'clerk01', {prim_new: 4, prim_cont: 2, wait_cont: 1, letter: 'ศธ 04221/215 ลงวันที่ 1 มิ.ย. 2570', note: 'รอฟังผล 1 ราย รอหลักฐานการย้ายสถานศึกษา',
        done: true, printed: '2027-06-04T08:30', updated: '2027-06-04T08:30'}),
      batch(s2, 'clerk02', {wait_new: 1, letter: 'ที่ วท 112/2570', done: true, updated: '2027-06-05T10:20'}),
      batch(s3, 'clerk01', {updated: '2027-06-07T13:40'}),
      batch(s4, 'clerk02', {other_new: 1, wait_new: 2, wait_cont: 1, note: 'อื่น ๆ 1 ราย: นักเรียนการศึกษานอกระบบ (กศน.) ส่งแนบมากับโรงเรียน', letter: 'ที่ ศธ 04297/88 ลงวันที่ 5 มิ.ย. 2570', done: true, updated: '2027-06-08T10:30'})]),
  };
};

/* ---------- ตัวช่วย ---------- */
const pName = e => [e.title, e.first, e.last].filter(Boolean).join(' ') || '(ไม่มีชื่อ)';
App.pUser = function (u) { return this.P().users.find(x => x.username === u) || {name: u}; };
App.pEntriesOf = function (school) { return this.P().entries.filter(e => e.school === school); };
App.pRate = function (e) {
  const rate = rateOf(e.next_class, /^ปวส/.test(e.next_class) ? e.pvs_type : '');
  return this.stdRate({rate, school: e.school});
};
App.pCounts = function (school) {
  const b = this.P().batches[school] || {};
  const es = this.pEntriesOf(school);
  const row = g => ({NEW: es.filter(e => e.type === 'NEW' && groupOfClass(e.next_class) === g).length, CONT: es.filter(e => e.type === 'CONT' && groupOfClass(e.next_class) === g).length});
  const rows = P_LEVELS.map(([g, t]) => {
    const r = row(g);
    if (g === 'primary') { r.NEW += Number(b.prim_new) || 0; r.CONT += Number(b.prim_cont) || 0; }
    return [g, t, r];
  });
  rows.push(['other', 'อื่น ๆ', {NEW: Number(b.other_new) || 0, CONT: Number(b.other_cont) || 0}]);
  rows.push(['wait', 'รอฟังผล', {NEW: Number(b.wait_new) || 0, CONT: Number(b.wait_cont) || 0}]);
  const total = rows.reduce((a, [, , r]) => ({NEW: a.NEW + r.NEW, CONT: a.CONT + r.CONT}), {NEW: 0, CONT: 0});
  return {rows, total, entered: es.length};
};
App.pStatus = function (school) {
  const b = this.P().batches[school];
  const es = this.pEntriesOf(school);
  if (!b && !es.length) return null;
  const decided = es.filter(e => e.decision).length;
  if (es.length && decided === es.length) return 'approved';
  if (decided) return 'reviewing';
  if (b && b.printed) return 'printed';
  if (b && b.done) return 'done';
  return 'doing';
};
const pBadge = k => k ? `<span class="badge t-${P_STATUS[k][1]}">${P_STATUS[k][0]}</span>` : '<span class="muted small">ยังไม่เริ่ม</span>';
App.pTouch = function (school) {
  const p = this.P();
  const b = p.batches[school] || (p.batches[school] = (() => { const t = this.teacherOf(school) || {};
    return {by: this.session.pUser, prim_new: 0, prim_cont: 0, wait_new: 0, wait_cont: 0, note: '', letter: '',
      teacher_name: t.name || '', teacher_phone: t.phone || '', teacher_email: t.email || '', done: false, printed: ''}; })());
  b.updated = nowIso();
  return b;
};
/* 1 โรงเรียน = จนท. 1 คน: คนแรกที่เริ่มบันทึกเป็นเจ้าของ คนอื่นดูได้แต่บันทึกเพิ่มไม่ได้ (แอดมินแก้ได้ทุกโรงเรียน) */
App.pOwner = function (school) { return (this.P().batches[school] || {}).by || ''; };
App.pCanEdit = function (school) {
  const o = this.pOwner(school);
  return !o || o === this.session.pUser || this.session.pRole === 'admin';
};
/* จนท.บันทึก เห็นเฉพาะโรงเรียน / ข้อมูลของตนเอง · ผจก. และแอดมินเห็นทั้งหมด */
App.pSees = function (school) {
  if (this.session.pRole !== 'clerk') return true;
  const o = this.pOwner(school);
  return !o || o === this.session.pUser;
};
App.pSchools = function () { return this.db.schools.slice().sort((a, b) => a.province.localeCompare(b.province, 'th') || a.name.localeCompare(b.name, 'th')); };

/* ---------- เข้าสู่ระบบ / เมนู ---------- */
App.pNav = function () {
  const r = this.session.pRole;
  const all = {
    form: ['post-form', 'บันทึกข้อมูล'], schools: ['post-schools', 'ใบปะหน้าโรงเรียน', ['post-cover']],
    approve: ['post-approve', 'อนุมัติทุน'], work: ['post-work', r === 'clerk' ? 'ผลงานของฉัน' : 'ผลงานเจ้าหน้าที่'], users: ['post-users', 'ผู้ใช้งาน'], recipients: ['post-recipients', 'ผู้ได้รับทุนปีก่อน'],
  };
  const keys = r === 'clerk' ? ['form', 'schools', 'work'] : r === 'manager' ? ['schools', 'approve', 'work'] : ['form', 'schools', 'approve', 'work', 'recipients', 'users'];
  return keys.map(k => all[k]);
};
App.pRoleBar = function () {
  const r = this.session.pRole;
  return `<div class="row between no-print"><div class="seg" role="group" aria-label="บทบาท">${Object.entries(P_ROLE).map(([k, [t]]) =>
    `<button type="button" data-action="p-role" data-role="${k}" aria-pressed="${k === r}">${t}</button>`).join('')}</div>
    <span class="small muted">กำลังใช้งาน: ${esc(this.session.name)} · ${P_ROLE[r][0]}</span></div>`;
};
App.pLogin = function (u) {
  this.session = {role: 'postal', pUser: u.username, pRole: u.role, name: u.name, who: `${u.name} · ${P_ROLE[u.role][0]}`};
};
App.pGuard = function () { return this.session.role === 'postal' && this.session.pUser; };
App.on('p-role', function (el) {
  const u = this.P().users.find(x => x.role === el.dataset.role && x.active !== false);
  if (!u) { this.toast('ไม่มีบัญชีที่เปิดใช้งานสำหรับบทบาทนี้'); return; }
  this.pLogin(u);
  const allowed = this.pNav().map(n => n[0]).concat('post-cover');
  this.go(allowed.includes(this.view.name) ? this.view.name : this.pNav()[0][0], allowed.includes(this.view.name) ? this.view.params : {});
});

App.views['postal-entry'] = function (p) {
  this.session = {role: null};
  const v = p.values || {}, e = p.errors || {};
  return {html: `
    <div class="page-head"><div><h1>สมัครทางไปรษณีย์</h1><p class="sub">บันทึกใบสมัครกระดาษแบบสรุปย่อ · ใบปะหน้าโรงเรียน · อนุมัติทุน</p></div></div>
    <div class="split">
      <form class="card" data-submit="p-login" novalidate>
        ${field('username', 'Username', input('username', v.username, 'autocomplete="username" autocapitalize="off"'), {req: 1, err: e.username})}
        ${field('password', 'Password', input('password', v.password, 'type="password" autocomplete="current-password"'), {req: 1, err: e.password})}
        <div class="row end"><button class="btn primary" type="submit">เข้าสู่ระบบ</button></div>
      </form>
      <aside class="card"><h3>บัญชีทดลอง</h3><p class="small muted">Password ทุกบัญชี <b>Demo@1234</b> · สลับบทบาทได้ภายในระบบ</p>
        ${this.P().users.filter(u => u.active !== false).map(u => `<button class="btn" data-action="p-sample" data-u="${u.username}">${u.username} · ${P_ROLE[u.role][0]}</button>`).join('')}</aside>
    </div>`, after: focusFirstError};
};
App.on('p-sample', function (el) { this.go('postal-entry', {values: {username: el.dataset.u, password: 'Demo@1234'}}); });
App.on('p-login', function (form) {
  const v = formData(form);
  const u = this.P().users.find(x => x.username === (v.username || '').toLowerCase());
  const e = {};
  if (!u) e.username = v.username ? 'ไม่พบ Username นี้' : 'กรุณากรอก Username';
  else if (u.active === false) e.username = 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อแอดมิน';
  if (v.password !== 'Demo@1234') e.password = v.password ? 'Password ไม่ถูกต้อง' : 'กรุณากรอก Password';
  if (Object.keys(e).length) { this.go('postal-entry', {values: {username: v.username}, errors: e}); return; }
  this.pLogin(u);
  this.go(this.pNav()[0][0]);
});
const pNeedLogin = fn => function (p) { return this.pGuard() ? fn.call(this, p || {}) : this.views['postal-entry'].call(this, {}); };

/* ---------- หน้า 1: บันทึกข้อมูล ---------- */
App.pPref = function () {
  const p = this.P();
  return p.prefs[this.session.pUser] || (p.prefs[this.session.pUser] = {school: '', type: 'NEW'});
};
App.pDraftKey = function () { const f = this.pPref(); return `${this.session.pUser}|${f.school}`; };
App.pCidNote = function (cid, type, school, editId) {
  if (!cid) return '';
  if (cid.length < 13) return `<span class="muted">พิมพ์แล้ว ${cid.length} / 13 หลัก</span>`;
  if (!validThaiId(cid)) return '<span class="p-bad">เลขบัตรไม่ถูกต้อง (ตรวจหลักสุดท้ายไม่ผ่าน) กรุณาตรวจอีกครั้ง</span>';
  const out = [];
  const dup = this.P().entries.find(e => e.cid === cid && e.id !== editId);
  if (dup) out.push(this.pSees(dup.school) ? `<span class="p-bad">บันทึกไปแล้ว: ${esc(pName(dup))} · ${esc(this.schoolName(dup.school))} · โดย ${esc(this.pUser(dup.by).name)}</span>`
    : '<span class="p-bad">เลขบัตรนี้ จนท. ท่านอื่นบันทึกไปแล้ว — แจ้งแอดมินถ้าต้องตรวจสอบ</span>');
  const online = this.db.students.find(s => s.citizen_id === cid);
  if (online) out.push(`<span class="p-warn">มีใบสมัครออนไลน์แล้ว (${esc(online.code)} · ${esc(fullName(online))})</span>`);
  if (type === 'NEW') {
    const r = this.P().recipients.find(x => x.cid === cid);
    out.push(r ? `<span class="p-bad">เคยได้รับทุนปี ${r.year} (${esc(pName(r))} · ${esc(this.schoolName(r.school))}) — ควรเป็นทุนต่อเนื่อง</span>`
      : `<span class="p-ok">ไม่พบในรายชื่อผู้ได้รับทุนปี ${this.db.cycle.history_year} → <b>ทุนใหม่</b></span>`);
  }
  if (type === 'CONT') {
    const r = this.P().recipients.find(x => x.cid === cid);
    if (r) {
      out.push(`<span class="p-ok">พบในรายชื่อผู้ได้รับทุนปี ${r.year} → <b>ทุนต่อเนื่อง</b> · ดึงชื่อและชั้นให้แล้ว</span>`);
      if (r.school !== school) out.push(`<span class="p-warn">ปีที่แล้วอยู่ ${esc(this.schoolName(r.school))}</span>`);
    } else out.push(`<span class="p-warn">ไม่พบในรายชื่อผู้ได้รับทุนปี ${this.db.cycle.history_year} — กรอกชื่อและชั้นเอง</span>`);
  }
  return out.join('') || '<span class="p-ok">เลขบัตรถูกต้อง</span>';
};

App.views['post-form'] = pNeedLogin(function (p) {
  if (this.session.pRole === 'manager') return this.views['post-schools'].call(this, {});
  const pf = this.pPref();
  const db = this.P();
  const edit = p.edit ? db.entries.find(e => e.id === p.edit) : null;
  if (edit) pf.school = edit.school;
  if (!this.pSees(pf.school)) pf.school = '';
  const sc = this.schoolById[pf.school];
  const bar = `<section class="card pf-bar no-print">
    <div class="field pf-sch"><label class="label" for="p-sq">โรงเรียน</label>${sc && !this.session.pSearch ? `<div class="pf-picked"><div><b>${esc(sc.name)}</b>
        <span>${esc(sc.district)} จ.${esc(sc.province)}</span></div>${edit ? '' : '<button type="button" class="btn sm" data-action="p-change">เปลี่ยนโรงเรียน</button>'}</div>`
      : `<input class="input" id="p-sq" data-oninput="p-sq" placeholder="พิมพ์ชื่อโรงเรียน อำเภอ หรือจังหวัด" autocomplete="off">
        <div class="pf-sres" id="p-sres">${this.pSchoolResults('')}</div>`}</div></section>`;
  if (!sc) return {nav: this.pNav(), html: `${this.pRoleBar()}
    <div class="page-head"><div><h1>บันทึกใบสมัครทางไปรษณีย์</h1><p class="sub">เลือกโรงเรียนครั้งเดียว แล้วพิมพ์ทีละคน · ประเภททุนระบบเลือกให้จากเลข 13 หลัก</p></div></div>
    ${bar}<div class="note info">เลือกโรงเรียนก่อน แล้วเริ่มบันทึกได้เลย</div>`, after() { const s = document.getElementById('p-sq'); if (s) s.focus(); }};

  const draft = edit ? null : db.drafts[this.pDraftKey()];
  const v = Object.assign({}, edit || draft || {}, p.values || {});
  const e = p.errors || {};
  const type = v.type === 'CONT' ? 'CONT' : 'NEW';
  const nexts = nextOptions(v.cls);
  if (!nexts.includes(v.next_class)) v.next_class = nexts[0] || '';
  const g = groupOfClass(v.cls), gn = groupOfClass(v.next_class);
  const needFac = ['voc', 'highvoc', 'bachelor'].includes(g) || ['voc', 'highvoc', 'bachelor'].includes(gn);
  const isPvs = /^ปวส/.test(v.next_class);
  const lock = type === 'CONT' && v.from_db && !v.unlocked;
  const ro = lock ? 'readonly' : '';
  const eq = arr(v.equipment), docs = arr(v.docs);
  const rate = v.next_class ? this.pRate({next_class: v.next_class, pvs_type: v.pvs_type, school: pf.school}) : null;
  const n = this.pEntriesOf(pf.school).length;
  const form = `<form class="card stack pf-form" data-submit="p-save" ${edit ? '' : 'data-pdraft'} novalidate autocomplete="off">
    <div class="row between"><h2>${edit ? `แก้ไข: ${esc(pName(edit))}` : `คนที่ ${n + 1}`}</h2>
      <span class="small muted" id="p-autosave">${edit ? 'กด “บันทึกการแก้ไข” เมื่อเสร็จ' : draft ? 'มีข้อมูลที่พิมพ์ค้างไว้ (บันทึกอัตโนมัติ)' : 'บันทึกอัตโนมัติระหว่างพิมพ์'}</span></div>
    ${field('cid', 'เลขประจำตัวประชาชน 13 หลัก', input('cid', v.cid, 'inputmode="numeric" maxlength="13" data-oninput="p-cid" placeholder="พิมพ์ตัวเลข 13 หลัก"'),
      {req: 1, err: e.cid, hint: `<span id="p-cid-note" class="p-note">${this.pCidNote(v.cid || '', type, pf.school, edit && edit.id)}</span>`})}
    <input type="hidden" name="type" value="${type}">
    <div class="field"><span class="label">ประเภททุน <span class="small muted">(ระบบเลือกให้จากเลข 13 หลัก · กดเปลี่ยนเองได้)</span></span>
      <div class="pf-type" role="group">${Object.entries(TYPE).map(([k, t]) =>
        `<button type="button" data-action="p-ftype" data-type="${k}" aria-pressed="${type === k}">${t}</button>`).join('')}</div></div>
    ${lock ? `<div class="note ok small row between"><span>ชื่อและชั้นดึงจากรายชื่อผู้ได้รับทุนปีล่าสุด</span><button class="btn ghost sm" type="button" data-action="p-unlock">แก้ไขเอง</button></div>` : ''}
    <input type="hidden" name="from_db" value="${v.from_db ? '1' : ''}"><input type="hidden" name="gpa_before" value="${esc(v.gpa_before || '')}"><input type="hidden" name="unlocked" value="${v.unlocked ? '1' : ''}">
    <div class="pf-name">
      ${field('title', 'คำนำหน้า', lock ? input('title', v.title, 'readonly') : select('title', P_TITLES, v.title, '—'), {req: 1, err: e.title})}
      ${field('first', 'ชื่อ', input('first', v.first, ro), {req: 1, err: e.first})}
      ${field('last', 'นามสกุล', input('last', v.last, ro), {req: 1, err: e.last})}</div>
    <div class="grid-2">
      ${field('cls', type === 'CONT' ? 'ชั้นปีนี้' : 'ชั้นปัจจุบัน', lock ? input('cls', v.cls, 'readonly') : select('cls', P_CLASSES, v.cls, 'เลือกชั้น', 'data-onchange="p-cls"'),
        {req: 1, err: e.cls, hint: 'ป.5 (ประถม) ไม่บันทึกรายคน ใส่แค่จำนวนในใบปะหน้า'})}
      ${nexts.length > 1 ? radioField('next_class', 'ชั้นปีหน้า', nexts.map(x => [x, x]), v.next_class, {req: 1, attrs: 'data-onchange="p-cls"'})
        : field('', 'ชั้นปีหน้า (คิดให้อัตโนมัติ)', `<div class="pf-next">${v.next_class ? esc(v.next_class) : '—'}${rate ? ' ' + rateBadge(rate) : ''}</div>
          <input type="hidden" name="next_class" value="${esc(v.next_class)}">`)}</div>
    ${nexts.length > 1 && rate ? `<div>${rateBadge(rate)}</div>` : ''}
    ${needFac || isPvs ? `<div class="grid-2">${needFac ? field('faculty', 'สาขา', input('faculty', v.faculty, ro + ' placeholder="เช่น ช่างยนต์ การบัญชี"')) : '<div></div>'}
      ${isPvs ? radioField('pvs_type', 'ประเภทวิชา (ปวส.)', PVS_TYPES, v.pvs_type || 'other', {attrs: 'data-onchange="p-cls"'}) : ''}</div>` : ''}
    ${field('gpa', type === 'CONT' ? 'เกรดเฉลี่ยปีนี้' : 'เกรดเฉลี่ย', input('gpa', v.gpa, 'inputmode="decimal" placeholder="เช่น 3.25"'), {err: e.gpa, hint: v.gpa_before ? `เกรดตอนได้รับทุนปี ${this.db.cycle.history_year}: <b>${esc(v.gpa_before)}</b>` : ''})}
    ${type === 'NEW' ? `
      ${field('family', 'สรุปสภาพครอบครัว', textarea('family', v.family, 'rows="2" placeholder="เช่น อาศัยกับยาย บิดามารดาแยกทางกัน รายได้ไม่แน่นอน"'))}
      <div class="field"><span class="label">บ้านมีเครื่องใช้อะไรบ้าง</span><div class="choice-grid pf-eq">${EQUIP.map(([k, t]) =>
        `<label class="choice"><input type="checkbox" name="equipment" value="${k}" ${eq.includes(k) ? 'checked' : ''}> ${t}</label>`).join('')}
        <label class="choice"><input type="checkbox" name="equipment" value="none" ${eq.includes('none') ? 'checked' : ''}> ไม่มีเลย</label></div></div>
      ${radioField('housing', 'บ้านที่อยู่อาศัยเป็นของใคร', P_HOUSING, v.housing, {cls: 'pf-wide'})}
      ${radioField('land', 'ที่ดินทำกิน', P_LAND, v.land)}` : `
      ${field('use_money', 'นำเงินทุนไปใช้จ่ายอะไรบ้าง', textarea('use_money', v.use_money, 'rows="2" placeholder="เช่น ค่าเดินทาง ค่าอุปกรณ์การเรียน ชุดนักเรียน"'))}
      <div class="field"><span class="label">เอกสารแนบ <span class="small muted">(ติ๊กที่มี)</span></span><div class="choices pf-docs">${P_DOCS.map(([k, t]) =>
        `<label class="choice"><input type="checkbox" name="docs" value="${k}" ${docs.includes(k) ? 'checked' : ''}> ${t}</label>`).join('')}</div></div>`}
    ${field('note', 'หมายเหตุ', input('note', v.note, 'placeholder="ถ้ามี"'))}
    ${errNote(e)}
    <div class="row end">${edit ? `<button class="btn ghost" type="button" data-action="p-delete" data-id="${edit.id}">ลบรายการนี้</button>
      <button class="btn" type="button" data-go="post-form">ยกเลิก</button><button class="btn primary" type="submit">บันทึกการแก้ไข</button>`
      : `<button class="btn ghost" type="button" data-action="p-clear">ล้างฟอร์ม</button><button class="btn primary pf-save" type="submit">บันทึก &amp; คนต่อไป <span class="kbd">Enter</span></button>`}</div>
  </form>`;
  return {nav: this.pNav(), html: `${this.pRoleBar()}
    <div class="page-head"><div><h1>บันทึกใบสมัครทางไปรษณีย์</h1><p class="sub">พิมพ์ทีละคน กด Enter เพื่อบันทึกแล้วไปคนต่อไป</p></div></div>
    ${bar}
    <div class="split pf-split">${!this.pCanEdit(pf.school) ? `<div class="card stack"><div class="note warn"><b>โรงเรียนนี้ ${esc(this.pUser(this.pOwner(pf.school)).name)} เป็นผู้บันทึก</b><br>
      1 โรงเรียนบันทึกโดย จนท. คนเดียว ดูรายชื่อได้ แต่บันทึกเพิ่ม / แก้ไขไม่ได้ ถ้าต้องโอนงานให้แจ้งแอดมิน</div>
      <div class="row"><button class="btn" data-action="p-change">เลือกโรงเรียนอื่น</button></div></div>`
    : edit && edit.decision ? `<div class="card"><div class="note warn">ผจก. พิจารณารายการนี้แล้ว (${DECISION[edit.decision.result].label}) จึงแก้ไขไม่ได้</div>
      <div class="row"><button class="btn" data-go="post-form">กลับ</button></div></div>` : form}
      <aside class="stack">${this.pSchoolPanel(pf.school, edit && edit.id)}</aside></div>`,
    after() {
      const f = document.getElementById(p.focus || (edit ? 'first' : 'cid'));
      if (f) { f.focus(); if (f.select && p.focus !== 'gpa') f.select(); }
      if (p.errors) focusFirstError();
    }};
});

App.pSchoolPanel = function (school, editId) {
  const sc = this.schoolById[school];
  const db = this.P();
  const b = db.batches[school] || {};
  const t = this.teacherOf(school) || {};
  const es = this.pEntriesOf(school);
  const st = this.pStatus(school);
  const listOf = k => { const all = es.filter(e => e.type === k);
    return `<h4 class="pf-h">${TYPE[k]} <span class="muted">(${all.length})</span></h4>${all.length ? '' : '<p class="small muted">ยังไม่มี</p>'}` + P_LEVELS.map(([g, gt]) => {
      const l = all.filter(e => groupOfClass(e.next_class) === g);
      return l.length ? `<div class="pf-lv">${TYPE[k]} ${gt} <span>(${l.length})</span></div><ol class="pf-list">${l.map(e =>
      `<li><button type="button" data-go="post-form" data-edit="${e.id}" ${e.id === editId ? 'aria-current="true"' : ''}><b>${esc(pName(e))}</b>
        <span>${esc(e.cls)} → ${esc(e.next_class)}${e.decision ? ` · ${DECISION[e.decision.result].label}` : ''}</span></button></li>`).join('')}</ol>` : ''; }).join(''); };
  const unused = db.recipients.filter(r => r.school === school && !db.entries.some(e => e.cid === r.cid));
  const num = (k, label) => `<label class="pf-num"><span>${label}</span><input class="input" type="number" min="0" name="${k}" value="${esc(b[k] || 0)}" inputmode="numeric"></label>`;
  return `<section class="card stack">
      <div><h3>${esc(sc.name)}</h3><p class="small muted">${esc(sc.address || '')} ${esc(sc.subdistrict || '')} ${esc(sc.district)} จ.${esc(sc.province)} · ${esc(this.regionName(sc.region))}</p>
        <div class="row">${pBadge(st)}<button class="btn sm" data-go="post-cover" data-id="${school}">${icon('print')} ใบปะหน้า</button></div></div>
      ${listOf('NEW')}${listOf('CONT')}
      ${unused.length ? `<details class="pf-demo"><summary>เลขบัตรทดลอง (ผู้ได้รับทุนปีที่แล้วของโรงเรียนนี้ → จะเป็นทุนต่อเนื่อง)</summary>
        <div class="choices">${unused.map(r => `<button type="button" class="btn sm" data-action="p-fillcid" data-cid="${r.cid}">${r.cid}</button>`).join('')}</div></details>` : ''}
    </section>
    <form class="card stack" data-pbatch="${school}" data-submit="p-batch-done" novalidate><fieldset class="pf-fs" ${this.pCanEdit(school) ? '' : 'disabled'}>
      <h3>ข้อมูลใบปะหน้า</h3><p class="small muted">ประถม · อื่น ๆ (ระบุในหมายเหตุ) · รอฟังผล (รอหลักฐานการย้ายสถานศึกษา) ใส่แค่จำนวน · บันทึกอัตโนมัติ</p>
      <div class="pf-nums"><span></span><b>ใหม่</b><b>ต่อเนื่อง</b>
        <span>ประถม</span>${num('prim_new', 'ประถม ใหม่')}${num('prim_cont', 'ประถม ต่อเนื่อง')}
        <span>อื่น ๆ</span>${num('other_new', 'อื่น ๆ ใหม่')}${num('other_cont', 'อื่น ๆ ต่อเนื่อง')}
        <span>รอฟังผล</span>${num('wait_new', 'รอฟังผล ใหม่')}${num('wait_cont', 'รอฟังผล ต่อเนื่อง')}</div>
      ${field('b-note', 'หมายเหตุ', `<input class="input" id="b-note" name="note" value="${esc(b.note || '')}">`)}
      ${field('b-letter', 'หนังสือนำส่ง', `<input class="input" id="b-letter" name="letter" value="${esc(b.letter || '')}" placeholder="เช่น ที่ ศธ 0000/123 ลงวันที่ ...">`)}
      ${field('b-tn', 'ครูผู้ดูแลทุน', `<input class="input" id="b-tn" name="teacher_name" value="${esc(b.teacher_name != null ? b.teacher_name : t.name || '')}">`)}
      <div class="grid-2">${field('b-tp', 'เบอร์โทร', `<input class="input" id="b-tp" name="teacher_phone" value="${esc(b.teacher_phone != null ? b.teacher_phone : t.phone || '')}" inputmode="tel">`)}
        ${field('b-te', 'อีเมล', `<input class="input" id="b-te" name="teacher_email" value="${esc(b.teacher_email != null ? b.teacher_email : t.email || '')}" inputmode="email">`)}</div>
      <label class="check"><input type="checkbox" name="done" ${b.done ? 'checked' : ''}> <span><b>บันทึกโรงเรียนนี้ครบแล้ว</b></span></label>
    </fieldset></form>`;
};

/* บันทึกร่างอัตโนมัติ: ฟอร์มคนปัจจุบัน และข้อมูลใบปะหน้า */
let pTimer = null;
function pAutosave(e) {
  const f = e.target.closest('form[data-pdraft], form[data-pbatch]');
  if (!f || App.view.name !== 'post-form') return;
  clearTimeout(pTimer);
  const now = f.hasAttribute('data-pbatch') && e.type === 'change';
  pTimer = setTimeout(() => App.pStore(f), now ? 0 : 400);
}
App.pStore = function (f) {
  if (!document.body.contains(f)) return;
  const v = formData(f);
  if (f.hasAttribute('data-pbatch')) {
    if (!this.pCanEdit(f.dataset.pbatch)) return;
    const b = this.pTouch(f.dataset.pbatch);
    ['prim_new', 'prim_cont', 'other_new', 'other_cont', 'wait_new', 'wait_cont'].forEach(k => (b[k] = Math.max(0, parseInt(v[k], 10) || 0)));
    ['note', 'letter', 'teacher_name', 'teacher_phone', 'teacher_email'].forEach(k => (b[k] = v[k] || ''));
    const done = !!v.done;
    if (done !== b.done) { b.done = done; this.pSave(); this.toast(done ? 'บันทึกโรงเรียนนี้เสร็จแล้ว' : 'เปิดให้บันทึกต่อ'); this.render(); return; }
  } else {
    this.P().drafts[this.pDraftKey()] = v;
    const s = document.getElementById('p-autosave');
    if (s) s.textContent = 'บันทึกอัตโนมัติแล้ว ' + nowIso().slice(11) + ' น.';
  }
  this.pSave();
};
document.addEventListener('input', pAutosave);
document.addEventListener('change', pAutosave);

App.pKeepForm = function () {
  const f = document.querySelector('form[data-pdraft]');
  if (f) { clearTimeout(pTimer); this.P().drafts[this.pDraftKey()] = formData(f); this.pSave(); }
  const b = document.querySelector('form[data-pbatch]');
  if (b) this.pStore(b);
};
/* ค้นหาโรงเรียนจากฐานข้อมูลสถานศึกษาเดียวกับระบบออนไลน์ */
App.pSchoolResults = function (q) {
  q = (q || '').trim();
  const db = this.P();
  /* ชื่อโรงเรียนที่ขึ้นต้นตรงกันมาก่อน → ชื่อมีคำนี้ → อำเภอ / จังหวัด */
  const score = s => { const n = s.name.replace(/^โรงเรียน|^วิทยาลัย|^มหาวิทยาลัย/, '');
    return !q ? 1 : n.startsWith(q) || s.name.startsWith(q) ? 4 : s.name.includes(q) ? 3 : [s.district, s.province].some(x => (x || '').includes(q)) ? 1 : 0; };
  const list = this.pSchools().map(s => [s, score(s)]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  if (!list.length) return '<p class="small muted">ไม่พบโรงเรียน — แจ้งแอดมินให้เพิ่มสถานศึกษาในระบบ</p>';
  return list.slice(0, 8).map(s => this.pSees(s.id) ? `<button type="button" data-action="p-pick" data-id="${s.id}"><b>${esc(s.name)}</b>
    <span>${esc(s.district)} จ.${esc(s.province)}${db.batches[s.id] ? ` · ${this.session.pRole === 'clerk' ? 'ที่ฉัน' : esc(this.pUser(db.batches[s.id].by).name) + ' '}บันทึกแล้ว ${this.pEntriesOf(s.id).length} ราย` : ''}</span></button>`
    : `<button type="button" disabled><b>${esc(s.name)}</b><span>${esc(s.district)} จ.${esc(s.province)} · มี จนท. ท่านอื่นรับผิดชอบแล้ว</span></button>`).join('')
    + (list.length > 8 ? `<p class="small muted">และอีก ${list.length - 8} แห่ง — พิมพ์เพิ่มเพื่อค้นหาให้แคบลง</p>` : '');
};
App.on('p-sq', function (el) { document.getElementById('p-sres').innerHTML = this.pSchoolResults(el.value); });
document.addEventListener('keydown', e => {
  if (e.target.id !== 'p-sq' || e.key !== 'Enter') return;
  e.preventDefault();
  const first = document.querySelector('#p-sres [data-action="p-pick"]');
  if (first) first.click();
});
App.on('p-change', function () { this.pKeepForm(); this.session.pSearch = true; this.render(); });
App.on('p-pick', function (el) {
  this.pKeepForm();
  this.session.pSearch = false;
  this.pPref().school = el.dataset.id;
  this.pSave();
  this.go('post-form');
});
/* เปลี่ยนประเภททุนเอง (กรณีระบบเลือกไม่ตรง เช่น ไม่มีชื่อในรายชื่อปีก่อน) */
App.on('p-ftype', function (el) {
  const v = {...formData(el.closest('form')), type: el.dataset.type};
  this.pRerender(v, 'cid');
});
App.pRerender = function (v, focus) {
  const edit = this.view.params.edit;
  if (edit) { this.go('post-form', {edit, values: v, focus}); return; }
  clearTimeout(pTimer);
  this.P().drafts[this.pDraftKey()] = v;
  this.pSave();
  this.go('post-form', {focus});
};
/* เปลี่ยนชั้น → คิดชั้นปีหน้า / สาขา / ประเภทวิชาใหม่ */
App.on('p-cls', function (el) {
  const f = el.form;
  const v = formData(f);
  if (f.hasAttribute('data-pdraft')) { this.P().drafts[this.pDraftKey()] = v; this.pSave(); this.go('post-form', {focus: el.name === 'cls' ? 'gpa' : el.id || 'gpa'}); }
  else this.go('post-form', {edit: this.view.params.edit, values: v, focus: 'gpa'});
});
/* พิมพ์เลข 13 หลักครบ → ระบบเลือกประเภททุนให้: พบในรายชื่อผู้ได้รับทุนปีก่อน = ทุนต่อเนื่อง (ดึงชื่อ / ชั้น) · ไม่พบ = ทุนใหม่ */
App.on('p-cid', function (el) {
  const cid = el.value.replace(/\D/g, '').slice(0, 13);
  if (cid !== el.value) el.value = cid;
  const pf = this.pPref();
  const edit = this.view.params.edit;
  const v = formData(el.form);
  const note = document.getElementById('p-cid-note');
  if (note) note.innerHTML = this.pCidNote(cid, v.type, pf.school, edit);
  if (cid.length !== 13 || !validThaiId(cid)) return;
  const r = this.P().recipients.find(x => x.cid === cid);
  if (r) {
    if (v.type === 'CONT' && v.from_db && v.first === r.first && v.last === r.last) return;
    this.pRerender({...v, cid, type: 'CONT', auto: '1', title: r.title, first: r.first, last: r.last, cls: r.cls, faculty: r.faculty, pvs_type: r.pvs_type,
      gpa_before: r.gpa, from_db: '1', unlocked: '', next_class: ''}, 'gpa');
    return;
  }
  if (v.type === 'NEW' && !v.from_db) return;
  /* ไม่พบในรายชื่อปีก่อน → ทุนใหม่ (ล้างข้อมูลที่ดึงมาจากคนก่อนหน้า) */
  const clean = v.from_db ? {title: '', first: '', last: '', cls: '', faculty: '', pvs_type: '', next_class: ''} : {};
  this.pRerender({...v, ...clean, cid, type: 'NEW', auto: '1', from_db: '', unlocked: '', gpa_before: ''}, v.from_db ? 'title' : 'title');
});
App.on('p-fillcid', function (el) {
  const c = document.getElementById('cid');
  if (!c) return;
  c.value = el.dataset.cid;
  this.dispatch('p-cid', c);
});
App.on('p-unlock', function (el) {
  const v = {...formData(el.closest('form')), unlocked: '1'};
  if (this.view.params.edit) { this.go('post-form', {edit: this.view.params.edit, values: v, focus: 'first'}); return; }
  this.P().drafts[this.pDraftKey()] = v;
  this.pSave();
  this.go('post-form', {focus: 'first'});
});
App.on('p-clear', function () {
  clearTimeout(pTimer);
  delete this.P().drafts[this.pDraftKey()];
  this.pSave();
  this.go('post-form');
});
App.on('p-save', function (form) {
  if (!this.pCanEdit(this.pPref().school)) { this.toast('โรงเรียนนี้ จนท. คนอื่นเป็นผู้บันทึก'); return; }
  clearTimeout(pTimer);
  const v = formData(form);
  const db = this.P();
  const pf = this.pPref();
  const editId = this.view.params.edit;
  const e = {};
  if (!v.cid) e.cid = 'กรุณากรอกเลขประจำตัวประชาชน';
  else if (!validThaiId(v.cid)) e.cid = 'เลขบัตรไม่ถูกต้อง';
  else if (db.entries.some(x => x.cid === v.cid && x.id !== editId)) e.cid = 'เลขบัตรนี้บันทึกไปแล้ว';
  if (!v.title) e.title = 'กรุณาเลือก';
  if (!v.first) e.first = 'กรุณากรอกชื่อ';
  if (!v.last) e.last = 'กรุณากรอกนามสกุล';
  if (!v.cls) e.cls = 'กรุณาเลือกชั้น';
  if (v.gpa && !(/^\d(\.\d{1,2})?$/.test(v.gpa) && Number(v.gpa) <= 4)) e.gpa = 'เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00–4.00';
  if (Object.keys(e).length) { this.go('post-form', {edit: editId, values: v, errors: e}); return; }
  const next = nextOptions(v.cls).includes(v.next_class) ? v.next_class : nextOptions(v.cls)[0] || '';
  const type = v.type === 'CONT' ? 'CONT' : 'NEW';
  const data = {type, school: pf.school, cid: v.cid, title: v.title, first: v.first, last: v.last, cls: v.cls, next_class: next,
    faculty: v.faculty || '', pvs_type: /^ปวส/.test(next) ? v.pvs_type || 'other' : '', gpa: v.gpa || '', note: v.note || '', from_db: !!v.from_db && !v.unlocked, gpa_before: v.gpa_before || ''};
  if (type === 'NEW') Object.assign(data, {family: v.family || '', equipment: arr(v.equipment), housing: v.housing || '', land: v.land || ''});
  else Object.assign(data, {use_money: v.use_money || '', docs: arr(v.docs)});
  if (editId) {
    const x = db.entries.find(y => y.id === editId);
    Object.assign(x, data, {edited_by: this.session.pUser, edited_at: nowIso()});
    this.pTouch(x.school);
    this.pSave();
    this.toast(`แก้ไข ${pName(x)} แล้ว`);
    this.go('post-form');
    return;
  }
  const id = 'P' + String(db.entries.reduce((m, x) => Math.max(m, parseInt(x.id.slice(1), 10) || 0), 0) + 1).padStart(4, '0');
  db.entries.push({id, ...data, by: this.session.pUser, at: nowIso(), decision: null});
  this.pTouch(pf.school);
  delete db.drafts[this.pDraftKey()];
  this.pSave();
  this.toast(`บันทึก ${pName(data)} แล้ว · ${TYPE[type]} · คนที่ ${this.pEntriesOf(pf.school).length} ของโรงเรียนนี้`);
  this.go('post-form');
});
App.on('p-delete', function (el) {
  const db = this.P();
  const x = db.entries.find(y => y.id === el.dataset.id);
  if (!x || !confirm(`ลบ ${pName(x)} ?`)) return;
  db.entries = db.entries.filter(y => y !== x);
  this.pSave();
  this.toast('ลบรายการแล้ว');
  this.go('post-form');
});
App.on('p-batch-done', function () { /* ฟอร์มใบปะหน้าบันทึกอัตโนมัติ — Enter ไม่ต้องทำอะไร */ });

/* ---------- หน้า 2: รายชื่อโรงเรียน / ใบปะหน้า ---------- */
App.views['post-schools'] = pNeedLogin(function (p) {
  const db = this.P();
  const f = p.f || {};
  const role = this.session.pRole;
  const ids = [...new Set(Object.keys(db.batches).concat(db.entries.map(e => e.school)))].filter(id => this.schoolById[id]);
  let rows = ids.map(id => ({id, sc: this.schoolById[id], st: this.pStatus(id), c: this.pCounts(id), b: db.batches[id] || {}}));
  rows = rows.filter(r => this.pSees(r.id));
  if (f.q) rows = rows.filter(r => r.sc.name.includes(f.q) || r.sc.province.includes(f.q));
  if (f.st) rows = rows.filter(r => r.st === f.st);
  if (f.by) rows = rows.filter(r => r.b.by === f.by);
  rows.sort((a, b) => a.sc.province.localeCompare(b.sc.province, 'th') || a.sc.name.localeCompare(b.sc.name, 'th'));
  const clerks = db.users.filter(u => u.role !== 'manager');
  const total = rows.reduce((a, r) => ({NEW: a.NEW + r.c.total.NEW, CONT: a.CONT + r.c.total.CONT}), {NEW: 0, CONT: 0});
  const printable = rows.filter(r => r.st !== 'doing').length;
  return {nav: this.pNav(), html: `${this.pRoleBar()}
    <div class="page-head"><div><h1>${role === 'manager' ? 'โรงเรียน / ใบปะหน้า' : 'ใบปะหน้าโรงเรียน'}</h1><p class="sub">ทุกโรงเรียนใช้ใบปะหน้าแบบเดียวกัน · พิมพ์ทีละโรงเรียนหรือทั้งหมด</p></div>
      <button class="btn primary" data-go="post-cover" data-id="all" ${printable ? '' : 'disabled'}>${icon('print')} พิมพ์ทุกโรงเรียนที่บันทึกเสร็จ (${printable})</button></div>
    <div class="stats"><div class="stat"><span>โรงเรียน</span><b>${rows.length}</b></div><div class="stat"><span>ทุนใหม่</span><b>${total.NEW}</b><small>ราย</small></div>
      <div class="stat"><span>ทุนต่อเนื่อง</span><b>${total.CONT}</b><small>ราย</small></div><div class="stat"><span>รวม</span><b>${total.NEW + total.CONT}</b><small>ราย</small></div></div>
    <form class="card filters pf-filters" data-submit="p-sch-filter">
      ${field('q', 'ค้นหาโรงเรียน / จังหวัด', input('q', f.q))}
      ${field('st', 'สถานะ', select('st', Object.entries(P_STATUS).map(([k, [t]]) => [k, t]), f.st, 'ทุกสถานะ'))}
      ${role === 'clerk' ? '' : field('by', 'ผู้บันทึก', select('by', clerks.map(u => [u.username, u.name]), f.by, 'ทุกคน'))}
      <div class="field"><span class="label">&nbsp;</span><button class="btn" type="submit">ค้นหา</button></div></form>
    ${tbl([{t: '#'}, {t: 'โรงเรียน'}, {t: 'ใหม่', r: 1}, {t: 'ต่อเนื่อง', r: 1}, {t: 'รวม', r: 1}, {t: 'สถานะ'}, {t: 'ผู้บันทึก'}, {t: ''}],
      rows.map((r, i) => [i + 1, `<b>${esc(r.sc.name)}</b><br><span class="small muted">จ.${esc(r.sc.province)}</span>`, r.c.total.NEW, r.c.total.CONT,
        `<b>${r.c.total.NEW + r.c.total.CONT}</b>`, pBadge(r.st), esc(this.pUser(r.b.by).name || '—'),
        `<div class="row nowrap"><button class="btn sm" data-go="post-cover" data-id="${r.id}">${icon('print')} ใบปะหน้า</button>
          ${role !== 'manager' ? `<button class="btn sm" data-action="p-open" data-id="${r.id}">บันทึกต่อ</button>` : ''}
          ${role !== 'clerk' && r.c.entered ? `<button class="btn sm" data-go="post-approve" data-id="${r.id}">อนุมัติ</button>` : ''}</div>`]))}`};
});
App.on('p-sch-filter', function (form) { this.go('post-schools', {f: formData(form)}); });
App.on('p-open', function (el) { this.pPref().school = el.dataset.id; this.pSave(); this.go('post-form'); });

App.pHead = function (sc, sub) {
  return `<div class="a4-head"><span class="a4-logo">TF</span><div><b>มูลนิธิทิสโก้ เพื่อการกุศล</b><span>ใบสมัครทุนการศึกษาทางไปรษณีย์ · ปีการศึกษา ${this.db.cycle.year}</span></div>
    <div class="cv-hs"><b>${esc(sc.name)}</b><span>${sub}</span></div></div>`;
};
/* ใบที่ 1: ใบสรุปใบสมัครของสถานศึกษา */
App.pCoverHtml = function (id) {
  const sc = this.schoolById[id];
  const b = this.P().batches[id] || {};
  const c = this.pCounts(id);
  const dots = '....................';
  const n = v => v ? `<b>${v}</b>` : '<span class="cv-zero">0</span>';
  return `<div class="paper a4 land cover">
    ${this.pHead(sc, 'ใบสรุป')}
    <h3>ใบสรุปใบสมัครของสถานศึกษา</h3>
    <div class="cv-school"><div class="cv-name">${esc(sc.name)}</div>
      <div>ที่อยู่ ${esc(sc.address || '')} ${esc(sc.subdistrict || '')} ${esc(sc.district)} จังหวัด${esc(sc.province)} ${esc(this.regionName(sc.region))} ${esc(sc.postcode || '')}</div></div>
    <div class="cv-body"><table class="cv-tbl"><thead><tr><th class="cv-ck"></th><th>ระดับ (ชั้นปีหน้า)</th><th class="r">ทุนใหม่ (ราย)</th><th class="r">ทุนต่อเนื่อง (ราย)</th><th class="r">รวม</th></tr></thead>
      <tbody>${c.rows.map(([g, t, r]) => `<tr><td class="cv-ck">${r.NEW + r.CONT ? '☑' : '☐'}</td><td>${t}${g === 'primary' ? ' <small>(ผจก. พิจารณาที่ใบสมัคร)</small>' : g === 'other' ? ' <small>(ระบุในหมายเหตุ)</small>' : g === 'wait' ? ' <small>(รอหลักฐานการย้ายสถานศึกษา)</small>' : ''}</td>
        <td class="r">${n(r.NEW)}</td><td class="r">${n(r.CONT)}</td><td class="r">${n(r.NEW + r.CONT)}</td></tr>`).join('')}
      <tr class="cv-total"><td></td><td>รวม</td><td class="r">${c.total.NEW}</td><td class="r">${c.total.CONT}</td><td class="r">${c.total.NEW + c.total.CONT}</td></tr></tbody></table>
    <div class="cv-lines">
      <div><span>หมายเหตุ</span><b>${esc(b.note) || dots}</b></div>
      <div><span>หนังสือนำส่ง</span><b>${esc(b.letter) || dots}</b></div>
      <div><span>คุณครูผู้ดูแลทุน</span><b>${esc(b.teacher_name) || dots}</b></div>
      <div><span>เบอร์โทร</span><b>${esc(b.teacher_phone) || dots}</b></div>
      <div><span>อีเมล</span><b>${esc(b.teacher_email) || dots}</b></div>
      <p class="foot">บันทึกโดย ${esc(this.pUser(b.by).name || '—')}${b.updated ? ' · ' + thDate(b.updated, true) : ''}</p></div></div>
  </div>`;
};
/* ใบที่ 2: รายชื่อที่บันทึกในระบบ — ต่อเนื่องก่อน แล้วทุนใหม่ แยกตามระดับชั้นปีหน้า แสดงข้อมูลที่บันทึกทุกช่อง */
/* ใบที่ 2: รายชื่อที่บันทึกในระบบ — 1 ตาราง / 1 แผ่น · ต่อเนื่องก่อน แล้วทุนใหม่ แยกตามระดับชั้นปีหน้า
   ทุกตารางใช้ช่องและความกว้างเดียวกัน (ความสูงตามข้อมูล) · หัวกระดาษบอกโรงเรียน / กลุ่ม เพื่อให้ตารางได้พื้นที่มากที่สุด */
/* ความกว้างช่อง (%) — ทุกแผ่นของประเภททุนเดียวกันเท่ากัน */
const P_LIST_COLS = {CONT: [6, 19, 12, 10, 33, 5, 5, 5, 5], NEW: [6, 19, 12, 6, 32, 25]};
const P_PER_SHEET = 12;   // คนต่อแผ่น (A4 แนวนอน · เว้นช่องลำดับให้ ผจก. วงผล)
App.pListHtml = function (id) {
  const sc = this.schoolById[id];
  const es = this.pEntriesOf(id);
  const eqName = k => k === 'none' ? 'ไม่มีเลย' : (EQUIP.find(x => x[0] === k) || [, k])[1];
  const lab = (list, k) => (list.find(x => x[0] === k) || [, '—'])[1];
  const groups = [];
  ['CONT', 'NEW'].forEach(t => P_LEVELS.forEach(([g, gt]) => {
    const l = es.filter(e => e.type === t && groupOfClass(e.next_class) === g).sort((a, b) => P_CLASSES.indexOf(a.next_class) - P_CLASSES.indexOf(b.next_class));
    if (l.length) groups.push([t, gt, l]);
  }));
  const DOC_SHORT = {cert: 'หนังสือ<br>รับรอง', bank: 'เดิน<br>บัญชี', expense: 'รายการ<br>ใช้จ่าย', receipt: 'ใบเสร็จ'};
  const head = t => '<th class="n">ลำดับ</th><th>เลขประจำตัวประชาชน<br>ชื่อ–นามสกุล</th><th>ระดับชั้น<br><small>ปีนี้ → ปีหน้า · สาขา</small></th>'
    + (t === 'CONT' ? '<th>เกรดเฉลี่ย<br><small>ก่อนรับทุน → ปีนี้</small></th><th>นำเงินทุนไปใช้จ่าย</th>' + P_DOCS.map(([k]) => `<th class="cv-dv">${DOC_SHORT[k]}</th>`).join('')
      : '<th>เกรด</th><th>สภาพครอบครัว</th><th>เครื่องใช้ในบ้าน · บ้าน · ที่ดินทำกิน</th>');
  const row = (e, i) => {
    const base = `<td class="n">${i + 1}</td><td><span class="cv-id">${esc(e.cid)}</span><br><b>${esc(pName(e))}</b></td>
      <td>${esc(e.cls)} → ${esc(e.next_class)}${e.faculty || e.pvs_type ? `<br><small>${esc(e.faculty || '')}${e.pvs_type ? ` (${PVS_TYPES.find(x => x[0] === e.pvs_type)[1]})` : ''}</small>` : ''}</td>`;
    if (e.type === 'CONT') return `<tr>${base}<td class="nw">${e.gpa_before ? `${esc(e.gpa_before)} → ` : ''}<b>${esc(e.gpa || '—')}</b></td><td>${esc(e.use_money || '—')}</td>
      ${P_DOCS.map(([k]) => `<td class="cv-ck2">${arr(e.docs).includes(k) ? '✓' : '<span class="no">✗</span>'}</td>`).join('')}</tr>`;
    return `<tr>${base}<td><b>${esc(e.gpa || '—')}</b></td><td>${esc(e.family || '—')}</td>
      <td><small>เครื่องใช้:</small> ${arr(e.equipment).map(eqName).join(', ') || '—'} · <small>บ้าน:</small> ${esc(lab(P_HOUSING, e.housing))} · <small>ที่ดิน:</small> ${esc(lab(P_LAND, e.land))}</td></tr>`;
  };
  const hd = (t, gt, n) => `<div class="a4-head cv-lhead"><span class="a4-logo">TF</span>
    <div><b>${esc(sc.name)} · จังหวัด${esc(sc.province)} · ${esc(this.regionName(sc.region))}</b></div>
    <div class="cv-hs">${t ? `<div class="cv-grp"><span class="cv-t cv-t-${t}">${TYPE[t]}</span><span class="cv-lv">${gt}</span></div><span class="cv-n">${n} ราย</span>` : ''}</div></div>`;
  const ft = (page, by) => `<div class="cv-foot"><span>${by ? `บันทึกโดย ${esc(by)}` : ''}</span><span>${page}</span></div>`;
  if (!groups.length) return `<div class="paper a4 land cover cv-list">${hd('', '', 0)}<p class="c">— ยังไม่มีรายชื่อที่บันทึก —</p></div>`;
  /* นับแผ่นแยกตามกลุ่ม เช่น ทุนต่อเนื่อง ม.ปลาย แผ่นที่ 1 / 1 */
  return groups.map(([t, gt, l]) => {
    const pages = [];
    for (let i = 0; i < l.length; i += P_PER_SHEET) pages.push(l.slice(i, i + P_PER_SHEET));
    return pages.map((chunk, pi) => {
      const by = this.pUser(this.pOwner(id)).name;
      return `<div class="paper a4 land cover cv-list">
      ${hd(t, gt, l.length)}
      <table class="cv-ltbl"><colgroup>${P_LIST_COLS[t].map(w => `<col style="width:${w}%">`).join('')}</colgroup>
        <thead><tr>${head(t)}</tr></thead><tbody>${chunk.map((e, i) => row(e, pi * P_PER_SHEET + i)).join('')}</tbody></table>
      ${ft(`แผ่นที่ ${pi + 1} / ${pages.length}`, by)}</div>`;
    }).join('');
  }).join('');
};
App.views['post-cover'] = pNeedLogin(function (p) {
  const db = this.P();
  const pr = this.session.pPrint || {sum: true, list: true};
  if (p.id !== 'all' && !this.pSees(p.id)) return this.views['post-schools'].call(this, {});
  const ids = p.id === 'all'
    ? Object.keys(db.batches).filter(id => this.schoolById[id] && this.pStatus(id) !== 'doing' && this.pSees(id))
      .sort((a, b) => this.schoolById[a].province.localeCompare(this.schoolById[b].province, 'th') || this.schoolById[a].name.localeCompare(this.schoolById[b].name, 'th'))
    : [p.id];
  const one = p.id !== 'all';
  const st = one ? this.pStatus(p.id) : null;
  return {nav: this.pNav(), html: `<div class="no-print">${this.pRoleBar()}</div>
    <div class="page-head no-print"><div><h1>ใบปะหน้า${one ? '' : ' — ทุกโรงเรียน'}</h1><p class="sub">${one ? esc(this.schoolName(p.id)) : `${ids.length} โรงเรียน (1 โรงเรียน / หน้า)`}</p></div>
      <div class="row"><button class="btn" data-go="post-schools">กลับ</button>
        ${one && this.session.pRole !== 'manager' && st === 'doing' ? `<button class="btn" data-action="p-open" data-id="${p.id}">บันทึกต่อ</button>` : ''}
        <button class="btn primary" data-action="p-print" data-id="${esc(p.id)}">${icon('print')} พิมพ์</button></div></div>
    ${one && st === 'doing' ? '<div class="note warn no-print">โรงเรียนนี้ยังบันทึกไม่เสร็จ ตัวเลขอาจยังไม่ครบ</div>' : ''}
    <div class="row no-print"><span class="small muted">พิมพ์ (A4 แนวนอน):</span>
      <label class="check"><input type="checkbox" data-onchange="p-printpart" data-k="sum" ${pr.sum ? 'checked' : ''}> <span>ใบสรุปใบสมัครของสถานศึกษา</span></label>
      <label class="check"><input type="checkbox" data-onchange="p-printpart" data-k="list" ${pr.list ? 'checked' : ''}> <span>รายชื่อที่บันทึกในระบบ</span></label></div>
    <div class="a4-wrap cover-wrap">${ids.map(id => (pr.sum ? this.pCoverHtml(id) : '') + (pr.list ? this.pListHtml(id) : '')).join('') || '<div class="empty">เลือกอย่างน้อย 1 ใบ</div>'}</div>`, after: pFitA4};
});
function pFitA4() {
  document.querySelectorAll('.cover-wrap .paper.a4').forEach(el => {
    el.style.zoom = 1;
    el.style.zoom = Math.min(1, el.parentElement.clientWidth / el.offsetWidth);
  });
}
window.addEventListener('resize', () => { if (App.view && App.view.name === 'post-cover') pFitA4(); });
App.on('p-printpart', function (el) {
  this.session.pPrint = {...(this.session.pPrint || {sum: true, list: true}), [el.dataset.k]: el.checked};
  this.render();
});
App.on('p-print', function (el) {
  const db = this.P();
  const ids = el.dataset.id === 'all' ? Object.keys(db.batches).filter(id => this.pStatus(id) !== 'doing' && this.pSees(id)) : [el.dataset.id];
  ids.forEach(id => { const b = db.batches[id]; if (b && b.done && !b.printed) b.printed = nowIso(); });
  this.pSave();
  document.querySelectorAll('.cover-wrap .paper.a4').forEach(x => (x.style.zoom = 1));
  window.print();
  pFitA4();
});

/* ---------- ผจก. อนุมัติทีละคน ทีละโรงเรียน ---------- */
App.views['post-approve'] = pNeedLogin(function (p) {
  const db = this.P();
  const can = this.session.pRole === 'manager';
  if (!p.id) {
    const ids = [...new Set(db.entries.map(e => e.school))].filter(id => this.schoolById[id])
      .sort((a, b) => this.schoolById[a].province.localeCompare(this.schoolById[b].province, 'th') || this.schoolById[a].name.localeCompare(this.schoolById[b].name, 'th'));
    const rows = ids.map(id => { const es = this.pEntriesOf(id); return {id, n: es.length, wait: es.filter(e => !e.decision).length, st: this.pStatus(id)}; });
    return {nav: this.pNav(), html: `${this.pRoleBar()}
      <div class="page-head"><div><h1>อนุมัติทุน (ทางไปรษณีย์)</h1><p class="sub">เลือกโรงเรียน แล้วพิจารณาทีละคน${can ? '' : ' · แอดมินดูได้อย่างเดียว'}</p></div></div>
      ${tbl([{t: '#'}, {t: 'โรงเรียน'}, {t: 'บันทึกแล้ว', r: 1}, {t: 'รอพิจารณา', r: 1}, {t: 'สถานะ'}, {t: ''}],
        rows.map((r, i) => [i + 1, `<b>${esc(this.schoolName(r.id))}</b><br><span class="small muted">จ.${esc(this.schoolById[r.id].province)}</span>`, r.n,
          r.wait ? `<b>${r.wait}</b>` : '0', pBadge(r.st), `<button class="btn sm ${r.wait ? 'primary' : ''}" data-go="post-approve" data-id="${r.id}">${r.wait ? 'พิจารณา' : 'ดู'}</button>`]))}`};
  }
  const sc = this.schoolById[p.id];
  const b = db.batches[p.id] || {};
  const es = this.pEntriesOf(p.id);
  const cnt = k => es.filter(e => (e.decision || {}).result === k).length;
  const wait = es.filter(e => !e.decision).length;
  const eqName = k => k === 'none' ? 'ไม่มีเลย' : (EQUIP.find(x => x[0] === k) || [, k])[1];
  const card = (e, i) => {
    const r = this.pRate(e);
    const d = e.decision;
    const docsOk = e.type === 'CONT' ? P_DOCS.map(([k, t]) => `<span class="p-doc ${arr(e.docs).includes(k) ? 'ok' : 'no'}">${arr(e.docs).includes(k) ? '✓' : '✗'} ${t}</span>`).join('') : '';
    return `<article class="card pa-card ${d ? 'pa-' + d.result : ''}" id="pa-${e.id}">
      <div class="row between"><div><span class="muted small">${i + 1}. ${TYPE[e.type]}${e.from_db ? ' · ดึงจากฐานข้อมูลปีก่อน' : ''}</span><h3>${esc(pName(e))}</h3>
        <span class="small muted">เลขบัตร ${esc(e.cid)}</span></div>${d ? `<span class="badge t-${DECISION[d.result].tone}">${DECISION[d.result].label}</span>` : '<span class="badge t-violet">รอพิจารณา</span>'}</div>
      <div class="pa-grid">
        <div><span>ชั้น</span><b>${esc(e.cls)} → ${esc(e.next_class)}</b></div>
        ${e.faculty ? `<div><span>สาขา</span><b>${esc(e.faculty)}${e.pvs_type ? ` (${PVS_TYPES.find(x => x[0] === e.pvs_type)[1]})` : ''}</b></div>` : ''}
        <div><span>เกรดเฉลี่ย</span><b>${e.gpa_before ? `${esc(e.gpa_before)} → ` : ''}${esc(e.gpa || '—')}</b>${e.gpa_before ? '<small class="muted">ก่อนรับทุน → ปีนี้</small>' : ''}</div>
        <div><span>เงินทุน</span><b>${rateBadge(r)}</b></div>
        ${e.type === 'NEW' ? `<div class="wide"><span>สภาพครอบครัว</span><b>${esc(e.family || '—')}</b></div>
          <div class="wide"><span>เครื่องใช้ในบ้าน</span><b>${arr(e.equipment).map(eqName).join(' · ') || '—'}</b></div>
          <div><span>บ้านที่อยู่อาศัย</span><b>${esc((P_HOUSING.find(x => x[0] === e.housing) || [, '—'])[1])}</b></div>
          <div><span>ที่ดินทำกิน</span><b>${esc((P_LAND.find(x => x[0] === e.land) || [, '—'])[1])}</b></div>`
        : `<div class="wide"><span>นำเงินทุนไปใช้</span><b>${esc(e.use_money || '—')}</b></div><div class="wide"><span>เอกสารแนบ</span><b class="p-docs">${docsOk}</b></div>`}
        ${e.note ? `<div class="wide"><span>หมายเหตุ</span><b>${esc(e.note)}</b></div>` : ''}
      </div>
      ${can ? `<div class="row end">${d ? `<span class="small muted">โดย ${esc(this.pUser(d.by).name)} · ${thDate(d.at, true)}</span><button class="btn sm ghost" data-action="p-decide" data-id="${e.id}" data-r="">ยกเลิกผล</button>` : ''}
        <button class="btn ${d && d.result === 'rejected' ? 'danger' : ''}" data-action="p-decide" data-id="${e.id}" data-r="rejected" aria-pressed="${!!d && d.result === 'rejected'}">ไม่อนุมัติ</button>
        <button class="btn ${d && d.result === 'approved' ? 'primary' : ''}" data-action="p-decide" data-id="${e.id}" data-r="approved" aria-pressed="${!!d && d.result === 'approved'}">อนุมัติ</button></div>`
      : d ? `<p class="small muted">โดย ${esc(this.pUser(d.by).name)} · ${thDate(d.at, true)}</p>` : ''}
    </article>`;
  };
  const amt = es.filter(e => (e.decision || {}).result === 'approved').reduce((a, e) => a + this.pRate(e).amount, 0);
  const ids = [...new Set(db.entries.filter(e => !e.decision).map(e => e.school))].filter(x => x !== p.id);
  return {nav: this.pNav(), html: `${this.pRoleBar()}
    <div class="page-head"><div><h1>${esc(sc.name)}</h1><p class="sub">จ.${esc(sc.province)} · ${esc(this.regionName(sc.region))} · ดูข้อมูลในระบบประกอบรูปภาพในใบสมัคร</p></div>
      <div class="row"><button class="btn" data-go="post-approve">รายชื่อโรงเรียน</button><button class="btn" data-go="post-cover" data-id="${p.id}">${icon('print')} ใบปะหน้า</button></div></div>
    <div class="stats"><div class="stat"><span>รอพิจารณา</span><b>${wait}</b></div><div class="stat"><span>อนุมัติ</span><b>${cnt('approved')}</b><small>${baht(amt)}</small></div>
      <div class="stat"><span>ไม่อนุมัติ</span><b>${cnt('rejected')}</b></div></div>
    ${['prim_new', 'prim_cont', 'other_new', 'other_cont', 'wait_new', 'wait_cont'].some(k => Number(b[k])) ? `<div class="note info">
      ประถม ${(Number(b.prim_new) || 0) + (Number(b.prim_cont) || 0)} ราย — พิจารณาที่ใบสมัครกระดาษ · อื่น ๆ ${(Number(b.other_new) || 0) + (Number(b.other_cont) || 0)} ราย · รอฟังผล ${(Number(b.wait_new) || 0) + (Number(b.wait_cont) || 0)} ราย — รอหลักฐานการย้ายสถานศึกษา</div>` : ''}
    <div class="stack">${es.map(card).join('') || '<div class="empty">ยังไม่มีรายชื่อ</div>'}</div>
    ${can && !wait && ids.length ? `<div class="row end"><button class="btn primary" data-go="post-approve" data-id="${ids[0]}">โรงเรียนถัดไป: ${esc(this.schoolName(ids[0]))}</button></div>` : ''}`,
    after() { if (p.focus) { const el = document.getElementById('pa-' + p.focus); if (el) el.scrollIntoView({block: 'center'}); } }};
});
App.on('p-decide', function (el) {
  if (this.session.pRole !== 'manager') return;
  const e = this.P().entries.find(x => x.id === el.dataset.id);
  e.decision = el.dataset.r ? {result: el.dataset.r, by: this.session.pUser, at: nowIso()} : null;
  this.pSave();
  const y = window.scrollY;
  this.render();
  window.scrollTo({top: y});
});

/* ---------- หน้า 3: ผลงานเจ้าหน้าที่ ---------- */
App.views['post-work'] = pNeedLogin(function (p) {
  const db = this.P();
  const me = this.session.pRole === 'clerk' ? this.session.pUser : null;
  const by = me || (p.f || {}).by || '';
  const users = db.users.filter(u => u.role !== 'manager' && (!by || u.username === by));
  const sum = users.map(u => {
    const es = db.entries.filter(e => e.by === u.username);
    const schools = Object.entries(db.batches).filter(([, b]) => b.by === u.username).map(([id]) => id);
    const last = es.map(e => e.at).concat(schools.map(id => db.batches[id].updated)).sort().pop();
    return {u, es, schools, done: schools.filter(id => this.pStatus(id) !== 'doing').length, last};
  }).filter(r => r.es.length || r.schools.length || me);
  const list = Object.entries(db.batches).filter(([id, b]) => this.schoolById[id] && (!by || b.by === by))
    .sort((a, b) => (b[1].updated || '').localeCompare(a[1].updated || ''));
  return {nav: this.pNav(), html: `${this.pRoleBar()}
    <div class="page-head"><div><h1>${me ? 'ผลงานของฉัน' : 'ผลงานเจ้าหน้าที่'}</h1><p class="sub">ทำสรุปโรงเรียนไหนไปแล้ว กี่คน เมื่อไหร่</p></div></div>
    ${me ? '' : `<form class="card row" data-submit="p-work-filter">${field('by', 'เจ้าหน้าที่', select('by', db.users.filter(u => u.role !== 'manager').map(u => [u.username, u.name]), by, 'ทุกคน', 'data-onchange="p-work-sel"'))}</form>`}
    ${tbl([{t: 'เจ้าหน้าที่'}, {t: 'โรงเรียน', r: 1}, {t: 'บันทึกเสร็จ', r: 1}, {t: 'ทุนใหม่', r: 1}, {t: 'ทุนต่อเนื่อง', r: 1}, {t: 'ล่าสุด'}],
      sum.map(r => [`<b>${esc(r.u.name)}</b><br><span class="small muted">${esc(r.u.username)}</span>`, r.schools.length, r.done,
        r.es.filter(e => e.type === 'NEW').length, r.es.filter(e => e.type === 'CONT').length, r.last ? thDate(r.last, true) : '—']))}
    <h2>รายโรงเรียน</h2>
    ${tbl([{t: '#'}, {t: 'โรงเรียน'}, {t: 'ผู้บันทึก'}, {t: 'บันทึก (ราย)', r: 1}, {t: 'สถานะ'}, {t: 'อัปเดตล่าสุด'}, {t: ''}],
      list.map(([id, b], i) => [i + 1, `<b>${esc(this.schoolName(id))}</b><br><span class="small muted">จ.${esc(this.schoolById[id].province)}</span>`,
        esc(this.pUser(b.by).name), this.pEntriesOf(id).length, pBadge(this.pStatus(id)), b.updated ? thDate(b.updated, true) : '—',
        `<button class="btn sm" data-go="post-cover" data-id="${id}">ใบปะหน้า</button>`]))}`};
});
App.on('p-work-sel', function (el) { this.go('post-work', {f: {by: el.value}}); });
App.on('p-work-filter', function (form) { this.go('post-work', {f: formData(form)}); });

/* ---------- แอดมิน: รายชื่อผู้ได้รับทุนปีล่าสุด (ใช้เทียบทุนใหม่ / ต่อเนื่อง) ---------- */
App.views['post-recipients'] = pNeedLogin(function (p) {
  if (this.session.pRole !== 'admin') return this.views['post-work'].call(this, {});
  const db = this.P();
  const f = p.f || {};
  const year = this.db.cycle.history_year;
  const stateOf = r => {
    const e = db.entries.find(x => x.cid === r.cid);
    if (e) return e.type === 'CONT' ? ['postal', 'ส่งทางไปรษณีย์แล้ว', 'ok'] : ['wrong', 'บันทึกเป็นทุนใหม่ (ควรเป็นต่อเนื่อง)', 'bad'];
    const o = this.db.students.find(x => x.citizen_id === r.cid);
    if (o) return ['online', 'สมัครออนไลน์แล้ว', 'info'];
    return ['none', 'ยังไม่ส่ง', 'idle'];
  };
  let rows = db.recipients.map(r => ({r, sc: this.schoolById[r.school] || {}, st: stateOf(r)}));
  const all = rows.length;
  const q = (f.q || '').replace(/\s+/g, ' ').trim();
  if (q) rows = rows.filter(x => x.r.cid.includes(q.replace(/\D/g, '') || '#') || pName(x.r).includes(q) || (x.r.first + ' ' + x.r.last).includes(q));
  if (f.school) rows = rows.filter(x => (x.sc.name || '').includes(f.school) || (x.sc.province || '').includes(f.school));
  if (f.g) rows = rows.filter(x => groupOfClass(x.r.cls) === f.g);
  if (f.st) rows = rows.filter(x => x.st[0] === f.st);
  const cnt = k => db.recipients.filter(r => stateOf(r)[0] === k).length;
  const shown = rows.slice(0, 100);
  return {nav: this.pNav(), html: `${this.pRoleBar()}
    <div class="page-head"><div><h1>ผู้ได้รับทุนปี ${year}</h1><p class="sub">ใช้เทียบว่าเป็นทุนใหม่หรือทุนต่อเนื่อง · ทุนต่อเนื่องพิมพ์เลข 13 หลักแล้วดึงชื่อจากรายชื่อนี้</p></div>
      <button class="btn" data-action="p-rec-import">นำเข้าจาก Excel</button></div>
    <div class="stats"><div class="stat"><span>ผู้ได้รับทุนปี ${year}</span><b>${all}</b><small>คน</small></div>
      <div class="stat"><span>ส่งทางไปรษณีย์แล้ว</span><b>${cnt('postal')}</b></div><div class="stat"><span>สมัครออนไลน์แล้ว</span><b>${cnt('online')}</b></div>
      <div class="stat"><span>ยังไม่ส่ง</span><b>${cnt('none')}</b></div></div>
    <form class="card filters pf-rfilters" data-submit="p-rec-filter">
      ${field('q', 'เลข 13 หลัก / ชื่อ–นามสกุล', input('q', f.q, 'placeholder="พิมพ์บางส่วนก็ได้"'))}
      ${field('school', 'โรงเรียน / จังหวัด', input('school', f.school))}
      ${field('g', 'ระดับ (ชั้นที่ได้รับทุน)', select('g', EDU_GROUPS.map(([k, t]) => [k, GROUP_SHORT[k]]), f.g, 'ทุกระดับ'))}
      ${field('st', 'ปีนี้', select('st', [['postal', 'ส่งทางไปรษณีย์แล้ว'], ['online', 'สมัครออนไลน์แล้ว'], ['wrong', 'บันทึกเป็นทุนใหม่'], ['none', 'ยังไม่ส่ง']], f.st, 'ทั้งหมด'))}
      <div class="field"><span class="label">&nbsp;</span><button class="btn primary" type="submit">ค้นหา</button></div></form>
    <p class="small muted">พบ ${rows.length} คน${rows.length > shown.length ? ` · แสดง ${shown.length} คนแรก` : ''}</p>
    ${tbl([{t: '#'}, {t: 'เลขประจำตัวประชาชน / ชื่อ'}, {t: 'โรงเรียน'}, {t: 'ชั้นที่ได้รับทุน'}, {t: 'เกรดตอนได้รับทุน', r: 1}, {t: 'ปีนี้'}],
      shown.map((x, i) => [i + 1, `<span class="small muted">${esc(x.r.cid)}</span><br><b>${esc(pName(x.r))}</b>`,
        `${esc(x.sc.name || '—')}<br><span class="small muted">จ.${esc(x.sc.province || '')}</span>`,
        `${esc(x.r.cls)}${x.r.faculty ? `<br><span class="small muted">${esc(x.r.faculty)}</span>` : ''}`, esc(x.r.gpa || '—'),
        `<span class="badge t-${x.st[2]}">${x.st[1]}</span>`]))}`,
    after() { const q = document.getElementById('q'); if (q && f.q != null) q.focus(); }};
});
App.on('p-rec-filter', function (form) { this.go('post-recipients', {f: formData(form)}); });
App.on('p-rec-import', function () { this.toast('ต้นแบบ: ระบบจริงนำเข้าไฟล์ Excel (เลข 13 หลัก · ชื่อ · โรงเรียน · ชั้น · สาขา · เกรด) ได้ที่นี่'); });

/* ---------- แอดมิน: ผู้ใช้งาน ---------- */
App.views['post-users'] = pNeedLogin(function (p) {
  if (this.session.pRole !== 'admin') return this.views['post-work'].call(this, {});
  const db = this.P();
  const e = p.errors || {}, v = p.values || {};
  return {nav: this.pNav(), html: `${this.pRoleBar()}
    <div class="page-head"><div><h1>ผู้ใช้งาน (ทางไปรษณีย์)</h1><p class="sub">บัญชีแยกจากระบบเจ้าหน้าที่เดิม</p></div></div>
    ${tbl([{t: 'Username'}, {t: 'ชื่อ'}, {t: 'บทบาท'}, {t: 'สถานะ'}, {t: ''}],
      db.users.map(u => [esc(u.username), esc(u.name), P_ROLE[u.role][0], u.active !== false ? '<span class="badge t-ok">ใช้งาน</span>' : '<span class="badge t-idle">ปิดใช้งาน</span>',
        u.username === this.session.pUser ? '<span class="small muted">บัญชีของคุณ</span>'
          : `<button class="btn sm" data-action="p-user-toggle" data-u="${u.username}">${u.active !== false ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button>`]))}
    <form class="card stack" data-submit="p-user-add" novalidate><h3>เพิ่มผู้ใช้</h3>
      <div class="grid-3">${field('nu', 'Username', input('nu', v.nu, 'autocapitalize="off"'), {req: 1, err: e.nu})}${field('nn', 'ชื่อ', input('nn', v.nn), {req: 1, err: e.nn})}
        ${field('nr', 'บทบาท', select('nr', Object.entries(P_ROLE).map(([k, [t]]) => [k, t]), v.nr || 'clerk'))}</div>
      <div class="row end"><button class="btn primary" type="submit">เพิ่มผู้ใช้</button></div></form>`};
});
App.on('p-user-toggle', function (el) {
  const u = this.P().users.find(x => x.username === el.dataset.u);
  u.active = u.active === false;
  this.pSave();
  this.render();
});
App.on('p-user-add', function (form) {
  const v = formData(form);
  const db = this.P();
  const e = {};
  const nu = (v.nu || '').toLowerCase();
  if (!/^[a-z0-9_.]{3,}$/.test(nu)) e.nu = 'ใช้ a-z 0-9 อย่างน้อย 3 ตัว';
  else if (db.users.some(u => u.username === nu)) e.nu = 'มี Username นี้แล้ว';
  if (!v.nn) e.nn = 'กรุณากรอกชื่อ';
  if (Object.keys(e).length) { this.go('post-users', {values: v, errors: e}); return; }
  db.users.push({username: nu, name: v.nn, role: v.nr || 'clerk', active: true});
  this.pSave();
  this.toast('เพิ่มผู้ใช้แล้ว');
  this.go('post-users');
});
