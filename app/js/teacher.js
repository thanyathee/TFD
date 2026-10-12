/* บทบาทครู / สถานศึกษา (ตาม v28): 1 โรงเรียน = 1 Username → รายชื่อนักเรียน → แฟ้มนักเรียน → ส่งมูลนิธิฯ → ใบสรุปเสนอ ผอ. */
'use strict';

const SENT = ['waiting_staff', 'need_more_info', 'waiting_manager', 'decided'];
const PARENT_LABEL = {alive: 'มีชีวิตอยู่', dead: 'เสียชีวิต', contact: 'ขาดการติดต่อ', prison: 'ถูกจำคุก', monk: 'บวช'};
const INCOME_LABEL = {none: 'ไม่มีรายได้', daily: 'รับจ้างรายวัน', salary: 'เงินเดือนประจำ', other: 'รายได้ไม่แน่นอน'};

App.teacherNav = function () { return [['teacher-home', 'รายชื่อนักเรียน', ['teacher-student']], ['teacher-report', 'ใบสรุปเสนอ ผอ.']]; };
App.myStudents = function () { return this.db.students.filter(s => s.school === this.session.school); };
const docsComplete = s => docsFor(s).every(([code]) => ((s.docFiles || {})[code] || []).length);

App.views['teacher-entry'] = function (p) {
  this.session = {role: null};
  const v = p.values || {};
  const e = p.errors || {};
  return {html: `
    <div class="page-head"><div><h1>เข้าสู่ระบบครู / สถานศึกษา</h1><p class="sub">1 โรงเรียน = 1 Username สำหรับผู้ดูแลทุนของสถานศึกษา</p></div></div>
    <div class="split">
      <form class="card" data-submit="teacher-login" novalidate>
        ${field('username', 'Username', input('username', v.username, 'autocomplete="username" autocapitalize="off"'), {req: 1, err: e.username})}
        ${field('password', 'Password', input('password', v.password, 'type="password" autocomplete="current-password"'), {req: 1, err: e.password})}
        <div class="note info small">Username จะผูกกับ SchoolID ของสถานศึกษาโดยตรง เพื่อให้บัญชีนี้เห็นเฉพาะนักเรียนของโรงเรียนตนเอง</div>
        <div class="row end"><button class="btn primary" type="submit">เข้าสู่ระบบ</button></div>
      </form>
      <aside class="card"><h3>ทดลองใช้งาน</h3>
        <p class="small muted">Username <b>sch001</b> ถึง <b>sch100</b> · Password <b>Demo@1234</b></p>
        <button class="btn" data-action="teacher-sample" data-u="sch001">โรงเรียนที่มีนักเรียนหลายคน (sch001)</button>
        <button class="btn" data-action="teacher-sample" data-u="${esc((this.db.teachers.find(t => (this.schoolById[t.school] || {}).type === 'university') || {}).username || 'sch022')}">มหาวิทยาลัย (ป.ตรี ส่งตรง)</button>
      </aside>
    </div>`, after: focusFirstError};
};
App.on('teacher-sample', function (el) { this.go('teacher-entry', {values: {username: el.dataset.u, password: 'Demo@1234'}}); });
App.on('teacher-login', function (form) {
  const v = formData(form);
  const e = {};
  const t = this.db.teachers.find(x => x.username === (v.username || '').toLowerCase());
  if (!v.username) e.username = 'กรุณากรอก Username';
  else if (!t) e.username = 'ไม่พบ Username นี้';
  else if (t.active === false) e.username = 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อมูลนิธิฯ';
  if (!v.password) e.password = 'กรุณากรอก Password';
  else if (t && v.password !== (t.password || 'Demo@1234')) e.password = 'Password ไม่ถูกต้อง';
  if (Object.keys(e).length) { this.go('teacher-entry', {values: {username: v.username}, errors: e}); return; }
  this.session = {role: 'teacher', teacher: t.username, school: t.school, who: this.schoolName(t.school)};
  this.go('teacher-home');
});

