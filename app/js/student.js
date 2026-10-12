/* บทบาทนักเรียน: เข้าสู่ระบบ → กรอก 4 ขั้นตอน → ส่ง → ติดตามสถานะ */
'use strict';

const STORY_Q = [
  ['ครอบครัวและอาชีพของผู้ปกครอง', 'พ่อแม่มีสถานะอย่างไร ทำงานอะไร รายได้ประมาณเท่าใดต่อเดือน ปัจจุบันอาศัยอยู่กับใคร', true],
  ['พี่น้องในครอบครัว', 'จำนวนพี่น้องหรือญาติที่อยู่บ้านเดียวกัน และใครเป็นผู้ออกค่าใช้จ่ายเลี้ยงดู', true],
  ['การเดินทางและค่าใช้จ่ายมาโรงเรียน', 'เดินทางอย่างไร ใช้เวลาเท่าใด ค่าเดินทาง และเงินไปโรงเรียนวันละเท่าใด', true],
  ['ลักษณะบ้านและที่อยู่อาศัย', 'บ้านเป็นของใคร มีลักษณะอย่างไร มีส่วนที่ชำรุดหรือต้องซ่อมแซมหรือไม่', true],
  ['ค่าใช้จ่ายและภาระหนี้สินของครอบครัว', 'ค่าเช่า ค่าน้ำไฟ ค่ากินอยู่ ค่ารักษาพยาบาล และหนี้สินที่ใช้จ่ายในชีวิตประจำวัน', true],
  ['เรื่องอื่น ๆ ที่อยากบอกมูลนิธิฯ', 'ไม่บังคับ', false],
];
const STEPS = ['ข้อมูลนักเรียน', 'ครอบครัว', 'เรื่องราวชีวิต', 'ตรวจสอบและส่ง'];
const PARENT_STATUS = [['alive', 'มีชีวิตอยู่'], ['deceased', 'เสียชีวิตแล้ว'], ['unknown', 'ไม่ทราบ / ขาดการติดต่อ']];
const ASSET_LIST = ['รถจักรยานยนต์', 'โทรศัพท์มือถือ', 'ตู้เย็น', 'โทรทัศน์', 'เครื่องซักผ้า', 'รถยนต์', 'คอมพิวเตอร์'];

App.me = function () { return this.studentByCode[this.session.code]; };
App.studentNav = function () {
  const s = this.me();
  if (!s) return null;
  return [['student-status', 'สถานะใบสมัคร']].concat(['draft', 'returned_to_student'].includes(s.status) ? [['student-form', 'กรอกใบสมัคร']] : []);
};

