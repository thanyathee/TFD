/* บทบาทเจ้าหน้าที่มูลนิธิฯ (ตาม Admin v14): Dashboard, รอบรับสมัคร, สถานศึกษา/ครู, ใบสมัคร, ย้ายสถานศึกษา, รายงาน/Export, PDPA */
'use strict';

const STAFF = [
  {username: 'reviewer01', name: 'จนท. 01', role: 'reviewer'},
  {username: 'reviewer02', name: 'จนท. 02', role: 'reviewer'},
  {username: 'manager01', name: 'ผู้จัดการทุน', role: 'manager'},
  {username: 'admin01', name: 'ผู้ดูแลระบบ', role: 'admin'},
];
const ROLE = {
  reviewer: ['จนท.รีวิว', 'ตรวจข้อมูล เขียนคอมเมนต์ แยกไม่เข้าเกณฑ์ แยกรอบ 1/2 และส่งต่อให้ผู้จัดการ'],
  manager: ['ผจก.อนุมัติทุน', 'เห็นข้อมูลนักเรียนทั้งหมด ความเห็นครู และความเห็นของ จนท.รีวิว ก่อนพิจารณาผลและกำหนดจำนวนเงินทุน'],
  admin: ['แอดมินระบบ', 'ดูข้อมูลทั้งหมดและสถานะทุกขั้นตอน รวมถึง Audit Trail'],
};
const WORK = [['all', 'ทั้งหมด'], ['draft', 'นักเรียนกำลังกรอกข้อมูล'], ['waiting_teacher', 'รอครูดำเนินการ'],
  ['waiting_transfer', 'รอหลักฐานการย้ายสถานศึกษา'], ['waiting_reviewer', 'รอเจ้าหน้าที่ดำเนินการ'], ['waiting_manager', 'รอผู้จัดการพิจารณา'], ['manager_done', 'ดำเนินการเรียบร้อย']];
const WORK_TEST = {
  all: () => true, draft: s => ['draft', 'returned_to_student'].includes(s.status), waiting_teacher: s => s.status === 'waiting_teacher', waiting_transfer: s => s.status === 'waiting_transfer_proof',
  waiting_reviewer: s => ['waiting_staff', 'need_more_info'].includes(s.status), waiting_manager: s => s.status === 'waiting_manager',
  manager_done: s => s.status === 'decided',
};
const PIPE = ['draft', 'waiting_teacher', 'returned_to_student', 'waiting_transfer_proof', 'waiting_staff', 'need_more_info', 'waiting_manager', 'decided'];
const TONE_COLOR = {idle: 'var(--idle)', warn: 'var(--warn)', bad: 'var(--bad)', info: 'var(--info)', violet: 'var(--violet)', ok: 'var(--ok)'};
const ACTIVITY = [
  ['started', 'นักเรียนเริ่มกรอกใบสมัคร', k => k === 'started'],
  ['submitted', 'นักเรียนส่งข้อมูลให้ครู', k => k === 'submitted'],
  ['teacher_sent', 'ครูส่งข้อมูลให้มูลนิธิฯ', k => k === 'teacher_sent'],
  ['reviewer_done', 'เจ้าหน้าที่ดำเนินการเรียบร้อย', k => k === 'reviewer_forward' || k === 'reviewer_ineligible'],
  ['forward', 'ส่งต่อให้ผู้จัดการพิจารณา', k => k === 'reviewer_forward'],
  ['manager_done', 'ผู้จัดการดำเนินการเรียบร้อย', k => /^manager_/.test(k)],
];
const SCHOOL_TYPES = [['school', 'โรงเรียน'], ['college', 'วิทยาลัย'], ['university', 'มหาวิทยาลัย'], ['other', 'อื่น ๆ']];

/* กู้ยืม กยศ./กรอ. (หน้าใบสมัคร): แยกผู้ขอทุนกู้เอง กับ พี่น้องกู้ */
function loanKind(s) {
  if (s.loan !== 'yes') return 'no';
  return (s.loans || []).some(x => x.who === 'self') ? 'self' : 'sibling';
}
function loanLabel(s) {
  const k = loanKind(s);
  if (k === 'no') return '';
  const funds = [...new Set((s.loans || []).filter(x => k === 'self' ? x.who === 'self' : true).map(x => x.fund || 'กยศ.'))].join('/') || 'กยศ.';
  return k === 'self' ? ` · <b class="loan-self">ผู้ขอทุนกู้ ${esc(funds)}</b>` : ` · พี่น้องกู้ ${esc(funds)}`;
}
App.staffNav = function () {
  return [['staff-dash', 'Dashboard'],
    ['staff-apps', 'ใบสมัคร', ['staff-app']], ['staff-transfer', 'ย้ายสถานศึกษา']]
    /* สถานศึกษา/ครู, รอบรับสมัคร, รายงาน/Export, PDPA และผู้ใช้งาน: เฉพาะแอดมินระบบ */
    .concat(this.session.staffRole === 'admin' ? [['staff-schools', 'สถานศึกษา/ครู', ['staff-school']], ['staff-cycle', 'รอบรับสมัคร'], ['staff-announce', 'ประกาศรายชื่อ'], ['staff-reports', 'รายงาน/Export'], ['staff-pdpa', 'PDPA'], ['staff-users', 'ผู้ใช้งาน', ['staff-user']]] : []);
};
/* สลับบทบาทสำหรับทดลอง (เหมือนปุ่มบทบาทใน v14) */
App.roleBar = function () {
  const r = this.session.staffRole;
  return `<div class="row between no-print"><div class="seg" role="group" aria-label="บทบาท">${Object.entries(ROLE).map(([k, [t]]) =>
    `<button type="button" data-action="staff-role" data-role="${k}" aria-pressed="${k === r}">${t}</button>`).join('')}</div>
    <span class="small muted">กำลังใช้งาน: ${ROLE[r][0]}</span></div>`;
};
App.staffList = function () { return this.db.staffUsers || STAFF.map(u => ({...u, active: true})); };
App.on('staff-role', function (el) {
  const u = this.staffList().find(s => s.role === el.dataset.role && s.active !== false) || STAFF.find(s => s.role === el.dataset.role);
  Object.assign(this.session, {staff: u.username, staffRole: u.role, name: u.name, who: `${u.name} · ${ROLE[u.role][0]}`});
  if (u.role !== 'admin' && (['staff-schools', 'staff-cycle', 'staff-announce', 'staff-reports', 'staff-pdpa', 'staff-users', 'staff-user'].includes(this.view.name) || (this.view.name === 'staff-school' && !this.view.params.back))) { this.go('staff-dash'); return; }
  this.render();
});

App.views['staff-entry'] = function (p) {
  this.session = {role: null};
  const v = p.values || {};
  const e = p.errors || {};
  return {html: `
    <div class="page-head"><div><h1>เข้าสู่ระบบเจ้าหน้าที่มูลนิธิฯ</h1><p class="sub">ระบบสำนักงานมูลนิธิทิสโก้ เพื่อการกุศล</p></div></div>
    <div class="split">
      <form class="card" data-submit="staff-login" novalidate>
        ${field('username', 'Username', input('username', v.username, 'autocomplete="username" autocapitalize="off"'), {req: 1, err: e.username})}
        ${field('password', 'Password', input('password', v.password, 'type="password" autocomplete="current-password"'), {req: 1, err: e.password})}
        <div class="row end"><button class="btn primary" type="submit">เข้าสู่ระบบ</button></div>
      </form>
      <aside class="card"><h3>บัญชีทดลอง</h3><p class="small muted">Password ทุกบัญชี <b>Demo@1234</b> · สลับบทบาทได้ภายในระบบ</p>
        ${this.staffList().filter(s => s.active !== false).map(s => `<button class="btn" data-action="staff-sample" data-u="${s.username}">${s.username} · ${ROLE[s.role][0]}</button>`).join('')}</aside>
    </div>`, after: focusFirstError};
};
App.on('rv-sheet', function () { document.body.classList.toggle('rv-open'); });
App.on('staff-sample', function (el) { this.go('staff-entry', {values: {username: el.dataset.u, password: 'Demo@1234'}}); });
App.on('staff-login', function (form) {
  const v = formData(form);
  const u = this.staffList().find(s => s.username === (v.username || '').toLowerCase());
  const e = {};
  if (!u) e.username = v.username ? 'ไม่พบ Username นี้' : 'กรุณากรอก Username';
  else if (u.active === false) e.username = 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ';
  if (v.password !== (u && u.password || 'Demo@1234')) e.password = v.password ? 'Password ไม่ถูกต้อง' : 'กรุณากรอก Password';
  if (Object.keys(e).length) { this.go('staff-entry', {values: {username: v.username}, errors: e}); return; }
  u.last_login = nowIso();
  this.save();
  this.session = {role: 'staff', staff: u.username, staffRole: u.role, name: u.name, who: `${u.name} · ${ROLE[u.role][0]}`};
  this.go('staff-dash');
});

