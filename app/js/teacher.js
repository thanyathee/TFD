/* บทบาทครู: เข้าสู่ระบบ → รายชื่อนักเรียนของโรงเรียน → ตรวจ แนบเอกสาร ให้ความเห็น → ส่งมูลนิธิฯ */
'use strict';

const SENT = ['waiting_staff', 'need_more_info', 'waiting_manager', 'decided'];
App.teacherNav = function () { return [['teacher-home', 'นักเรียน'], ['teacher-report', 'ใบสรุปเสนอ ผอ.']]; };
App.myStudents = function () { return this.db.students.filter(s => s.school === this.session.school); };

App.views['teacher-entry'] = function (p) {
  this.session = {role: null};
  const v = p.values || {};
  const e = p.errors || {};
  return {html: `
    <div class="page-head"><div><h1>เข้าสู่ระบบครู / สถานศึกษา</h1><p class="sub">บัญชีผูกกับสถานศึกษา จะเห็นเฉพาะนักเรียนของโรงเรียนตนเอง</p></div></div>
    <div class="split">
      <form class="card" data-submit="teacher-login" novalidate>
        ${field('username', 'ชื่อผู้ใช้', input('username', v.username, 'autocomplete="username" autocapitalize="off"'), {req: 1, err: e.username})}
        ${field('password', 'รหัสผ่าน', input('password', v.password, 'type="password" autocomplete="current-password"'), {req: 1, err: e.password})}
        <div class="row end"><button class="btn primary" type="submit">เข้าสู่ระบบ</button></div>
      </form>
      <aside class="card"><h3>ทดลองใช้งาน</h3>
        <p class="small muted">ชื่อผู้ใช้ <b>t001</b> ถึง <b>t100</b> · รหัสผ่าน <b>Demo@1234</b></p>
        <button class="btn" data-action="teacher-sample">ใช้บัญชีตัวอย่าง t001</button></aside>
    </div>`};
};
App.on('teacher-sample', function () { this.go('teacher-entry', {values: {username: 't001', password: 'Demo@1234'}}); });
App.on('teacher-login', function (form) {
  const v = formData(form);
  const e = {};
  const t = this.data.teachers.find(x => x.username === v.username.toLowerCase());
  if (!v.username) e.username = 'กรุณากรอกชื่อผู้ใช้';
  else if (!t) e.username = 'ไม่พบชื่อผู้ใช้นี้';
  if (!v.password) e.password = 'กรุณากรอกรหัสผ่าน';
  else if (t && v.password !== 'Demo@1234') e.password = 'รหัสผ่านไม่ถูกต้อง';
  if (Object.keys(e).length) { this.go('teacher-entry', {values: {username: v.username}, errors: e}); return; }
  this.session = {role: 'teacher', teacher: t.username, school: t.school, who: t.name};
  this.go('teacher-home');
});