/* ---------- เข้าสู่ระบบ ---------- */
App.views['student-entry'] = function (p) {
  this.session = {role: null};
  const v = p.values || {};
  const e = p.errors || {};
  const sample = this.db.students.find(s => s.status === 'draft');
  const sent = this.db.students.find(s => s.status === 'waiting_teacher');
  return {html: `
    <div class="page-head"><div><h1>เข้าสู่ระบบนักเรียน</h1><p class="sub">ใช้ข้อมูลนี้ทุกครั้งที่กลับมากรอกต่อหรือตรวจสอบสถานะ</p></div></div>
    <div class="split">
      <form class="card" data-submit="student-login" novalidate>
        ${field('cid', 'เลขประจำตัวประชาชน 13 หลัก', input('cid', v.cid, 'inputmode="numeric" maxlength="13" autocomplete="off" placeholder="เช่น 1234567890123"'), {req: 1, err: e.cid})}
        <div class="grid-2">
          ${field('birth', 'วันเดือนปีเกิด', input('birth', v.birth, 'type="date"'), {req: 1, err: e.birth})}
          ${field('phone', 'หมายเลขโทรศัพท์', input('phone', v.phone, 'inputmode="numeric" maxlength="10" placeholder="0812345678"'), {req: 1, err: e.phone})}
        </div>
        <div class="field ${e.received ? 'invalid' : ''}"><span class="label">ปีการศึกษา ${this.db.cycle.year - 1} ได้รับทุนจากมูลนิธิฯ หรือไม่ <span class="req">*</span></span>
          ${radios('received', [['no', 'ไม่ได้รับ (ทุนใหม่)'], ['yes', 'ได้รับ (ทุนต่อเนื่อง)']], v.received)}
          ${e.received ? `<div class="err">${e.received}</div>` : ''}</div>
        ${e.form ? `<div class="note warn">${esc(e.form)}</div>` : ''}
        <div class="row end"><button class="btn primary" type="submit">เข้าสู่ระบบ</button></div>
      </form>
      <aside class="card">
        <h3>ทดลองใช้งาน</h3>
        <p class="small muted">กรอกเลขบัตรใหม่ที่ถูกต้องเพื่อเริ่มใบสมัครใหม่ หรือกดเลือกนักเรียนตัวอย่าง</p>
        ${sample ? `<button class="btn" data-action="student-sample" data-code="${sample.code}">นักเรียนที่กำลังกรอก</button>` : ''}
        ${sent ? `<button class="btn" data-action="student-sample" data-code="${sent.code}">นักเรียนที่ส่งแล้ว</button>` : ''}
        <button class="btn" data-action="student-newid">สร้างเลขบัตรใหม่สำหรับทดลอง</button>
      </aside>
    </div>`};
};
App.on('student-sample', function (el) {
  const s = this.studentByCode[el.dataset.code];
  this.go('student-entry', {values: {cid: s.citizen_id, birth: s.birth_date, phone: s.phone, received: s.type === 'CONT' ? 'yes' : 'no'}});
});
App.on('student-newid', function () {
  let id;
  do {
    const d = [1 + Math.floor(Math.random() * 8)].concat(Array.from({length: 11}, () => Math.floor(Math.random() * 10)));
    const sum = d.reduce((a, x, i) => a + x * (13 - i), 0);
    id = d.join('') + (11 - sum % 11) % 10;
  } while (this.db.students.some(s => s.citizen_id === id));
  this.go('student-entry', {values: {cid: id, birth: '2011-06-15', phone: '0800009999'}});
});
App.on('student-login', function (form) {
  const v = formData(form);
  const e = {};
  if (!/^\d{13}$/.test(v.cid)) e.cid = 'กรุณากรอกตัวเลข 13 หลัก';
  else if (!validThaiId(v.cid)) e.cid = 'เลขประจำตัวประชาชนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
  if (!v.birth) e.birth = 'กรุณาเลือกวันเกิด';
  if (!/^0\d{9}$/.test(v.phone)) e.phone = 'กรุณากรอกหมายเลขโทรศัพท์ 10 หลัก ขึ้นต้นด้วย 0';
  const existing = this.db.students.find(s => s.citizen_id === v.cid);
  if (!existing && !v.received) e.received = 'กรุณาเลือกคำตอบ';
  if (existing && !Object.keys(e).length && (existing.birth_date !== v.birth || existing.phone !== v.phone)) {
    e.form = 'วันเกิดหรือหมายเลขโทรศัพท์ไม่ตรงกับที่เคยลงทะเบียนไว้';
  }
  if (Object.keys(e).length) { this.go('student-entry', {values: v, errors: e}); return; }

  let s = existing;
  if (!s) {
    const n = this.db.students.reduce((m, x) => Math.max(m, Number(x.code.slice(-6))), 0) + 1;
    s = {code: `TF${this.db.cycle.year}-${String(n).padStart(6, '0')}`, citizen_id: v.cid, birth_date: v.birth, phone: v.phone,
      title: '', first_name: '', last_name: '', gender: '', type: v.received === 'yes' ? 'CONT' : 'NEW', status: 'draft',
      school: '', class: '', next_class: '', home_address: '', current_address: '', same_address: false, stories: ['', '', '', '', '', ''], family: {assets: []}, siblings: [],
      loan: '', other: '', other_detail: '', history: [], docs: []};
    this.db.students.push(s);
    this.save();
  }
  this.session = {role: 'student', code: s.code, who: fullName(s).trim() || s.code};
  if (['draft', 'returned_to_student'].includes(s.status)) this.go('student-form', {step: 1}); else this.go('student-status');
});