/* ---------- Dashboard ---------- */
App.allEvents = function (list) {
  const out = [];
  list.forEach(s => (s.history || []).forEach(h => { if (h.kind) out.push({...h, code: s.code}); }));
  return out;
};
App.views['staff-dash'] = function (p) {
  const f = {round: p.round || '', region: p.region || '', province: p.province || '', reviewer: p.reviewer || ''};
  const list = this.db.students.filter(s => {
    const sc = this.schoolById[s.school] || {};
    return (!f.round || String(s.round) === f.round) && (!f.region || sc.region === f.region) && (!f.province || sc.province === f.province)
      && (!f.reviewer || (s.staff_review && s.staff_review.reviewer === f.reviewer));
  });
  const events = this.allEvents(list);
  const ref = events.reduce((m, e) => e.at > m ? e.at : m, this.db.cycle.open);
  const refDay = ref.slice(0, 10);
  const period = p.period || 'today';
  const from = {today: refDay, week: shiftDay(refDay, -6), month: shiftDay(refDay, -29), all: this.db.cycle.open}[period];
  const inP = events.filter(e => e.at.slice(0, 10) >= from && e.at.slice(0, 10) <= refDay);
  const cnt = test => inP.filter(e => test(e.kind));
  const act = ACTIVITY.map(([k, t, test]) => [k, t, cnt(test)]);
  const dec = r => inP.filter(e => r === 'ineligible' ? e.kind === 'reviewer_ineligible' : e.kind === 'manager_' + r).length;
  const backlog = [['draft', 'นักเรียนกำลังกรอกข้อมูล'], ['waiting_teacher', 'รอครูดำเนินการ'], ['waiting_reviewer', 'รอเจ้าหน้าที่ดำเนินการ'], ['waiting_manager', 'รอผู้จัดการพิจารณา']];
  const provs = f.region ? this.provincesOf(f.region) : [];
  const pl = {today: `วันนี้ ${thDate(refDay)}`, week: '7 วันล่าสุด', month: '30 วันล่าสุด', all: 'ตลอดรอบทุน'}[period];
  const done = act.find(a => a[0] === 'reviewer_done')[2];
  return {nav: this.staffNav(), html: `
    ${this.roleBar()}
    <div class="page-head"><div><h1>Dashboard — ภาพรวมทุนการศึกษา ปี ${this.db.cycle.year}</h1>
      <p class="sub">ติดตามสถานะปัจจุบัน งานที่ดำเนินการในแต่ละวัน ผลการพิจารณา และแนวโน้มตลอดรอบทุน</p></div></div>
    <form class="card" data-submit="dash-filter" novalidate><div class="grid-4">
      ${field('d_year', 'ปีทุนการศึกษา', select('d_year', [String(this.db.cycle.year)], String(this.db.cycle.year)))}
      ${field('d_round', 'รอบพิจารณา', select('d_round', [['1', 'รอบ 1'], ['2', 'รอบ 2']], f.round, 'ทั้งหมด', 'data-onchange="dash-filter-auto"'))}
      ${field('d_region', 'ภาค', select('d_region', this.data.geo.regions.map(r => [r.code, r.name]), f.region, 'ทั่วประเทศ', 'data-onchange="dash-filter-auto"'))}
      ${field('d_province', 'จังหวัด', select('d_province', provs, f.province, 'ทั้งหมด', `data-onchange="dash-filter-auto" ${f.region ? '' : 'disabled'}`))}
      ${field('d_reviewer', 'เจ้าหน้าที่', select('d_reviewer', ['จนท. 01', 'จนท. 02'], f.reviewer, 'ทั้งหมด', 'data-onchange="dash-filter-auto"'))}
    </div></form>
    <div class="stats">
      <div class="stat"><span>ผู้สมัครทั้งหมด ปี ${this.db.cycle.year}</span><b>${list.length.toLocaleString('th-TH')}</b>
        <small>ทุนใหม่ ${list.filter(s => s.type === 'NEW').length} | ทุนต่อเนื่อง ${list.filter(s => s.type === 'CONT').length}</small></div>
    </div>
    <section class="stack"><h3>สถานะปัจจุบัน — งานคงค้าง</h3><div class="stats">${backlog.map(([k, t]) =>
      `<button class="stat" data-go="staff-apps" data-work="${k}"><span>${t}</span><b>${list.filter(WORK_TEST[k]).length}</b><small>กดเพื่อดูรายชื่อ</small></button>`).join('')}</div></section>
    <div class="grid-2">
      <section class="card"><div class="card-head"><div><h3>การดำเนินงานในช่วงเวลาที่เลือก</h3><span class="sub">${pl}</span></div></div>
        <div class="seg">${[['today', 'วันนี้'], ['week', '7 วัน'], ['month', '30 วัน'], ['all', 'ทั้งรอบ']].map(([k, t]) =>
          `<button type="button" data-action="dash-period" data-period="${k}" aria-pressed="${k === period}">${t}</button>`).join('')}</div>
        ${tbl([{t: 'ขั้นตอนที่ดำเนินการ'}, {t: 'จำนวน', r: 1}], act.map(([k, t, ev]) => [
          k === 'reviewer_done' ? `<b>${t}</b><div class="small muted">ส่งต่อผู้จัดการ ${ev.filter(e => e.kind === 'reviewer_forward').length} คน + ไม่เข้าเกณฑ์ ${ev.filter(e => e.kind === 'reviewer_ineligible').length} คน</div>` : k === 'manager_done' ? `<b>${t}</b>` : t,
          `<button class="link" data-action="dash-drill" data-k="${k}">${ev.length} คน</button>`]))}
      </section>
      <section class="card"><h3>ผลการพิจารณาในช่วงเวลาที่เลือก</h3>
        <div class="grid-2">${[['approved', 'ผ่าน', 'ผู้จัดการอนุมัติ'], ['rejected', 'ไม่ผ่าน', 'ผู้จัดการไม่อนุมัติ'], ['reserve', 'สำรอง', 'ผู้จัดการพิจารณา'], ['ineligible', 'ไม่เข้าเกณฑ์', 'จบที่เจ้าหน้าที่รีวิว']].map(([k, t, sub]) =>
          `<div class="stat" style="box-shadow:none;background:var(--fill)"><span>${t}</span><b>${dec(k)}</b><small>${sub}</small></div>`).join('')}</div>
        <p class="small muted">ผู้จัดการดำเนินการแล้ว ${dec('approved') + dec('rejected') + dec('reserve')} คน = ผ่าน ${dec('approved')} + ไม่ผ่าน ${dec('rejected')} + สำรอง ${dec('reserve')} · เจ้าหน้าที่ดำเนินการเรียบร้อย ${done.length} คน</p>
      </section>
    </div>
    ${p.drill ? drillBox.call(this, act.find(a => a[0] === p.drill), pl) : ''}
    ${trendCard.call(this, events, refDay, p)}`};
};
/* คำนวณแบบ UTC ล้วน ไม่ขึ้นกับเขตเวลาเครื่อง (เดิมเครื่องเวลาไทย +7 ทำให้วันไม่ขยับ และวนไม่จบ) */
function shiftDay(day, n) { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function drillBox(a, pl) {
  if (!a) return '';
  const rows = a[2].map(e => [e, this.studentByCode[e.code]]).filter(x => x[1]);
  return `<section class="card" id="drill"><div class="card-head"><h3>รายละเอียด: ${a[1]}</h3><span class="sub">${pl} · ${rows.length} คน</span></div>
    ${listRows(rows.map(([e, s]) => studentRow(s, `data-go="staff-app" data-code="${s.code}"`, `<span class="num">${s.code}</span> · ${esc(this.schoolName(s.school))} · ${thDate(e.at, true)}`)), 'ไม่มีรายการในช่วงเวลานี้')}</section>`;
}
function trendCard(events, refDay, p) {
  const mode = p.tmode || 'cum', view = p.tview || 'chart';
  const series = [['started', 'เริ่มสมัคร', 'var(--idle)'], ['submitted', 'ส่งให้ครู', 'var(--warn)'], ['teacher_sent', 'มูลนิธิฯ รับ', 'var(--info)'],
    ['reviewer_done', 'จนท.ดำเนินการ', 'var(--violet)'], ['manager_done', 'ผจก.ดำเนินการ', 'var(--ok)']];
  const tests = Object.fromEntries(ACTIVITY.map(a => [a[0], a[2]]));
  const days = [];
  for (let d = this.db.cycle.open; d <= refDay && days.length < 800; d = shiftDay(d, 1)) days.push(d);
  const byDay = series.map(([k]) => days.map(d => events.filter(e => e.at.slice(0, 10) === d && tests[k](e.kind)).length));
  const data = mode === 'cum' ? byDay.map(a => a.reduce((acc, x, i) => (acc.push((acc[i - 1] || 0) + x), acc), [])) : byDay;
  const max = Math.max(1, ...data.flat());
  const W = 900, H = 260, L = 36, B = 28, T = 10;
  const x = i => L + (days.length > 1 ? i * (W - L - 10) / (days.length - 1) : 0);
  const y = v => T + (H - T - B) * (1 - v / max);
  const ticks = [0, Math.round(max / 2), max];
  const lab = days.map((d, i) => [d, i]).filter(([, i]) => i % Math.ceil(days.length / 6) === 0);
  const chart = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="แนวโน้มการดำเนินงาน">
    ${ticks.map(t => `<line x1="${L}" x2="${W - 10}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('')}
    ${lab.map(([d, i]) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${new Date(d + 'T00:00:00').toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}</text>`).join('')}
    ${data.map((a, si) => `<polyline fill="none" stroke="${series[si][2]}" stroke-width="2.2" stroke-linejoin="round" points="${a.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`).join('')}
  </svg><div class="legend">${series.map(s => `<span><i style="background:${s[2]}"></i>${s[1]}</span>`).join('')}</div>`;
  const table = tbl([{t: 'วันที่'}].concat(series.map(s => ({t: s[1], r: 1}))),
    days.map((d, i) => [thDate(d)].concat(data.map(a => a[i]))).filter(r => r.slice(1).some(Boolean)).reverse());
  return `<section class="card"><div class="card-head"><div><h3>แนวโน้มการดำเนินงานตลอดรอบทุน</h3>
      <span class="sub">ตั้งแต่วันเปิดรับสมัคร ${thDate(this.db.cycle.open)} ถึงวันที่ ${thDate(refDay)}</span></div>
      <div class="row"><div class="seg">${[['daily', 'รายวัน'], ['cum', 'สะสม']].map(([k, t]) => `<button type="button" data-action="dash-trend" data-tmode="${k}" aria-pressed="${k === mode}">${t}</button>`).join('')}</div>
        <div class="seg">${[['chart', 'กราฟ'], ['table', 'ตาราง']].map(([k, t]) => `<button type="button" data-action="dash-trend" data-tview="${k}" aria-pressed="${k === view}">${t}</button>`).join('')}</div></div></div>
    ${view === 'chart' ? chart : table}</section>`;
}
App.on('dash-filter-auto', function (el) {
  const v = formData(el.form);
  if (el.name === 'd_region') v.d_province = '';
  this.go('staff-dash', {...this.view.params, round: v.d_round, region: v.d_region, province: v.d_province, reviewer: v.d_reviewer, drill: ''});
});
App.on('dash-period', function (el) { this.go('staff-dash', {...this.view.params, period: el.dataset.period, drill: ''}); });
App.on('dash-trend', function (el) {
  const {tmode, tview} = el.dataset;
  this.view.params = {...this.view.params, ...(tmode ? {tmode} : {}), ...(tview ? {tview} : {})};
  this.render();
});
App.on('dash-drill', function (el) {
  this.view.params = {...this.view.params, drill: el.dataset.k};
  this.render();
  document.getElementById('drill').scrollIntoView({behavior: 'smooth', block: 'start'});
});

/* แก้ประเภทวิชา ปวส. (ทั่วไป / อุตสาหกรรม) กรณีนักเรียนเลือกผิด — จนท.รีวิว และ ผจก. ก่อนตัดสินผล */
function pvsField(s) {
  /* มีผลกับอัตราทุนเฉพาะคนที่ปีหน้าเรียน ปวส. */
  if (!/^ปวส/.test(s.next_class || '')) return null;
  return (s.group || groupOfClass(s.class)) === 'highvoc' ? 'pvs_type' : 'next_pvs_type';
}
function pvsFixCard(s, role) {
  const k = pvsField(s);
  if (!k || !['reviewer', 'manager'].includes(role) || s.status === 'decided') return '';
  const cur = s[k] === 'industry' ? 'industry' : 'other';
  return `<section class="card"><h3>ประเภทวิชา ปวส.</h3>
    <form class="stack" data-submit="pvs-fix" data-code="${s.code}" novalidate>
      ${radioField('pvs_fix', k === 'pvs_type' ? 'ประเภทวิชา' : 'ประเภทวิชา (ปวส. ที่จะเรียน)', PVS_TYPES, cur)}
      ${(() => { const orig = s[k + '_by_student'] != null ? s[k + '_by_student'] : s[k];
        return `<p class="small muted">นักเรียนเลือก: <b>${orig === 'industry' ? 'อุตสาหกรรม' : orig ? 'ทั่วไป' : '-'}</b>${s[k + '_by_student'] != null && s[k + '_by_student'] !== s[k] ? ' · <b style="color:var(--warn)">เจ้าหน้าที่แก้แล้ว</b>' : ''} · อัตราทุนตอนนี้ ${baht(this.stdRate(s).amount)}</p>`; })()}
      <button class="btn sm" type="submit">บันทึกประเภทวิชา</button></form></section>`;
}
App.on('pvs-fix', function (form) {
  const s = this.studentByCode[form.dataset.code];
  const k = pvsField(s);
  const v = formData(form).pvs_fix;
  if (!k || !v || s[k] === v) { this.toast('ประเภทวิชาไม่เปลี่ยน'); return; }
  const before = this.stdRate(s).amount;
  if (s[k + '_by_student'] == null) s[k + '_by_student'] = s[k] || '';
  s[k] = v;
  s.rate = rateOf(s.next_class, /^ปวส/.test(s.next_class) ? (s.next_pvs_type || s.pvs_type) : '');
  const after = this.stdRate(s).amount;
  addHistory(s, `${this.session.name} แก้ประเภทวิชา ปวส. เป็น${v === 'industry' ? 'อุตสาหกรรม' : 'ทั่วไป'} (อัตรา ${baht(before)} → ${baht(after)})`, 'pvs_fix');
  this.save();
  this.toast(`บันทึกแล้ว · อัตราทุน ${baht(after)}`);
  this.go('staff-app', {code: s.code});
});

/* ---------- รอบรับสมัคร ---------- */
App.views['staff-cycle'] = function () {
  { const deny = adminOnly.call(this); if (deny) return deny; }
  const c = this.db.cycle;
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <div class="page-head"><div><h1>ตั้งค่ารอบรับสมัคร</h1></div></div>
    <form class="stack" data-submit="cycle-save" novalidate>
      <section class="card"><div class="grid-3">
        ${field('c_year', 'ปีการศึกษาที่เปิดรับ', input('c_year', c.year, 'type="number" inputmode="numeric"'))}
        ${field('c_hist', 'ปีที่ใช้ในคำถามประวัติทุน', input('c_hist', c.history_year, 'type="number" inputmode="numeric"'))}
        ${field('c_status', 'สถานะรอบ', select('c_status', [['open', 'เปิดรับสมัคร'], ['closed', 'ปิดรับสมัคร'], ['preparing', 'เตรียมระบบ']], c.status))}
      </div><div class="grid-2">
        ${field('c_open', 'วันเปิดรับสมัคร', input('c_open', c.open, 'type="date"'))}
        ${field('c_close', 'วันปิดรับสมัคร', input('c_close', c.close, 'type="date"'))}
      </div></section>
      <section class="card"><h3>กำหนดส่งหลักฐานการย้ายสถานศึกษา</h3>
        <p class="small muted">วันที่ตั้งไว้ที่นี่จะแสดงในข้อความเตือนของนักเรียนและครูทุกจุด</p><div class="grid-3">
        ${field('c_topen', 'วันเปิดรับหลักฐานย้าย', input('c_topen', c.transfer_open, 'type="date"'))}
        ${field('c_cut', 'วันตัดรอบแรก (เฉพาะ ป.6 / ม.3)', input('c_cut', c.first_cutoff, 'type="date"'), {hint: 'ป.6 / ม.3 ที่ส่งหลักฐานภายในวันนี้ → พิจารณารอบแรก'})}
        ${field('c_tclose', 'วันสุดท้ายรับหลักฐาน (ทุกระดับชั้น)', input('c_tclose', c.transfer_close, 'type="date"'), {hint: 'ส่งหลังวันตัดรอบแรกแต่ไม่เกินวันนี้ → พิจารณารอบที่ 2 (รอบรอฟังผล) · เกินวันนี้ถือว่าสละสิทธิ์'})}
      </div></section>
      <div class="row end"><button class="btn primary" type="submit">บันทึก</button></div>
    </form>`};
};
App.on('cycle-save', function (form) {
  const v = formData(form);
  if (v.c_open && v.c_close && v.c_close <= v.c_open) { this.toast('วันปิดรับสมัครต้องอยู่หลังวันเปิดรับสมัคร'); return; }
  Object.assign(this.db.cycle, {year: Number(v.c_year), history_year: Number(v.c_hist), status: v.c_status, open: v.c_open, close: v.c_close,
    transfer_open: v.c_topen, first_cutoff: v.c_cut, transfer_close: v.c_tclose});
  this.save();
  this.toast('บันทึกการตั้งค่ารอบรับสมัครแล้ว');
  this.go('staff-cycle');
});

