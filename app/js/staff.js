/* บทบาทเจ้าหน้าที่มูลนิธิฯ: ภาพรวม, พิจารณาใบสมัคร, ย้ายสถานศึกษา, สถานศึกษาและครู, รายงาน, ตั้งค่า */
'use strict';

const STAFF = [
  {username: 'reviewer01', name: 'จนท. 01', role: 'reviewer'},
  {username: 'reviewer02', name: 'จนท. 02', role: 'reviewer'},
  {username: 'manager01', name: 'ผู้จัดการทุน', role: 'manager'},
  {username: 'admin01', name: 'ผู้ดูแลระบบ', role: 'admin'},
];
const ROLE_NAME = {reviewer: 'เจ้าหน้าที่พิจารณา', manager: 'ผู้จัดการ', admin: 'ผู้ดูแลระบบ'};
const PIPE = ['draft', 'waiting_teacher', 'returned_to_student', 'waiting_staff', 'need_more_info', 'waiting_manager', 'decided'];
const PIPE_COLOR = {idle: 'var(--idle)', warn: 'var(--warn)', bad: 'var(--bad)', info: 'var(--info)', violet: 'var(--violet)', ok: 'var(--ok)'};

App.staffNav = function () {
  return [['staff-dash', 'ภาพรวม'], ['staff-apps', 'ใบสมัคร'], ['staff-transfer', 'ย้ายสถานศึกษา'], ['staff-schools', 'สถานศึกษาและครู'],
    ['staff-reports', 'รายงาน'], ['staff-settings', 'ตั้งค่ารอบ']];
};

App.views['staff-entry'] = function (p) {
  this.session = {role: null};
  const v = p.values || {};
  const e = p.errors || {};
  return {html: `
    <div class="page-head"><div><h1>เข้าสู่ระบบเจ้าหน้าที่มูลนิธิฯ</h1><p class="sub">สิทธิ์การใช้งานขึ้นกับบทบาทของบัญชี</p></div></div>
    <div class="split">
      <form class="card" data-submit="staff-login" novalidate>
        ${field('username', 'ชื่อผู้ใช้', input('username', v.username, 'autocomplete="username" autocapitalize="off"'), {req: 1, err: e.username})}
        ${field('password', 'รหัสผ่าน', input('password', v.password, 'type="password" autocomplete="current-password"'), {req: 1, err: e.password})}
        <div class="row end"><button class="btn primary" type="submit">เข้าสู่ระบบ</button></div>
      </form>
      <aside class="card"><h3>บัญชีทดลอง</h3><p class="small muted">รหัสผ่านทุกบัญชี <b>Demo@1234</b></p>
        ${STAFF.map(s => `<button class="btn" data-action="staff-sample" data-u="${s.username}">${s.username} · ${ROLE_NAME[s.role]}</button>`).join('')}</aside>
    </div>`};
};
App.on('staff-sample', function (el) { this.go('staff-entry', {values: {username: el.dataset.u, password: 'Demo@1234'}}); });
App.on('staff-login', function (form) {
  const v = formData(form);
  const u = STAFF.find(s => s.username === v.username.toLowerCase());
  const e = {};
  if (!u) e.username = v.username ? 'ไม่พบชื่อผู้ใช้นี้' : 'กรุณากรอกชื่อผู้ใช้';
  if (v.password !== 'Demo@1234') e.password = v.password ? 'รหัสผ่านไม่ถูกต้อง' : 'กรุณากรอกรหัสผ่าน';
  if (Object.keys(e).length) { this.go('staff-entry', {values: {username: v.username}, errors: e}); return; }
  this.session = {role: 'staff', staff: u.username, staffRole: u.role, who: `${u.name} · ${ROLE_NAME[u.role]}`, name: u.name};
  this.go('staff-dash');
});