App.views['teacher-home'] = function (p) {
  const sc = this.schoolById[this.session.school];
  const t = this.teacherOf(sc.id);
  const all = this.myStudents();
  const groups = {
    all: ['ทั้งหมด', () => true],
    draft: ['กำลังกรอกใบสมัคร', s => ['draft', 'returned_to_student'].includes(s.status)],
    waiting: ['รอครูดำเนินการ', s => s.status === 'waiting_teacher'],
    sent: ['ส่งมูลนิธิฯ แล้ว', s => SENT.includes(s.status)],
  };
  const f = groups[p.filter] ? p.filter : (all.some(groups.waiting[1]) ? 'waiting' : 'all');
  const q = (p.q || '').toLowerCase();
  const rows = all.filter(groups[f][1]).filter(s => !q || (s.code + fullName(s)).toLowerCase().includes(q));
  return {nav: this.teacherNav(), html: `
    <div class="page-head"><div><h1>${esc(sc.name)}</h1><p class="sub">ระบบครู / สถานศึกษา</p></div></div>
    <section class="card"><div class="card-head"><div><b>ครูผู้ดูแลทุน: ${esc(t ? t.name : '-')}</b>
      <div class="small muted">โทร. <span class="num">${esc(t ? t.phone : '-')}</span> · อีเมล ${esc(t ? t.email : '-')}</div></div></div>
      <p class="small muted">บัญชีผู้ดูแลทุนของโรงเรียน — โรงเรียนนี้ใช้ Username เดียวสำหรับตรวจสอบนักเรียนและส่งเอกสารมายังมูลนิธิฯ</p></section>
    <div class="stats">${['draft', 'waiting', 'sent'].map(k =>
      `<button class="stat" data-go="teacher-home" data-filter="${k}" aria-pressed="${k === f}"><span>${groups[k][0]}</span><b>${all.filter(groups[k][1]).length}</b></button>`).join('')}</div>
    <div class="grid-2">
      ${field('tf', 'กรองตามสถานะ', select('tf', Object.entries(groups).map(([k, g]) => [k, g[0]]), f, null, 'data-onchange="teacher-filter"'))}
      ${field('tq', 'ค้นหานักเรียน', input('tq', p.q || '', 'placeholder="รหัสผู้สมัคร หรือ ชื่อ–นามสกุล" data-oninput="teacher-search"'))}
    </div>
    ${listRows(rows.map(s => studentRow(s, `data-go="teacher-student" data-code="${s.code}"`,
      `<span class="num">${s.code}</span> · ${esc(s.class || '-')} · ${TYPE[s.type]}${SENT.includes(s.status) || s.status === 'waiting_teacher' ? ` · เอกสาร${docsComplete(s) ? 'ครบ' : 'ยังไม่ครบ'}` : ''}`)),
      'ไม่มีนักเรียนในกลุ่มนี้')}`,
    after() { const el = document.getElementById('tq'); if (p.q != null && el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }};
};
App.on('teacher-filter', function (el) { this.go('teacher-home', {filter: el.value, q: (document.getElementById('tq') || {}).value || ''}); });
App.on('teacher-search', function (el) {
  clearTimeout(this._ts);
  this._ts = setTimeout(() => this.go('teacher-home', {filter: document.getElementById('tf').value, q: el.value}), 250);
});

/* ข้อมูลผู้สมัครทุกส่วน ใช้ร่วมกันระหว่างครูและเจ้าหน้าที่ */
function applicantSections(s, o = {}) {
  const sc = this.schoolById[s.school] || {};
  const f = s.family || {};
  const parent = k => {
    const st = f[k + '_status'];
    if (st !== 'alive') return PARENT_LABEL[st] || '—';
    const it = f[k + '_income_type'];
    const inc = it === 'daily' ? `ประมาณ ${baht(f[k + '_daily_wage'])}/วัน ${f[k + '_work_days'] ? `ทำงานเฉลี่ย ${f[k + '_work_days']} วัน/เดือน` : '(ไม่ทราบจำนวนวัน)'}`
      : it === 'salary' || it === 'other' ? `${baht(f[k + '_monthly_income'])}/เดือน` : '';
    return `${esc(f[k + '_name'] || '-')}${f[k + '_age'] ? ` (${f[k + '_age']} ปี)` : ''}<div class="small muted">${esc(f[k + '_occupation'] || '')} ${INCOME_LABEL[it] ? '· ' + INCOME_LABEL[it] : ''} ${inc}${f[k + '_cannot_work'] ? ' · ไม่สามารถประกอบอาชีพได้' : ''}</div>`;
  };
  const assetText = f.no_assets ? 'ไม่มีสิ่งของตามรายการ' : Object.entries(f.assets || {}).map(([k, n]) => {
    const a = ASSETS.find(x => x[0] === k); return a ? a[1] + (a[2] ? ` ${n} คัน` : '') : k; }).join(', ') || '—';
  const flags = (f.family_status || []).map(k => (FAMILY_FLAGS.find(x => x[0] === k) || [k, k])[1]).join(', ') || '—';
  const land = (yes, rai, ngan, cost) => yes ? `${rai || 0} ไร่ ${ngan || 0} งาน${cost ? ` · ค่าเช่า ${baht(cost)}/ปี` : ''}` : yes === false ? 'ไม่มี' : '—';
  const sibs = s.siblings || [];
  const n = o.numbered ? i => `${i}. ` : () => '';
  return `
    <section class="card"><h3>${n(1)}ข้อมูลผู้สมัคร</h3><dl class="kv">
      <div><dt>ชื่อ–นามสกุล</dt><dd>${esc(fullName(s))}</dd></div><div><dt>เลขประจำตัวประชาชน</dt><dd class="num">${esc(s.citizen_id)}</dd></div>
      <div><dt>วันเดือนปีเกิด / อายุ</dt><dd>${beDate(s.birth_date)} / ${s.age_at_submit !== undefined && s.age_at_submit !== '' ? s.age_at_submit : ageAt(s.birth_date)} ปี</dd></div>
      <div><dt>หมายเลขโทรศัพท์</dt><dd class="num">${esc(s.phone)}</dd></div><div><dt>เพศ</dt><dd>${esc(s.gender || '-')}</dd></div></dl>
      <dl class="kv"><div><dt>ที่อยู่ตามภูมิลำเนา</dt><dd>${esc(s.home_address || '-')}</dd></div><div><dt>ที่อยู่ปัจจุบัน</dt><dd>${s.same_address ? 'เหมือนที่อยู่ตามภูมิลำเนา' : esc(s.current_address || '-')}</dd></div></dl></section>
    <section class="card"><h3>${n(2)}ข้อมูลการศึกษา</h3><dl class="kv">
      <div><dt>สถานศึกษา</dt><dd>${esc(sc.name || '-')}</dd></div><div><dt>พื้นที่</dt><dd>${esc(this.regionName(sc.region))} / จังหวัด${esc(sc.province || '')} / ${esc(sc.district || '')}</dd></div>
      <div><dt>ระดับชั้นปัจจุบัน</dt><dd>${esc(s.class || '-')}</dd></div><div><dt>ระดับชั้นปีถัดไป</dt><dd>${esc(s.next_class || '-')}</dd></div>
      ${s.faculty ? `<div><dt>คณะ / สาขาวิชา</dt><dd>${esc(s.faculty)}</dd></div>` : ''}
      ${s.pvs_type ? `<div><dt>ประเภทวิชา</dt><dd>${esc((PVS_TYPES.find(x => x[0] === s.pvs_type) || [, s.pvs_type])[1])}</dd></div>` : ''}
      ${s.study_mode ? `<div><dt>รูปแบบการเรียน</dt><dd>${esc((STUDY_MODES.find(x => x[0] === s.study_mode) || [, s.study_mode])[1])}${s.study_mode_other ? ' — ' + esc(s.study_mode_other) : ''}</dd></div>` : ''}
      <div><dt>สถานศึกษาปีถัดไป</dt><dd>${s.school_next === 'same' ? 'เรียนต่อสถานศึกษาเดิม' : s.school_next === 'transfer' ? 'ย้ายสถานศึกษา' : '-'}</dd></div>
      <div><dt>ประเภททุน</dt><dd>${TYPE[s.type]}</dd></div><div><dt>อัตราทุน</dt><dd>${baht(this.rateAmount(s.rate))}</dd></div>
      <div><dt>กยศ./กรอ.</dt><dd>${s.loan === 'yes' ? `กู้ ${s.loan_amount ? baht(s.loan_amount) + ' ' + esc(s.loan_period || '') : ''}` : s.loan === 'no' ? 'ไม่กู้' : '-'}</dd></div>
      <div><dt>ทุนต่อเนื่องอื่น</dt><dd>${s.other === 'yes' ? `${esc(s.other_org || '')} ${s.other_amount ? baht(s.other_amount) + ' ' + esc(s.other_period || '') : ''}` : s.other === 'no' ? 'ไม่ได้รับ' : '-'}</dd></div>
      ${s.teacher_review ? `<div><dt>ผลการเรียนจากครู</dt><dd>${s.teacher_review.grade_type === 'gpa' ? `${s.teacher_review.grade_value} / 4.00` : `${s.teacher_review.grade_value}%`}</dd></div>` : ''}
    </dl></section>
    <section class="card"><h3>${n(3)}ข้อมูลครอบครัว</h3><dl class="kv">
      <div><dt>บิดา</dt><dd>${parent('father')}</dd></div><div><dt>มารดา</dt><dd>${parent('mother')}</dd></div>
      <div><dt>สถานภาพครอบครัว</dt><dd>${esc(flags)}</dd></div><div><dt>พี่น้อง</dt><dd>${sibs.length} คน</dd></div>
      <div><dt>ที่อยู่อาศัย</dt><dd>${esc(f.housing_type || '-')}</dd></div><div><dt>ค่าเช่า / ค่างวด</dt><dd>${f.housing_cost ? baht(f.housing_cost) + '/เดือน' : '—'}</dd></div>
      <div><dt>ที่ดินเกษตรของตนเอง</dt><dd>${land(f.own_land, f.own_land_rai, f.own_land_ngan)}</dd></div>
      <div><dt>เช่าที่ดินเกษตร</dt><dd>${land(f.rent_land, f.rent_land_rai, f.rent_land_ngan, f.rent_land_cost)}</dd></div>
      <div><dt>ทรัพย์สิน</dt><dd>${esc(assetText)}</dd></div></dl>
      ${sibs.length ? `<details class="more"><summary>รายละเอียดพี่น้อง (${sibs.length})</summary><div>${sibs.map((x, i) => `<div class="small"><b>${i + 1}. ${esc(x.name || '-')}</b> ${x.age ? x.age + ' ปี' : ''} · ${esc(x.relation || '')} · ${esc(x.residence || '')}
        <div class="muted">${x.status === 'study' ? `กำลังศึกษา ${esc(x.edu_level || '')} ${esc(x.school_name || '')}${x.has_loan ? ' · กู้ กยศ./กรอ.' : ''}` : x.status === 'work' ? `ทำงาน: ${esc(x.occupation || '')}` : x.status === 'none' ? esc(x.detail || 'ไม่ได้ศึกษาและยังไม่ได้ทำงาน') : ''}</div></div>`).join('')}</div></details>` : ''}
    </section>
    <section class="card"><h3>${n(4)}เรื่องราวชีวิตที่นักเรียนเขียน</h3>
      <details class="more" ${o.openStories ? 'open' : ''}><summary>เปิดดูคำตอบทั้งหมด</summary><div>${STORY_Q.map(([t], i) =>
        `<div class="story"><b class="small">${i + 1}. ${t}</b><span>${esc(s.stories[i] || '—')}</span></div>`).join('')}</div></details></section>`;
}

App.views['teacher-student'] = function (p) {
  const s = this.studentByCode[p.code];
  const e = p.errors || {};
  const tr = s.teacher_review;
  const active = s.status === 'waiting_teacher';
  const bachelor = s.group === 'bachelor';
  const v = p.values || {grade_type: tr ? tr.grade_type : '', grade_value: tr ? tr.grade_value : '', comment: tr ? tr.comment : ''};
  const complete = docsComplete(s);
  const gradeLabel = v.grade_type === 'gpa' ? 'เกรดเฉลี่ย (GPA)' : v.grade_type === 'percent' ? 'คะแนนเฉลี่ย (%)' : 'คะแนน / เกรดเฉลี่ย';
  return {nav: this.teacherNav(), html: `
    <button class="back" data-go="teacher-home">${icon('back')} กลับรายชื่อ</button>
    <div class="page-head"><div><h1>แฟ้มนักเรียน</h1><p class="sub"><span class="num">${s.code}</span> — ${esc(fullName(s))}</p></div>${badge(s)}</div>
    <div class="grid-2"><div class="stat"><span>ระดับชั้น</span><b style="font-size:20px">${esc(s.class || '-')}</b></div><div class="stat"><span>ประเภททุน</span><b style="font-size:20px">${TYPE[s.type]}</b></div></div>
    <div class="note info">ครูสามารถ <b>ดูข้อมูลที่นักเรียนกรอก</b> แต่ไม่แก้ไขแทนนักเรียนโดยตรง หากข้อมูลผิด ให้เปิดสิทธิ์ให้นักเรียนกลับไปแก้ไขก่อนส่งมายังมูลนิธิฯ</div>
    ${s.status === 'returned_to_student' ? `<div class="note warn"><b>เปิดสิทธิ์ให้นักเรียนแก้ไขแล้ว:</b> ${esc(s.return_reason || '')}</div>` : ''}
    ${s.status === 'draft' ? '<div class="note warn">นักเรียนยังไม่ได้ส่งใบสมัคร</div>' : ''}
    ${bachelor ? '<div class="note info">ระดับปริญญาตรี: นักศึกษาอัปโหลดเอกสารและส่งใบสมัครถึงมูลนิธิฯ โดยตรง</div>' : ''}
    <div class="split">
      <div class="stack"><h2>ตรวจสอบใบสมัครของนักเรียน</h2>${applicantSections.call(this, s)}</div>
      <form class="stack" data-submit="teacher-send" data-code="${s.code}" novalidate>
        <section class="card"><div class="card-head"><h3>เอกสารประกอบ</h3><span class="sub">${TYPE[s.type]} · ${esc(s.class || '')}</span></div>
          <p class="small muted">ระบบแสดงเฉพาะเอกสารที่เกี่ยวข้องกับนักเรียนรายนี้ ตามประเภททุนและระดับชั้น</p>
          <div>${docsFor(s).map(([code, name, multi]) => docRow(s, code, name, multi, active, 'teacher-file')).join('')}</div>
          ${e.docs ? `<div class="err">${e.docs}</div>` : ''}</section>
        <section class="card"><h3>ความเห็นของครูผู้ดูแลทุน</h3>
          ${active ? `<div class="note info small"><b>กรุณาเขียนข้อมูลที่ช่วยให้มูลนิธิฯ เข้าใจความจำเป็นของนักเรียน</b> เช่น สภาพครอบครัว ภาระค่าใช้จ่าย ความยากลำบาก เหตุจำเป็น หรือข้อเท็จจริงที่ครูทราบ
            <b>หลีกเลี่ยงข้อความสั้น ๆ เช่น “สมควรได้รับทุน” เพียงอย่างเดียว</b></div>` : ''}
          ${field('comment', 'ความคิดเห็นของครู', textarea('comment', v.comment, `rows="5" data-oninput="count" maxlength="2000" aria-describedby="cnt_c" placeholder="เขียนเหตุผลและข้อเท็จจริงที่แสดงถึงความจำเป็นของนักเรียน" ${active ? '' : 'readonly'}`) +
            `<div class="counter" id="cnt_c">${(v.comment || '').length} / 2000</div>`, {req: active, err: e.comment})}
          <h3>ผลการเรียนของนักเรียน</h3>
          <div class="grid-2">
            ${field('grade_type', 'รูปแบบคะแนน', select('grade_type', [['gpa', 'เกรดเฉลี่ย (GPA 4.00)'], ['percent', 'คะแนนเฉลี่ยเป็นเปอร์เซ็นต์']], v.grade_type, 'กรุณาเลือก', `data-onchange="teacher-grade" ${active ? '' : 'disabled'}`), {req: active, err: e.grade_type})}
            ${field('grade_value', `<span id="grade_label">${gradeLabel}</span>`, input('grade_value', v.grade_value, `type="number" step="0.01" min="0" ${v.grade_type === 'gpa' ? 'max="4" placeholder="เช่น 3.25"' : v.grade_type === 'percent' ? 'max="100" placeholder="เช่น 78.50"' : 'placeholder="กรุณาเลือกรูปแบบคะแนนก่อน"'} inputmode="decimal" ${active ? '' : 'readonly'}`), {req: active, err: e.grade_value})}
          </div>
          ${active ? `<div class="note ${complete ? 'ok' : 'warn'} small">${complete ? 'เอกสารบังคับครบแล้ว กดส่งมูลนิธิฯ ได้' : 'ระบบจะเปิดปุ่ม “ส่งมูลนิธิฯ” เมื่อแนบเอกสารบังคับครบทุกรายการ'}</div>
          <div class="row between"><button class="btn" type="button" data-action="teacher-return-open" data-code="${s.code}">เปิดสิทธิ์ให้นักเรียนแก้ไข</button>
            <button class="btn primary" type="submit" ${complete ? '' : 'disabled'}>ส่งมูลนิธิฯ</button></div>
          <div id="return_box" class="subcard" ${p.returnOpen ? '' : 'hidden'}>
            ${field('return_reason', 'สิ่งที่นักเรียนต้องแก้ไข', textarea('return_reason', v.return_reason, 'rows="2"'), {req: 1, err: e.return_reason})}
            <div class="row end"><button class="btn danger" type="button" data-action="teacher-return" data-code="${s.code}">ยืนยันเปิดสิทธิ์ให้แก้ไข</button></div></div>` : ''}
          ${tr ? `<p class="small muted">ส่งมูลนิธิฯ เมื่อ ${thDate(tr.sent_at, true)}</p>` : ''}
        </section>
      </form>
    </div>`, after: focusFirstError};
};
App.on('teacher-grade', function (el) {
  const g = document.getElementById('grade_value');
  document.getElementById('grade_label').textContent = el.value === 'gpa' ? 'เกรดเฉลี่ย (GPA)' : el.value === 'percent' ? 'คะแนนเฉลี่ย (%)' : 'คะแนน / เกรดเฉลี่ย';
  g.max = el.value === 'gpa' ? 4 : el.value === 'percent' ? 100 : '';
  g.placeholder = el.value === 'gpa' ? 'เช่น 3.25' : el.value === 'percent' ? 'เช่น 78.50' : 'กรุณาเลือกรูปแบบคะแนนก่อน';
});
App.on('teacher-file', function (el) {
  const v = formData(el.form);
  const s = storeFiles(this, el);
  if (!s) return;
  this.save();
  this.go('teacher-student', {code: s.code, values: v});
});
App.on('teacher-return-open', function (el) {
  const box = document.getElementById('return_box');
  box.hidden = !box.hidden;
  if (!box.hidden) document.getElementById('return_reason').focus();
});
App.on('teacher-send', function (form) {
  const s = this.studentByCode[form.dataset.code];
  const v = formData(form);
  const e = {};
  if (!docsComplete(s)) e.docs = 'กรุณาแนบเอกสารบังคับให้ครบทุกรายการ';
  if ((v.comment || '').length < 30) e.comment = 'กรุณาเขียนความคิดเห็นของครูให้มีรายละเอียดเพียงพอสำหรับประกอบการพิจารณา (อย่างน้อย 30 ตัวอักษร)';
  const g = Number(v.grade_value);
  if (!v.grade_type) e.grade_type = 'กรุณาเลือกรูปแบบคะแนน';
  if (v.grade_value === '' || v.grade_value == null || isNaN(g)) e.grade_value = 'กรุณากรอกข้อมูลผลการเรียนของนักเรียน';
  else if (v.grade_type === 'gpa' && (g < 0 || g > 4)) e.grade_value = 'เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00–4.00';
  else if (v.grade_type === 'percent' && (g < 0 || g > 100)) e.grade_value = 'คะแนนเฉลี่ยต้องอยู่ระหว่าง 0–100';
  if (Object.keys(e).length) { this.go('teacher-student', {code: s.code, values: v, errors: e}); return; }
  s.teacher_review = {teacher: this.session.teacher, grade_type: v.grade_type, grade_value: g, comment: v.comment, sent_at: nowIso()};
  s.status = 'waiting_staff';
  addHistory(s, 'ครูส่งข้อมูลให้มูลนิธิฯ — ' + this.schoolName(s.school), 'teacher_sent');
  this.save();
  this.toast('ส่งข้อมูลนักเรียนรายนี้มายังมูลนิธิฯ เรียบร้อยแล้ว');
  this.go('teacher-home');
});
App.on('teacher-return', function (el) {
  const s = this.studentByCode[el.dataset.code];
  const v = formData(el.form);
  if (!v.return_reason) { this.go('teacher-student', {code: s.code, values: v, errors: {return_reason: 'กรุณาระบุสิ่งที่ต้องแก้ไข'}, returnOpen: 1}); return; }
  s.status = 'returned_to_student';
  s.return_reason = v.return_reason;
  addHistory(s, 'ครูเปิดสิทธิ์ให้นักเรียนแก้ไข: ' + v.return_reason, 'returned');
  this.save();
  this.toast('เปิดสิทธิ์ให้นักเรียนกลับไปแก้ไขข้อมูลแล้ว');
  this.go('teacher-home');
});

App.views['teacher-report'] = function () {
  const sc = this.schoolById[this.session.school];
  const t = this.teacherOf(sc.id);
  const sent = this.myStudents().filter(s => SENT.includes(s.status) && s.group !== 'bachelor');
  return {nav: this.teacherNav(), html: `
    <div class="page-head"><div><h1>รายงานการส่งนักเรียน</h1><p class="sub">${esc(sc.name)}</p></div>
      <button class="btn primary no-print" data-action="print">${icon('print')} พิมพ์ใบสรุปรายชื่อเสนอ ผอ.</button></div>
    <div class="stats no-print"><div class="stat"><span>ส่งแล้วทั้งหมด</span><b>${sent.length}</b><small>คน</small></div>
      <div class="stat"><span>ทุนใหม่</span><b>${sent.filter(s => s.type === 'NEW').length}</b><small>คน</small></div>
      <div class="stat"><span>ทุนต่อเนื่อง</span><b>${sent.filter(s => s.type === 'CONT').length}</b><small>คน</small></div></div>
    <div class="note info no-print">หลังผู้อำนวยการลงนามรับรองแล้ว ให้สแกน/บันทึกเป็น PDF และส่งทางอีเมลมาที่ <b>tiscofoundation@tiscofoundation.org</b>
      ฉบับจริงเก็บไว้ที่สถานศึกษา <b>ไม่ต้องส่งทางไปรษณีย์</b></div>
    <div class="paper">
      <h3>ใบสรุปรายชื่อนักเรียนที่ส่งขอรับทุนการศึกษา มูลนิธิทิสโก้ เพื่อการกุศล</h3>
      <div class="c"><b>${esc(sc.name)}</b><br>${esc(sc.district)} จังหวัด${esc(sc.province)} | ปีการศึกษา ${this.db.cycle.year}</div>
      <table><thead><tr><th>ลำดับ</th><th>รหัสผู้สมัคร</th><th>ชื่อ–นามสกุล</th><th>ชั้น</th><th>ประเภททุน</th></tr></thead>
        <tbody>${sent.length ? sent.map((s, i) => `<tr><td>${i + 1}</td><td>${s.code}</td><td>${esc(fullName(s))}</td><td>${esc(s.class)}</td><td>${TYPE[s.type]}</td></tr>`).join('')
          : '<tr><td colspan="5" style="text-align:center">ยังไม่มีนักเรียนที่ส่งมูลนิธิฯ</td></tr>'}</tbody></table>
      <div class="sign"><div><b>ผู้ประสานงานทุนการศึกษา</b><br>${esc(t ? t.name : '')}<br>โทร. ${esc(t ? t.phone : '')}<br>อีเมล ${esc(t ? t.email : '')}</div>
        <div style="text-align:right">ลงชื่อ ................................................ ผู้อำนวยการสถานศึกษา<br>(................................................)<br>วันที่ ........../........../..........</div></div>
    </div>`};
};