/* ---------- กรอกใบสมัคร ---------- */
App.views['student-form'] = function (p) {
  const s = this.me();
  const step = Number(p.step) || 1;
  const e = p.errors || {};
  const stepper = `<ol class="stepper" style="--n:4">${STEPS.map((t, i) =>
    `<li class="${i + 1 < step ? 'done' : i + 1 === step ? 'now' : ''}"><span>${i + 1}. ${t}</span></li>`).join('')}</ol>`;
  const body = [null, stepPersonal, stepFamily, stepStory, stepReview][step].call(this, s, e);
  const errCount = Object.keys(e).length;
  return {nav: this.studentNav(), html: `
    <div class="page-head"><div><h1>${STEPS[step - 1]}</h1><p class="sub">${esc(s.code)} · ${TYPE[s.type]} · ขั้นตอน ${step} จาก 4</p></div></div>
    ${stepper}
    ${s.status === 'returned_to_student' && s.return_reason ? `<div class="note warn"><b>ครูส่งกลับให้แก้ไข:</b> ${esc(s.return_reason)}</div>` : ''}
    ${errCount ? `<div class="note warn" role="alert">กรุณาตรวจสอบ ${errCount} ช่องที่มีข้อความสีแดง</div>` : ''}
    <form class="stack" data-submit="student-step" data-step="${step}" novalidate>
      ${body}
      <div class="row between no-print">
        ${step > 1 ? `<button class="btn" type="button" data-action="student-back" data-step="${step}">ย้อนกลับ</button>` : '<span></span>'}
        <button class="btn primary" type="submit">${step < 4 ? 'บันทึกและไปต่อ' : 'ส่งใบสมัคร'}</button>
      </div>
    </form>`, after() { const el = document.querySelector('.field.invalid .input'); if (el) el.focus(); }};
};