/* ---------- ใบสมัคร ---------- */
App.appFilter = function (f) {
  return this.db.students.filter(s => {
    const sc = this.schoolById[s.school] || {};
    return WORK_TEST[f.work || 'all'](s) && (!f.result || (s.decision && s.decision.result === f.result))
      && (!f.round || String(s.round || '') === f.round) && (!f.loan || loanKind(s) === f.loan) && (!f.type || s.type === f.type)
      && (!f.move || s.school_next === f.move) && (!f.rate || (f.rate === 'special') === this.stdRate(s).special)
      && (!f.region || sc.region === f.region) && (!f.province || sc.province === f.province) && (!f.district || sc.district === f.district)
      && (!f.school || s.school === f.school) && (!f.classes || !f.classes.length || f.classes.includes(s.class))
      && (!f.q || (s.code + fullName(s)).toLowerCase().includes(f.q.toLowerCase()));
  });
};
App.views['staff-apps'] = function (p) {
  const f = p.work || p.reset ? {work: p.work || 'all', classes: []} : (this._appF || {work: 'all', classes: []});
  this._appF = f;
  const rows = this.appFilter(f);
  const role = this.session.staffRole;
  const nAdv = ['round', 'loan', 'type', 'rate', 'move', 'region', 'school'].filter(k => f[k]).length + ((f.classes || []).length ? 1 : 0);
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <div class="page-head"><div><h1>งานพิจารณาใบสมัคร</h1><p class="sub">${ROLE[role][0]} — ${ROLE[role][1]}</p></div></div>
    <form class="card no-print af" data-submit="apps-filter" novalidate>
      <div class="af-main">
        ${field('f_q', 'ค้นหา', input('f_q', f.q, 'placeholder="รหัสผู้สมัคร / ชื่อ–นามสกุล"'))}
        ${field('f_work', 'สถานะการดำเนินงาน', select('f_work', WORK, f.work || 'all'))}
        ${field('f_result', 'ผลการพิจารณา', select('f_result', Object.entries(DECISION).map(([k, d]) => [k, d.label === 'อนุมัติทุน' ? 'ผ่าน' : d.label]), f.result, 'ทั้งหมด'))}
        <button class="btn primary" type="submit">ค้นหา</button>
      </div>
      <details class="af-more" ${nAdv ? 'open' : ''}><summary>ตัวกรองเพิ่มเติม${nAdv ? ` <span class="badge t-info">${nAdv}</span>` : ''}</summary>
      <div class="af-grid">
        ${field('f_round', 'รอบพิจารณา', select('f_round', [['1', 'รอบ 1'], ['2', 'รอบ 2']], f.round, 'ทั้งหมด'))}
        ${field('f_loan', 'กยศ./กรอ.', select('f_loan', [['no', 'ไม่กู้'], ['self', 'ผู้ขอทุนกู้'], ['sibling', 'พี่น้องกู้ (ผู้ขอทุนไม่กู้)']], f.loan, 'ทั้งหมด'))}
        ${field('f_type', 'ประเภททุน', select('f_type', [['NEW', 'ทุนใหม่'], ['CONT', 'ทุนต่อเนื่อง']], f.type, 'ทั้งหมด'))}
        ${field('f_rate', 'อัตราทุน', select('f_rate', [['normal', 'อัตราปกติ'], ['special', 'อัตราพิเศษ']], f.rate, 'ทั้งหมด'))}
        ${field('f_move', 'สถานศึกษาปีหน้า', select('f_move', [['transfer', 'ย้ายสถานศึกษา'], ['same', 'เรียนต่อที่เดิม']], f.move, 'ทั้งหมด'))}
      </div>
      <div class="field"><span class="label">เลือกโรงเรียนที่ต้องการรีวิว</span>
        <div class="grid-4" data-area='{"any":true,"school":true}'>${this.areaPicker('fa', f, {any: true, school: true})}</div>
</div>
      <div class="field"><span class="label">ระดับชั้น (เลือกทั้งช่วงชั้น หรือเลือกเป็นรายชั้นก็ได้)</span>
        <div class="lv-grid">${EDU_GROUPS.map(([k]) => { const cls = CLASS_GROUPS[k] || []; const on = cls.filter(c => (f.classes || []).includes(c));
          return `<div class="lv-row"><label class="choice lv-group"><input type="checkbox" data-group="${k}" data-onchange="lv-group" ${on.length === cls.length ? 'checked' : ''}> <b>${k === 'primary' ? 'ประถม' : GROUP_SHORT[k]}</b></label>
            <div class="lv-classes">${cls.map(c => `<label class="choice"><input type="checkbox" name="f_classes" value="${c}" data-g="${k}" data-onchange="lv-class" ${(f.classes || []).includes(c) ? 'checked' : ''}> ${c.replace('ปริญญาตรี ', 'ป.ตรี ')}</label>`).join('')}</div></div>`; }).join('')}</div></div>
      </details>
      <div class="row between"><button class="btn sm" type="button" data-action="print">${icon('print')} พิมพ์ผลการค้นหา</button>
        <button class="btn sm" type="button" data-go="staff-apps" data-reset="1">ล้างตัวกรอง</button></div>
    </form>
    <p class="small muted">พบ ${rows.length} รายการ — เลือกสถานะการดำเนินงานและผลการพิจารณาแยกกันได้</p>
    <div class="tlist app-list" role="table" aria-label="รายชื่อใบสมัคร">
      <div class="tlist-head" role="row"><span class="n">ลำดับ</span><span>ชื่อ–นามสกุล</span><span>สถานศึกษา</span><span>ชั้น</span><span>ประเภททุน</span><span>สถานะ</span><span>รอบ</span></div>
      ${rows.length ? rows.map((s, i) => { const sc = this.schoolById[s.school] || {};
        return `<button class="trow" role="row" data-go="staff-app" data-code="${s.code}">
          <span class="n">${i + 1}</span>
          <span class="c-name">${esc(fullName(s))}<small class="num">${s.code}${loanLabel(s)}${s.school_next === 'transfer' ? ' · ย้ายสถานศึกษา' : ''}<span class="m-only"> · ${esc(shortCls(s.class) || '-')} · ${TYPE[s.type]}${s.round ? ' · รอบ ' + s.round : ''}</span></small></span>
          <span class="c-school">${esc(sc.name || '-')}<small>จ.${esc(sc.province || '')} · ${esc(this.regionName(sc.region))}</small></span>
          <span class="c-class">${esc(shortCls(s.class) || '-')}</span><span class="c-type">${TYPE[s.type]}</span>
          <span class="c-status">${badge(s)}</span><span class="c-round">${s.round ? s.round : '—'}</span></button>`; }).join('')
        : '<div class="empty">ไม่พบใบสมัครตามเงื่อนไข</div>'}
    </div>`};
};
App.on('apps-filter', function (form) {
  const v = formData(form);
  const a = this.readArea('fa');
  this._appF = {work: v.f_work, result: v.f_result, round: v.f_round, loan: v.f_loan, type: v.f_type, move: v.f_move, rate: v.f_rate, q: v.f_q,
    region: a.region, province: a.province, district: a.district, school: a.school, classes: arr(v.f_classes)};
  this.go('staff-apps');
});

App.views['staff-app'] = function (p) {
  const s = this.studentByCode[p.code];
  const role = this.session.staffRole;
  const e = p.errors || {};
  const v = p.values || {};
  const tr = s.teacher_review, sr = s.staff_review;
  const files = s.docFiles || {};
  let panel;
  if (role === 'reviewer') {
    const can = ['waiting_staff', 'need_more_info'].includes(s.status);
    if (s.status === 'waiting_transfer_proof') panel = `<div class="note warn"><b>รอหลักฐานการย้ายสถานศึกษา</b><br>นักเรียนแจ้งย้ายสถานศึกษา ต้องบันทึกการย้ายก่อน (แม้เรียนต่อที่เดิมก็ต้องบันทึก) จึงจะพิจารณาต่อได้</div>
      <button class="btn primary block" data-go="staff-transfer" data-code="${s.code}">ไปบันทึกการย้ายสถานศึกษา</button>`;
    else panel = can ? `<form class="stack" data-submit="staff-review" data-code="${s.code}" novalidate>
      ${field('r_comment', 'ความคิดเห็นของเจ้าหน้าที่รีวิว', textarea('r_comment', v.r_comment ?? (sr && sr.comment) ?? '', 'rows="4" placeholder="สรุปข้อเท็จจริง ความจำเป็น ประเด็นสำคัญ หรือเหตุผลที่ไม่เข้าเกณฑ์"'), {err: e.r_comment})}
      ${field('r_result', 'ผลการรีวิว', select('r_result', [['forward', 'ส่งต่อให้ผู้จัดการพิจารณา'], ['ineligible', 'ไม่เข้าเกณฑ์'], ['need_more_info', 'รอข้อมูลเพิ่มเติม']], v.r_result || 'forward'))}
      ${field('r_round', 'จัดเข้ารอบ', select('r_round', [['1', 'รอบ 1'], ['2', 'รอบ 2']], v.r_round || s.round || (s.school_next === 'transfer' && !['ป.6', 'ม.3'].includes(s.class) ? '2' : '1')),
        {hint: s.school_next === 'transfer' ? `ย้ายสถานศึกษา: ป.6 / ม.3 ส่งหลักฐานภายใน ${thDate(this.db.cycle.first_cutoff)} → รอบ 1 · ระดับอื่น หรือส่งหลังจากนั้นแต่ไม่เกิน ${thDate(this.db.cycle.transfer_close)} → รอบ 2` : 'ไม่ย้ายสถานศึกษา → รอบ 1'})}
      <button class="btn primary block" type="submit">บันทึกและส่งต่อผู้จัดการ</button></form>`
      : `<p class="small muted">ใบสมัครนี้อยู่สถานะ “${STATUS[s.status].label}” — จนท.รีวิวดำเนินการได้เมื่อสถานะเป็น “รอเจ้าหน้าที่ดำเนินการ”</p>${reviewSummary(s)}`;
  } else if (role === 'manager') {
    const can = s.status === 'waiting_manager';
    const sr0 = this.stdRate(s), std = sr0.amount;
    const pendingMove = s.school_next === 'transfer' && !this.db.transfers.some(t => t.code === s.code);
    const dec = v.m_decision || 'approved';
    panel = (sr ? `<div class="subcard"><span class="label">ความเห็น จนท.รีวิว (${esc(sr.reviewer)}) · รอบ ${sr.round || s.round || '-'}</span><span class="small">${esc(sr.comment || '—')}</span></div>` : '') + (can ? `
      <form class="stack" data-submit="staff-decide" data-code="${s.code}" novalidate>
      ${radioField('m_decision', 'ผลการพิจารณา', [['approved', 'อนุมัติทุน', 'ผ่านการพิจารณาและกำหนดจำนวนเงินทุน'], ['rejected', 'ไม่อนุมัติทุน', 'ไม่ผ่านการพิจารณาทุนในรอบนี้'],
        ['reserve', 'สำรอง', 'อยู่ในรายชื่อสำรอง ยังไม่รวมวงเงินทุนที่อนุมัติ']], dec, {req: 1, col: 1, attrs: 'data-onchange="manager-ui"'})}
      <div class="stack" id="amount_box" ${dec === 'approved' ? '' : 'hidden'}>
        <div class="subcard"><span class="small muted">ระดับชั้นปีการศึกษา ${this.db.cycle.year}</span><b>${esc(this.rateName(s.rate))} (${esc(s.next_class || '-')})</b>
          <span class="small muted">อัตราทุนมาตรฐาน</span><b>${baht(std)}</b>
          ${rateBadge(sr0)}${sr0.special ? `<span class="small muted">อัตราปกติ ม.ต้น ${baht(sr0.base)} · คิดจากโรงเรียนปีหน้า ${esc(this.schoolName(s.school))}</span>` : ''}
          ${pendingMove && s.rate === 'M_LOWER' ? '<span class="small" style="color:var(--warn)">นักเรียนแจ้งย้ายสถานศึกษา แต่ยังไม่ได้บันทึกโรงเรียนใหม่ — อัตรานี้คิดจากโรงเรียนเดิม ควรบันทึกการย้ายก่อน</span>' : ''}</div>
        ${radioField('m_amount', 'จำนวนเงินทุนที่อนุมัติ', [['std', baht(std), `ตามอัตรามาตรฐานของระดับชั้นปี ${this.db.cycle.year}`],
          ['special', baht(this.rateAmount('SPECIAL')), 'ปรับเป็นรายคน (ต้องระบุเหตุผล)']], v.m_amount || 'std', {req: 1, col: 1, attrs: 'data-onchange="manager-ui"'})}
        <div id="special_box" ${v.m_amount === 'special' ? '' : 'hidden'}>
          ${field('m_reason', `เหตุผลที่ปรับเป็น ${baht(this.rateAmount('SPECIAL'))}`, textarea('m_reason', v.m_reason, 'rows="3" placeholder="ระบุเหตุผลที่ใช้อัตราอื่น ๆ เช่น ลักษณะการดูแลของสถานศึกษา/หอพัก หรือเงื่อนไขพิเศษ"'), {req: 1, err: e.m_reason,
            hint: 'ระบบจะเก็บยอดมาตรฐาน ยอดที่อนุมัติจริง เหตุผล ผู้แก้ไข และวันเวลาไว้ใน Audit Log'})}</div>
      </div>
      ${field('m_note', 'หมายเหตุผู้จัดการ', textarea('m_note', v.m_note, 'rows="2" placeholder="เหตุผลหรือหมายเหตุเพิ่มเติม"'))}
      <button class="btn primary block" type="submit">บันทึกผลการพิจารณา</button></form>`
      : `<p class="small muted">ใบสมัครนี้อยู่สถานะ “${STATUS[s.status].label}” — ผู้จัดการบันทึกผลได้เมื่อสถานะเป็น “รอผู้จัดการพิจารณา”</p>${reviewSummary(s)}`);
  } else {
    panel = `<p class="small muted">ดูข้อมูลทั้งหมดและสถานะทุกขั้นตอน รวมถึง Audit Trail</p>${reviewSummary(s)}`;
  }
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <button class="back" data-go="staff-apps">${icon('back')} รายการใบสมัคร</button>
    <div class="page-head"><div><h1><span class="num">${s.code}</span> — ${esc(fullName(s))}</h1><p class="sub">หน้าพิจารณาแบบเต็ม: ข้อมูลผู้สมัครทุกส่วน + เอกสาร + ความเห็นครู</p></div>
      <div class="row">${badge(s)}${s.school_next === 'transfer' || this.db.transfers.some(t => t.code === s.code)
        ? `<button class="btn sm" data-go="staff-transfer" data-code="${s.code}">${this.db.transfers.some(t => t.code === s.code) ? 'ดู / แก้ไขการย้ายสถานศึกษา' : 'บันทึกการย้ายสถานศึกษา'}</button>` : ''}</div></div>
    <div class="split">
      <div class="rv-left"><div class="stack" id="rv-info">${applicantSections.call(this, s, {numbered: true})}
        <section class="card"><h3>6. ความคิดเห็นของครูผู้ดูแลทุน</h3>${tr ? `<p>${esc(tr.comment)}</p><p class="small">ผลการเรียน: ${gradeText(tr)}</p><p class="small muted">ส่งเมื่อ ${thDate(tr.sent_at, true)}</p>`
          : `<p class="small muted">${s.group === 'bachelor' ? 'ระดับปริญญาตรีส่งตรงถึงมูลนิธิฯ ไม่ผ่านครู' : 'ครูยังไม่ได้ดำเนินการ'}</p>`}</section>
        <section class="card"><h3>7. ประวัติสถานะใบสมัคร</h3>${(s.history || []).length ? `<ol class="timeline">${s.history.map(h =>
          `<li class="done">${esc(h.text)}<small>${thDate(h.at, true)}</small></li>`).join('')}</ol>` : '<p class="small muted">ยังไม่มีประวัติ</p>'}</section>
        <section class="card" id="docs-card"><h3>8. เอกสารแนบ</h3><div id="doc-rows">${docsFor(s).map(([code, name, , opt]) => { const fl = files[code] || [];
          return `<div class="doc-row"><div><div>${code} — ${name}</div><div class="code">${fl.length ? esc(fl.length > 1 ? fl.length + ' ไฟล์' : fl[0]) : opt ? 'ไม่มี (ไม่บังคับ)' : 'ยังไม่ได้แนบ'}</div></div>
            ${fl.length ? `<button class="btn sm" type="button" data-action="preview" data-k="${code}:0">Preview</button>` : ''}</div>`; }).join('')}</div>${pvViewer(s, files)}</section>
      </div></div>
      <aside class="stack rv-side" id="rv-side"><section class="card"><div class="rv-sheet-head"><h3>${ROLE[role][0]}</h3><button class="btn sm rv-close" type="button" data-action="rv-sheet">ปิด</button></div>${panel}</section>${pvsFixCard.call(this, s, role)}</aside>
    </div>
    <div class="rv-bar"><span>${ROLE[role][0]}</span><button class="btn primary sm" type="button" data-action="rv-sheet">${role === 'admin' ? 'ดูสรุปผล' : role === 'manager' ? 'บันทึกผลพิจารณา' : 'เขียนความเห็น'}</button></div>
    <div class="rv-dim" data-action="rv-sheet"></div>`, after: focusFirstError};
};
function reviewSummary(s) {
  const sr = s.staff_review, d = s.decision;
  return `<dl class="kv">${sr ? `<div><dt>ผลจากเจ้าหน้าที่</dt><dd>${{forward: 'ส่งต่อให้ผู้จัดการพิจารณา', ineligible: 'ไม่เข้าเกณฑ์', need_more_info: 'รอข้อมูลเพิ่มเติม', pass: 'ส่งต่อให้ผู้จัดการพิจารณา'}[sr.result] || sr.result} · ${esc(sr.reviewer)}</dd></div>
    ${sr.round || s.round ? `<div><dt>รอบ</dt><dd>รอบ ${sr.round || s.round}</dd></div>` : ''}${sr.comment ? `<div><dt>ความคิดเห็น</dt><dd>${esc(sr.comment)}</dd></div>` : ''}` : ''}
    ${d ? `<div><dt>ผลการพิจารณา</dt><dd>${badge(s)}</dd></div>${d.approved_amount ? `<div><dt>จำนวนเงินทุน</dt><dd>${baht(d.approved_amount)}${d.standard_amount && d.standard_amount !== d.approved_amount ? ` (มาตรฐาน ${baht(d.standard_amount)})` : ''}</dd></div>` : ''}
    ${d.reason ? `<div><dt>เหตุผล</dt><dd>${esc(d.reason)}</dd></div>` : ''}${d.note ? `<div><dt>หมายเหตุผู้จัดการ</dt><dd>${esc(d.note)}</dd></div>` : ''}` : ''}</dl>`;
}
/* ---------- ดูไฟล์เอกสารแนบ: รายการไฟล์ทั้งหมดด้านซ้าย จิ้มแล้วเปิดดู (กล่องรีวิวทางขวายังพิมพ์ได้) ---------- */
function pvMock(s, code, name, fname, i) {
  const t = x => String(x).replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
  const font = `font-family="Google Sans,Tahoma,sans-serif"`;
  let w = 600, h = 848, body;
  if (code === '01_IDCARD') {
    w = 856; h = 540;
    body = `<rect x="20" y="20" width="816" height="500" rx="28" fill="#eef4fb" stroke="#9fb6d3" stroke-width="3"/>
      <text x="60" y="90" ${font} font-size="30" font-weight="700" fill="#1d3b63">บัตรประจำตัวประชาชน</text>
      <rect x="610" y="140" width="180" height="220" rx="10" fill="#cfd9e6"/><circle cx="700" cy="215" r="45" fill="#aebdd0"/><rect x="640" y="275" width="120" height="70" rx="35" fill="#aebdd0"/>
      <text x="60" y="160" ${font} font-size="24" fill="#334">เลขประจำตัว ${t(s.cid || '-')}</text>
      <text x="60" y="215" ${font} font-size="28" font-weight="700" fill="#111">${t(fullName(s))}</text>
      ${[260, 300, 340, 380].map(y => `<rect x="60" y="${y}" width="${300 + (y % 7) * 20}" height="14" rx="7" fill="#c9d4e2"/>`).join('')}`;
  } else if (code === '05_HOUSEPHOTO') {
    w = 800; h = 600;
    const sky = ['#cfe6f7', '#d9ecf3', '#e4eef8'][i % 3];
    body = `<rect width="800" height="600" fill="${sky}"/><rect y="420" width="800" height="180" fill="#9cc58a"/>
      <polygon points="${200 + i * 30},250 ${400 + i * 30},120 ${600 + i * 30},250" fill="#a5644b"/><rect x="${230 + i * 30}" y="250" width="340" height="190" fill="#e9d8b9"/>
      <rect x="${370 + i * 30}" y="320" width="60" height="120" fill="#7b5137"/><rect x="${260 + i * 30}" y="290" width="70" height="60" fill="#8fb6d8"/><rect x="${470 + i * 30}" y="290" width="70" height="60" fill="#8fb6d8"/>
      <text x="24" y="580" ${font} font-size="20" fill="#234">รูปถ่ายสภาพบ้าน ${i + 1}</text>`;
  } else {
    const lines = Array.from({length: 16}, (_, k) => `<rect x="60" y="${250 + k * 32}" width="${480 - ((k * 37 + i * 11) % 160)}" height="12" rx="6" fill="#d7dde6"/>`).join('');
    body = `<rect width="600" height="848" fill="#fff"/><rect x="250" y="40" width="100" height="100" rx="50" fill="#e3e8ef"/>
      <text x="300" y="185" text-anchor="middle" ${font} font-size="22" font-weight="700" fill="#222">${t(name.length > 34 ? name.slice(0, 34) + '…' : name)}</text>
      <text x="300" y="218" text-anchor="middle" ${font} font-size="16" fill="#666">${t(fullName(s))}</text>${lines}
      <rect x="380" y="770" width="160" height="2" fill="#999"/><text x="460" y="800" text-anchor="middle" ${font} font-size="14" fill="#666">ลงชื่อ / ตราประทับ</text>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#f4f6f9"/>${body}
    <text x="${w - 14}" y="24" text-anchor="end" font-family="monospace" font-size="13" fill="#99a">${t(fname)}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
function pvViewer(s, files) {
  const docs = docsFor(s);
  const total = docs.reduce((n, [code]) => n + (files[code] || []).length, 0);
  return `<div class="pv" id="pv" hidden>
    <div class="pv-top"><button class="btn sm" type="button" data-action="pv-close">${icon('back')} ปิดตัวดูไฟล์</button>
      <span class="small muted">ดูแล้ว <b id="pv-seen">0</b> / ${total} ไฟล์</span></div>
    <div class="pv-body">
      <nav class="pv-list" aria-label="เอกสารแนบ">${docs.map(([code, name, , opt]) => { const fl = files[code] || [];
        return `<div class="pv-doc${fl.length ? '' : ' missing'}"><div class="pv-dname"><b>${code.slice(0, 2)}</b> ${esc(name)}</div>
          ${fl.length ? `<div class="pv-thumbs">${fl.map((f, i) => { const src = pvMock(s, code, name, f, i);
            return `<button type="button" class="pv-th" data-action="pv-pick" data-k="${code}:${i}" data-src="${src}" data-title="${esc(code.slice(0, 2) + ' ' + name + (fl.length > 1 ? ` (${i + 1}/${fl.length})` : ''))}" data-f="${esc(f)}" title="${esc(f)}"><img src="${src}" alt="" loading="lazy"><span class="pv-ok" aria-hidden="true">✓</span></button>`; }).join('')}</div>`
            : `<div class="small muted">${opt ? 'ไม่มี (ไม่บังคับ)' : 'ยังไม่ได้แนบ'}</div>`}</div>`; }).join('')}</nav>
      <div class="pv-main"><button class="btn sm pv-back" type="button" data-action="pv-grid">${icon('back')} ไฟล์ทั้งหมด</button>
        <div class="pv-title"><b id="pv-title"></b><span class="code" id="pv-f"></span></div>
        <div class="pv-stage" id="pv-stage"><img id="pv-img" alt=""></div>
        <div class="row pv-tools"><button class="btn sm" type="button" data-action="pv-zoom" data-d="-1">ซูม −</button><button class="btn sm" type="button" data-action="pv-zoom" data-d="1">ซูม +</button>
          <button class="btn sm" type="button" data-action="pv-rot">หมุน</button><button class="btn sm" type="button" data-action="pv-tab">เปิดแท็บใหม่</button></div></div>
    </div></div>`;
}
const PV = {z: 1, r: 0};
/* พอดีกรอบก่อน แล้วค่อยซูม */
function pvApply() {
  const img = document.getElementById('pv-img'), st = document.getElementById('pv-stage'); if (!img || !img.naturalWidth) return;
  const side = PV.r % 180 !== 0, nw = side ? img.naturalHeight : img.naturalWidth, nh = side ? img.naturalWidth : img.naturalHeight;
  const fit = Math.min((st.clientWidth - 24) / nw, st.clientHeight > 200 && innerWidth > 900 ? (st.clientHeight - 24) / nh : Infinity);
  img.style.width = Math.round(img.naturalWidth * fit * PV.z) + 'px';
  img.style.transform = PV.r ? `rotate(${PV.r}deg)` : '';
  img.style.margin = side ? `${Math.max(0, (img.naturalWidth - img.naturalHeight) * fit * PV.z / 2)}px auto` : 'auto';
}
App.on('preview', function (el) {
  const pv = document.getElementById('pv'); if (!pv) return;
  document.getElementById('doc-rows').hidden = true; pv.hidden = false;
  const th = pv.querySelector(`.pv-th[data-k="${el.dataset.k}"]`) || pv.querySelector('.pv-th');
  if (th) this.handlers['pv-pick'].call(this, th);
  pvTop(document.getElementById('docs-card'));
});
function pvTop(pv) {
  window.scrollTo(0, Math.max(0, pv.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tb-h')) || 0) - 12));
}
App.on('pv-pick', function (el) {
  const pv = document.getElementById('pv');
  pv.querySelectorAll('.pv-th.on').forEach(b => b.classList.remove('on'));
  el.classList.add('on', 'seen'); pv.classList.add('pv-one');
  document.getElementById('pv-img').src = el.dataset.src;
  document.getElementById('pv-title').textContent = el.dataset.title;
  document.getElementById('pv-f').textContent = el.dataset.f;
  document.getElementById('pv-seen').textContent = pv.querySelectorAll('.pv-th.seen').length;
  PV.z = 1; PV.r = 0; const img = document.getElementById('pv-img'); img.onload = pvApply; if (img.complete) pvApply();
  document.getElementById('pv-stage').scrollTo(0, 0);
});
App.on('pv-grid', function () { const pv = document.getElementById('pv'); pv.classList.remove('pv-one'); pvTop(document.getElementById('docs-card')); });
App.on('pv-close', function () {
  document.getElementById('pv').hidden = true; document.getElementById('doc-rows').hidden = false; pvTop(document.getElementById('docs-card'));
});
App.on('pv-zoom', function (el) { PV.z = Math.min(3, Math.max(.5, PV.z + (+el.dataset.d) * .25)); pvApply(); });
App.on('pv-rot', function () { PV.r = (PV.r + 90) % 360; pvApply(); });
App.on('pv-tab', function () {
  const img = document.getElementById('pv-img'), w = window.open('', '_blank');
  if (!w) { this.toast('เบราว์เซอร์บล็อกการเปิดแท็บใหม่'); return; }
  w.document.title = document.getElementById('pv-f').textContent;
  w.document.body.style.cssText = 'margin:0;background:#333;display:flex;justify-content:center';
  const im = w.document.createElement('img'); im.src = img.src; im.style.cssText = 'max-width:100%;height:auto'; w.document.body.appendChild(im);
});
App.on('manager-ui', function () {
  const dec = (document.querySelector('[name=m_decision]:checked') || {}).value;
  const amt = (document.querySelector('[name=m_amount]:checked') || {}).value;
  document.getElementById('amount_box').hidden = dec !== 'approved';
  document.getElementById('special_box').hidden = amt !== 'special';
});
App.on('staff-review', function (form) {
  const s = this.studentByCode[form.dataset.code];
  const v = formData(form);
  if (v.r_result !== 'forward' && !v.r_comment) { this.go('staff-app', {code: s.code, values: v, errors: {r_comment: 'กรุณาระบุเหตุผล / ข้อมูลที่ต้องการเพิ่มเติม'}}); return; }
  s.staff_review = {reviewer: this.session.name, result: v.r_result, round: Number(v.r_round), comment: v.r_comment};
  s.round = Number(v.r_round);
  if (v.r_result === 'forward') {
    s.status = 'waiting_manager';
    addHistory(s, 'เจ้าหน้าที่รีวิวเรียบร้อย ส่งให้ผู้จัดการพิจารณา — ' + this.session.name, 'reviewer_forward');
  } else if (v.r_result === 'ineligible') {
    s.status = 'decided';
    s.decision = {result: 'ineligible', standard_amount: null, approved_amount: null, reason: v.r_comment, by: this.session.name};
    addHistory(s, 'เจ้าหน้าที่รีวิว: ไม่เข้าเกณฑ์ — ' + this.session.name, 'reviewer_ineligible');
  } else {
    s.status = 'need_more_info';
    addHistory(s, 'เจ้าหน้าที่ขอข้อมูลเพิ่มเติม — ' + this.session.name, 'reviewer_need_more_info');
  }
  this.save();
  this.toast('บันทึกผลการรีวิวแล้ว');
  this.go('staff-app', {code: s.code});
});
App.on('staff-decide', function (form) {
  const s = this.studentByCode[form.dataset.code];
  const v = formData(form);
  if (v.m_decision === 'approved' && v.m_amount === 'special' && !v.m_reason) {
    this.go('staff-app', {code: s.code, values: v, errors: {m_reason: `กรุณาระบุเหตุผลที่ปรับจำนวนเงินทุนเป็น ${baht(this.rateAmount('SPECIAL'))}`}});
    return;
  }
  const sr0 = this.stdRate(s), std = sr0.amount;
  const ok = v.m_decision === 'approved';
  s.decision = {result: v.m_decision, special_rate: ok && sr0.special, standard_amount: ok ? std : null, approved_amount: ok ? (v.m_amount === 'special' ? this.rateAmount('SPECIAL') : std) : null,
    reason: ok && v.m_amount === 'special' ? v.m_reason : '', note: v.m_note, by: this.session.name};
  s.status = 'decided';
  addHistory(s, `ผู้จัดการพิจารณาเรียบร้อย — ผลการพิจารณา: ${{approved: 'อนุมัติทุน', rejected: 'ไม่อนุมัติทุน', reserve: 'สำรอง'}[v.m_decision]}${ok ? ' ' + baht(s.decision.approved_amount) : ''}`, 'manager_' + v.m_decision);
  this.save();
  this.toast('บันทึกผลการพิจารณาแล้ว');
  this.go('staff-app', {code: s.code});
});

/* ---------- ย้ายสถานศึกษา ---------- */
/* รอบพิจารณาของนักเรียนที่ย้าย: ป.6 / ม.3 ที่ส่งหลักฐานภายในวันตัดรอบแรก → รอบ 1, นอกนั้น → รอบ 2 */
function transferRound(s, t) {
  if (!['ป.6', 'ม.3'].includes(s.class)) return {r: 2, why: ''};
  if (!t) return {r: 1, why: '', pending: true};
  return t.date <= this.db.cycle.first_cutoff ? {r: 1, why: `ส่งหลักฐาน ${thDate(t.date)}`} : {r: 2, why: `ส่งหลักฐานหลัง ${thDate(this.db.cycle.first_cutoff)}`};
}
App.views['staff-transfer'] = function (p) {
  if (p.code) return transferForm.call(this, p);
  const f = p.f || this._trF || {state: 'todo', side: 'from'};
  this._trF = f;
  const th = (a, b) => a.localeCompare(b, 'th');
  const lastTr = code => this.db.transfers.filter(t => t.code === code).slice(-1)[0];
  const q = (f.q || '').toLowerCase();
  /* ตั้งต้นจากนักเรียนที่ติ๊กย้าย + คนที่บันทึกการย้ายไปแล้ว */
  const base = this.db.students.filter(s => s.school_next === 'transfer' || lastTr(s.code));
  const origin = s => { const t = lastTr(s.code); return this.schoolById[t ? t.from : s.school] || {}; };
  const dest = s => { const t = lastTr(s.code); return t ? this.schoolById[t.to] || {} : null; };
  const side = f.side === 'to' ? dest : origin;
  /* ภาค → จังหวัด → อำเภอ → สถานศึกษา จากสถานศึกษาเดิมหรือใหม่ (เลือกได้) พร้อมจำนวนคน */
  const pool = base.filter(s => f.state === 'all' || (f.state === 'done' ? !!lastTr(s.code) : !lastTr(s.code))).filter(s => side(s));
  const cnt = (arr, fn) => arr.reduce((m, s) => { const k = fn(s); if (k) m[k] = (m[k] || 0) + 1; return m; }, {});
  const opts = (c, label = k => k) => Object.keys(c).sort((a, b) => th(label(a), label(b))).map(k => [k, `${label(k)} (${c[k]})`]);
  const inRg = pool.filter(s => !f.region || side(s).region === f.region);
  const inPv = inRg.filter(s => !f.province || side(s).province === f.province);
  const inDs = inPv.filter(s => !f.district || side(s).district === f.district);
  const list = inDs.filter(s => (!f.school || side(s).id === f.school) && (!f.cls || s.class === f.cls) && (!f.round || String(transferRound.call(this, s, lastTr(s.code)).r) === f.round)
    && (!q || (s.code + fullName(s) + (origin(s).name || '') + ((dest(s) || {}).name || '')).toLowerCase().includes(q)))
    .sort((a, b) => th(side(a).province || '', side(b).province || '') || th(side(a).name || '', side(b).name || '') || th(a.code, b.code));
  const classes = Object.values(CLASS_GROUPS).flat().filter(c => base.some(s => s.class === c));
  const nDone = base.filter(s => lastTr(s.code)).length;
  const sch = (x, extra = '') => x ? `<b class="sch">${esc(x.name || '-')}</b><small>${esc(x.district || '')} · จ.${esc(x.province || '')}${extra}</small>` : '';
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <div class="page-head"><div><h1>ย้ายสถานศึกษา</h1><p class="sub">บันทึกว่านักเรียนย้ายไปเรียนที่ไหน หลังเจ้าหน้าที่ตรวจหลักฐานการย้ายภายนอกระบบแล้ว</p></div></div>
    <div class="stats">${[['todo', 'ยังไม่บันทึกที่เรียนใหม่', base.length - nDone], ['done', 'บันทึกแล้ว', nDone], ['all', 'แจ้งย้ายทั้งหมด', base.length]].map(([k, t, n]) =>
      `<button class="stat" data-action="transfer-state" data-state="${k}" aria-pressed="${f.state === k}"><span>${t}</span><b>${n}</b></button>`).join('')}</div>
    <section class="card stack">
      <div class="filters tr-filters">
        ${field('tq', 'ค้นหา', input('tq', f.q || '', 'autocomplete="off" placeholder="รหัส / ชื่อ–นามสกุล / ชื่อสถานศึกษา" data-oninput="transfer-search"'))}
        ${field('t_state', 'การบันทึก', select('t_state', [['todo', 'ยังไม่บันทึก'], ['done', 'บันทึกแล้ว'], ['all', 'ทั้งหมด']], f.state, null, 'data-onchange="transfer-filter"'))}
        ${field('t_round', 'รอบพิจารณา', select('t_round', [['1', 'รอบ 1'], ['2', 'รอบ 2']], f.round, 'ทุกรอบ', 'data-onchange="transfer-filter"'))}
        ${field('t_cls', 'ชั้นปัจจุบัน', select('t_cls', classes, f.cls, 'ทุกชั้น', 'data-onchange="transfer-filter"'))}
      </div>
      <div class="field"><span class="label">พื้นที่ของ</span><div class="seg tr-side">${[['from', 'สถานศึกษาเดิม'], ['to', 'สถานศึกษาใหม่']].map(([k, t]) =>
        `<button type="button" data-action="transfer-side" data-side="${k}" aria-pressed="${(f.side || 'from') === k}">${t}</button>`).join('')}</div>
        ${f.side === 'to' && f.state === 'todo' ? '<div class="hint">คนที่ยังไม่บันทึกยังไม่มีสถานศึกษาใหม่ — เลือก “บันทึกแล้ว” หรือ “ทั้งหมด”</div>' : ''}</div>
      <div class="filters tr-area">
        ${field('t_rg', 'ภาค', select('t_rg', opts(cnt(pool, s => side(s).region), k => this.regionName(k)), f.region, 'ทุกภาค', 'data-onchange="transfer-filter" data-level="rg"'))}
        ${field('t_pv', 'จังหวัด', select('t_pv', opts(cnt(inRg, s => side(s).province)), f.province, 'ทุกจังหวัด', 'data-onchange="transfer-filter" data-level="pv"'))}
        ${field('t_ds', 'อำเภอ / เขต', select('t_ds', opts(cnt(inPv, s => side(s).district)), f.district, f.province ? 'ทุกอำเภอ' : 'เลือกจังหวัดก่อน', `data-onchange="transfer-filter" data-level="ds" ${f.province ? '' : 'disabled'}`))}
        ${field('t_sc', 'สถานศึกษา', select('t_sc', opts(cnt(inDs, s => side(s).id), k => this.schoolName(k)), f.school, f.district ? 'ทุกสถานศึกษา' : 'เลือกอำเภอก่อน', `data-onchange="transfer-filter" data-level="sc" ${f.district ? '' : 'disabled'}`))}
      </div>
    </section>
    <div class="small muted">พบ <b>${list.length}</b> คน · กดที่รายชื่อเพื่อบันทึกหรือแก้ไข · นักเรียนที่ไม่ได้ติ๊กย้ายแต่ย้ายจริง พิมพ์รหัสผู้สมัครในช่องค้นหา</div>
    <div class="tlist tr-list pf-widepage" role="table" aria-label="นักเรียนแจ้งย้ายสถานศึกษา">
      <div class="tlist-head" role="row"><span class="n">ลำดับ</span><span>ชื่อ–นามสกุล</span><span>สถานศึกษาเดิม</span><span>ชั้นปีนี้</span><span>สถานศึกษาใหม่</span><span>ชั้นปีหน้า</span><span>รอบ</span></div>
      ${list.length ? list.map((s, i) => { const t = lastTr(s.code), rd = transferRound.call(this, s, t);
        return `<button class="trow" role="row" data-go="staff-transfer" data-code="${s.code}">
          <span class="n">${i + 1}</span>
          <span class="c-name">${esc(fullName(s))}<small class="num">${s.code}</small></span>
          <span class="c-from">${sch(origin(s))}</span>
          <span class="c-cls"><span class="cls">${esc(s.class || '-')}</span></span>
          <span class="c-to">${t ? sch(dest(s), ` · แจ้ง ${thDate(t.date)}`)
            : `<span class="badge t-warn">ยังไม่บันทึก</span>${s.next_school_text ? `<small>นักเรียนแจ้ง: ${esc(s.next_school_text)}</small>` : ''}`}</span>
          <span class="c-ncls"><span class="cls">${esc((t && t.cls) || s.next_class || '-')}</span>${t ? '' : '<small>นักเรียนแจ้ง</small>'}</span>
          <span class="c-round"><span class="badge ${rd.r === 1 ? 't-info' : 't-violet'}">รอบ ${rd.r}${rd.pending ? '*' : ''}</span>${rd.why ? `<small>${esc(rd.why)}</small>` : ''}</span></button>`; }).join('')
        : '<div class="empty">ไม่พบนักเรียนตามเงื่อนไขนี้</div>'}
    </div>
    <p class="tiny muted">* ป.6 / ม.3 ที่ยังไม่บันทึก: ได้รอบ 1 ถ้าส่งหลักฐานภายใน ${thDate(this.db.cycle.first_cutoff)} ถ้าส่งหลังจากนั้นถึง ${thDate(this.db.cycle.transfer_close)} เป็นรอบ 2</p>`,
    after() { const el = document.getElementById('tq'); if (p.focusQ && el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }};
};
/* ฟอร์มบันทึกการย้ายของนักเรียน 1 คน */
function transferForm(p) {
  const s = this.studentByCode[p.code];
  const e = p.errors || {};
  const mine = this.db.transfers.filter(t => t.code === s.code);
  const last = mine.slice(-1)[0];
  const lastTo = last && this.schoolById[last.to];
  const v = p.values || (last ? {region: lastTo && lastTo.region, province: lastTo && lastTo.province, district: lastTo && lastTo.district, school: last.to,
    cls: last.cls, notified: last.date, note: last.note} : {cls: s.next_class});
  if (!v.cls && !p.errors) v.cls = (last && last.cls) || s.next_class;
  const from = this.schoolById[last ? last.from : s.school] || {};
  const allClasses = Object.values(CLASS_GROUPS).flat();
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <button class="back" data-go="staff-transfer">${icon('back')} รายชื่อนักเรียนแจ้งย้าย</button>
    <div class="page-head"><div><h1>บันทึกการย้ายสถานศึกษา</h1><p class="sub"><span class="num">${s.code}</span> — ${esc(fullName(s))}</p></div>
      ${last ? '<span class="badge t-ok">บันทึกแล้ว</span>' : '<span class="badge t-warn">ยังไม่บันทึก</span>'}</div>
    ${errNote(e)}
    <div class="split">
      <form class="card stack" data-submit="transfer-save" data-code="${s.code}" novalidate>
        <h3>สถานศึกษาใหม่</h3><p class="small muted">ถ้าสุดท้ายเรียนต่อที่เดิม ให้เลือกสถานศึกษาเดิม</p>
        <div class="grid-2" data-area='{"school":true,"required":true,"schoolLabel":"ชื่อสถานศึกษาใหม่"}'>${this.areaPicker('tr', v, {school: true, required: true, schoolLabel: 'ชื่อสถานศึกษาใหม่'})}</div>
        ${e.school ? `<div class="err">${e.school}</div>` : ''}
        <p class="small muted">ไม่พบสถานศึกษา? <button class="btn ghost sm" type="button" data-action="transfer-addschool">+ เพิ่มสถานศึกษาใหม่</button></p>
        <div class="grid-2">
          ${field('t_class', 'ระดับชั้นที่ไปเรียน', select('t_class', allClasses, v.cls, 'เลือกระดับชั้น'), {req: 1, err: e.cls, hint: `นักเรียนแจ้งไว้: ${esc(s.next_class || '-')}`})}
          ${field('notified', 'วันที่แจ้งย้ายสถานศึกษา', input('notified', v.notified, 'type="date"'), {req: 1, err: e.notified})}
        </div>
        ${field('note', 'หมายเหตุของเจ้าหน้าที่', textarea('note', v.note, 'rows="2" placeholder="เช่น ตรวจหนังสือรับรองจากสถานศึกษาใหม่แล้ว"'))}
        <button class="btn primary block" type="submit">${last ? 'บันทึกการแก้ไข' : 'บันทึกการย้ายสถานศึกษา'}</button>
      </form>
      <aside class="stack">
        <section class="card"><h3>ข้อมูลนักเรียน</h3><dl class="kv">
          <div><dt>สถานศึกษาเดิม</dt><dd>${esc(from.name || '-')}<div class="small muted">${esc(from.district || '')} จ.${esc(from.province || '')}</div></dd></div>
          <div><dt>ชั้นปัจจุบัน → ปีหน้า</dt><dd>${esc(s.class || '-')} → ${esc(s.next_class || '-')}</dd></div>
          <div><dt>นักเรียนแจ้งว่าจะไปเรียนที่</dt><dd>${esc(s.next_school_text || 'ยังไม่ทราบ')}</dd></div>
          <div><dt>ประเภททุน / สถานะ</dt><dd>${TYPE[s.type]} · ${badge(s)}</dd></div>
          <div><dt>กำหนดส่งหลักฐาน</dt><dd>${transferDeadlineText.call(this, s)}</dd></div></dl></section>
        ${mine.length ? `<section class="card"><h3>ประวัติการย้าย (${mine.length})</h3><ol class="timeline">${mine.map((t, i) =>
          `<li class="done">ครั้งที่ ${i + 1}: ${esc(this.schoolName(t.from))} → ${esc(this.schoolName(t.to))}${t.cls ? ` (${esc(t.cls)})` : ''}<small>แจ้งย้าย ${thDate(t.date)} · บันทึกโดย ${esc(t.by)}${t.note ? ' · ' + esc(t.note) : ''}</small></li>`).join('')}</ol></section>` : ''}
      </aside>
    </div>`};
}
const transferFilters = (q, level) => {
  const v = id => (document.getElementById(id) || {}).value || '';
  /* เปลี่ยนระดับบน ล้างระดับล่าง */
  const lv = ['rg', 'pv', 'ds', 'sc'].indexOf(level);
  return {state: v('t_state'), round: v('t_round'), cls: v('t_cls'), side: (App._trF || {}).side || 'from', q: q != null ? q : v('tq'),
    region: v('t_rg'), province: lv === 0 ? '' : v('t_pv'), district: lv >= 0 && lv < 2 ? '' : v('t_ds'), school: lv >= 0 && lv < 3 ? '' : v('t_sc')};
};
App.on('transfer-filter', function (el) { this.go('staff-transfer', {f: transferFilters(null, el.dataset.level)}); });
App.on('transfer-state', function (el) { this.go('staff-transfer', {f: {...transferFilters(), state: el.dataset.state}}); });
App.on('transfer-side', function (el) {
  const f = {...transferFilters(null, 'rg'), region: '', side: el.dataset.side};
  if (f.side === 'to' && f.state === 'todo') f.state = 'done';
  this.go('staff-transfer', {f});
});
App.on('transfer-search', function (el) {
  clearTimeout(this._tq);
  /* ค้นหาด้วยรหัสหรือชื่อ: ถ้าไม่เจอในกลุ่มแจ้งย้าย ให้หาจากนักเรียนทั้งหมด */
  this._tq = setTimeout(() => {
    const q = el.value.trim();
    const hit = q.length >= 6 && this.db.students.find(x => x.code.toLowerCase() === q.toLowerCase());
    if (hit && hit.school_next !== 'transfer' && !this.db.transfers.some(t => t.code === hit.code)) { this.go('staff-transfer', {code: hit.code}); return; }
    this.go('staff-transfer', {f: {...transferFilters(q), state: q ? 'all' : document.getElementById('t_state').value}, focusQ: 1});
  }, 300);
});
App.on('transfer-addschool', function () {
  const a = this.readArea('tr');
  this.go('staff-school', {id: 'new', back: this.view.params.code, region: a.region, province: a.province, district: a.district});
});
App.on('transfer-save', function (form) {
  const s = this.studentByCode[form.dataset.code];
  const v = formData(form);
  const a = this.readArea('tr');
  const last = this.db.transfers.filter(t => t.code === s.code).slice(-1)[0];
  const from = last ? last.from : s.school;
  const e = {};
  if (!a.school) e.school = 'กรุณาเลือกสถานศึกษาใหม่';
  if (!v.t_class) e.cls = 'กรุณาเลือกระดับชั้นที่ไปเรียน';
  if (!v.notified) e.notified = 'กรุณาระบุวันที่แจ้งย้ายสถานศึกษา';
  if (Object.keys(e).length) { this.go('staff-transfer', {code: s.code, values: {...a, cls: v.t_class, notified: v.notified, note: v.note}, errors: e}); return; }
  if (last) Object.assign(last, {to: a.school, cls: v.t_class, date: v.notified, note: v.note, by: this.session.name, at: nowIso()});
  else this.db.transfers.push({code: s.code, from, to: a.school, cls: v.t_class, date: v.notified, note: v.note, by: this.session.name, at: nowIso()});
  addHistory(s, `${this.session.name} ${last ? 'แก้ไขการย้าย' : 'บันทึกการย้าย'}: ${a.school === from ? `เรียนที่เดิม ${this.schoolName(from)}` : `${this.schoolName(from)} → ${this.schoolName(a.school)}`} ชั้น ${v.t_class}${s.next_class && s.next_class !== v.t_class ? ` (เดิมแจ้งไว้: ${s.next_class})` : ''}`, 'transfer');
  s.school = a.school;
  s.next_class = v.t_class;
  if (s.status === 'waiting_transfer_proof') { s.status = 'waiting_staff'; addHistory(s, 'ได้รับหลักฐานการย้ายสถานศึกษาแล้ว — รอเจ้าหน้าที่ดำเนินการ', 'transfer_proof'); }
  this.save();
  this.toast(`บันทึกการย้ายสถานศึกษาของ ${fullName(s)} แล้ว`);
  this.go('staff-transfer', {code: s.code});
});

/* ---------- สถานศึกษาและบัญชีครู ---------- */
App.views['staff-schools'] = function (p) {
  { const deny = adminOnly.call(this); if (deny) return deny; }
  const rg = p.region || '', pv = p.province || '', ds = p.district || '';
  const q = (p.q || '').toLowerCase();
  const all = this.db.schools;
  const th = (a, b) => a.localeCompare(b, 'th');
  const count = (arr, key) => arr.reduce((m, s) => (m[s[key]] = (m[s[key]] || 0) + 1, m), {});
  /* ตัวเลือกแสดงเฉพาะพื้นที่ที่มีสถานศึกษา พร้อมจำนวนแห่ง */
  const rgCount = count(all, 'region');
  const inRg = all.filter(s => !rg || s.region === rg);
  const pvCount = count(inRg, 'province');
  const inPv = inRg.filter(s => !pv || s.province === pv);
  const dsCount = count(inPv, 'district');
  const list = inPv.filter(s => (!p.rate || (p.rate === 'special') === !!s.special_rate) && (!ds || s.district === ds) && (!q || (s.name + s.id + ((this.teacherOf(s.id) || {}).username || '')).toLowerCase().includes(q)))
    .sort((a, b) => th(a.province, b.province) || th(a.district, b.district) || th(a.name, b.name));
  const opts = (cnt, label) => Object.keys(cnt).sort((a, b) => th(label(a), label(b))).map(k => [k, `${label(k)} (${cnt[k]})`]);
  const area = rg || pv || ds ? [rg && this.regionName(rg), pv && 'จ.' + pv, ds].filter(Boolean).join(' › ') : 'ทั้งประเทศ';
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <div class="page-head"><div><h1>สถานศึกษาและบัญชีครู</h1><p class="sub">1 โรงเรียน = 1 Username · ${all.length} สถานศึกษา</p></div>
      <button class="btn primary" data-go="staff-school" data-id="new">+ เพิ่มสถานศึกษา</button></div>
    <div class="filters sch-filters">
      ${field('s_q', 'ค้นหา', input('s_q', p.q || '', 'placeholder="ชื่อสถานศึกษา / รหัส / Username" data-oninput="schools-search"'))}
      ${field('s_rg', 'ภาค', select('s_rg', opts(rgCount, k => this.regionName(k)), rg, 'ทุกภาค', 'data-onchange="schools-filter" data-level="rg"'))}
      ${field('s_prov', 'จังหวัด', select('s_prov', opts(pvCount, k => k), pv, 'ทุกจังหวัด', 'data-onchange="schools-filter" data-level="pv"'))}
      ${field('s_dist', 'อำเภอ / เขต', select('s_dist', opts(dsCount, k => k), ds, pv ? 'ทุกอำเภอ' : 'เลือกจังหวัดก่อน', `data-onchange="schools-filter" data-level="ds" ${pv ? '' : 'disabled'}`))}
      ${field('s_rate', 'อัตราทุน ม.ต้น', select('s_rate', [['normal', `อัตราปกติ (${all.filter(x => !x.special_rate).length})`], ['special', `อัตราพิเศษ (${all.filter(x => x.special_rate).length})`]], p.rate, 'ทั้งหมด', 'data-onchange="schools-filter" data-level="grp"'))}
    </div>
    <div class="small muted"><b>${esc(area)}</b> · พบ <b>${list.length}</b> แห่ง</div>
    <div class="tlist sch-list" role="table" aria-label="รายชื่อสถานศึกษา">
      <div class="tlist-head" role="row"><span class="n">ลำดับ</span><span>สถานศึกษา</span><span>จังหวัด / อำเภอ</span><span>บัญชีครู</span><span>สถานะ</span></div>
      ${list.length ? list.map((s, i) => { const t = this.teacherOf(s.id);
        return `<button class="trow" role="row" data-go="staff-school" data-id="${s.id}">
          <span class="n">${i + 1}</span>
          <span class="c-name">${esc(s.name)}<small>${s.id} · ${(s.levels || []).map(l => GROUP_SHORT[l]).join(', ')}${(s.modes || []).length ? ' · ' + s.modes.map(m => m === 'other' ? (s.modes_other || 'อื่น ๆ') : ((STUDY_MODES.find(x => x[0] === m) || [, m])[1]).replace(/ \(.*\)$/, '')).join(', ') : ''}</small>${s.special_rate ? '<span class="badge t-warn sm">อัตราพิเศษ ม.ต้น</span>' : ''}</span>
          <span class="c-area">จ.${esc(s.province)}<small>${esc(s.district)} · ${esc(this.regionName(s.region))}</small></span>
          <span class="c-acc">${t ? `${esc(t.username)}<small>${esc(t.name)}</small>` : '<span class="muted">ยังไม่มีบัญชีครู</span>'}</span>
          <span class="c-status">${t ? `<span class="badge ${t.active === false ? 't-bad' : 't-ok'}">${t.active === false ? 'ปิดใช้งาน' : 'ใช้งาน'}</span>` : ''}</span></button>`; }).join('')
        : '<div class="empty">ไม่พบสถานศึกษาตามเงื่อนไขนี้</div>'}
    </div>`,
    after() { const el = document.getElementById('s_q'); if (p.q != null && p.focusQ && el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }};
};
const schoolFilters = level => {
  const v = id => document.getElementById(id).value;
  /* เปลี่ยนระดับบน ล้างระดับล่าง */
  return {region: v('s_rg'), province: level === 'rg' ? '' : v('s_prov'), district: level === 'ds' || level === 'grp' ? v('s_dist') : '', rate: v('s_rate'), q: v('s_q')};
};
App.on('schools-filter', function (el) { this.go('staff-schools', schoolFilters(el.dataset.level)); });
App.on('schools-search', function (el) {
  clearTimeout(this._sq);
  this._sq = setTimeout(() => this.go('staff-schools', {...schoolFilters('ds'), focusQ: 1}), 250);
});
App.views['staff-school'] = function (p) {
  /* จนท. ที่บันทึกการย้ายเพิ่มสถานศึกษาใหม่ได้ (ไม่พบในระบบ) ส่วนแก้ไขสถานศึกษาเดิมเฉพาะแอดมิน */
  if (!(p.id === 'new' && p.back)) { const deny = adminOnly.call(this); if (deny) return deny; }
  const isNew = p.id === 'new';
  const sc = isNew ? {id: 'SCH-' + String(this.db.schools.length + 1).padStart(3, '0'), type: 'school', levels: [],
    region: p.region || '', province: p.province || '', district: p.district || ''} : this.schoolById[p.id];
  const t = (isNew ? null : this.teacherOf(sc.id)) || {};
  const v = p.values || {name: sc.name, type: sc.type, special_rate: !!sc.special_rate, modes: sc.modes || [], modes_other: sc.modes_other || '', address: sc.address, postcode: sc.postcode, levels: sc.levels, username: t.username || '',
    active: t.active === false ? 'no' : 'yes', t_name: t.name, t_position: t.position, t_dept: t.department, t_phone: t.phone, t_email: t.email,
    region: sc.region, province: sc.province, district: sc.district, sub: sc.subdistrict};
  const e = p.errors || {};
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <button class="back" data-go="${p.back ? 'staff-transfer' : 'staff-schools'}" data-code="${esc(p.back || '')}">${icon('back')} ${p.back ? 'กลับไปบันทึกการย้าย' : 'สถานศึกษาทั้งหมด'}</button>
    <div class="page-head"><div><h1>${isNew ? 'เพิ่ม' : 'แก้ไข'}ข้อมูลสถานศึกษา</h1><p class="sub">${esc(isNew ? '' : sc.name)}</p></div></div>
    ${errNote(e)}
    <form class="stack" data-submit="school-save" data-id="${esc(p.id)}" data-back="${esc(p.back || '')}" novalidate>
      <section class="card"><div class="grid-2">
        ${field('sid', 'InstitutionID', input('sid', sc.id, 'readonly'), {hint: 'ใช้รหัสเดียวกันสำหรับโรงเรียน วิทยาลัย และมหาวิทยาลัย'})}
        ${field('stype', 'ประเภทสถานศึกษา', select('stype', SCHOOL_TYPES, v.type))}
      </div>${radioField('srate', 'อัตราทุน ม.ต้น', [['normal', 'อัตราปกติ', baht(this.rateAmount('M_LOWER'))], ['special', 'อัตราพิเศษ', baht(this.rateAmount('SPECIAL')) + ' · เช่น พระปริยัติธรรม ราชประชานุเคราะห์ ศึกษาสงเคราะห์ มีหอพักให้ฟรี']],
        v.special_rate ? 'special' : 'normal', {hint: 'มีผลเฉพาะนักเรียนที่จะเรียน ม.ต้น ที่สถานศึกษานี้ในปีหน้า'})}${field('sname', 'ชื่อสถานศึกษา', input('sname', v.name), {req: 1, err: e.sname})}</section>
      <section class="card"><h3>พื้นที่และที่อยู่สถานศึกษา</h3>
        <div class="subcard">${field('raw', 'วางที่อยู่แบบยาวเพื่อให้ระบบช่วยแยก (ไม่บังคับ)', textarea('raw', '', 'rows="2" placeholder="เช่น 151 ถนน... ตำบลในเวียง อำเภอเมืองแพร่ จังหวัดแพร่ 54000"'))}
          <div class="row between"><span class="hint">ระบบช่วยกรอกให้เบื้องต้นเท่านั้น Admin ต้องตรวจสอบก่อนบันทึก</span><button class="btn sm" type="button" data-action="school-parse">ช่วยแยกที่อยู่</button></div></div>
        <div class="grid-2" data-area='{"sub":true,"required":true}' data-after="school-zip">${this.areaPicker('sa', v, {sub: true, required: true, err: {district: e.area}})}</div>
        <div class="grid-2">${field('saddr', 'ที่อยู่', input('saddr', v.address, 'placeholder="บ้านเลขที่ หมู่ ถนน อาคาร ฯลฯ"'))}
          ${field('szip', 'รหัสไปรษณีย์', input('szip', v.postcode, 'maxlength="5" inputmode="numeric" placeholder="เช่น 54000"'))}</div></section>
      <section class="card"><h3>ช่วงชั้นที่เปิดสอน</h3>
        <div class="choices">${EDU_GROUPS.map(([k, t]) => `<label class="choice"><input type="checkbox" name="levels" value="${k}" ${(v.levels || []).includes(k) ? 'checked' : ''}> ${t}</label>`).join('')}</div>
        <div class="hint">เลือกได้มากกว่า 1 ช่วงชั้น ใช้เป็นตัวช่วยกรองสถานศึกษาในหน้าสมัครของนักเรียนและหน้ารีวิวของเจ้าหน้าที่</div></section>
      <section class="card"><h3>รูปแบบหลักสูตรที่เปิดสอน</h3>
        <div class="choices col">${STUDY_MODES_PAPER.map(([k, t]) => `<label class="choice"><input type="checkbox" name="modes" value="${k}" ${(v.modes || []).includes(k) ? 'checked' : ''}> ${t}</label>`).join('')}</div>
        ${field('modes_other', 'อื่น ๆ (ระบุ)', input('modes_other', v.modes_other, 'placeholder="เช่น หลักสูตรเทียบโอน / ออนไลน์"'), {err: e.modes_other, hint: 'กรอกเมื่อเลือก “อื่น ๆ” · เลือกได้มากกว่า 1 แบบ ใช้ตรวจกับรูปแบบการเรียนที่นักเรียนกรอกในใบสมัคร'})}</section>
      <section class="card"><h3>บัญชีครู / ผู้ประสานงานทุน</h3>
        <div class="grid-3">
          ${field('username', 'Username', input('username', v.username, 'autocapitalize="off"'), {req: 1, err: e.username})}
          ${field('active', 'สถานะบัญชี', select('active', [['yes', 'ใช้งาน'], ['no', 'ปิดใช้งาน']], v.active))}
          <div class="field"><span class="label">Password</span><button class="btn" type="button" data-action="school-pw">ตั้ง / รีเซ็ตรหัสผ่าน</button></div>
        </div>
        <div class="grid-2">
          ${field('t_name', 'ชื่อครูผู้ดูแลทุน', input('t_name', v.t_name))}
          ${field('t_position', 'ตำแหน่งครู', input('t_position', v.t_position, 'placeholder="เช่น ครู / อาจารย์ / เจ้าหน้าที่"'))}
          ${field('t_dept', 'งาน / ฝ่ายที่รับผิดชอบ', input('t_dept', v.t_dept, 'placeholder="เช่น งานแนะแนว / งานทุนการศึกษา / กองพัฒนานักศึกษา"'))}
          ${field('t_phone', 'หมายเลขโทรศัพท์', input('t_phone', v.t_phone, 'inputmode="tel"'))}
          ${field('t_email', 'อีเมล', input('t_email', v.t_email, 'type="email"'))}
        </div></section>
      <div class="row end"><button class="btn" type="button" data-go="${p.back ? 'staff-transfer' : 'staff-schools'}" data-code="${esc(p.back || '')}">ปิด</button>
        <button class="btn primary" type="submit">บันทึกสถานศึกษา</button></div>
    </form>`, after: focusFirstError};
};
App.on('school-zip', function () {
  const a = this.readArea('sa');
  const sub = this.subdistrictsOf(a.province, a.district).find(x => x.th === a.sub);
  if (sub) document.getElementById('szip').value = sub.zip;
});
App.on('school-parse', function () {
  const raw = document.getElementById('raw').value.replace(/\s+/g, ' ').trim();
  if (!raw) { this.toast('กรุณาวางที่อยู่ก่อน'); return; }
  const pv = (/(?:จังหวัด|จ\.)\s*([^\s\d]+)/.exec(raw) || [])[1] || (/กรุงเทพ/.test(raw) ? 'กรุงเทพมหานคร' : '');
  const prov = this.data.geo.provinces.find(p => p.th === pv);
  if (!prov) { this.toast('ไม่พบชื่อจังหวัดในที่อยู่ กรุณาเลือกเอง'); return; }
  const region = this.data.geo.regions.find(r => r.id === prov.r).code;
  const dn = (/(?:อำเภอ|อ\.|เขต)\s*([^\s\d]+)/.exec(raw) || [])[1] || '';
  const dist = this.districtsOf(pv).find(d => d.replace(/^(อำเภอ|เขต)/, '') === dn) || '';
  const sn = (/(?:ตำบล|ต\.|แขวง)\s*([^\s\d]+)/.exec(raw) || [])[1] || '';
  const sub = dist ? this.subdistrictsOf(pv, dist).find(x => x.th.replace(/^(ตำบล|แขวง)/, '') === sn) : null;
  const line = raw.split(/\s(?:ตำบล|ต\.|แขวง|อำเภอ|อ\.|เขต|จังหวัด|จ\.)/)[0];
  const zip = (/\b(\d{5})\b/.exec(raw) || [])[1] || (sub ? sub.zip : '');
  const form = document.querySelector('form[data-submit=school-save]');
  const v = {...formData(form), name: document.getElementById('sname').value, type: document.getElementById('stype').value, special_rate: (document.querySelector('[name=srate]:checked') || {}).value === 'special', modes: arr(formData(form).modes), modes_other: document.getElementById('modes_other').value, levels: arr(formData(form).levels),
    username: document.getElementById('username').value, active: document.getElementById('active').value,
    region, province: pv, district: dist, sub: sub ? sub.th : '', address: line, postcode: zip};
  this.go('staff-school', {...this.view.params, values: v});
  this.toast('แยกที่อยู่แล้ว กรุณาตรวจสอบก่อนบันทึก');
});
App.on('school-pw', function () {
  const t = this.db.teachers.find(x => x.school === this.view.params.id);
  if (!t) { this.toast('บันทึกสถานศึกษาก่อน จึงจะตั้งรหัสผ่านได้'); return; }
  const pw = 'Tf' + Math.random().toString(36).slice(2, 8) + '!';
  t.password = pw;
  this.auditLog('รีเซ็ตรหัสผ่าน', t.username, 'บัญชีครู');
  this.save();
  this.toast(`รีเซ็ตรหัสผ่านของ ${t.username} แล้ว · รหัสผ่านชั่วคราว ${pw}`);
});
App.on('school-save', function (form) {
  const v = formData(form);
  const a = this.readArea('sa');
  const isNew = form.dataset.id === 'new';
  const id = isNew ? 'SCH-' + String(this.db.schools.length + 1).padStart(3, '0') : form.dataset.id;
  const e = {};
  if (!v.sname) e.sname = 'กรุณากรอกชื่อสถานศึกษา';
  else if (this.db.schools.some(s => s.id !== id && s.name === v.sname && s.district === a.district)) e.sname = 'มีสถานศึกษาชื่อนี้ในอำเภอนี้แล้ว';
  if (!a.district) e.area = 'กรุณาเลือกภาค จังหวัด และอำเภอ / เขต';
  if (arr(v.modes).includes('other') && !(v.modes_other || '').trim()) e.modes_other = 'กรุณาระบุรูปแบบหลักสูตรอื่น ๆ';
  const uname = (v.username || '').toLowerCase();
  if (!uname) e.username = 'กรุณากำหนด Username';
  else if (this.db.teachers.some(t => t.username === uname && t.school !== id)) e.username = 'Username นี้ถูกใช้แล้ว (1 โรงเรียน = 1 Username)';
  const values = {name: v.sname, type: v.stype, special_rate: v.srate === 'special', modes: arr(v.modes), modes_other: v.modes_other, address: v.saddr, postcode: v.szip, levels: arr(v.levels), username: v.username, active: v.active,
    t_name: v.t_name, t_position: v.t_position, t_dept: v.t_dept, t_phone: v.t_phone, t_email: v.t_email, ...a};
  if (Object.keys(e).length) { this.go('staff-school', {...this.view.params, values, errors: e}); return; }
  const rec = {id, name: v.sname, type: v.stype, special_rate: v.srate === 'special', modes: arr(v.modes), modes_other: arr(v.modes).includes('other') ? (v.modes_other || '').trim() : '', region: a.region, province: a.province, district: a.district, subdistrict: a.sub,
    address: v.saddr, postcode: v.szip, levels: arr(v.levels)};
  if (isNew) this.db.schools.push(rec); else Object.assign(this.schoolById[id], rec);
  const t = this.db.teachers.find(x => x.school === id);
  const trec = {username: uname, name: v.t_name, position: v.t_position, department: v.t_dept, phone: v.t_phone, email: v.t_email, school: id, active: v.active !== 'no'};
  if (t) Object.assign(t, trec); else this.db.teachers.push(trec);
  this.save();
  this.toast('บันทึกสถานศึกษาแล้ว');
  if (form.dataset.back) this.go('staff-transfer', {code: form.dataset.back, values: {region: a.region, province: a.province, district: a.district, school: id}});
  else this.go('staff-schools');
});

/* ---------- รายงาน / Export ---------- */
const REPORT_TYPES = [['all', 'ผู้สมัครทั้งหมด'], ['approved', 'อนุมัติทุน'], ['rejected', 'ไม่ผ่าน'], ['reserve', 'สำรอง'], ['ineligible', 'ไม่เข้าเกณฑ์'],
  ['special', 'ปรับเงินเป็นรายคน'], ['budget', 'งบประมาณทุน'], ['schools', 'สถานศึกษา'], ['backlog', 'งานค้างดำเนินการ']];
App.reportData = function (f) {
  const list = this.db.students.filter(s => {
    const sc = this.schoolById[s.school] || {};
    const d = s.decision;
    return (!f.decision || (d && d.result === f.decision)) && (!f.type || s.type === f.type) && (!f.round || String(s.round || '') === f.round)
      && (!f.move || s.school_next === f.move) && (!f.rate || (f.rate === 'special') === this.stdRate(s).special)
      && (!f.region || sc.region === f.region) && (!f.province || sc.province === f.province) && (!f.district || sc.district === f.district)
      && (!f.levels.length || f.levels.includes(s.rate) || (f.levels.includes('SPECIAL') && d && d.approved_amount != null && d.approved_amount !== d.standard_amount));
  });
  const k = f.kind;
  const pick = {approved: s => s.decision && s.decision.result === 'approved', rejected: s => s.decision && s.decision.result === 'rejected',
    reserve: s => s.decision && s.decision.result === 'reserve', ineligible: s => s.decision && s.decision.result === 'ineligible',
    special: s => s.decision && s.decision.result === 'approved' && s.decision.approved_amount !== s.decision.standard_amount,
    backlog: s => s.status !== 'decided'}[k] || (() => true);
  if (k === 'budget') {
    const ap = list.filter(s => s.decision && s.decision.result === 'approved');
    const cols = [{t: 'ระดับชั้นปีที่ได้รับทุน'}, {t: 'อัตรา', r: 1}, {t: 'จำนวน (คน)', r: 1}, {t: 'งบประมาณ', r: 1}];
    const sum = g => g.reduce((a, s) => a + s.decision.approved_amount, 0);
    const std = s => s.decision.approved_amount === s.decision.standard_amount;
    const data = this.db.rates.map(r => {
      const g = ap.filter(s => r.code === 'SPECIAL' ? !std(s) : s.rate === r.code && std(s) && !(r.code === 'M_LOWER' && s.decision.special_rate));
      return [r.code === 'SPECIAL' ? 'ปรับเป็นรายคน' : r.name, r.amount, g.length, sum(g)]; });
    /* ม.ต้น อัตราพิเศษ แยกบรรทัด ต่อจาก ม.ต้น ปกติ */
    const sp = ap.filter(s => s.decision.special_rate && std(s));
    const grp = [['มัธยมศึกษาตอนต้น — อัตราพิเศษ', this.rateAmount('SPECIAL'), sp.length, sum(sp)]];
    const at = this.db.rates.findIndex(r => r.code === 'M_LOWER') + 1;
    data.splice(at, 0, ...grp);
    return {cols, rows: data.map(r => [esc(r[0]), baht(r[1]), r[2], baht(r[3])]), foot: ['รวม', '', ap.length, baht(sum(ap))],
      csv: [cols.map(c => c.t)].concat(data)};
  }
  if (k === 'schools') {
    const cols = [{t: 'สถานศึกษา'}, {t: 'จังหวัด'}, {t: 'ผู้สมัคร', r: 1}, {t: 'ส่งถึงมูลนิธิฯ', r: 1}, {t: 'อนุมัติ', r: 1}, {t: 'งบประมาณ', r: 1}];
    const by = {};
    list.forEach(s => (by[s.school] = by[s.school] || []).push(s));
    const data = Object.entries(by).map(([id, g]) => { const ap = g.filter(s => s.decision && s.decision.result === 'approved');
      return [this.schoolName(id), (this.schoolById[id] || {}).province || '', g.length, g.filter(s => SENT.includes(s.status)).length, ap.length, ap.reduce((a, s) => a + s.decision.approved_amount, 0)]; })
      .sort((a, b) => b[2] - a[2]);
    return {cols, rows: data.map(r => [esc(r[0]), esc(r[1]), r[2], r[3], r[4], baht(r[5])]), csv: [cols.map(c => c.t)].concat(data)};
  }
  const rows = list.filter(pick);
  const cols = [{t: 'รหัส'}, {t: 'ชื่อ–นามสกุล'}, {t: 'สถานศึกษา'}, {t: 'จังหวัด'}, {t: 'ชั้นปี ' + this.db.cycle.year}, {t: 'ทุน'}, {t: 'รอบ'}, {t: 'สถานะ / ผล'}, {t: 'จำนวนเงิน', r: 1}];
  const data = rows.map(s => [s.code, fullName(s), this.schoolName(s.school), (this.schoolById[s.school] || {}).province || '', s.next_class || '', TYPE[s.type], s.round || '',
    s.decision ? DECISION[s.decision.result].label : STATUS[s.status].label, s.decision && s.decision.approved_amount || '']);
  return {cols, rows: data.map(r => r.map((x, i) => i === 8 ? (x ? baht(x) : '—') : esc(x))),
    foot: k === 'approved' || k === 'special' ? ['รวม', `${rows.length} คน`, '', '', '', '', '', '', baht(rows.reduce((a, s) => a + (s.decision.approved_amount || 0), 0))] : null,
    csv: [cols.map(c => c.t)].concat(data)};
};
App.views['staff-reports'] = function (p) {
  { const deny = adminOnly.call(this); if (deny) return deny; }
  const f = this._repF || {kind: 'all', levels: []};
  const r = this.reportData(f);
  this._lastCsv = r.csv;
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <div class="page-head"><div><h1>รายงาน / Export</h1><p class="sub">สรุปผลการพิจารณา จำนวนทุน และงบประมาณ โดยใช้ข้อมูลชุดเดียวกับผลอนุมัติจริง</p></div></div>
    <section class="stack no-print"><h3>ประเภทรายงาน</h3><div class="choices">${REPORT_TYPES.map(([k, t]) =>
      `<button class="btn sm ${k === f.kind ? 'primary' : ''}" type="button" data-action="report-kind" data-kind="${k}">${t}</button>`).join('')}</div></section>
    <form class="card no-print" data-submit="report-filter" novalidate><h3>สร้างรายงาน</h3>
      <div class="grid-4">
        ${field('r_year', 'ปีทุนการศึกษา', select('r_year', [String(this.db.cycle.year)], String(this.db.cycle.year)))}
        ${field('r_dec', 'ผลพิจารณา', select('r_dec', Object.entries(DECISION).map(([k, d]) => [k, d.label]), f.decision, 'ทั้งหมด'))}
        ${field('r_type', 'ประเภททุน', select('r_type', [['NEW', 'ทุนใหม่'], ['CONT', 'ทุนต่อเนื่อง']], f.type, 'ทั้งหมด'))}
        ${field('r_round', 'รอบ', select('r_round', [['1', 'รอบ 1'], ['2', 'รอบ 2']], f.round, 'ทั้งหมด'))}
        ${field('r_rate', 'อัตราทุน', select('r_rate', [['normal', 'อัตราปกติ'], ['special', 'อัตราพิเศษ']], f.rate, 'ทั้งหมด'))}
        ${field('r_move', 'สถานศึกษาปีหน้า', select('r_move', [['transfer', 'ย้ายสถานศึกษา'], ['same', 'เรียนต่อที่เดิม']], f.move, 'ทั้งหมด'))}
      </div>
      <div class="field"><span class="label">พื้นที่</span><div class="grid-3" data-area='{"any":true}'>${this.areaPicker('ra', f, {any: true})}</div></div>
      <div class="field"><span class="label">ระดับชั้นปี ${this.db.cycle.year} (เลือกได้มากกว่า 1)</span>
        <div class="choices">${[['P6', 'ป.6'], ['M_LOWER', 'ม.ต้น'], ['M_UPPER', 'ม.ปลาย'], ['PVC', 'ปวช.'], ['PVS', 'ปวส.'], ['PVS_IND', 'ปวส. อุตสาหกรรม'], ['BACHELOR', 'ป.ตรี'], ['SPECIAL', 'ปรับเป็นรายคน']]
          .map(([k, t]) => `<label class="choice"><input type="checkbox" name="r_levels" value="${k}" ${f.levels.includes(k) ? 'checked' : ''}> ${t}</label>`).join('')}</div></div>
      <div class="row between"><button class="btn primary" type="submit">แสดงรายงาน</button>
        <div class="row"><button class="btn" type="button" data-action="report-export">Export Excel</button><button class="btn" type="button" data-action="print">${icon('print')} พิมพ์ / PDF</button></div></div>
    </form>
    <section class="stack"><h3>${REPORT_TYPES.find(x => x[0] === f.kind)[1]} · ${r.rows.length} รายการ</h3>${tbl(r.cols, r.rows, r.foot)}</section>
    <section class="stack no-print"><h3>อัตราทุน ปีการศึกษา ${this.db.cycle.year}</h3>
      ${tbl([{t: 'ระดับชั้นปีที่ได้รับทุน'}, {t: 'จำนวนเงินทุน/คน/ปี', r: 1}], this.db.rates.map(x => [esc(x.name), baht(x.amount)]))}
      <p class="small muted">อัตราทุนอ้างอิง “ระดับชั้นปีการศึกษา ${this.db.cycle.year}” ซึ่งเป็นปีที่ผู้สมัครได้รับทุน ไม่ใช่ระดับชั้นขณะสมัครในปี ${this.db.cycle.history_year}</p></section>`};
};
App.on('report-kind', function (el) { this._repF = {...(this._repF || {levels: []}), kind: el.dataset.kind}; this.go('staff-reports'); });
App.on('report-filter', function (form) {
  const v = formData(form);
  const a = this.readArea('ra');
  this._repF = {kind: (this._repF || {}).kind || 'all', decision: v.r_dec, type: v.r_type, round: v.r_round, move: v.r_move, rate: v.r_rate, region: a.region, province: a.province, district: a.district, levels: arr(v.r_levels)};
  this.go('staff-reports');
});
App.on('report-export', function () {
  const csv = '﻿' + this._lastCsv.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    a.download = `report-${this.db.cycle.year}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { /* ดาวน์โหลดไม่ได้ในหน้าต่างนี้ */ }
  this.toast('สร้างไฟล์ CSV (เปิดด้วย Excel ได้) — ถ้าไม่ดาวน์โหลด ให้เปิดไฟล์บนเครื่องโดยตรง');
});

/* ---------- PDPA ---------- */
App.views['staff-pdpa'] = function () {
  { const deny = adminOnly.call(this); if (deny) return deny; }
  const d = this.db.pdpa;
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <div class="page-head"><div><h1>PDPA / Privacy Notice</h1></div></div>
    <form class="card" data-submit="pdpa-save" novalidate>
      <div class="grid-2">${field('p_ver', 'เวอร์ชัน Privacy Notice', input('p_ver', d.version))}${field('p_eff', 'วันที่มีผล', input('p_eff', d.effective, 'type="date"'))}</div>
      ${field('p_url', 'ลิงก์ Privacy Notice', input('p_url', d.url, 'type="url"'))}
      <div class="note info small">ระบบควรบันทึกเวอร์ชัน Privacy Notice และวัน-เวลาที่ผู้สมัครรับทราบ ณ ตอนกดส่งใบสมัคร</div>
      <div class="row end"><button class="btn primary" type="submit">บันทึก</button></div>
    </form>`};
};
App.on('pdpa-save', function (form) {
  const v = formData(form);
  Object.assign(this.db.pdpa, {version: v.p_ver, effective: v.p_eff, url: v.p_url});
  this.save();
  this.toast('บันทึก Privacy Notice แล้ว');
});