/* ---------- ภาพรวม ---------- */
App.views['staff-dash'] = function () {
  const all = this.db.students;
  const count = st => all.filter(s => s.status === st).length;
  const approved = all.filter(s => s.decision && s.decision.result === 'approved');
  const budget = approved.reduce((a, s) => a + (s.decision.approved_amount || 0), 0);
  const mine = this.session.staffRole === 'manager' ? ['waiting_manager', 'รอคุณพิจารณาอนุมัติ']
    : this.session.staffRole === 'reviewer' ? ['waiting_staff', 'รอคุณตรวจสอบ'] : null;
  const regions = this.data.geo.regions.map(r => {
    const list = all.filter(s => (this.schoolById[s.school] || {}).region === r.code);
    const ap = list.filter(s => s.decision && s.decision.result === 'approved');
    return {cells: [esc(r.name), list.length, list.filter(s => SENT.includes(s.status)).length, ap.length,
      baht(ap.reduce((a, s) => a + s.decision.approved_amount, 0))]};
  });
  return {nav: this.staffNav(), html: `
    <div class="page-head"><div><h1>ภาพรวมทุนการศึกษา ปี ${this.db.cycle.year}</h1><p class="sub">ข้อมูล ณ ขณะนี้</p></div></div>
    ${mine ? `<div class="note info row between"><span><b>${mine[1]}:</b> ${count(mine[0])} ใบสมัคร</span>
      <button class="btn primary sm" data-go="staff-apps" data-status="${mine[0]}">เปิดรายการ</button></div>` : ''}
    <div class="stats">
      <div class="stat"><span>ผู้สมัครทั้งหมด</span><b>${all.length}</b></div>
      <div class="stat"><span>ส่งถึงมูลนิธิฯ แล้ว</span><b>${all.filter(s => SENT.includes(s.status)).length}</b></div>
      <div class="stat"><span>รอผู้จัดการ</span><b>${count('waiting_manager')}</b></div>
      <div class="stat"><span>อนุมัติทุน</span><b>${approved.length}</b></div>
      <div class="stat"><span>งบประมาณที่อนุมัติ</span><b class="num">${budget.toLocaleString('th-TH')}</b></div>
    </div>
    <section class="card"><h3>สถานะใบสมัคร</h3>
      <div class="bar" role="img" aria-label="สัดส่วนใบสมัครตามสถานะ">${PIPE.map(st => { const n = count(st);
        return n ? `<span style="width:${n / all.length * 100}%;background:${PIPE_COLOR[STATUS[st].tone]}" title="${STATUS[st].label} ${n}"></span>` : ''; }).join('')}</div>
      <div class="legend">${PIPE.map(st => `<button class="btn ghost sm" data-go="staff-apps" data-status="${st}"><i style="background:${PIPE_COLOR[STATUS[st].tone]}"></i>${STATUS[st].label} <b class="num">${count(st)}</b></button>`).join('')}</div>
    </section>
    <section class="stack"><h3>แยกตามภาค</h3>
      ${table([{t: 'ภาค'}, {t: 'ผู้สมัคร', r: 1}, {t: 'ส่งถึงมูลนิธิฯ', r: 1}, {t: 'อนุมัติ', r: 1}, {t: 'งบประมาณ', r: 1}], regions)}</section>`};
};