function stepPersonal(s, e) {
  const sc = this.schoolById[s.school];
  const area = sc ? {region: sc.region, province: sc.province, district: sc.district, school: sc.id} : {};
  return `
  <section class="card"><h3>ข้อมูลส่วนตัว</h3>
    <div class="grid-3">
      ${field('title', 'คำนำหน้า', select('title', ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว'], s.title, 'เลือก'), {req: 1, err: e.title})}
      ${field('first_name', 'ชื่อ', input('first_name', s.first_name), {req: 1, err: e.first_name})}
      ${field('last_name', 'นามสกุล', input('last_name', s.last_name), {req: 1, err: e.last_name})}
    </div>
    <div class="grid-3">
      ${field('cid_ro', 'เลขประจำตัวประชาชน', input('cid_ro', s.citizen_id, 'readonly'))}
      ${field('birth_ro', 'วันเกิด', input('birth_ro', thDate(s.birth_date), 'readonly'))}
      ${field('gender', 'เพศ', select('gender', ['ชาย', 'หญิง'], s.gender, 'เลือก'), {req: 1, err: e.gender})}
    </div>
  </section>
  <section class="card"><h3>ที่อยู่</h3>
    ${field('home_address', 'ที่อยู่ตามทะเบียนบ้าน', textarea('home_address', s.home_address, 'rows="2" placeholder="บ้านเลขที่ หมู่ ซอย ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"'), {req: 1, err: e.home_address})}
    <label class="check"><input type="checkbox" name="same_address" data-onchange="student-same-address" ${s.same_address ? 'checked' : ''}> <span>ที่อยู่ปัจจุบันเหมือนที่อยู่ตามทะเบียนบ้าน</span></label>
    ${field('current_address', 'ที่อยู่ปัจจุบัน (ที่พักอาศัยจริง)', textarea('current_address', s.same_address ? '' : s.current_address, 'rows="2" placeholder="บ้านเลขที่ หมู่ ซอย ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"'),
      {req: 1, err: e.current_address, attrs: `id="current_wrap" ${s.same_address ? 'hidden' : ''}`})}
  </section>
  <section class="card"><h3>สถานศึกษาปัจจุบัน</h3>
    <div class="grid-2" data-area='{"school":true,"required":true}'>${this.areaPicker('st', area, {school: true, required: true})}</div>
    ${e.school ? `<div class="err">${e.school}</div>` : ''}
  </section>
  <section class="card"><h3>ระดับชั้น</h3>
    <div id="class_box" class="stack">${classFields.call(this, {group: CLASS_GROUPS[s.group] ? s.group : groupOfClass(s.class), cls: s.class, next: s.next_class, pvs: s.pvs_type}, e)}</div>
  </section>
  <section class="card"><h3>ทุนและเงินกู้อื่น</h3>
    <div class="field"><span class="label">กู้ยืม กยศ. / กรอ. หรือไม่ <span class="req">*</span></span>${radios('loan', [['no', 'ไม่กู้'], ['yes', 'กู้']], s.loan)}${e.loan ? `<div class="err">${e.loan}</div>` : ''}</div>
    <div class="field"><span class="label">ได้รับทุนจากหน่วยงานอื่นหรือไม่ <span class="req">*</span></span>${radios('other', [['no', 'ไม่ได้รับ'], ['yes', 'ได้รับ']], s.other)}${e.other ? `<div class="err">${e.other}</div>` : ''}</div>
    ${field('other_detail', 'ชื่อหน่วยงานและจำนวนเงิน (ถ้าได้รับ)', input('other_detail', s.other_detail), {err: e.other_detail})}
  </section>`;
}
App.on('student-same-address', function (el) {
  document.getElementById('current_wrap').hidden = el.checked;
});
/* เลือกช่วงชั้นก่อน แล้วจึงเลือกระดับชั้นปัจจุบัน ระดับชั้นปีถัดไปเลือกให้อัตโนมัติเมื่อมีทางเดียว */
function classFields(v, e = {}) {
  const y = this.db.cycle.year;
  const classes = CLASS_GROUPS[v.group] || [];
  const nexts = NEXT_OPTIONS[v.cls] || [];
  const next = nexts.length === 1 ? nexts[0] : (nexts.includes(v.next) ? v.next : '');
  const rate = RATE_OF_NEXT(next, v.pvs);
  return `<div class="grid-3">
      ${field('group', 'ช่วงชั้นที่กำลังศึกษา', select('group', EDU_GROUPS, v.group, 'เลือกช่วงชั้น', 'data-onchange="student-class"'), {req: 1, err: e.group})}
      ${field('class', `ระดับชั้นปัจจุบัน (ปี ${y - 1})`, select('class', classes, v.cls, v.group ? 'เลือกระดับชั้น' : 'เลือกช่วงชั้นก่อน', `data-onchange="student-class" ${v.group ? '' : 'disabled'}`), {req: 1, err: e.class})}
      ${field('next_class', `ระดับชั้นปีที่ได้รับทุน (ปี ${y})`, select('next_class', nexts, next, v.cls ? (nexts.length > 1 ? 'เลือกระดับชั้นปีถัดไป' : 'เลือก') : 'เลือกระดับชั้นปัจจุบันก่อน',
        `data-onchange="student-class" ${nexts.length > 1 ? '' : 'disabled'}`) + (nexts.length === 1 ? `<input type="hidden" name="next_class" value="${esc(next)}">` : ''),
        {req: 1, err: e.next_class, hint: nexts.length > 1 ? 'เลือกตามที่จะศึกษาต่อในปีที่ได้รับทุน' : ''})}
    </div>
    ${/^ปวส/.test(next) ? field('pvs_type', 'ประเภทวิชา (ปวส.)', select('pvs_type', PVS_TYPES, v.pvs, 'เลือกประเภทวิชา', 'data-onchange="student-class"'), {req: 1, err: e.pvs_type}) : ''}
    ${rate ? `<div class="note info small">อัตราทุนปี ${y}: <b>${baht(this.rateAmount(rate))}</b>${rate === 'BACHELOR' ? ' · ระดับปริญญาตรีส่งใบสมัครถึงมูลนิธิฯ โดยตรง ไม่ผ่านครู' : ''}</div>` : ''}`;
}
App.on('student-class', function (el) {
  const val = id => (document.getElementById(id) || {}).value || '';
  const v = {group: val('group'), cls: val('class'), next: val('next_class'), pvs: val('pvs_type')};
  if (el.name === 'group') { v.cls = ''; v.next = ''; }
  if (el.name === 'class') v.next = '';
  document.getElementById('class_box').innerHTML = classFields.call(this, v);
  const nextFocus = el.name === 'group' ? 'class' : el.name === 'class' && !document.getElementById('next_class').disabled ? 'next_class' : null;
  if (nextFocus) document.getElementById(nextFocus).focus();
});