/* ---------- ผู้ใช้งาน (เฉพาะแอดมินระบบ) ---------- */
App.auditLog = function (action, target, detail) {
  (this.db.audit = this.db.audit || []).push({at: nowIso(), by: this.session.name || this.session.staff, action, target, detail: detail || ''});
};
const USER_ROLES = [['reviewer', 'จนท.รีวิว'], ['manager', 'ผจก.อนุมัติทุน'], ['admin', 'แอดมินระบบ'], ['teacher', 'ครู / สถานศึกษา']];
function adminOnly() {
  return this.session.staffRole === 'admin' ? null : {nav: this.staffNav(), html: `${this.roleBar()}<section class="card"><h2>เฉพาะแอดมินระบบ</h2>
    <p class="muted">หน้านี้เข้าได้เฉพาะบทบาท “แอดมินระบบ”</p></section>`};
}
App.views['staff-users'] = function (p) {
  const deny = adminOnly.call(this); if (deny) return deny;
  const f = p.f || this._usF || {};
  this._usF = f;
  const q = (f.q || '').toLowerCase();
  /* เฉพาะบัญชีเจ้าหน้าที่มูลนิธิฯ — บัญชีครูจัดการที่หน้าสถานศึกษา/ครู */
  const rows = this.staffList().map(u => ({username: u.username, name: u.name, role: u.role, active: u.active !== false, last: u.last_login, position: u.position, email: u.email}))
    .filter(u => (!f.role || u.role === f.role) && (!f.state || (f.state === 'on') === u.active)
      && (!q || (u.username + u.name + (u.email || '')).toLowerCase().includes(q)));
  const roleName = r => (USER_ROLES.find(x => x[0] === r) || [, r])[1];
  const nStaff = this.staffList().length;
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <div class="page-head"><div><h1>ผู้ใช้งาน</h1><p class="sub">บัญชีเจ้าหน้าที่มูลนิธิฯ ${nStaff} บัญชี · บัญชีครูจัดการที่เมนู “สถานศึกษา/ครู”</p></div>
      <button class="btn primary" data-go="staff-user" data-u="new">+ เพิ่มบัญชีเจ้าหน้าที่</button></div>
    <div class="filters us-filters">
      ${field('u_q', 'ค้นหา', input('u_q', f.q || '', 'placeholder="Username / ชื่อ / อีเมล" data-oninput="users-search"'))}
      ${field('u_role', 'บทบาท', select('u_role', USER_ROLES.filter(r => r[0] !== 'teacher'), f.role, 'ทุกบทบาท', 'data-onchange="users-filter"'))}
      ${field('u_state', 'สถานะ', select('u_state', [['on', 'ใช้งาน'], ['off', 'ปิดใช้งาน']], f.state, 'ทั้งหมด', 'data-onchange="users-filter"'))}
    </div>
    <div class="small muted">พบ <b>${rows.length}</b> บัญชี</div>
    <div class="tlist us-list" role="table" aria-label="ผู้ใช้งาน">
      <div class="tlist-head" role="row"><span class="n">ลำดับ</span><span>Username</span><span>ชื่อ</span><span>บทบาท</span><span>อีเมล</span><span>สถานะ</span><span>เข้าใช้ล่าสุด</span></div>
      ${rows.length ? rows.map((u, i) => `<button class="trow" role="row" data-go="staff-user" data-u="${u.username}">
        <span class="n">${i + 1}</span><span class="num"><b>${esc(u.username)}</b></span><span>${esc(u.name || '-')}<small>${esc(u.position || '')}</small></span>
        <span><span class="badge ${u.role === 'admin' ? 't-bad' : u.role === 'manager' ? 't-violet' : 't-info'}">${roleName(u.role)}</span></span>
        <span class="small">${esc(u.email || '—')}</span>
        <span><span class="badge ${u.active ? 't-ok' : 't-bad'}">${u.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</span></span>
        <span class="small muted">${u.last ? thDate(u.last, true) : 'ยังไม่เคยเข้าใช้'}</span></button>`).join('') : '<div class="empty">ไม่พบบัญชีตามเงื่อนไขนี้</div>'}
    </div>
    ${(this.db.audit || []).length ? `<section class="card"><h3>ประวัติการแก้ไขบัญชี (ล่าสุด)</h3><ol class="timeline">${this.db.audit.slice(-10).reverse().map(a =>
      `<li class="done">${esc(a.action)}: <b>${esc(a.target)}</b>${a.detail ? ' — ' + esc(a.detail) : ''}<small>${thDate(a.at, true)} · ${esc(a.by)}</small></li>`).join('')}</ol></section>` : ''}`,
    after() { const el = document.getElementById('u_q'); if (p.focusQ && el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }};
};
const userFilters = q => ({q: q != null ? q : document.getElementById('u_q').value, role: document.getElementById('u_role').value, state: document.getElementById('u_state').value});
App.on('users-filter', function () { this.go('staff-users', {f: userFilters()}); });
App.on('users-search', function (el) { clearTimeout(this._uq); this._uq = setTimeout(() => this.go('staff-users', {f: userFilters(el.value), focusQ: 1}), 250); });

App.views['staff-user'] = function (p) {
  const deny = adminOnly.call(this); if (deny) return deny;
  const isNew = p.u === 'new';
  const u = isNew ? {active: true, role: 'reviewer'} : this.staffList().find(x => x.username === p.u);
  const v = p.values || {username: u.username || '', name: u.name || '', position: u.position || '', email: u.email || '', role: u.role, active: u.active === false ? 'no' : 'yes'};
  const e = p.errors || {};
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <button class="back" data-go="staff-users">${icon('back')} ผู้ใช้งานทั้งหมด</button>
    <div class="page-head"><div><h1>${isNew ? 'เพิ่มบัญชีเจ้าหน้าที่' : 'แก้ไขบัญชี ' + esc(u.username)}</h1><p class="sub">${isNew ? 'รหัสผ่านเริ่มต้นจะแสดงหลังบันทึก' : `เข้าใช้ล่าสุด: ${u.last_login ? thDate(u.last_login, true) : 'ยังไม่เคยเข้าใช้'}`}</p></div></div>
    ${errNote(e)}
    <form class="card stack" data-submit="user-save" data-u="${esc(p.u)}" novalidate>
      <div class="grid-2">
        ${field('us_username', 'Username', input('us_username', v.username, `autocapitalize="off" ${isNew ? '' : 'readonly'}`), {req: 1, err: e.username, hint: isNew ? 'ภาษาอังกฤษตัวเล็ก ตัวเลข จุด หรือขีดล่าง' : 'Username เปลี่ยนไม่ได้'})}
        ${field('us_name', 'ชื่อ–นามสกุล', input('us_name', v.name), {req: 1, err: e.name})}
        ${field('us_position', 'ตำแหน่ง', input('us_position', v.position))}
        ${field('us_email', 'อีเมล', input('us_email', v.email, 'type="email"'), {err: e.email})}
      </div>
      ${radioField('us_role', 'บทบาท', USER_ROLES.filter(r => r[0] !== 'teacher').map(([k, t]) => [k, t, ROLE[k][1]]), v.role, {req: 1, err: e.role, col: 1})}
      ${radioField('us_active', 'สถานะบัญชี', [['yes', 'ใช้งาน'], ['no', 'ปิดใช้งาน']], v.active, {err: e.active})}
      <div class="row between">${isNew ? '<span></span>' : `<button class="btn" type="button" data-action="user-reset" data-u="${esc(u.username)}">รีเซ็ตรหัสผ่าน</button>`}
        <button class="btn primary" type="submit">บันทึก</button></div>
    </form>`};
};
App.on('user-save', function (form) {
  const v = formData(form);
  const isNew = form.dataset.u === 'new';
  const list = this.db.staffUsers = this.staffList();
  const u = isNew ? null : list.find(x => x.username === form.dataset.u);
  const uname = (isNew ? v.us_username || '' : u.username).trim().toLowerCase();
  const e = {};
  if (isNew) {
    if (!uname) e.username = 'กรุณากำหนด Username';
    else if (!/^[a-z0-9._]{3,}$/.test(uname)) e.username = 'ใช้ภาษาอังกฤษตัวเล็ก ตัวเลข จุด หรือขีดล่าง อย่างน้อย 3 ตัว';
    else if (list.some(x => x.username === uname) || this.db.teachers.some(t => t.username === uname)) e.username = 'Username นี้ถูกใช้แล้ว';
  }
  if (!(v.us_name || '').trim()) e.name = 'กรุณากรอกชื่อ–นามสกุล';
  if (v.us_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.us_email)) e.email = 'รูปแบบอีเมลไม่ถูกต้อง';
  if (!v.us_role) e.role = 'กรุณาเลือกบทบาท';
  /* กันพลาด: ต้องเหลือแอดมินที่ใช้งานอย่างน้อย 1 บัญชี */
  const staysAdmin = v.us_role === 'admin' && v.us_active !== 'no';
  if (u && u.role === 'admin' && u.active !== false && !staysAdmin && list.filter(x => x.role === 'admin' && x.active !== false).length <= 1)
    e.active = 'ต้องมีแอดมินระบบที่ใช้งานอย่างน้อย 1 บัญชี — เปลี่ยนบทบาทหรือปิดบัญชีนี้ไม่ได้';
  const values = {username: uname, name: v.us_name, position: v.us_position, email: v.us_email, role: v.us_role, active: v.us_active};
  if (Object.keys(e).length) { this.go('staff-user', {u: form.dataset.u, values, errors: e}); return; }
  const rec = {name: v.us_name.trim(), position: v.us_position || '', email: v.us_email || '', role: v.us_role, active: v.us_active !== 'no'};
  if (isNew) {
    const pw = 'Tf' + Math.random().toString(36).slice(2, 8) + '!';
    list.push({username: uname, ...rec, password: pw});
    this.auditLog('เพิ่มบัญชีเจ้าหน้าที่', uname, ROLE[rec.role][0]);
    this.save();
    this.toast(`เพิ่มบัญชี ${uname} แล้ว · รหัสผ่านเริ่มต้น ${pw}`);
  } else {
    const changes = [u.role !== rec.role && `บทบาท ${ROLE[u.role][0]} → ${ROLE[rec.role][0]}`, (u.active !== false) !== rec.active && (rec.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'),
      u.name !== rec.name && 'แก้ชื่อ'].filter(Boolean);
    Object.assign(u, rec);
    this.auditLog('แก้ไขบัญชี', uname, changes.join(', ') || 'แก้ไขข้อมูลติดต่อ');
    this.save();
    this.toast('บันทึกบัญชีแล้ว');
  }
  this.go('staff-users');
});
App.on('user-reset', function (el) {
  const u = this.staffList().find(x => x.username === el.dataset.u);
  const pw = 'Tf' + Math.random().toString(36).slice(2, 8) + '!';
  u.password = pw;
  this.auditLog('รีเซ็ตรหัสผ่าน', u.username);
  this.save();
  this.toast(`รีเซ็ตรหัสผ่านของ ${u.username} แล้ว · รหัสผ่านชั่วคราว ${pw}`);
});

