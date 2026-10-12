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
  ['waiting_reviewer', 'รอเจ้าหน้าที่ดำเนินการ'], ['waiting_manager', 'รอผู้จัดการพิจารณา'], ['manager_done', 'ดำเนินการเรียบร้อย']];
const WORK_TEST = {
  all: () => true, draft: s => ['draft', 'returned_to_student'].includes(s.status), waiting_teacher: s => s.status === 'waiting_teacher',
  waiting_reviewer: s => ['waiting_staff', 'need_more_info'].includes(s.status), waiting_manager: s => s.status === 'waiting_manager',
  manager_done: s => s.status === 'decided',
};
const PIPE = ['draft', 'waiting_teacher', 'returned_to_student', 'waiting_staff', 'need_more_info', 'waiting_manager', 'decided'];
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

App.staffNav = function () {
  return [['staff-dash', 'Dashboard'], ['staff-cycle', 'รอบรับสมัคร'], ['staff-schools', 'สถานศึกษา/ครู', ['staff-school']],
    ['staff-apps', 'ใบสมัคร', ['staff-app']], ['staff-transfer', 'ย้ายสถานศึกษา'], ['staff-reports', 'รายงาน/Export'], ['staff-pdpa', 'PDPA']];
};
/* สลับบทบาทสำหรับทดลอง (เหมือนปุ่มบทบาทใน v14) */
App.roleBar = function () {
  const r = this.session.staffRole;
  return `<div class="row between no-print"><div class="seg" role="group" aria-label="บทบาท">${Object.entries(ROLE).map(([k, [t]]) =>
    `<button type="button" data-action="staff-role" data-role="${k}" aria-pressed="${k === r}">${t}</button>`).join('')}</div>
    <span class="small muted">กำลังใช้งาน: ${ROLE[r][0]}</span></div>`;
};
App.on('staff-role', function (el) {
  const u = STAFF.find(s => s.role === el.dataset.role);
  Object.assign(this.session, {staff: u.username, staffRole: u.role, name: u.name, who: `${u.name} · ${ROLE[u.role][0]}`});
  this.render();
});