function stepFamily(s, e) {
  const f = s.family || {};
  const parent = (k, title) => `
    <section class="card"><h3>ข้อมูล${title}</h3>
      <div class="grid-2">
        ${field(k + '_name', 'ชื่อ–นามสกุล' + title, input(k + '_name', f[k + '_name']), {req: 1, err: e[k + '_name']})}
        ${field(k + '_status', 'สถานะ', select(k + '_status', PARENT_STATUS, f[k + '_status'], 'เลือก'), {req: 1, err: e[k + '_status']})}
        ${field(k + '_occupation', 'อาชีพ', input(k + '_occupation', f[k + '_occupation'], 'placeholder="เช่น รับจ้างทั่วไป เกษตรกร"'))}
        ${field(k + '_monthly_income', 'รายได้ต่อเดือน (บาท)', input(k + '_monthly_income', f[k + '_monthly_income'], 'type="number" min="0" step="100" inputmode="numeric"'), {err: e[k + '_monthly_income']})}
      </div></section>`;
  return parent('father', 'บิดา') + parent('mother', 'มารดา') + `
  <section class="card"><h3>สถานภาพครอบครัวและที่อยู่อาศัย</h3>
    <div class="grid-2">
      ${field('family_status', 'สถานภาพของบิดามารดา', select('family_status', ['อยู่ด้วยกัน', 'แยกกันอยู่', 'หย่าร้าง', 'บิดาหรือมารดาเสียชีวิต'], f.family_status, 'เลือก'), {req: 1, err: e.family_status})}
      ${field('guardian_relation', 'ปัจจุบันอาศัยอยู่กับ', select('guardian_relation', ['บิดามารดา', 'บิดา', 'มารดา', 'ปู่ / ย่า / ตา / ยาย', 'ญาติ', 'อื่น ๆ'], f.guardian_relation, 'เลือก'), {req: 1, err: e.guardian_relation})}
      ${field('housing_type', 'บ้านที่อาศัย', select('housing_type', ['บ้านตนเอง', 'เช่า', 'อาศัยผู้อื่น', 'ผ่อนชำระ'], f.housing_type, 'เลือก'), {req: 1, err: e.housing_type})}
      ${field('housing_cost', 'ค่าเช่า / ค่างวดต่อเดือน (บาท)', input('housing_cost', f.housing_cost, 'type="number" min="0" step="100" inputmode="numeric"'))}
    </div>
    <div class="field"><span class="label">ครอบครัวมีสิ่งของต่อไปนี้หรือไม่</span>
      <div class="choices">${ASSET_LIST.map(a => `<label class="choice"><input type="checkbox" name="assets" value="${a}" ${(f.assets || []).includes(a) ? 'checked' : ''}> ${a}</label>`).join('')}</div></div>
  </section>
  <section class="card"><div class="card-head"><h3>พี่น้อง</h3>
    <div class="field" style="min-width:160px">${select('sib_count', [0, 1, 2, 3, 4, 5, 6].map(n => [n, n === 0 ? 'ไม่มีพี่น้อง' : n + ' คน']), (s.siblings || []).length, null, 'data-onchange="student-sibs" aria-label="จำนวนพี่น้อง"')}</div></div>
    <div id="sibs" class="stack">${siblingRows(s.siblings || [])}</div>
  </section>`;
}
function siblingRows(list) {
  return list.map((x, i) => `<div class="grid-3">
    ${field('sib_name_' + i, `พี่น้องคนที่ ${i + 1}: ชื่อ`, input('sib_name_' + i, x.name))}
    ${field('sib_age_' + i, 'อายุ', input('sib_age_' + i, x.age, 'type="number" min="0" inputmode="numeric"'))}
    ${field('sib_status_' + i, 'สถานะ', select('sib_status_' + i, ['กำลังเรียน', 'ทำงาน', 'ยังไม่เข้าเรียน', 'อื่น ๆ'], x.status, 'เลือก'))}</div>`).join('');
}
App.on('student-sibs', function (el) {
  const n = Number(el.value);
  const cur = readSiblings(document.querySelector('form'));
  const list = Array.from({length: n}, (_, i) => cur[i] || {name: '', age: '', status: ''});
  document.getElementById('sibs').innerHTML = siblingRows(list);
});
function readSiblings(form) {
  const v = formData(form);
  const n = Number(v.sib_count || 0);
  return Array.from({length: n}, (_, i) => ({name: v['sib_name_' + i] || '', age: v['sib_age_' + i] || '', status: v['sib_status_' + i] || ''}));
}