/* ตัวกรองระดับชั้น: ติ๊กช่วงชั้น = เลือก/ไม่เลือกทุกชั้นในช่วงนั้น, ติ๊กรายชั้นแล้วช่วงชั้นติ๊กตามเมื่อครบ */
App.on('lv-group', function (el) {
  el.form.querySelectorAll(`[name=f_classes][data-g="${el.dataset.group}"]`).forEach(x => { x.checked = el.checked; });
});
App.on('lv-class', function (el) {
  const all = [...el.form.querySelectorAll(`[name=f_classes][data-g="${el.dataset.g}"]`)];
  el.form.querySelector(`[data-group="${el.dataset.g}"]`).checked = all.every(x => x.checked);
});

/* ---------- ประกาศรายชื่อผู้ได้รับทุน (เฉพาะแอดมินระบบ) ----------
   ลำดับ: ภาค → จังหวัด (ก-ฮ) → สถานศึกษา (ก-ฮ) → ทุนต่อเนื่องก่อน แล้วทุนใหม่ → ชั้น (ป.6 → ป.ตรี) → หญิงก่อนชาย → ชื่อ (ก-ฮ)
   ลำดับที่นับต่อเนื่องทั้งประกาศ · ชั้น = ชั้นในปีที่ได้รับทุน */
