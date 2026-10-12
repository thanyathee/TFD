/* บทบาทครู / สถานศึกษา (ตาม v28): 1 โรงเรียน = 1 Username → รายชื่อนักเรียน → แฟ้มนักเรียน → ส่งมูลนิธิฯ → ใบสรุปเสนอ ผอ. */
'use strict';

const SENT = ['waiting_staff', 'need_more_info', 'waiting_manager', 'decided'];

App.teacherNav = function () { return [['teacher-home', 'รายชื่อนักเรียน', ['teacher-student']], ['teacher-report', 'ใบสรุปเสนอ ผอ.']]; };
App.myStudents = function () { return this.db.students.filter(s => s.school === this.session.school); };
const docsComplete = s => docsFor(s).every(([code, , , opt]) => opt || ((s.docFiles || {})[code] || []).length);

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
  const lab = (list, k) => (list.find(x => x[0] === k) || [, k || '—'])[1];
  const person = (k, p) => {
    if (!p) return '—';
    const head = `<b>${esc(p.name || '-')}</b>${p.age ? ` · ${esc(p.age)} ปี` : ''}${p.relation ? ` · ${esc(p.relation)}` : ''}${p.status ? ` · ${p.status === 'dead' ? 'ถึงแก่กรรม' : 'ยังมีชีวิตอยู่'}` : ''}`;
    if (p.status === 'dead') return head;
    const occ = p.no_occ ? '<div class="small muted">ไม่มีอาชีพ / ไม่มีรายได้ / ไม่ทราบ</div>'
      : (p.occs || []).map(x => `<div class="small">• ${esc(occText(x))}</div>`).join('');
    return `${head}${occ}${p.workplace || p.work_province ? `<div class="small muted">ที่ทำงาน: ${esc(p.workplace || '')} ${p.work_province ? 'จ.' + esc(p.work_province) : ''}</div>` : ''}
      ${p.no_occ ? '' : `<div class="small"><b>รวมประมาณ ${baht(personMonthly(p))} / เดือน</b></div>`}`;
  };
  const total = personMonthly(f.father) + personMonthly(f.mother) + (f.live_with === 'guardian' ? personMonthly(f.guardian) : 0);
  const housing = lab(HOUSING_P, f.housing) + (f.housing_land_owner ? ` (ที่ดินของ ${f.housing_land_owner})` : '') + (f.housing_cost ? ` · ${baht(f.housing_cost)}/เดือน` : '') + (f.housing_other ? ` · ${f.housing_other}` : '');
  const equip = f.no_equipment ? 'ไม่มีอุปกรณ์ตามรายการ' : (f.equipment || []).map(k => k === 'other' ? (f.equipment_other || 'อื่น ๆ') : lab(EQUIP, k)).join(', ') || '—';
  const land = [f.own_land ? `เป็นของตนเอง ${f.own_land_amt || '-'} ${lab(LAND_UNITS, f.own_land_unit)}` : '',
    f.rent_land ? `เช่าผู้อื่น ${f.rent_land_amt || '-'} ${lab(LAND_UNITS, f.rent_land_unit)} ค่าเช่า ${baht(f.rent_land_cost)}/${f.rent_land_per === 'month' ? 'เดือน' : 'ปี'}` : ''].filter(Boolean).join(' · ') || 'ไม่มี';
  const sibs = s.siblings || [];
  const n = o.numbered ? i => `${i}. ` : () => '';
  return `
    <section class="card"><h3>${n(1)}ข้อมูลผู้ขอทุน</h3><dl class="kv">
      <div><dt>ชื่อ–นามสกุล</dt><dd>${esc(fullName(s))}</dd></div><div><dt>เลขประจำตัวประชาชน</dt><dd class="num">${esc(s.citizen_id)}</dd></div>
      <div><dt>วันเดือนปีเกิด / อายุ</dt><dd>${beDate(s.birth_date)} / ${s.age_at_submit !== undefined && s.age_at_submit !== '' ? s.age_at_submit : ageAt(s.birth_date)} ปี</dd></div>
      <div><dt>หมายเลขโทรศัพท์</dt><dd class="num">${esc(s.phone)}</dd></div><div><dt>E-mail</dt><dd>${esc(s.email || '—')}</dd></div><div><dt>เพศ</dt><dd>${esc(s.gender || '-')}</dd></div></dl>
      <dl class="kv"><div><dt>ที่อยู่ตามภูมิลำเนา</dt><dd>${esc(s.home_address || '-')}</dd></div><div><dt>ที่อยู่ปัจจุบัน</dt><dd>${s.same_address ? 'เหมือนที่อยู่ตามภูมิลำเนา' : esc(s.current_address || '-')}</dd></div></dl></section>
    <section class="card"><h3>${n(2)}ข้อมูลการศึกษา</h3><dl class="kv">
      <div><dt>สถานศึกษา</dt><dd>${esc(sc.name || '-')}</dd></div><div><dt>พื้นที่</dt><dd>${esc(this.regionName(sc.region))} / จังหวัด${esc(sc.province || '')} / ${esc(sc.district || '')}</dd></div>
      <div><dt>ระดับชั้นปัจจุบัน</dt><dd>${esc(s.class || '-')}</dd></div>
      ${s.faculty ? `<div><dt>คณะ / สาขา</dt><dd>${esc(s.faculty)}${s.program_years ? ` · หลักสูตร ${esc(s.program_years)} ปี` : ''}</dd></div>` : ''}
      ${s.pvs_type ? `<div><dt>ประเภทวิชา</dt><dd>${esc(lab(PVS_TYPES, s.pvs_type))}</dd></div>` : ''}
      ${s.study_mode ? `<div><dt>รูปแบบการเรียน</dt><dd>${esc(lab(STUDY_MODES_PAPER, s.study_mode))}${s.study_mode_other ? ' — ' + esc(s.study_mode_other) : ''}</dd></div>` : ''}
      <div><dt>ปีหน้าศึกษาต่อระดับชั้น</dt><dd>${esc(s.next_class || '-')}${s.next_faculty ? ' · ' + esc(s.next_faculty) : ''}</dd></div>
      <div><dt>สถานศึกษาปีหน้า</dt><dd>${s.school_next === 'same' ? 'ศึกษาต่อสถานศึกษาเดิม' : s.school_next === 'transfer' ? `<span class="badge t-warn">ย้ายสถานศึกษาใหม่</span>${s.next_school_text ? ' ไป ' + esc(s.next_school_text) : ''}<div class="small muted">ต้องส่งหลักฐานการย้ายภายใน ${thDate(transferDeadline.call(this, s))}</div>` : '-'}</dd></div>
      <div><dt>ประเภททุน</dt><dd>${TYPE[s.type]}${s.type === 'CONT' && s.cont_since ? ` · ได้รับตั้งแต่ปี ${esc(s.cont_since)} รวม ${esc(s.cont_years || '-')} ปี` : ''}</dd></div>
      <div><dt>อัตราทุน</dt><dd>${baht(this.rateAmount(s.rate))}</dd></div>
      ${s.teacher_review ? `<div><dt>ผลการเรียนจากครู</dt><dd>${gradeText(s.teacher_review)}</dd></div>` : ''}
    </dl></section>
    <section class="card"><h3>${n(3)}ข้อมูลครอบครัว</h3>
      <div class="note info small">รายได้รวมของผู้ปกครองประมาณ <b>${baht(total)} / เดือน</b> (ระบบคำนวณจากข้อมูลที่กรอก)</div>
      <dl class="kv">
        <div><dt>บิดา</dt><dd>${person('father', f.father)}</dd></div><div><dt>มารดา</dt><dd>${person('mother', f.mother)}</dd></div>
        <div><dt>อาศัยอยู่กับ</dt><dd>${esc(lab(LIVE_WITH, f.live_with))}</dd></div>
        ${f.live_with === 'guardian' ? `<div><dt>ญาติ / ผู้อุปการะ</dt><dd>${person('guardian', f.guardian)}</dd></div>` : ''}
        <div><dt>สภาพที่อยู่ปัจจุบัน</dt><dd>${esc(housing)}</dd></div><div><dt>อุปกรณ์ในบ้าน</dt><dd>${esc(equip)}${f.equipment_note ? `<div class="muted small">${esc(f.equipment_note)}</div>` : ''}</dd></div>
        <div><dt>ที่ดินทำกิน</dt><dd>${esc(land)}</dd></div>
        <div><dt>ความสัมพันธ์ในครอบครัว</dt><dd>${esc((f.relations || []).map(relLabel).join(', ') || '—')}</dd></div>
        <div><dt>พี่น้อง</dt><dd>${sibs.length} คน${sibs.length ? ` (อยู่บ้านเดียวกัน ${sibs.length - movedCount(sibs) - outCount(sibs)} · แยกไปอยู่ข้างนอก ${outCount(sibs)} · แยกไปมีครอบครัว ${movedCount(sibs)})` : ''}</dd></div></dl>
      ${sibs.length ? `<details class="more"><summary>รายละเอียดพี่น้อง (${sibs.length})</summary><div>${sibs.map((x, i) => `<div class="small"><b>${i + 1}. ${esc(x.name || '-')}</b> ${esc(x.gender || '')} ${esc(sibAge(x))}
        <div class="muted">${esc([(SIB_RES.find(r => r[0] === x.residence) || [, ''])[1], x.edu, x.occupation, x.place, x.note && `หมายเหตุ: ${x.note}`].filter(Boolean).join(' · ') || '—')}</div></div>`).join('')}</div></details>` : ''}
    </section>
    <section class="card"><h3>${n(4)}ข้อมูลเพิ่มเติม</h3><dl class="kv">
      <div><dt>ได้เงินมาใช้จ่ายวันละ</dt><dd>${baht(s.allowance)}</dd></div>
      <div><dt>ทุนต่อเนื่องอื่น</dt><dd>${s.other === 'yes' ? `${esc(s.other_org || '')} ${s.other_amount ? baht(s.other_amount) + ' ' + esc(s.other_period || '') : ''}` : s.other === 'no' ? 'ไม่ได้รับ' : '-'}</dd></div>
      <div><dt>กยศ. / กรอ. (ผู้ขอทุนหรือพี่น้อง)</dt><dd>${s.loan === 'yes' ? `<span class="badge t-warn">มี ${esc(s.loan_count || (s.loans || []).length || '')} คน</span>${(s.loans || []).length
        ? s.loans.map(x => `<div class="small">${esc(x.name || '-')} (${x.who === 'self' ? 'ผู้ขอทุน' : 'พี่น้อง'}) · ${esc(x.fund || 'กยศ.')}${x.amount ? ` · ${baht(x.amount)}/ปี` : ''}</div>`).join('')
        : ` ${esc(s.loan_names || '')}${s.loan_amount ? ` · ผู้ขอทุนได้รับ ${baht(s.loan_amount)}/ปี` : ''}`}` : s.loan === 'no' ? 'ไม่มี' : '-'}</dd></div>
      <div><dt>หลังเลิกเรียน / วันหยุด</dt><dd>${s.part_time === 'yes' ? `ทำงานพิเศษ: ${esc(s.part_job || '')} ${s.part_income ? baht(s.part_income) + '/' + (s.part_per === 'month' ? 'เดือน' : 'วัน') : ''}` : s.part_time === 'no' ? 'ไม่ได้ทำงานหารายได้พิเศษ' : '-'}</dd></div>
    </dl></section>
    <section class="card"><h3>${n(5)}เขียนเล่าประวัติและสภาพความเป็นอยู่</h3>
      <details class="more" ${o.openStories ? 'open' : ''}><summary>เปิดดูคำตอบทั้งหมด</summary><div>${STORY_Q.map(([t], i) =>
        `<div class="story"><b class="small">${i + 1}. ${t}</b><span>${esc((s.stories || [])[i] || '—')}</span></div>`).join('')}
        <div class="story"><b class="small">เหตุผลในการขอรับทุน</b><span>${esc(s.reason || '—')}</span></div>
        ${s.goal ? `<div class="story"><b class="small">เป้าหมายในการศึกษาต่อระดับอุดมศึกษา</b><span>${esc(s.goal)}</span></div>` : ''}</div></details></section>`;
}
function gradeText(t) {
  const g = v => t.grade_type === 'gpa' ? `${v} / 4.00` : `${v}%`;
  return t.grade_before != null && t.grade_before !== '' ? `ก่อนรับทุน ${g(t.grade_before)} · หลังรับทุน ${g(t.grade_value)}` : g(t.grade_value);
}