function stepStory(s, e) {
  return `<section class="card"><p class="muted small">เล่าตามความจริง ข้อมูลนี้ใช้ประกอบการพิจารณาทุน (ข้อ 1–5 อย่างน้อย 20 ตัวอักษร)</p>
    ${STORY_Q.map(([t, h, req], i) => field('story_' + i, `${i + 1}. ${t}`,
      textarea('story_' + i, s.stories[i], `rows="3" data-oninput="count" maxlength="1500" aria-describedby="cnt_${i}"`) +
      `<div class="counter" id="cnt_${i}">${(s.stories[i] || '').length} / 1500</div>`, {req, hint: h, err: e['story_' + i]})).join('')}
  </section>`;
}
App.on('count', function (el) {
  const c = document.getElementById(el.getAttribute('aria-describedby'));
  if (c) c.textContent = `${el.value.length} / ${el.maxLength}`;
});

function stepReview(s, e) {
  const f = s.family || {};
  const edit = n => `<button class="btn ghost sm" type="button" data-go="student-form" data-step="${n}">แก้ไข</button>`;
  return `
  <section class="card"><div class="card-head"><h3>ข้อมูลนักเรียน</h3>${edit(1)}</div>
    <dl class="kv"><div><dt>ชื่อ–นามสกุล</dt><dd>${esc(fullName(s))}</dd></div><div><dt>เลขประจำตัวประชาชน</dt><dd class="num">${esc(s.citizen_id)}</dd></div>
      <div><dt>สถานศึกษา</dt><dd>${esc(this.schoolName(s.school))}</dd></div><div><dt>ระดับชั้น</dt><dd>${esc(s.class)} → ${esc(s.next_class)}${s.pvs_type ? ` (${esc(s.pvs_type)})` : ''}</dd></div>
      <div><dt>ประเภททุน</dt><dd>${TYPE[s.type]}</dd></div><div><dt>อัตราทุน</dt><dd>${baht(this.rateAmount(s.rate))}</dd></div></dl>
    ${addressBlock(s)}</section>
  <section class="card"><div class="card-head"><h3>ครอบครัว</h3>${edit(2)}</div>
    <dl class="kv"><div><dt>บิดา</dt><dd>${esc(f.father_name)} · ${baht(f.father_monthly_income || 0)}/เดือน</dd></div>
      <div><dt>มารดา</dt><dd>${esc(f.mother_name)} · ${baht(f.mother_monthly_income || 0)}/เดือน</dd></div>
      <div><dt>อาศัยอยู่กับ</dt><dd>${esc(f.guardian_relation)}</dd></div><div><dt>พี่น้อง</dt><dd>${(s.siblings || []).length} คน</dd></div></dl></section>
  <section class="card"><div class="card-head"><h3>เรื่องราวชีวิต</h3>${edit(3)}</div>
    <p class="muted small">ตอบแล้ว ${s.stories.filter(Boolean).length} จาก 6 ข้อ</p></section>
  <section class="card"><h3>เอกสารที่ต้องเตรียมส่งครูผู้ดูแลทุน</h3>
    <ul class="small">${docsFor(s.type).map(d => `<li>${d}</li>`).join('')}</ul>
    <label class="check"><input type="checkbox" name="confirm" ${s.confirmed ? 'checked' : ''}> <span>ข้าพเจ้าขอยืนยันว่าข้อมูลที่กรอกเป็นความจริงและถูกต้อง <span class="req">*</span></span></label>
    ${e.confirm ? `<div class="err">${e.confirm}</div>` : ''}
    <label class="check"><input type="checkbox" name="pdpa" ${s.pdpa ? 'checked' : ''}> <span>ข้าพเจ้ารับทราบ<a href="https://tiscofoundation.org/wp-content/uploads/pdpa_privacy_notice_tiscof.pdf" target="_blank" rel="noopener">ประกาศความเป็นส่วนตัว (Privacy Notice)</a> ของมูลนิธิฯ <span class="req">*</span></span></label>
    ${e.pdpa ? `<div class="err">${e.pdpa}</div>` : ''}
    <div class="note info small">เมื่อกดส่งแล้ว จะแก้ไขข้อมูลเองไม่ได้ หากต้องแก้ไข ให้ติดต่อครูผู้ดูแลทุน</div>
  </section>`;
}