/* ---------- รายการใบสมัคร ---------- */
App.views['staff-apps'] = function (p) {
  const f = {status: p.status || '', type: p.type || '', q: p.q || '', region: p.region || '', province: p.province || '', district: p.district || ''};
  const rows = this.db.students.filter(s => {
    const sc = this.schoolById[s.school] || {};
    return (!f.status || s.status === f.status) && (!f.type || s.type === f.type) && (!f.region || sc.region === f.region)
      && (!f.province || sc.province === f.province) && (!f.district || sc.district === f.district)
      && (!f.q || (s.code + fullName(s) + (sc.name || '')).toLowerCase().includes(f.q.toLowerCase()));
  });
  return {nav: this.staffNav(), html: `
    <div class="page-head"><div><h1>ใบสมัคร</h1><p class="sub">พบ ${rows.length} รายการ</p></div></div>
    <form class="card" data-submit="staff-filter" novalidate>
      <div class="grid-3">
        ${field('f_q', 'ค้นหา', input('f_q', f.q, 'placeholder="เลขใบสมัคร ชื่อ หรือสถานศึกษา"'))}
        ${field('f_status', 'สถานะ', select('f_status', PIPE.map(s => [s, STATUS[s].label]), f.status, 'ทุกสถานะ'))}
        ${field('f_type', 'ประเภททุน', select('f_type', [['NEW', 'ทุนใหม่'], ['CONT', 'ทุนต่อเนื่อง']], f.type, 'ทุกประเภท'))}
      </div>
      <div class="grid-3" data-area='{"any":true}'>${this.areaPicker('fa', f, {any: true})}</div>
      <div class="row end"><button class="btn" type="button" data-go="staff-apps">ล้างตัวกรอง</button><button class="btn primary" type="submit">ค้นหา</button></div>
    </form>
    ${table([{t: 'เลขใบสมัคร'}, {t: 'ชื่อ–นามสกุล'}, {t: 'สถานศึกษา'}, {t: 'ชั้น'}, {t: 'ประเภท'}, {t: 'สถานะ'}], rows.map(s => ({
      attrs: `class="click" data-go="staff-app" data-code="${s.code}"`,
      cells: [`<span class="num">${s.code}</span>`, esc(fullName(s)), esc(this.schoolName(s.school)), esc(s.next_class || s.class), TYPE[s.type], badge(s.status, s.decision)]})),
      {empty: 'ไม่พบใบสมัครตามเงื่อนไข'})}`};
};
App.on('staff-filter', function (form) {
  const v = formData(form);
  const a = this.readArea('fa');
  this.go('staff-apps', {q: v.f_q, status: v.f_status, type: v.f_type, region: a.region, province: a.province, district: a.district});
});