App.views['teacher-home'] = function (p) {
  const sc = this.schoolById[this.session.school];
  const all = this.myStudents();
  const f = p.filter || (all.some(s => s.status === 'waiting_teacher') ? 'todo' : 'all');
  const q = (p.q || '').toLowerCase();
  const groups = {
    todo: ['รอครูตรวจ', s => s.status === 'waiting_teacher'],
    draft: ['นักเรียนกำลังกรอก', s => ['draft', 'returned_to_student'].includes(s.status)],
    sent: ['ส่งมูลนิธิฯ แล้ว', s => SENT.includes(s.status)],
    all: ['ทั้งหมด', () => true],
  };
  const rows = all.filter(groups[f][1]).filter(s => !q || (s.code + fullName(s)).toLowerCase().includes(q));
  return {nav: this.teacherNav(), html: `
    <div class="page-head"><div><h1>${esc(sc.name)}</h1><p class="sub">อำเภอ${esc(sc.district.replace(/^(อำเภอ|เขต)/, ''))} จังหวัด${esc(sc.province)}</p></div></div>
    <div class="stats">${Object.entries(groups).map(([k, [t, fn]]) =>
      `<button class="stat" data-go="teacher-home" data-filter="${k}" aria-pressed="${k === f}"><span>${t}</span><b>${all.filter(fn).length}</b></button>`).join('')}</div>
    <div class="field"><label for="tq" class="label">ค้นหานักเรียน</label>
      ${input('tq', p.q || '', 'placeholder="เลขใบสมัคร หรือ ชื่อ" data-oninput="teacher-search" data-filter="' + f + '"')}</div>
    ${table([{t: 'เลขใบสมัคร'}, {t: 'ชื่อ–นามสกุล'}, {t: 'ชั้น'}, {t: 'ประเภท'}, {t: 'สถานะ'}, {t: ''}], rows.map(s => ({
      attrs: `class="click" data-go="teacher-student" data-code="${s.code}"`,
      cells: [`<span class="num">${s.code}</span>`, esc(fullName(s)), esc(s.class), TYPE[s.type], badge(s.status, s.decision),
        `<span class="btn sm ${s.status === 'waiting_teacher' ? 'primary' : ''}">${s.status === 'waiting_teacher' ? 'ตรวจ' : 'ดู'}</span>`]})),
      {empty: 'ไม่มีนักเรียนในกลุ่มนี้'})}`,
    after() { const el = document.getElementById('tq'); if (p.q != null && el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }};
};
App.on('teacher-search', function (el) {
  clearTimeout(this._ts);
  this._ts = setTimeout(() => this.go('teacher-home', {filter: el.dataset.filter, q: el.value}), 250);
});

App.views['teacher-student'] = function (p) {
  const s = this.studentByCode[p.code];
  const e = p.errors || {};
  const active = s.status === 'waiting_teacher';
  const docs = docsFor(s.type);
  const files = s.docFiles || [];
  const tr = s.teacher_review;
  const v = p.values || {grade_type: tr ? tr.grade_type : '', grade_value: tr ? tr.grade_value : '', comment: tr ? tr.comment : ''};
  return {nav: this.teacherNav(), html: `
    <div class="row"><button class="btn ghost sm" data-go="teacher-home">← รายชื่อนักเรียน</button></div>
    <div class="page-head"><div><h1>${esc(fullName(s))}</h1><p class="sub"><span class="num">${s.code}</span> · ${esc(s.class)} → ${esc(s.next_class)} · ${TYPE[s.type]}</p></div>${badge(s.status, s.decision)}</div>
    <div class="split">
      <div class="stack">
        ${studentSummary.call(this, s)}
      </div>
      <form class="card" data-submit="teacher-send" data-code="${s.code}" novalidate>
        <h3>${active ? 'ตรวจและส่งมูลนิธิฯ' : 'ผลการตรวจของครู'}</h3>
        ${['draft', 'returned_to_student'].includes(s.status) ? '<div class="note info small">นักเรียนยังไม่ได้ส่งใบสมัคร</div>' : ''}
        <div class="field"><span class="label">เอกสารประกอบ ${active ? '<span class="req">*</span>' : ''}</span>
          ${docs.map((d, i) => `<div class="doc-row"><span class="small">${d}</span>${files[i] || (s.docs || [])[i]
            ? `<span class="badge t-ok">${esc(files[i] || 'แนบแล้ว')}</span>`
            : active ? `<label class="btn sm">แนบไฟล์<input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" data-onchange="teacher-file" data-code="${s.code}" data-i="${i}"></label>`
              : '<span class="muted small">—</span>'}</div>`).join('')}
          ${e.docs ? `<div class="err">${e.docs}</div>` : '<div class="hint">PDF, JPG หรือ PNG ไม่เกิน 10 MB ต่อไฟล์</div>'}</div>
        <div class="grid-2">
          ${field('grade_type', 'รูปแบบคะแนน', select('grade_type', [['gpa', 'เกรดเฉลี่ย (0–4)'], ['percent', 'ร้อยละ (0–100)']], v.grade_type, 'เลือก', active ? '' : 'disabled'), {req: active, err: e.grade_type})}
          ${field('grade_value', 'ผลการเรียน', input('grade_value', v.grade_value, `type="number" step="0.01" min="0" inputmode="decimal" ${active ? '' : 'readonly'}`), {req: active, err: e.grade_value})}
        </div>
        ${field('comment', 'ความเห็นของครู', textarea('comment', v.comment, `rows="4" data-oninput="count" maxlength="1000" aria-describedby="cnt_c" ${active ? '' : 'readonly'}`) +
          `<div class="counter" id="cnt_c">${(v.comment || '').length} / 1000</div>`, {req: active, hint: active ? 'ความประพฤติ ความตั้งใจเรียน และความจำเป็นของครอบครัว อย่างน้อย 30 ตัวอักษร' : '', err: e.comment})}
        ${active ? `<div class="row end"><button class="btn primary" type="submit">ส่งมูลนิธิฯ</button></div>
        <details class="more"><summary>ส่งกลับให้นักเรียนแก้ไข</summary><div class="stack">
          ${field('return_reason', 'สิ่งที่ต้องแก้ไข', textarea('return_reason', '', 'rows="2"'), {err: e.return_reason})}
          <div class="row end"><button class="btn danger" type="button" data-action="teacher-return" data-code="${s.code}">ส่งกลับให้แก้ไข</button></div></div></details>` : ''}
        ${tr ? `<p class="small muted">ส่งมูลนิธิฯ เมื่อ ${thDate(tr.sent_at, true)}</p>` : ''}
      </form>
    </div>`};
};
function studentSummary(s) {
  const f = s.family || {};
  const income = (f.father_monthly_income || 0) + (f.mother_monthly_income || 0);
  return `
    <section class="card"><h3>ข้อมูลนักเรียน</h3>
      <dl class="kv"><div><dt>เลขประจำตัวประชาชน</dt><dd class="num">${esc(s.citizen_id)}</dd></div>
        <div><dt>วันเกิด</dt><dd>${thDate(s.birth_date)}</dd></div><div><dt>โทรศัพท์</dt><dd class="num">${esc(s.phone)}</dd></div>
        <div><dt>สถานศึกษา</dt><dd>${esc(this.schoolName(s.school))}</dd></div>
        <div><dt>อัตราทุน</dt><dd>${baht(this.rateAmount(s.rate))}</dd></div><div><dt>ส่งใบสมัคร</dt><dd>${thDate(s.submitted_at, true)}</dd></div></dl>
      ${s.address ? `<p class="small"><span class="muted">ที่อยู่:</span> ${esc(s.address)}</p>` : ''}</section>
    <section class="card"><h3>ครอบครัว</h3>
      <dl class="kv"><div><dt>บิดา</dt><dd>${esc(f.father_name || '—')}<br><span class="small muted">${esc(f.father_occupation || '')} ${baht(f.father_monthly_income || 0)}/เดือน</span></dd></div>
        <div><dt>มารดา</dt><dd>${esc(f.mother_name || '—')}<br><span class="small muted">${esc(f.mother_occupation || '')} ${baht(f.mother_monthly_income || 0)}/เดือน</span></dd></div>
        <div><dt>รายได้บิดามารดารวม</dt><dd>${baht(income)}/เดือน</dd></div>
        <div><dt>อาศัยอยู่กับ / บ้าน</dt><dd>${esc(f.guardian_relation || '—')} · ${esc(f.housing_type || '—')}</dd></div>
        <div><dt>พี่น้อง</dt><dd>${(s.siblings || []).length} คน</dd></div>
        <div><dt>ทรัพย์สิน</dt><dd>${esc((f.assets || []).join(', ') || 'ไม่มี')}</dd></div></dl></section>
    <details class="more card" style="padding:0 20px"><summary>เรื่องราวชีวิต</summary><div>${STORY_Q.map(([t], i) =>
      `<div class="story"><b class="small">${i + 1}. ${t}</b><span>${esc(s.stories[i] || '—')}</span></div>`).join('')}</div></details>`;
}
App.on('teacher-file', function (el) {
  const file = el.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { this.toast('ไฟล์ใหญ่เกิน 10 MB กรุณาเลือกไฟล์ใหม่'); return; }
  const s = this.studentByCode[el.dataset.code];
  s.docFiles = s.docFiles || [];
  s.docFiles[Number(el.dataset.i)] = file.name;
  const v = formData(el.form);
  this.save();
  this.go('teacher-student', {code: s.code, values: v});
});
App.on('teacher-send', function (form) {
  const s = this.studentByCode[form.dataset.code];
  const v = formData(form);
  const e = {};
  const files = s.docFiles || [];
  if (docsFor(s.type).some((_, i) => !files[i])) e.docs = 'กรุณาแนบเอกสารให้ครบทุกรายการ';
  if (!v.grade_type) e.grade_type = 'กรุณาเลือกรูปแบบคะแนน';
  const g = Number(v.grade_value);
  if (v.grade_value === '' || isNaN(g)) e.grade_value = 'กรุณากรอกผลการเรียน';
  else if (v.grade_type === 'gpa' && (g < 0 || g > 4)) e.grade_value = 'เกรดเฉลี่ยต้องอยู่ระหว่าง 0–4';
  else if (v.grade_type === 'percent' && (g < 0 || g > 100)) e.grade_value = 'ร้อยละต้องอยู่ระหว่าง 0–100';
  if ((v.comment || '').length < 30) e.comment = 'กรุณาเขียนความเห็นอย่างน้อย 30 ตัวอักษร';
  if (Object.keys(e).length) { this.go('teacher-student', {code: s.code, values: v, errors: e}); return; }
  s.teacher_review = {teacher: this.session.teacher, grade_type: v.grade_type, grade_value: g, comment: v.comment, sent_at: nowIso()};
  s.docs = docsFor(s.type).map(() => true);
  s.status = 'waiting_staff';
  s.history.push({at: nowIso(), text: 'ครูตรวจและส่งมูลนิธิฯ — ' + this.session.who});
  this.save();
  this.toast(`ส่ง ${fullName(s)} ไปยังมูลนิธิฯ แล้ว`);
  this.go('teacher-home');
});
App.on('teacher-return', function (el) {
  const s = this.studentByCode[el.dataset.code];
  const reason = document.getElementById('return_reason').value.trim();
  if (!reason) { this.go('teacher-student', {code: s.code, values: formData(el.form), errors: {return_reason: 'กรุณาระบุสิ่งที่ต้องแก้ไข'}}); return; }
  s.status = 'returned_to_student';
  s.return_reason = reason;
  s.history.push({at: nowIso(), text: 'ครูส่งกลับให้แก้ไข: ' + reason});
  this.save();
  this.toast('ส่งกลับให้นักเรียนแก้ไขแล้ว');
  this.go('teacher-home');
});

App.views['teacher-report'] = function () {
  const sc = this.schoolById[this.session.school];
  const sent = this.myStudents().filter(s => SENT.includes(s.status));
  const signed = (this.db.signed || {})[sc.id];
  return {nav: this.teacherNav(), html: `
    <div class="page-head"><div><h1>ใบสรุปรายชื่อเสนอผู้อำนวยการ</h1><p class="sub">${esc(sc.name)} · ปีการศึกษา ${this.db.cycle.year}</p></div></div>
    <div class="stats"><div class="stat"><span>ส่งแล้วทั้งหมด</span><b>${sent.length}</b></div>
      <div class="stat"><span>ทุนใหม่</span><b>${sent.filter(s => s.type === 'NEW').length}</b></div>
      <div class="stat"><span>ทุนต่อเนื่อง</span><b>${sent.filter(s => s.type === 'CONT').length}</b></div></div>
    ${table([{t: 'ลำดับ', r: 1}, {t: 'เลขใบสมัคร'}, {t: 'ชื่อ–นามสกุล'}, {t: 'ชั้นปีที่ได้รับทุน'}, {t: 'ประเภท'}],
      sent.map((s, i) => ({cells: [i + 1, `<span class="num">${s.code}</span>`, esc(fullName(s)), esc(s.next_class), TYPE[s.type]]})),
      {empty: 'ยังไม่มีนักเรียนที่ส่งมูลนิธิฯ'})}
    <section class="card"><h3>ส่งใบสรุปที่ผู้อำนวยการลงนามแล้ว</h3>
      <p class="small muted">พิมพ์ใบสรุปนี้ ให้ผู้อำนวยการลงนาม แล้วแนบไฟล์ PDF กลับเข้าระบบ ฉบับจริงเก็บไว้ที่สถานศึกษา</p>
      <div class="row">${signed ? `<span class="badge t-ok">${esc(signed)}</span>` : ''}
        <label class="btn ${signed ? '' : 'primary'}">${signed ? 'แนบไฟล์ใหม่' : 'แนบไฟล์ที่ลงนามแล้ว'}<input type="file" hidden accept=".pdf" data-onchange="teacher-signed"></label></div>
    </section>`};
};
App.on('teacher-signed', function (el) {
  const f = el.files[0];
  if (!f) return;
  this.db.signed = this.db.signed || {};
  this.db.signed[this.session.school] = f.name;
  this.save();
  this.toast('แนบใบสรุปที่ลงนามแล้ว');
  this.go('teacher-report');
});