App.on('student-back', function (el) {
  this.go('student-form', {step: Number(el.dataset.step) - 1});
});
App.on('student-step', function (form) {
  const s = this.me();
  const step = Number(form.dataset.step);
  const v = formData(form);
  const e = {};
  const need = (k, msg) => { if (!v[k]) e[k] = msg || 'กรุณากรอกข้อมูล'; };
  if (step === 1) {
    ['title', 'gender'].forEach(k => need(k, 'กรุณาเลือก'));
    ['first_name', 'last_name', 'home_address'].forEach(k => need(k));
    if (!v.same_address) need('current_address');
    need('group', 'กรุณาเลือกช่วงชั้น');
    need('class', 'กรุณาเลือกระดับชั้นปัจจุบัน');
    need('next_class', 'กรุณาเลือกระดับชั้นปีที่ได้รับทุน');
    if (/^ปวส/.test(v.next_class)) need('pvs_type', 'กรุณาเลือกประเภทวิชา');
    need('loan', 'กรุณาเลือกคำตอบ');
    need('other', 'กรุณาเลือกคำตอบ');
    if (v.other === 'yes' && !v.other_detail) e.other_detail = 'กรุณาระบุชื่อหน่วยงานและจำนวนเงิน';
    const area = this.readArea('st');
    if (!area.school) e.school = 'กรุณาเลือกภาค จังหวัด อำเภอ และสถานศึกษา';
    Object.assign(s, {title: v.title, first_name: v.first_name, last_name: v.last_name, gender: v.gender, home_address: v.home_address,
      same_address: !!v.same_address, current_address: v.same_address ? v.home_address : v.current_address,
      school: area.school || s.school, group: v.group, class: v.class, next_class: v.next_class, pvs_type: /^ปวส/.test(v.next_class) ? v.pvs_type : '',
      rate: RATE_OF_NEXT(v.next_class, v.pvs_type),
      loan: v.loan, other: v.other, other_detail: v.other_detail});
  } else if (step === 2) {
    ['father', 'mother'].forEach(p => {
      need(p + '_name'); need(p + '_status', 'กรุณาเลือก');
      if (v[p + '_monthly_income'] && Number(v[p + '_monthly_income']) < 0) e[p + '_monthly_income'] = 'ต้องไม่ติดลบ';
    });
    ['family_status', 'guardian_relation', 'housing_type'].forEach(k => need(k, 'กรุณาเลือก'));
    const assets = [...form.querySelectorAll('input[name="assets"]:checked')].map(x => x.value);
    s.family = {father_name: v.father_name, father_status: v.father_status, father_occupation: v.father_occupation,
      father_monthly_income: Number(v.father_monthly_income || 0), mother_name: v.mother_name, mother_status: v.mother_status,
      mother_occupation: v.mother_occupation, mother_monthly_income: Number(v.mother_monthly_income || 0),
      family_status: v.family_status, guardian_relation: v.guardian_relation, housing_type: v.housing_type,
      housing_cost: Number(v.housing_cost || 0), assets};
    s.siblings = readSiblings(form);
  } else if (step === 3) {
    s.stories = STORY_Q.map((_, i) => v['story_' + i] || '');
    STORY_Q.forEach(([, , req], i) => { if (req && s.stories[i].length < 20) e['story_' + i] = 'กรุณาเล่าอย่างน้อย 20 ตัวอักษร'; });
  } else {
    s.confirmed = !!v.confirm;
    s.pdpa = !!v.pdpa;
    if (!v.confirm) e.confirm = 'กรุณายืนยันความถูกต้องของข้อมูล';
    if (!v.pdpa) e.pdpa = 'กรุณารับทราบประกาศความเป็นส่วนตัว';
    const missing = [1, 2, 3].find(n => !stepComplete(s, n));
    if (!Object.keys(e).length && missing) { this.save(); this.toast(`ขั้นตอนที่ ${missing} ยังกรอกไม่ครบ`); this.go('student-form', {step: missing}); return; }
  }
  this.session.who = fullName(s).trim() || s.code;
  this.save();
  if (Object.keys(e).length) { this.go('student-form', {step, errors: e}); return; }
  if (step < 4) { this.toast('บันทึกแล้ว'); this.go('student-form', {step: step + 1}); return; }
  const direct = s.group === 'bachelor';
  s.status = direct ? 'waiting_staff' : 'waiting_teacher';
  s.submitted_at = nowIso();
  s.return_reason = '';
  s.history.push({at: s.submitted_at, text: direct ? 'นักศึกษาส่งใบสมัครถึงมูลนิธิฯ โดยตรง' : 'นักเรียนส่งใบสมัคร'});
  this.save();
  this.toast('ส่งใบสมัครแล้ว');
  this.go('student-status');
});
function stepComplete(s, n) {
  if (n === 1) return s.title && s.first_name && s.home_address && s.last_name && s.school && s.class && s.next_class && s.loan && s.other;
  if (n === 2) return s.family && s.family.father_name && s.family.mother_name && s.family.housing_type;
  return STORY_Q.every(([, , req], i) => !req || (s.stories[i] || '').length >= 20);
}