/* ---------- รายละเอียดใบสมัคร + การพิจารณา ---------- */
App.views['staff-app'] = function (p) {
  const s = this.studentByCode[p.code];
  const e = p.errors || {};
  const v = p.values || {};
  const role = this.session.staffRole;
  const tr = s.teacher_review;
  const std = this.rateAmount(s.rate);
  let action = '<p class="small muted">ใบสมัครนี้ไม่มีงานที่ต้องทำสำหรับบทบาทของคุณในขณะนี้</p>';
  if (role === 'reviewer' && ['waiting_staff', 'need_more_info'].includes(s.status)) {
    action = `<form class="stack" data-submit="staff-review" data-code="${s.code}" novalidate>
      <div class="field"><span class="label">ผลการตรวจสอบ <span class="req">*</span></span>
        ${radios('result', [['pass', 'ครบถ้วน ส่งผู้จัดการพิจารณา'], ['need_more_info', 'ขอข้อมูลเพิ่มเติม']], v.result)}${e.result ? `<div class="err">${e.result}</div>` : ''}</div>
      ${field('note', 'หมายเหตุ', textarea('note', v.note, 'rows="3"'), {hint: 'จำเป็นเมื่อขอข้อมูลเพิ่มเติม', err: e.note})}
      <div class="row end"><button class="btn primary" type="submit">บันทึกผลการตรวจสอบ</button></div></form>`;
  } else if (role === 'manager' && s.status === 'waiting_manager') {
    action = `<form class="stack" data-submit="staff-decide" data-code="${s.code}" novalidate>
      <div class="field"><span class="label">ผลการพิจารณา <span class="req">*</span></span>
        ${radios('result', Object.entries(DECISION).map(([k, d]) => [k, d.label]), v.result)}${e.result ? `<div class="err">${e.result}</div>` : ''}</div>
      <div class="field"><span class="label">จำนวนเงินทุน (เมื่ออนุมัติ)</span>
        ${radios('amount', [['std', `${baht(std)} ตามอัตรามาตรฐาน`], ['special', `${baht(this.rateAmount('SPECIAL'))} อัตราพิเศษ`]], v.amount || 'std')}</div>
      ${field('reason', 'เหตุผล', textarea('reason', v.reason, 'rows="3"'), {hint: 'จำเป็นเมื่อใช้อัตราพิเศษ หรือไม่อนุมัติ', err: e.reason})}
      <div class="row end"><button class="btn primary" type="submit">บันทึกผลการพิจารณา</button></div></form>`;
  } else if (s.decision) {
    action = `<dl class="kv"><div><dt>ผลการพิจารณา</dt><dd>${badge('decided', s.decision)}</dd></div>
      <div><dt>จำนวนเงินทุน</dt><dd>${baht(s.decision.approved_amount)}</dd></div>${s.decision.reason ? `<div><dt>เหตุผล</dt><dd>${esc(s.decision.reason)}</dd></div>` : ''}</dl>`;
  }
  return {nav: this.staffNav(), html: `
    <div class="row"><button class="btn ghost sm" data-go="staff-apps">← รายการใบสมัคร</button></div>
    <div class="page-head"><div><h1>${esc(fullName(s))}</h1><p class="sub"><span class="num">${s.code}</span> · ${esc(s.class)} → ${esc(s.next_class)} · ${TYPE[s.type]}</p></div>${badge(s.status, s.decision)}</div>
    <div class="split">
      <div class="stack">${studentSummary.call(this, s)}
        <section class="card"><h3>ความเห็นครู</h3>${tr ? `<dl class="kv"><div><dt>ผลการเรียน</dt><dd>${tr.grade_type === 'gpa' ? 'เกรดเฉลี่ย ' : 'ร้อยละ '}${tr.grade_value}</dd></div>
          <div><dt>ส่งเมื่อ</dt><dd>${thDate(tr.sent_at, true)}</dd></div></dl><p>${esc(tr.comment)}</p>` : '<p class="small muted">ครูยังไม่ได้ตรวจ</p>'}</section>
      </div>
      <aside class="stack">
        <section class="card"><h3>${ROLE_NAME[role]}</h3>${action}</section>
        <section class="card"><h3>ประวัติ</h3>${s.history.length ? `<ol class="timeline">${s.history.map(h =>
          `<li class="done">${esc(h.text)}<small>${thDate(h.at, true)}</small></li>`).join('')}</ol>` : '<p class="small muted">ยังไม่มีประวัติ</p>'}</section>
      </aside>
    </div>`};
};
App.on('staff-review', function (form) {
  const s = this.studentByCode[form.dataset.code];
  const v = formData(form);
  const e = {};
  if (!v.result) e.result = 'กรุณาเลือกผลการตรวจสอบ';
  if (v.result === 'need_more_info' && !v.note) e.note = 'กรุณาระบุข้อมูลที่ต้องการเพิ่ม';
  if (Object.keys(e).length) { this.go('staff-app', {code: s.code, values: v, errors: e}); return; }
  s.status = v.result === 'pass' ? 'waiting_manager' : 'need_more_info';
  s.staff_review = {reviewer: this.session.name, result: v.result, note: v.note};
  s.history.push({at: nowIso(), text: (v.result === 'pass' ? 'เจ้าหน้าที่ตรวจแล้ว ส่งผู้จัดการ' : 'เจ้าหน้าที่ขอข้อมูลเพิ่มเติม') + (v.note ? ': ' + v.note : '') + ' — ' + this.session.name});
  this.save();
  this.toast('บันทึกผลการตรวจสอบแล้ว');
  this.go('staff-app', {code: s.code});
});
App.on('staff-decide', function (form) {
  const s = this.studentByCode[form.dataset.code];
  const v = formData(form);
  const e = {};
  if (!v.result) e.result = 'กรุณาเลือกผลการพิจารณา';
  if (v.result === 'approved' && v.amount === 'special' && !v.reason) e.reason = 'กรุณาระบุเหตุผลที่ใช้อัตราพิเศษ';
  if (v.result && v.result !== 'approved' && !v.reason) e.reason = 'กรุณาระบุเหตุผล';
  if (Object.keys(e).length) { this.go('staff-app', {code: s.code, values: v, errors: e}); return; }
  const std = this.rateAmount(s.rate);
  s.decision = {result: v.result, standard_amount: v.result === 'approved' ? std : null,
    approved_amount: v.result === 'approved' ? (v.amount === 'special' ? this.rateAmount('SPECIAL') : std) : null, reason: v.reason};
  s.status = 'decided';
  s.history.push({at: nowIso(), text: 'ผู้จัดการบันทึกผล: ' + DECISION[v.result].label + (s.decision.approved_amount ? ' ' + baht(s.decision.approved_amount) : '')});
  this.save();
  this.toast('บันทึกผลการพิจารณาแล้ว');
  this.go('staff-app', {code: s.code});
});