const CLASS_ORDER = Object.values(CLASS_GROUPS).flat();
const ANN_LEVELS = [['ประถม (ป.6)', c => c === 'ป.6'], ['ม.ต้น', c => /^ม\.[123]$/.test(c)], ['ม.ปลาย', c => /^ม\.[456]$/.test(c)],
  ['ปวช.', c => /^ปวช/.test(c)], ['ปวส.', c => /^ปวส/.test(c)], ['ปริญญาตรี', c => /^ปริญญาตรี/.test(c)]];
App.announceData = function () {
  const th = (a, b) => (a || '').localeCompare(b || '', 'th');
  const regionOrder = this.data.geo.regions.map(r => r.code);
  const list = this.db.students.filter(s => s.decision && s.decision.result === 'approved')
    .map(s => ({s, sc: this.schoolById[s.school] || {}, cls: s.next_class || s.class, amt: s.decision.approved_amount || 0}));
  list.sort((a, b) => regionOrder.indexOf(a.sc.region) - regionOrder.indexOf(b.sc.region) || th(a.sc.province, b.sc.province) || th(a.sc.name, b.sc.name)
    || (a.s.type === b.s.type ? 0 : a.s.type === 'CONT' ? -1 : 1) || CLASS_ORDER.indexOf(a.cls) - CLASS_ORDER.indexOf(b.cls)
    || (a.s.gender === b.s.gender ? 0 : a.s.gender === 'หญิง' ? -1 : 1) || th(a.s.first_name, b.s.first_name));
  list.forEach((x, i) => { x.no = i + 1; });
  return list;
};
App.views['staff-announce'] = function () {
  { const deny = adminOnly.call(this); if (deny) return deny; }
  const list = this.announceData();
  const total = list.reduce((a, x) => a + x.amt, 0);
  const lv = ANN_LEVELS.map(([t, test]) => { const g = list.filter(x => test(x.cls)); return [t, g.length, g.reduce((a, x) => a + x.amt, 0)]; });
  /* จัดกลุ่ม ภาค → จังหวัด → สถานศึกษา → ประเภททุน */
  const groups = [];
  list.forEach(x => {
    let r = groups[groups.length - 1];
    if (!r || r.code !== x.sc.region) groups.push(r = {code: x.sc.region, provs: []});
    let p = r.provs[r.provs.length - 1];
    if (!p || p.name !== x.sc.province) r.provs.push(p = {name: x.sc.province, schools: []});
    let c = p.schools[p.schools.length - 1];
    if (!c || c.id !== x.sc.id) p.schools.push(c = {id: x.sc.id, name: x.sc.name, district: x.sc.district, types: []});
    let t = c.types[c.types.length - 1];
    if (!t || t.type !== x.s.type) c.types.push(t = {type: x.s.type, rows: []});
    t.rows.push(x);
  });
  this._annCsv = [['ลำดับ', 'ภาค', 'จังหวัด', 'สถานศึกษา', 'ประเภททุน', 'ชั้น', 'เพศ', 'ชื่อ–นามสกุล', 'จำนวนเงิน (บาท)']]
    .concat(list.map(x => [x.no, this.regionName(x.sc.region), x.sc.province, x.sc.name, TYPE[x.s.type], x.cls, x.s.gender, fullName(x.s), x.amt]));
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <div class="page-head no-print"><div><h1>ประกาศรายชื่อผู้ได้รับทุน</h1><p class="sub">เฉพาะผู้ที่ผู้จัดการอนุมัติทุนแล้ว · ปีการศึกษา ${this.db.cycle.year}</p></div>
      <div class="row"><button class="btn" data-action="announce-export">Export Excel</button><button class="btn primary" data-action="print">${icon('print')} พิมพ์ / PDF</button></div></div>
    <div class="ann paper">
      <h3>ประกาศรายชื่อผู้ได้รับทุนการศึกษา มูลนิธิทิสโก้ เพื่อการกุศล<br>ปีการศึกษา ${this.db.cycle.year}</h3>
      <section class="ann-sum">
        <div class="ann-total"><span>จำนวนเงินทุนทั้งหมด</span><b>${baht(total)}</b><small>${list.length} ทุน</small></div>
        <table><thead><tr><th>ระดับชั้น</th><th class="r">จำนวน (ทุน)</th><th class="r">จำนวนเงิน</th></tr></thead>
          <tbody>${lv.map(r => `<tr><td>${r[0]}</td><td class="r">${r[1]}</td><td class="r">${baht(r[2])}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td>รวม</td><td class="r">${list.length}</td><td class="r">${baht(total)}</td></tr></tfoot></table>
      </section>
      ${groups.length ? groups.map(r => `<h4 class="ann-region">${esc(this.regionName(r.code))}</h4>${r.provs.map(p => `
        <h5 class="ann-prov">จังหวัด${esc(p.name)}</h5>${p.schools.map(c => `
          <div class="ann-school"><b>${esc(c.name)}</b> <span class="muted small">${esc(c.district || '')}</span></div>
          <table class="ann-tbl"><thead><tr><th class="n">ลำดับ</th><th>ชื่อ–นามสกุล</th><th>ชั้น</th><th class="r">จำนวนเงิน</th></tr></thead><tbody>
          ${c.types.map(t => `<tr class="ann-type"><td colspan="4">${TYPE[t.type]}</td></tr>${t.rows.map(x => `<tr><td class="n">${x.no}</td><td>${esc(fullName(x.s))}</td><td>${esc(x.cls)}</td><td class="r">${baht(x.amt)}</td></tr>`).join('')}`).join('')}
          </tbody></table>`).join('')}`).join('')}`).join('') : '<p class="empty">ยังไม่มีผู้ได้รับอนุมัติทุน</p>'}
    </div>`};
};
App.on('announce-export', function () {
  const csv = '﻿' + (this._annCsv || []).map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    a.download = `announce-${this.db.cycle.year}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { /* ดาวน์โหลดไม่ได้ในหน้าต่างนี้ */ }
  this.toast('สร้างไฟล์ CSV (เปิดด้วย Excel ได้)');
});