App.views['staff-entry'] = function (p) {
  this.session = {role: null};
  const v = p.values || {};
  const e = p.errors || {};
  return {html: `
    <div class="page-head"><div><h1>office.tiscofoundation.org</h1><p class="sub">ระบบสำนักงานมูลนิธิทิสโก้ เพื่อการกุศล</p></div></div>
    <div class="split">
      <form class="card" data-submit="staff-login" novalidate>
        ${field('username', 'Username', input('username', v.username, 'autocomplete="username" autocapitalize="off"'), {req: 1, err: e.username})}
        ${field('password', 'Password', input('password', v.password, 'type="password" autocomplete="current-password"'), {req: 1, err: e.password})}
        <div class="row end"><button class="btn primary" type="submit">เข้าสู่ระบบ</button></div>
      </form>
      <aside class="card"><h3>บัญชีทดลอง</h3><p class="small muted">Password ทุกบัญชี <b>Demo@1234</b> · สลับบทบาทได้ภายในระบบ</p>
        ${STAFF.map(s => `<button class="btn" data-action="staff-sample" data-u="${s.username}">${s.username} · ${ROLE[s.role][0]}</button>`).join('')}</aside>
    </div>`, after: focusFirstError};
};
App.on('staff-sample', function (el) { this.go('staff-entry', {values: {username: el.dataset.u, password: 'Demo@1234'}}); });
App.on('staff-login', function (form) {
  const v = formData(form);
  const u = STAFF.find(s => s.username === (v.username || '').toLowerCase());
  const e = {};
  if (!u) e.username = v.username ? 'ไม่พบ Username นี้' : 'กรุณากรอก Username';
  if (v.password !== 'Demo@1234') e.password = v.password ? 'Password ไม่ถูกต้อง' : 'กรุณากรอก Password';
  if (Object.keys(e).length) { this.go('staff-entry', {values: {username: v.username}, errors: e}); return; }
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

/* ---------- รอบรับสมัคร ---------- */
App.views['staff-cycle'] = function () {
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
      && (!f.round || String(s.round || '') === f.round) && (!f.loan || s.loan === f.loan) && (!f.type || s.type === f.type)
      && (!f.move || s.school_next === f.move)
      && (!f.region || sc.region === f.region) && (!f.province || sc.province === f.province) && (!f.district || sc.district === f.district)
      && (!f.school || s.school === f.school) && (!f.levels || !f.levels.length || f.levels.includes(s.group || groupOfClass(s.class)))
      && (!f.q || (s.code + fullName(s)).toLowerCase().includes(f.q.toLowerCase()));
  });
};
App.views['staff-apps'] = function (p) {
  const f = p.work || p.reset ? {work: p.work || 'all', levels: []} : (this._appF || {work: 'all', levels: []});
  this._appF = f;
  const rows = this.appFilter(f);
  const role = this.session.staffRole;
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <div class="page-head"><div><h1>งานพิจารณาใบสมัคร</h1><p class="sub">${ROLE[role][0]} — ${ROLE[role][1]}</p></div></div>
    <form class="card no-print" data-submit="apps-filter" novalidate>
      <div class="grid-3">
        ${field('f_work', 'สถานะการดำเนินงาน', select('f_work', WORK, f.work || 'all'))}
        ${field('f_result', 'ผลการพิจารณา', select('f_result', Object.entries(DECISION).map(([k, d]) => [k, d.label === 'อนุมัติทุน' ? 'ผ่าน' : d.label]), f.result, 'ทั้งหมด'))}
        ${field('f_round', 'รอบพิจารณา', select('f_round', [['1', 'รอบ 1'], ['2', 'รอบ 2']], f.round, 'ทั้งหมด'))}
        ${field('f_loan', 'กยศ./กรอ.', select('f_loan', [['no', 'ไม่กู้'], ['yes', 'กู้ / ไม่เข้าเกณฑ์']], f.loan, 'ทั้งหมด'))}
        ${field('f_type', 'ประเภททุน', select('f_type', [['NEW', 'ทุนใหม่'], ['CONT', 'ทุนต่อเนื่อง']], f.type, 'ทั้งหมด'))}
        ${field('f_move', 'สถานศึกษาปีหน้า', select('f_move', [['transfer', 'ย้ายสถานศึกษา'], ['same', 'เรียนต่อที่เดิม']], f.move, 'ทั้งหมด'))}
        ${field('f_q', 'ค้นหาเพิ่มเติม', input('f_q', f.q, 'placeholder="รหัสผู้สมัคร / ชื่อ–นามสกุล"'))}
      </div>
      <div class="field"><span class="label">เลือกโรงเรียนที่ต้องการรีวิว</span>
        <div class="grid-4" data-area='{"any":true,"school":true}'>${this.areaPicker('fa', f, {any: true, school: true})}</div>
        <div class="hint">ช่อง “โรงเรียน” จะแสดงเฉพาะสถานศึกษาที่ถูกเพิ่มไว้ในระบบของมูลนิธิฯ เท่านั้น</div></div>
      <div class="field"><span class="label">ระดับชั้น (เลือกได้มากกว่า 1 ระดับ)</span>
        <div class="choices">${EDU_GROUPS.map(([k]) => `<label class="choice"><input type="checkbox" name="f_levels" value="${k}" ${(f.levels || []).includes(k) ? 'checked' : ''}> ${GROUP_SHORT[k]}</label>`).join('')}</div></div>
      <div class="row between"><button class="btn" type="button" data-action="print">${icon('print')} พิมพ์ผลการค้นหา</button>
        <div class="row"><button class="btn" type="button" data-go="staff-apps" data-reset="1">ล้างตัวกรอง</button><button class="btn primary" type="submit">ค้นหา / แสดงผล</button></div></div>
    </form>
    <p class="small muted">พบ ${rows.length} รายการ — เลือกสถานะการดำเนินงานและผลการพิจารณาแยกกันได้</p>
    <div class="tlist app-list" role="table" aria-label="รายชื่อใบสมัคร">
      <div class="tlist-head" role="row"><span class="n">ลำดับ</span><span>ชื่อ–นามสกุล</span><span>สถานะ</span><span>สถานศึกษา</span><span>ชั้น</span><span>ประเภททุน</span><span>รอบ</span></div>
      ${rows.length ? rows.map((s, i) => { const sc = this.schoolById[s.school] || {};
        return `<button class="trow" role="row" data-go="staff-app" data-code="${s.code}">
          <span class="n">${i + 1}</span>
          <span class="c-name">${esc(fullName(s))}<small class="num">${s.code}${s.loan === 'yes' ? ' · กู้ กยศ.' : ''}${s.school_next === 'transfer' ? ' · ย้ายสถานศึกษา' : ''}<span class="m-only"> · ${esc(s.class || '-')} · ${TYPE[s.type]}${s.round ? ' · รอบ ' + s.round : ''}</span></small></span>
          <span class="c-status">${badge(s)}</span>
          <span class="c-school">${esc(sc.name || '-')}<small>จ.${esc(sc.province || '')} · ${esc(this.regionName(sc.region))}</small></span>
          <span class="c-class">${esc(s.class || '-')}</span><span class="c-type">${TYPE[s.type]}</span><span class="c-round">${s.round ? s.round : '—'}</span></button>`; }).join('')
        : '<div class="empty">ไม่พบใบสมัครตามเงื่อนไข</div>'}
    </div>`};
};
App.on('apps-filter', function (form) {
  const v = formData(form);
  const a = this.readArea('fa');
  this._appF = {work: v.f_work, result: v.f_result, round: v.f_round, loan: v.f_loan, type: v.f_type, move: v.f_move, q: v.f_q,
    region: a.region, province: a.province, district: a.district, school: a.school, levels: arr(v.f_levels)};
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
    panel = can ? `<form class="stack" data-submit="staff-review" data-code="${s.code}" novalidate>
      ${field('r_comment', 'ความคิดเห็นของเจ้าหน้าที่รีวิว', textarea('r_comment', v.r_comment ?? (sr && sr.comment) ?? '', 'rows="4" placeholder="สรุปข้อเท็จจริง ความจำเป็น ประเด็นสำคัญ หรือเหตุผลที่ไม่เข้าเกณฑ์"'), {err: e.r_comment})}
      ${field('r_result', 'ผลการรีวิว', select('r_result', [['forward', 'ส่งต่อให้ผู้จัดการพิจารณา'], ['ineligible', 'ไม่เข้าเกณฑ์'], ['need_more_info', 'รอข้อมูลเพิ่มเติม']], v.r_result || 'forward'))}
      ${field('r_round', 'จัดเข้ารอบ', select('r_round', [['1', 'รอบ 1'], ['2', 'รอบ 2']], v.r_round || s.round || (s.school_next === 'transfer' && !['ป.6', 'ม.3'].includes(s.class) ? '2' : '1')),
        {hint: s.school_next === 'transfer' ? `ย้ายสถานศึกษา: ป.6 / ม.3 ส่งหลักฐานภายใน ${thDate(this.db.cycle.first_cutoff)} → รอบ 1 · ระดับอื่น หรือส่งหลังจากนั้นแต่ไม่เกิน ${thDate(this.db.cycle.transfer_close)} → รอบ 2` : 'ไม่ย้ายสถานศึกษา → รอบ 1'})}
      <button class="btn primary block" type="submit">บันทึกและส่งต่อผู้จัดการ</button></form>`
      : `<p class="small muted">ใบสมัครนี้อยู่สถานะ “${STATUS[s.status].label}” — จนท.รีวิวดำเนินการได้เมื่อสถานะเป็น “รอเจ้าหน้าที่ดำเนินการ”</p>${reviewSummary(s)}`;
  } else if (role === 'manager') {
    const can = s.status === 'waiting_manager';
    const std = this.rateAmount(s.rate);
    const dec = v.m_decision || 'approved';
    panel = (sr ? `<div class="subcard"><span class="label">ความเห็น จนท.รีวิว (${esc(sr.reviewer)}) · รอบ ${sr.round || s.round || '-'}</span><span class="small">${esc(sr.comment || '—')}</span></div>` : '') + (can ? `
      <form class="stack" data-submit="staff-decide" data-code="${s.code}" novalidate>
      ${radioField('m_decision', 'ผลการพิจารณา', [['approved', 'อนุมัติทุน', 'ผ่านการพิจารณาและกำหนดจำนวนเงินทุน'], ['rejected', 'ไม่อนุมัติทุน', 'ไม่ผ่านการพิจารณาทุนในรอบนี้'],
        ['reserve', 'สำรอง', 'อยู่ในรายชื่อสำรอง ยังไม่รวมวงเงินทุนที่อนุมัติ']], dec, {req: 1, col: 1, attrs: 'data-onchange="manager-ui"'})}
      <div class="stack" id="amount_box" ${dec === 'approved' ? '' : 'hidden'}>
        <div class="subcard"><span class="small muted">ระดับชั้นปีการศึกษา ${this.db.cycle.year}</span><b>${esc(this.rateName(s.rate))} (${esc(s.next_class || '-')})</b>
          <span class="small muted">อัตราทุนมาตรฐาน</span><b>${baht(std)}</b></div>
        ${radioField('m_amount', 'จำนวนเงินทุนที่อนุมัติ', [['std', baht(std), `ตามอัตรามาตรฐานของระดับชั้นปี ${this.db.cycle.year}`],
          ['special', baht(this.rateAmount('SPECIAL')), 'อัตราอื่น ๆ / อัตราพิเศษ']], v.m_amount || 'std', {req: 1, col: 1, attrs: 'data-onchange="manager-ui"'})}
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
      <div class="stack">${applicantSections.call(this, s, {numbered: true})}
        <section class="card"><h3>6. ความคิดเห็นของครูผู้ดูแลทุน</h3>${tr ? `<p>${esc(tr.comment)}</p><p class="small">ผลการเรียน: ${gradeText(tr)}</p><p class="small muted">ส่งเมื่อ ${thDate(tr.sent_at, true)}</p>`
          : `<p class="small muted">${s.group === 'bachelor' ? 'ระดับปริญญาตรีส่งตรงถึงมูลนิธิฯ ไม่ผ่านครู' : 'ครูยังไม่ได้ดำเนินการ'}</p>`}</section>
        <section class="card"><h3>7. ประวัติสถานะใบสมัคร</h3>${(s.history || []).length ? `<ol class="timeline">${s.history.map(h =>
          `<li class="done">${esc(h.text)}<small>${thDate(h.at, true)}</small></li>`).join('')}</ol>` : '<p class="small muted">ยังไม่มีประวัติ</p>'}</section>
        <section class="card"><h3>8. เอกสารแนบ</h3><div>${docsFor(s).map(([code, name, , opt]) => { const fl = files[code] || [];
          return `<div class="doc-row"><div><div>${code} — ${name}</div><div class="code">${fl.length ? esc(fl.length > 1 ? fl.length + ' ไฟล์' : fl[0]) : opt ? 'ไม่มี (ไม่บังคับ)' : 'ยังไม่ได้แนบ'}</div></div>
            ${fl.length ? `<button class="btn sm" type="button" data-action="preview">Preview</button>` : ''}</div>`; }).join('')}</div></section>
      </div>
      <aside class="stack"><section class="card"><h3>${ROLE[role][0]}</h3>${panel}</section></aside>
    </div>`, after: focusFirstError};
};
function reviewSummary(s) {
  const sr = s.staff_review, d = s.decision;
  return `<dl class="kv">${sr ? `<div><dt>ผลจากเจ้าหน้าที่</dt><dd>${{forward: 'ส่งต่อให้ผู้จัดการพิจารณา', ineligible: 'ไม่เข้าเกณฑ์', need_more_info: 'รอข้อมูลเพิ่มเติม', pass: 'ส่งต่อให้ผู้จัดการพิจารณา'}[sr.result] || sr.result} · ${esc(sr.reviewer)}</dd></div>
    ${sr.round || s.round ? `<div><dt>รอบ</dt><dd>รอบ ${sr.round || s.round}</dd></div>` : ''}${sr.comment ? `<div><dt>ความคิดเห็น</dt><dd>${esc(sr.comment)}</dd></div>` : ''}` : ''}
    ${d ? `<div><dt>ผลการพิจารณา</dt><dd>${badge(s)}</dd></div>${d.approved_amount ? `<div><dt>จำนวนเงินทุน</dt><dd>${baht(d.approved_amount)}${d.standard_amount && d.standard_amount !== d.approved_amount ? ` (มาตรฐาน ${baht(d.standard_amount)})` : ''}</dd></div>` : ''}
    ${d.reason ? `<div><dt>เหตุผล</dt><dd>${esc(d.reason)}</dd></div>` : ''}${d.note ? `<div><dt>หมายเหตุผู้จัดการ</dt><dd>${esc(d.note)}</dd></div>` : ''}` : ''}</dl>`;
}
App.on('preview', function () { this.toast('ต้นแบบ: ระบบจริงจะเปิดดูไฟล์เอกสารในหน้าต่างใหม่'); });
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
  const std = this.rateAmount(s.rate);
  const ok = v.m_decision === 'approved';
  s.decision = {result: v.m_decision, standard_amount: ok ? std : null, approved_amount: ok ? (v.m_amount === 'special' ? this.rateAmount('SPECIAL') : std) : null,
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
  if (!['ป.6', 'ม.3'].includes(s.class)) return {r: 2, why: 'ระดับชั้นนี้พิจารณารอบที่ 2'};
  if (!t) return {r: 1, why: `ถ้าส่งหลักฐานภายใน ${thDate(this.db.cycle.first_cutoff)}`, pending: true};
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
  const sch = (x, cls, extra = '') => x ? `<b class="sch">${esc(x.name || '-')} <span class="cls">${esc(cls || '-')}</span></b><small>${esc(x.district || '')} · จ.${esc(x.province || '')}${extra}</small>` : '';
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
    <div class="tlist tr-list" role="table" aria-label="นักเรียนแจ้งย้ายสถานศึกษา">
      <div class="tlist-head" role="row"><span class="n">ลำดับ</span><span>ชื่อ–นามสกุล</span><span>สถานศึกษาเดิม</span><span>สถานศึกษาใหม่</span><span>รอบ</span></div>
      ${list.length ? list.map((s, i) => { const t = lastTr(s.code), rd = transferRound.call(this, s, t);
        return `<button class="trow" role="row" data-go="staff-transfer" data-code="${s.code}">
          <span class="n">${i + 1}</span>
          <span class="c-name">${esc(fullName(s))}<small class="num">${s.code}</small></span>
          <span class="c-from">${sch(origin(s), s.class)}</span>
          <span class="c-to">${t ? sch(dest(s), t.cls || s.next_class, ` · แจ้ง ${thDate(t.date)}`)
            : `<span class="badge t-warn">ยังไม่บันทึก</span> <span class="cls">${esc(s.next_class || '-')}</span>${s.next_school_text ? `<small>นักเรียนแจ้ง: ${esc(s.next_school_text)}</small>` : ''}`}</span>
          <span class="c-round"><span class="badge ${rd.r === 1 ? 't-info' : 't-violet'}">รอบ ${rd.r}${rd.pending ? '*' : ''}</span><small>${esc(rd.why)}</small></span></button>`; }).join('')
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
        <h3>สถานศึกษาใหม่</h3>
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
  else if (a.school === from) e.school = 'สถานศึกษาใหม่ต้องไม่ใช่สถานศึกษาเดิม';
  if (!v.t_class) e.cls = 'กรุณาเลือกระดับชั้นที่ไปเรียน';
  if (!v.notified) e.notified = 'กรุณาระบุวันที่แจ้งย้ายสถานศึกษา';
  if (Object.keys(e).length) { this.go('staff-transfer', {code: s.code, values: {...a, cls: v.t_class, notified: v.notified, note: v.note}, errors: e}); return; }
  if (last) Object.assign(last, {to: a.school, cls: v.t_class, date: v.notified, note: v.note, by: this.session.name, at: nowIso()});
  else this.db.transfers.push({code: s.code, from, to: a.school, cls: v.t_class, date: v.notified, note: v.note, by: this.session.name, at: nowIso()});
  addHistory(s, `${last ? 'แก้ไขการย้าย' : 'ย้ายสถานศึกษา'}: ${this.schoolName(from)} → ${this.schoolName(a.school)} (${v.t_class}) — ${this.session.name}`, 'transfer');
  s.school = a.school;
  s.next_class = v.t_class;
  this.save();
  this.toast(`บันทึกการย้ายสถานศึกษาของ ${fullName(s)} แล้ว`);
  this.go('staff-transfer', {code: s.code});
});

/* ---------- สถานศึกษาและบัญชีครู ---------- */
App.views['staff-schools'] = function (p) {
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
  const list = inPv.filter(s => (!ds || s.district === ds) && (!q || (s.name + s.id + ((this.teacherOf(s.id) || {}).username || '')).toLowerCase().includes(q)))
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
    </div>
    <div class="small muted"><b>${esc(area)}</b> · พบ <b>${list.length}</b> แห่ง</div>
    <div class="tlist sch-list" role="table" aria-label="รายชื่อสถานศึกษา">
      <div class="tlist-head" role="row"><span class="n">ลำดับ</span><span>สถานศึกษา</span><span>จังหวัด / อำเภอ</span><span>บัญชีครู</span><span>สถานะ</span></div>
      ${list.length ? list.map((s, i) => { const t = this.teacherOf(s.id);
        return `<button class="trow" role="row" data-go="staff-school" data-id="${s.id}">
          <span class="n">${i + 1}</span>
          <span class="c-name">${esc(s.name)}<small>${s.id} · ${(s.levels || []).map(l => GROUP_SHORT[l]).join(', ')}</small></span>
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
  return {region: v('s_rg'), province: level === 'rg' ? '' : v('s_prov'), district: level === 'ds' ? v('s_dist') : '', q: v('s_q')};
};
App.on('schools-filter', function (el) { this.go('staff-schools', schoolFilters(el.dataset.level)); });
App.on('schools-search', function (el) {
  clearTimeout(this._sq);
  this._sq = setTimeout(() => this.go('staff-schools', {...schoolFilters('ds'), focusQ: 1}), 250);
});
App.views['staff-school'] = function (p) {
  const isNew = p.id === 'new';
  const sc = isNew ? {id: 'SCH-' + String(this.db.schools.length + 1).padStart(3, '0'), type: 'school', levels: [],
    region: p.region || '', province: p.province || '', district: p.district || ''} : this.schoolById[p.id];
  const t = (isNew ? null : this.teacherOf(sc.id)) || {};
  const v = p.values || {name: sc.name, type: sc.type, address: sc.address, postcode: sc.postcode, levels: sc.levels, username: t.username || '',
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
      </div>${field('sname', 'ชื่อสถานศึกษา', input('sname', v.name), {req: 1, err: e.sname})}</section>
      <section class="card"><h3>พื้นที่และที่อยู่สถานศึกษา</h3>
        <div class="subcard">${field('raw', 'วางที่อยู่แบบยาวเพื่อให้ระบบช่วยแยก (ไม่บังคับ)', textarea('raw', '', 'rows="2" placeholder="เช่น 151 ถนน... ตำบลในเวียง อำเภอเมืองแพร่ จังหวัดแพร่ 54000"'))}
          <div class="row between"><span class="hint">ระบบช่วยกรอกให้เบื้องต้นเท่านั้น Admin ต้องตรวจสอบก่อนบันทึก</span><button class="btn sm" type="button" data-action="school-parse">ช่วยแยกที่อยู่</button></div></div>
        <div class="grid-2" data-area='{"sub":true,"required":true}' data-after="school-zip">${this.areaPicker('sa', v, {sub: true, required: true, err: {district: e.area}})}</div>
        <div class="grid-2">${field('saddr', 'ที่อยู่', input('saddr', v.address, 'placeholder="บ้านเลขที่ หมู่ ถนน อาคาร ฯลฯ"'))}
          ${field('szip', 'รหัสไปรษณีย์', input('szip', v.postcode, 'maxlength="5" inputmode="numeric" placeholder="เช่น 54000"'))}</div></section>
      <section class="card"><h3>ช่วงชั้นที่เปิดสอน</h3>
        <div class="choices">${EDU_GROUPS.map(([k, t]) => `<label class="choice"><input type="checkbox" name="levels" value="${k}" ${(v.levels || []).includes(k) ? 'checked' : ''}> ${t}</label>`).join('')}</div>
        <div class="hint">เลือกได้มากกว่า 1 ช่วงชั้น ใช้เป็นตัวช่วยกรองสถานศึกษาในหน้าสมัครของนักเรียนและหน้ารีวิวของเจ้าหน้าที่</div></section>
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
  const v = {...formData(form), name: document.getElementById('sname').value, type: document.getElementById('stype').value, levels: arr(formData(form).levels),
    username: document.getElementById('username').value, active: document.getElementById('active').value,
    region, province: pv, district: dist, sub: sub ? sub.th : '', address: line, postcode: zip};
  this.go('staff-school', {...this.view.params, values: v});
  this.toast('แยกที่อยู่แล้ว กรุณาตรวจสอบก่อนบันทึก');
});
App.on('school-pw', function () { this.toast('ต้นแบบ: ระบบจริงจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้ครูผู้ดูแลทุน (รหัสทดลองคือ Demo@1234)'); });
App.on('school-save', function (form) {
  const v = formData(form);
  const a = this.readArea('sa');
  const isNew = form.dataset.id === 'new';
  const id = isNew ? 'SCH-' + String(this.db.schools.length + 1).padStart(3, '0') : form.dataset.id;
  const e = {};
  if (!v.sname) e.sname = 'กรุณากรอกชื่อสถานศึกษา';
  else if (this.db.schools.some(s => s.id !== id && s.name === v.sname && s.district === a.district)) e.sname = 'มีสถานศึกษาชื่อนี้ในอำเภอนี้แล้ว';
  if (!a.district) e.area = 'กรุณาเลือกภาค จังหวัด และอำเภอ / เขต';
  const uname = (v.username || '').toLowerCase();
  if (!uname) e.username = 'กรุณากำหนด Username';
  else if (this.db.teachers.some(t => t.username === uname && t.school !== id)) e.username = 'Username นี้ถูกใช้แล้ว (1 โรงเรียน = 1 Username)';
  const values = {name: v.sname, type: v.stype, address: v.saddr, postcode: v.szip, levels: arr(v.levels), username: v.username, active: v.active,
    t_name: v.t_name, t_position: v.t_position, t_dept: v.t_dept, t_phone: v.t_phone, t_email: v.t_email, ...a};
  if (Object.keys(e).length) { this.go('staff-school', {...this.view.params, values, errors: e}); return; }
  const rec = {id, name: v.sname, type: v.stype, region: a.region, province: a.province, district: a.district, subdistrict: a.sub,
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
  ['special', 'อัตราอื่น ๆ 1,000 บาท'], ['budget', 'งบประมาณทุน'], ['schools', 'สถานศึกษา'], ['backlog', 'งานค้างดำเนินการ']];
App.reportData = function (f) {
  const list = this.db.students.filter(s => {
    const sc = this.schoolById[s.school] || {};
    const d = s.decision;
    return (!f.decision || (d && d.result === f.decision)) && (!f.type || s.type === f.type) && (!f.round || String(s.round || '') === f.round)
      && (!f.move || s.school_next === f.move)
      && (!f.region || sc.region === f.region) && (!f.province || sc.province === f.province) && (!f.district || sc.district === f.district)
      && (!f.levels.length || f.levels.includes(s.rate) || (f.levels.includes('SPECIAL') && d && d.approved_amount === this.rateAmount('SPECIAL')));
  });
  const k = f.kind;
  const pick = {approved: s => s.decision && s.decision.result === 'approved', rejected: s => s.decision && s.decision.result === 'rejected',
    reserve: s => s.decision && s.decision.result === 'reserve', ineligible: s => s.decision && s.decision.result === 'ineligible',
    special: s => s.decision && s.decision.result === 'approved' && s.decision.approved_amount !== s.decision.standard_amount,
    backlog: s => s.status !== 'decided'}[k] || (() => true);
  if (k === 'budget') {
    const ap = list.filter(s => s.decision && s.decision.result === 'approved');
    const cols = [{t: 'ระดับชั้นปีที่ได้รับทุน'}, {t: 'อัตรา', r: 1}, {t: 'จำนวน (คน)', r: 1}, {t: 'งบประมาณ', r: 1}];
    const rows = this.db.rates.map(r => { const g = ap.filter(s => r.code === 'SPECIAL' ? s.decision.approved_amount !== s.decision.standard_amount : s.rate === r.code && s.decision.approved_amount === s.decision.standard_amount);
      return [esc(r.name), baht(r.amount), g.length, baht(g.reduce((a, s) => a + s.decision.approved_amount, 0))]; });
    return {cols, rows, foot: ['รวม', '', ap.length, baht(ap.reduce((a, s) => a + s.decision.approved_amount, 0))],
      csv: [cols.map(c => c.t)].concat(this.db.rates.map((r, i) => [r.name, r.amount, rows[i][2], rows[i][3].replace(/[^\d]/g, '')]))};
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
        ${field('r_move', 'สถานศึกษาปีหน้า', select('r_move', [['transfer', 'ย้ายสถานศึกษา'], ['same', 'เรียนต่อที่เดิม']], f.move, 'ทั้งหมด'))}
      </div>
      <div class="field"><span class="label">พื้นที่</span><div class="grid-3" data-area='{"any":true}'>${this.areaPicker('ra', f, {any: true})}</div></div>
      <div class="field"><span class="label">ระดับชั้นปี ${this.db.cycle.year} (เลือกได้มากกว่า 1)</span>
        <div class="choices">${[['P6', 'ป.6'], ['M_LOWER', 'ม.ต้น'], ['M_UPPER', 'ม.ปลาย'], ['PVC', 'ปวช.'], ['PVS', 'ปวส.'], ['PVS_IND', 'ปวส. อุตสาหกรรม'], ['BACHELOR', 'ป.ตรี'], ['SPECIAL', 'อื่น ๆ 1,000 บาท']]
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
  this._repF = {kind: (this._repF || {}).kind || 'all', decision: v.r_dec, type: v.r_type, round: v.r_round, move: v.r_move, region: a.region, province: a.province, district: a.district, levels: arr(v.r_levels)};
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