/* ---------- ย้ายสถานศึกษา ---------- */
App.views['staff-transfer'] = function (p) {
  const s = p.code ? this.studentByCode[p.code] : null;
  const e = p.errors || {};
  const v = p.values || {};
  const q = (p.q || '').toLowerCase();
  const found = q ? this.db.students.filter(x => (x.code + fullName(x) + this.schoolName(x.school)).toLowerCase().includes(q)).slice(0, 30) : [];
  const list = this.db.transfers.slice().reverse();
  const mine = s ? this.db.transfers.filter(t => t.code === s.code) : [];
  return {nav: this.staffNav(), html: `
    <div class="page-head"><div><h1>ย้ายสถานศึกษา</h1><p class="sub">บันทึกว่านักเรียนย้ายไปเรียนที่ใด (ตรวจสอบหลักฐานภายนอกแล้ว)</p></div></div>
    <div class="split">
      <div class="stack">
        <section class="card"><h3>1. ค้นหานักเรียน</h3>
          ${field('tq', 'เลขใบสมัคร ชื่อ–นามสกุล หรือชื่อสถานศึกษา', input('tq', p.q || '', 'autocomplete="off" data-oninput="transfer-search" placeholder="พิมพ์อย่างน้อย 2 ตัวอักษร"'))}
          ${q && !s ? (found.length ? `<div class="results">${found.map(x => `<button type="button" data-go="staff-transfer" data-code="${x.code}">
            <span class="num">${x.code}</span> — ${esc(fullName(x))}<small>${esc(this.schoolName(x.school))}</small></button>`).join('')}</div>`
            : '<p class="small muted">ไม่พบนักเรียน</p>') : ''}
          ${s ? `<div class="note info row between"><span><b>${esc(fullName(s))}</b> · <span class="num">${s.code}</span><br>
            <span class="small">สถานศึกษาปัจจุบัน: ${esc(this.schoolName(s.school))}</span></span>
            <button class="btn sm" data-go="staff-transfer">เปลี่ยนนักเรียน</button></div>` : ''}
        </section>
        <form class="card" data-submit="transfer-save" data-code="${s ? s.code : ''}" novalidate ${s ? '' : 'hidden'}>
          <h3>2. สถานศึกษาใหม่</h3>
          <div class="grid-2" data-area='{"school":true,"required":true}'>${this.areaPicker('tr', v, {school: true, required: true})}</div>
          ${e.school ? `<div class="err">${e.school}</div>` : ''}
          <p class="small muted">ไม่พบสถานศึกษา? <button class="btn ghost sm" type="button" data-action="transfer-addschool">+ เพิ่มสถานศึกษาใหม่</button></p>
          <div class="grid-2">${field('notified', 'วันที่แจ้งย้ายสถานศึกษา', input('notified', v.notified, 'type="date"'), {req: 1, err: e.notified})}</div>
          ${field('note', 'หมายเหตุ', textarea('note', v.note, 'rows="2"'))}
          <div class="row end"><button class="btn primary" type="submit">บันทึกการย้ายสถานศึกษา</button></div>
          ${mine.length ? `<details class="more"><summary>ประวัติการย้ายของนักเรียนรายนี้ (${mine.length})</summary><div><ol class="timeline">${mine.map(t =>
            `<li class="done">${esc(this.schoolName(t.from))} → ${esc(this.schoolName(t.to))}<small>แจ้งย้าย ${thDate(t.date)} · ${esc(t.by)}</small></li>`).join('')}</ol></div></details>` : ''}
        </form>
      </div>
      <aside class="stack"><h3>บันทึกล่าสุด (${list.length})</h3>
        ${table([{t: 'นักเรียน'}, {t: 'ย้ายไป'}, {t: 'วันที่แจ้ง'}], list.slice(0, 20).map(t => ({
          attrs: `class="click" data-go="staff-transfer" data-code="${t.code}"`,
          cells: [esc(fullName(this.studentByCode[t.code])), esc(this.schoolName(t.to)), thDate(t.date)]})), {empty: 'ยังไม่มีการบันทึก'})}</aside>
    </div>`, after() { const el = document.getElementById('tq'); if (p.q != null && !s && el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }};
};
App.on('transfer-search', function (el) {
  clearTimeout(this._tq);
  this._tq = setTimeout(() => this.go('staff-transfer', {q: el.value.trim().length >= 2 ? el.value : ''}), 250);
});
App.on('transfer-addschool', function () {
  const a = this.readArea('tr');
  this.go('staff-schools', {add: '1', region: a.region, province: a.province, district: a.district, back: this.view.params.code});
});
App.on('transfer-save', function (form) {
  const s = this.studentByCode[form.dataset.code];
  const v = formData(form);
  const a = this.readArea('tr');
  const e = {};
  if (!a.school) e.school = 'กรุณาเลือกสถานศึกษาใหม่';
  else if (a.school === s.school) e.school = 'สถานศึกษาใหม่ต้องไม่ใช่สถานศึกษาปัจจุบัน';
  if (!v.notified) e.notified = 'กรุณาระบุวันที่แจ้งย้าย';
  if (Object.keys(e).length) { this.go('staff-transfer', {code: s.code, values: {...a, ...v}, errors: e}); return; }
  this.db.transfers.push({code: s.code, from: s.school, to: a.school, date: v.notified, note: v.note, by: this.session.name, at: nowIso()});
  s.history.push({at: nowIso(), text: `ย้ายสถานศึกษา: ${this.schoolName(s.school)} → ${this.schoolName(a.school)} — ${this.session.name}`});
  s.school = a.school;
  this.save();
  this.toast(`บันทึกการย้ายของ ${fullName(s)} แล้ว`);
  this.go('staff-transfer', {code: s.code});
});

/* ---------- สถานศึกษาและครู ---------- */
App.views['staff-schools'] = function (p) {
  const q = (p.q || '').toLowerCase();
  const list = this.db.schools.filter(s => !q || (s.name + s.province + s.district).toLowerCase().includes(q));
  const open = p.id ? this.schoolById[p.id] : null;
  const e = p.errors || {};
  const v = p.values || {region: p.region, province: p.province, district: p.district};
  return {nav: this.staffNav(), html: `
    <div class="page-head"><div><h1>สถานศึกษาและครู</h1><p class="sub">${this.db.schools.length} สถานศึกษา · ${this.data.teachers.length} บัญชีครู</p></div>
      <button class="btn primary" data-go="staff-schools" data-add="1">+ เพิ่มสถานศึกษา</button></div>
    ${p.add ? `<form class="card" data-submit="school-save" data-back="${esc(p.back || '')}" novalidate><h3>เพิ่มสถานศึกษาใหม่</h3>
      <div class="grid-2">${field('sname', 'ชื่อสถานศึกษา', input('sname', v.sname, 'placeholder="เช่น โรงเรียนบ้านหนองบัว"'), {req: 1, err: e.sname})}
        ${field('stype', 'ประเภท', select('stype', [['school', 'โรงเรียน'], ['college', 'วิทยาลัย'], ['university', 'มหาวิทยาลัย']], v.stype || 'school'), {req: 1})}</div>
      <div class="grid-3" data-area="{}">${this.areaPicker('ns', v)}</div>${e.area ? `<div class="err">${e.area}</div>` : ''}
      <div class="row end"><button class="btn" type="button" data-go="${p.back ? 'staff-transfer' : 'staff-schools'}" data-code="${esc(p.back || '')}">ยกเลิก</button>
        <button class="btn primary" type="submit">บันทึกสถานศึกษา</button></div></form>` : ''}
    ${open ? `<section class="card"><div class="card-head"><h3>${esc(open.name)}</h3><button class="btn ghost sm" data-go="staff-schools">ปิด</button></div>
      <p class="small muted">${esc(open.district)} จังหวัด${esc(open.province)} · ${esc(this.regionName(open.region))}</p>
      ${table([{t: 'ชื่อผู้ใช้'}, {t: 'ชื่อครู'}, {t: 'ตำแหน่ง'}, {t: 'ติดต่อ'}], this.teachersOf(open.id).map(t => ({
        cells: [esc(t.username), esc(t.name), esc(t.position), `<span class="num">${esc(t.phone)}</span><br><span class="small muted">${esc(t.email)}</span>`]})),
        {empty: 'ยังไม่มีบัญชีครู'})}</section>` : ''}
    ${field('sq', 'ค้นหาสถานศึกษา', input('sq', p.q || '', 'placeholder="ชื่อ จังหวัด หรืออำเภอ" data-oninput="school-search"'))}
    ${table([{t: 'สถานศึกษา'}, {t: 'จังหวัด'}, {t: 'ครู', r: 1}, {t: 'นักเรียน', r: 1}], list.map(s => ({
      attrs: `class="click" data-go="staff-schools" data-id="${s.id}"`,
      cells: [esc(s.name), esc(s.province), this.teachersOf(s.id).length, this.db.students.filter(x => x.school === s.id).length]})),
      {empty: 'ไม่พบสถานศึกษา'})}`,
  after() { const el = document.getElementById('sq'); if (p.q != null && el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }};
};
App.on('school-search', function (el) {
  clearTimeout(this._sq);
  this._sq = setTimeout(() => this.go('staff-schools', {q: el.value}), 250);
});
App.on('school-save', function (form) {
  const v = formData(form);
  const a = this.readArea('ns');
  const e = {};
  if (!v.sname) e.sname = 'กรุณากรอกชื่อสถานศึกษา';
  else if (this.db.schools.some(s => s.name === v.sname && s.district === a.district)) e.sname = 'มีสถานศึกษาชื่อนี้ในอำเภอนี้แล้ว';
  if (!a.district) e.area = 'กรุณาเลือกภาค จังหวัด และอำเภอ';
  if (Object.keys(e).length) { this.go('staff-schools', {add: '1', back: form.dataset.back, values: {...v, ...a}, errors: e}); return; }
  const id = 'NEW-' + String(this.db.schools.length + 1).padStart(3, '0');
  this.db.schools.push({id, name: v.sname, type: v.stype, region: a.region, province: a.province, district: a.district});
  this.save();
  this.toast('เพิ่มสถานศึกษาแล้ว');
  if (form.dataset.back) this.go('staff-transfer', {code: form.dataset.back, values: {region: a.region, province: a.province, district: a.district, school: id}});
  else this.go('staff-schools', {id});
});

/* ---------- รายงาน ---------- */
App.views['staff-reports'] = function () {
  const all = this.db.students;
  const levels = this.db.rates.filter(r => r.code !== 'SPECIAL').map(r => {
    const list = all.filter(s => s.rate === r.code);
    const ap = list.filter(s => s.decision && s.decision.result === 'approved');
    return {cells: [esc(r.name), list.length, ap.length, baht(ap.reduce((a, s) => a + s.decision.approved_amount, 0))]};
  });
  const dec = Object.entries(DECISION).map(([k, d]) => ({cells: [`<span class="badge t-${d.tone}">${d.label}</span>`,
    all.filter(s => s.decision && s.decision.result === k).length]}));
  return {nav: this.staffNav(), html: `
    <div class="page-head"><div><h1>รายงาน</h1><p class="sub">สรุปจากข้อมูลชุดเดียวกับผลอนุมัติจริง</p></div></div>
    <div class="grid-2">
      <section class="stack"><h3>ผลการพิจารณา</h3>${table([{t: 'ผล'}, {t: 'จำนวน', r: 1}], dec)}</section>
      <section class="stack"><h3>การย้ายสถานศึกษา</h3>${table([{t: 'รายการ'}, {t: 'จำนวน', r: 1}], [{cells: ['บันทึกการย้ายทั้งหมด', this.db.transfers.length]}])}</section>
    </div>
    <section class="stack"><h3>แยกตามระดับชั้นที่ได้รับทุน</h3>
      ${table([{t: 'ระดับชั้น'}, {t: 'ผู้สมัคร', r: 1}, {t: 'อนุมัติ', r: 1}, {t: 'งบประมาณ', r: 1}], levels)}</section>`};
};

/* ---------- ตั้งค่ารอบ ---------- */
App.views['staff-settings'] = function () {
  const admin = this.session.staffRole === 'admin';
  const c = this.db.cycle;
  const ro = admin ? '' : 'disabled';
  return {nav: this.staffNav(), html: `
    <div class="page-head"><div><h1>ตั้งค่ารอบรับสมัคร</h1><p class="sub">${admin ? 'แก้ไขได้เฉพาะผู้ดูแลระบบ' : 'ดูได้อย่างเดียว เฉพาะผู้ดูแลระบบที่แก้ไขได้'}</p></div></div>
    <form class="stack" data-submit="settings-save" novalidate>
      <section class="card"><h3>รอบรับสมัคร</h3>
        <div class="grid-3">
          ${field('c_open', 'วันเปิดรับสมัคร', input('c_open', c.open, 'type="date" ' + ro))}
          ${field('c_close', 'วันปิดรับสมัคร', input('c_close', c.close, 'type="date" ' + ro))}
          ${field('c_status', 'สถานะรอบ', select('c_status', [['preparing', 'เตรียมระบบ'], ['open', 'เปิดรับสมัคร'], ['closed', 'ปิดรับสมัคร']], c.status, null, ro))}
        </div></section>
      <section class="stack"><h3>อัตราทุน ปีการศึกษา ${c.year}</h3>
        ${table([{t: 'ระดับชั้นปีที่ได้รับทุน'}, {t: 'บาท / คน / ปี', r: 1}], this.db.rates.map(r => ({
          cells: [esc(r.name), `<input class="input num" style="max-width:140px;text-align:right" name="rate_${r.code}" value="${r.amount}" type="number" min="0" step="500" inputmode="numeric" aria-label="${esc(r.name)}" ${ro}>`]})))}</section>
      ${admin ? '<div class="row end"><button class="btn primary" type="submit">บันทึกการตั้งค่า</button></div>' : ''}
    </form>`};
};
App.on('settings-save', function (form) {
  const v = formData(form);
  if (v.c_close && v.c_open && v.c_close <= v.c_open) { this.toast('วันปิดรับสมัครต้องอยู่หลังวันเปิดรับสมัคร'); return; }
  Object.assign(this.db.cycle, {open: v.c_open, close: v.c_close, status: v.c_status});
  this.db.rates.forEach(r => { if (v['rate_' + r.code] !== undefined) r.amount = Number(v['rate_' + r.code]); });
  this.save();
  this.toast('บันทึกการตั้งค่าแล้ว');
  this.go('staff-settings');
});