App.views['teacher-student'] = function (p) {
  const s = this.studentByCode[p.code];
  const e = p.errors || {};
  const tr = s.teacher_review;
  const active = s.status === 'waiting_teacher';
  const bachelor = s.group === 'bachelor';
  const v = p.values || {grade_type: tr ? tr.grade_type : '', grade_value: tr ? tr.grade_value : '', grade_before: tr ? tr.grade_before : '', comment: tr ? tr.comment : ''};
  const cont = s.type === 'CONT';
  const gAttr = `type="number" step="0.01" min="0" ${v.grade_type === 'gpa' ? 'max="4" placeholder="เช่น 3.25"' : v.grade_type === 'percent' ? 'max="100" placeholder="เช่น 78.50"' : 'placeholder="กรุณาเลือกรูปแบบคะแนนก่อน"'} inputmode="decimal" ${active ? '' : 'readonly'}`;
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
          <div>${docsFor(s).map(([code, name, multi, opt]) => docRow(s, code, name, multi, active, 'teacher-file', opt)).join('')}</div>
          ${e.docs ? `<div class="err">${e.docs}</div>` : ''}</section>
        <section class="card"><h3>ความเห็นของครูผู้ดูแลทุน</h3>
          ${active ? `<div class="note info small"><b>กรุณาเขียนข้อมูลที่ช่วยให้มูลนิธิฯ เข้าใจความจำเป็นของนักเรียน</b> เช่น สภาพครอบครัว ภาระค่าใช้จ่าย ความยากลำบาก เหตุจำเป็น หรือข้อเท็จจริงที่ครูทราบ
            <b>หลีกเลี่ยงข้อความสั้น ๆ เช่น “สมควรได้รับทุน” เพียงอย่างเดียว</b></div>` : ''}
          ${field('comment', cont ? 'เห็นสมควรให้ผู้ขอทุนได้รับทุนต่อเนื่องจากมูลนิธิฯ เนื่องจาก' : 'ความคิดเห็นของครู (เพราะเหตุใดผู้สมัครจึงสมควรได้รับทุน)', textarea('comment', v.comment, `rows="5" data-oninput="count" maxlength="2000" aria-describedby="cnt_c" placeholder="เขียนเหตุผลและข้อเท็จจริงที่แสดงถึงความจำเป็นของนักเรียน" ${active ? '' : 'readonly'}`) +
            `<div class="counter" id="cnt_c">${(v.comment || '').length} / 2000</div>`, {req: active, err: e.comment})}
          <h3>ผลการเรียนของนักเรียน</h3>
          <div class="grid-2">
            ${field('grade_type', 'รูปแบบคะแนน', select('grade_type', [['gpa', 'เกรดเฉลี่ย (GPA 4.00)'], ['percent', 'คะแนนเฉลี่ยเป็นเปอร์เซ็นต์']], v.grade_type, 'กรุณาเลือก', `data-onchange="teacher-grade" ${active ? '' : 'disabled'}`), {req: active, err: e.grade_type})}
            ${cont ? field('grade_before', `ผลการเรียนก่อนรับทุน`, input('grade_before', v.grade_before, gAttr), {req: active, err: e.grade_before}) : ''}
            ${field('grade_value', `<span id="grade_label">${cont ? 'ผลการเรียนหลังรับทุน' : gradeLabel}</span>`, input('grade_value', v.grade_value, gAttr), {req: active, err: e.grade_value})}
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
  const gb = document.getElementById('grade_before');
  if (gb) { gb.max = el.value === 'gpa' ? 4 : 100; gb.placeholder = el.value === 'gpa' ? 'เช่น 3.25' : 'เช่น 78.50'; }
  if (!gb) document.getElementById('grade_label').textContent = el.value === 'gpa' ? 'เกรดเฉลี่ย (GPA)' : el.value === 'percent' ? 'คะแนนเฉลี่ย (%)' : 'คะแนน / เกรดเฉลี่ย';
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
  if (s.type === 'CONT') {
    const b = Number(v.grade_before);
    if (v.grade_before === '' || v.grade_before == null || isNaN(b)) e.grade_before = 'กรุณากรอกผลการเรียนก่อนรับทุน';
    else if ((v.grade_type === 'gpa' && (b < 0 || b > 4)) || (v.grade_type === 'percent' && (b < 0 || b > 100))) e.grade_before = 'ค่าเกินช่วงที่กำหนด';
    if (e.grade_before) { this.go('teacher-student', {code: s.code, values: v, errors: e}); return; }
  }
  s.teacher_review = {teacher: this.session.teacher, grade_type: v.grade_type, grade_value: g, grade_before: s.type === 'CONT' ? Number(v.grade_before) : null, comment: v.comment, sent_at: nowIso()};
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