/* ---------- สถานะใบสมัคร ---------- */
App.views['student-status'] = function () {
  const s = this.me();
  const flow = [['draft', 'กรอกใบสมัคร'], ['waiting_teacher', 'ครูตรวจและแนบเอกสาร'], ['waiting_staff', 'มูลนิธิฯ ตรวจสอบ'],
    ['waiting_manager', 'พิจารณาอนุมัติ'], ['decided', 'ประกาศผล']];
  const pos = {draft: 0, returned_to_student: 0, waiting_teacher: 1, waiting_staff: 2, need_more_info: 2, waiting_manager: 3, decided: 4}[s.status];
  const teachers = this.teachersOf(s.school);
  const editable = ['draft', 'returned_to_student'].includes(s.status);
  const d = s.decision;
  return {nav: this.studentNav(), html: `
    <div class="page-head"><div><h1>สถานะใบสมัคร</h1><p class="sub">${esc(s.code)} · ${TYPE[s.type]}</p></div>${badge(s.status, d)}</div>
    ${editable ? `<div class="note ${s.status === 'returned_to_student' ? 'warn' : 'info'} row between"><span>${s.status === 'returned_to_student'
      ? '<b>ครูส่งกลับให้แก้ไข:</b> ' + esc(s.return_reason || '') : 'ใบสมัครยังไม่ได้ส่ง กรอกต่อให้ครบแล้วกดส่ง'}</span>
      <button class="btn primary" data-go="student-form" data-step="1">กรอกใบสมัครต่อ</button></div>` : ''}
    ${d ? `<div class="note ${d.result === 'approved' ? 'ok' : 'warn'}"><b>ผลการพิจารณา: ${DECISION[d.result].label}</b>${d.result === 'approved' ? ` · จำนวนเงินทุน ${baht(d.approved_amount)}` : ''}</div>` : ''}
    <div class="split">
      <section class="card"><h3>ขั้นตอน</h3>
        <ol class="timeline">${flow.map(([, t], i) => `<li class="${i < pos ? 'done' : i === pos ? 'now' : ''}">${t}${i === pos ? `<small>${STATUS[s.status].label}</small>` : ''}</li>`).join('')}</ol>
        ${s.history.length ? `<details class="more"><summary>ประวัติ (${s.history.length})</summary><div><ol class="timeline">${s.history.map(h =>
          `<li class="done">${esc(h.text)}<small>${thDate(h.at, true)}</small></li>`).join('')}</ol></div></details>` : ''}
      </section>
      <aside class="stack">
        ${!editable && s.status === 'waiting_teacher' ? `<section class="card"><h3>สิ่งที่ต้องทำต่อ</h3>
          <p class="small">ติดต่อครูผู้ดูแลทุน แจ้งว่ากรอกข้อมูลแล้ว และนำเอกสารไปส่งให้ครู</p>
          <ul class="small">${docsFor(s.type).map(x => `<li>${x}</li>`).join('')}</ul></section>` : ''}
        <section class="card"><h3>ครูผู้ดูแลทุน</h3>
          <p class="small muted">${esc(this.schoolName(s.school))}</p>
          ${teachers.length ? teachers.map(t => `<div class="small"><b>${esc(t.name)}</b><br><span class="num">${esc(t.phone)}</span> · ${esc(t.email)}</div>`).join('')
            : '<p class="small muted">ยังไม่ได้เลือกสถานศึกษา</p>'}
        </section>
      </aside>
    </div>`};
};

function addressBlock(s) {
  return `<dl class="kv"><div><dt>ที่อยู่ตามทะเบียนบ้าน</dt><dd>${esc(s.home_address || '—')}</dd></div>
    <div><dt>ที่อยู่ปัจจุบัน</dt><dd>${s.same_address ? 'เหมือนที่อยู่ตามทะเบียนบ้าน' : esc(s.current_address || '—')}</dd></div></dl>`;
}
