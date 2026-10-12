/* บทบาทนักเรียน (ตาม v28): ตรวจสอบสิทธิ์ → ข้อมูลนักเรียนและการศึกษา → ข้อมูลครอบครัว → เรื่องราวชีวิต → ส่งเรียบร้อย */
'use strict';

const STORY_Q = [
  ['ครอบครัวและอาชีพของผู้ปกครอง', 'พ่อและแม่ของนักเรียนมีสถานะอย่างไร (เช่น อยู่ด้วยกัน แยกกันอยู่ หรือมีผู้ปกครองคนอื่นดูแล) พ่อและแม่ทำงานอะไร มีรายได้ประมาณเท่าใดต่อเดือน ปัจจุบันนักเรียนอาศัยอยู่กับใครบ้าง และสมาชิกแต่ละคนในบ้านทำอาชีพอะไร มีรายได้โดยประมาณเท่าใดต่อเดือน', true, 'เขียนเล่าเกี่ยวกับครอบครัวและอาชีพของผู้ปกครอง'],
  ['พี่น้องในครอบครัว', 'จำนวนพี่น้อง เด็ก หรือญาติที่อาศัยอยู่บ้านเดียวกัน และใครเป็นผู้ออกเงินเลี้ยงดู', true, 'เขียนเล่าเกี่ยวกับพี่น้องและสมาชิกที่อาศัยอยู่ในบ้าน'],
  ['การเดินทางและค่าใช้จ่ายมาโรงเรียน', 'นักเรียนเดินทางมาโรงเรียนด้วยวิธีใด (เช่น เดิน จักรยาน รถจักรยานยนต์ รถโดยสาร ฯลฯ) ใช้เวลาเดินทางประมาณเท่าใด มีค่าใช้จ่ายในการเดินทางเท่าใดต่อวันหรือต่อเดือน และได้รับเงินไปโรงเรียนวันละเท่าใด', true, 'เขียนเล่าเกี่ยวกับการเดินทางและค่าใช้จ่ายมาโรงเรียน'],
  ['ลักษณะบ้านและที่อยู่อาศัย', 'บ้านหรือที่พักอาศัยเป็นของใคร มีลักษณะอย่างไร และมีส่วนใดที่ชำรุดหรือจำเป็นต้องซ่อมแซมหรือไม่', true, 'เขียนเล่าเกี่ยวกับบ้านและที่อยู่อาศัย'],
  ['ค่าใช้จ่ายของครอบครัว / ภาระหนี้สินของครอบครัว', 'ครอบครัวของนักเรียนมีค่าใช้จ่ายเกี่ยวกับเรื่องใดบ้าง จำนวนเท่าใด เช่น ค่าเช่าบ้าน ค่าน้ำ ค่าไฟ ค่ากินอยู่ หรือค่าใช้จ่ายในการดูแลสุขภาพของคนในครอบครัว หากมีการยืมหรือกู้เงินมาใช้จ่ายสำหรับชีวิตประจำวัน โปรดระบุเพิ่มเติมด้วย', true, 'เขียนเล่าเกี่ยวกับค่าใช้จ่ายและภาระหนี้สินของครอบครัว'],
  ['เรื่องอื่น ๆ ที่อยากบอกเล่าให้มูลนิธิฯ ทราบ', '', false, 'หากมีเรื่องอื่นที่ต้องการให้มูลนิธิฯ ทราบ สามารถเขียนเพิ่มเติมได้'],
];
const STEPS = ['ข้อมูลนักเรียนและการศึกษา', 'ข้อมูลครอบครัว', 'เรื่องราวชีวิตและยืนยัน', 'ส่งใบสมัครเรียบร้อย'];
const PARENT_STATUS = {
  father: [['alive', 'มีชีวิตอยู่'], ['dead', 'เสียชีวิต'], ['contact', 'ขาดการติดต่อ / ไม่สามารถติดต่อได้'], ['prison', 'ถูกจำคุก'], ['monk', 'บวช']],
  mother: [['alive', 'มีชีวิตอยู่'], ['dead', 'เสียชีวิต'], ['contact', 'ขาดการติดต่อ / ไม่สามารถติดต่อได้'], ['prison', 'ถูกจำคุก']],
};
const INCOME_TYPES = [['none', 'ไม่มีรายได้'], ['daily', 'รับค่าจ้างเป็นรายวัน'], ['salary', 'รับเงินเดือนประจำ'], ['other', 'รายได้ไม่แน่นอน / อื่น ๆ']];
const FAMILY_FLAGS = [['together', 'บิดามารดาอยู่ด้วยกัน'], ['apart', 'บิดามารดาอยู่คนละที่ แต่ไม่ได้หย่าร้างหรือเลิกรากัน'],
  ['separated', 'บิดามารดาแยกทาง / เลิกรากัน'], ['divorced', 'บิดามารดาหย่าร้างกัน'], ['father_new', 'บิดามีครอบครัวใหม่'], ['mother_new', 'มารดามีครอบครัวใหม่']];
const HOUSING = ['บ้านของครอบครัว', 'บ้านเช่า', 'ห้องเช่า / หอพัก', 'อาศัยอยู่กับญาติหรือผู้อื่น', 'บ้านพักที่นายจ้างหรือที่ทำงานจัดให้', 'บ้านพักของทางราชการ', 'อื่น ๆ'];
const ASSETS = [['washer', 'เครื่องซักผ้า', false], ['computer', 'คอมพิวเตอร์ / โน้ตบุ๊ก', false], ['aircon', 'เครื่องปรับอากาศ', false],
  ['motorcycle', 'รถจักรยานยนต์', true], ['car', 'รถเก๋ง / รถยนต์นั่งส่วนบุคคล', true], ['pickup', 'รถกระบะ', true], ['farm_vehicle', 'รถเพื่อการเกษตร', true]];
const SIB_STATUS = [['study', 'กำลังศึกษา'], ['work', 'ทำงาน'], ['none', 'ไม่ได้ศึกษาและยังไม่ได้ทำงาน']];
const LOAN_NOTE = 'ผู้ที่กำลังกู้ยืม กยศ. หรือ กรอ. ไม่เข้าเกณฑ์การพิจารณาทุนของมูลนิธิฯ ระบบจริงจะหยุดการสมัครและบันทึกสถานะว่า “ไม่เข้าเกณฑ์” โดยไม่ลบข้อมูลทิ้งทันที';

App.me = function () { return this.studentByCode[this.session.code]; };
App.studentNav = function () {
  const s = this.me();
  return [['student-status', 'สถานะใบสมัคร']].concat(['draft', 'returned_to_student'].includes(s.status) ? [['student-form', 'กรอกใบสมัคร']] : []);
};

/* แสดง/ซ่อนส่วนตามคำตอบ: data-when="ชื่อช่อง=ค่า1|ค่า2" (ขึ้นต้น ! = ไม่ใช่ค่าเหล่านี้) */
function applyWhen(root) {
  const form = root.closest ? (root.closest('form') || root) : root;
  const val = name => {
    const els = form.querySelectorAll(`[name="${name}"]`);
    if (!els.length) return '';
    const el = els[0];
    if (el.type === 'radio') return (form.querySelector(`[name="${name}"]:checked`) || {}).value || '';
    if (el.type === 'checkbox') return el.checked ? 'on' : '';
    return el.value;
  };
  form.querySelectorAll('[data-when]').forEach(el => {
    el.dataset.when.split('&').forEach((cond, i) => {
      const neg = cond.startsWith('!');
      const [k, vs] = (neg ? cond.slice(1) : cond).split('=');
      const hit = vs.split('|').includes(val(k));
      const show = neg ? !hit : hit;
      if (i === 0) el.hidden = !show; else if (!show) el.hidden = true;
    });
  });
}
document.addEventListener('change', e => { if (e.target.closest('form[data-when-form]')) applyWhen(e.target); });

/* ---------- หน้า 1: ตรวจสอบสิทธิ์ ---------- */
App.views['student-entry'] = function (p) {
  this.session = {role: null};
  const v = p.values || {};
  const e = p.errors || {};
  const y = this.db.cycle.history_year;
  const tries = (this._tries || {})[v.cid] || 0;
  const sample = this.db.students.find(s => s.status === 'draft' && s.group !== 'bachelor');
  const sent = this.db.students.find(s => s.status === 'waiting_teacher');
  return {html: `
    <div class="page-head"><div><h1>เริ่มสมัครขอรับทุนการศึกษา</h1><p class="sub">ตรวจสอบสิทธิ์และเลือกประเภทใบสมัคร</p></div></div>
    <div class="split">
      <form class="card" data-submit="student-login" novalidate>
        ${radioField('received', `ได้รับทุนการศึกษาจากมูลนิธิทิสโก้ เพื่อการกุศล ในปีการศึกษา ${y} หรือไม่`,
          [['yes', 'ได้รับทุน'], ['no', 'ไม่ได้รับทุน']], v.received, {req: 1, err: e.received,
          hint: 'ระบบจะใช้คำตอบนี้เพื่อแสดงแบบฟอร์ม ทุนต่อเนื่อง หรือ ทุนใหม่ ให้อัตโนมัติ'})}
        ${field('cid', 'เลขประจำตัวประชาชน 13 หลัก', input('cid', v.cid, 'inputmode="numeric" maxlength="13" autocomplete="off" placeholder="กรอกตัวเลข 13 หลัก" data-oninput="digits"'),
          {req: 1, err: e.cid, hint: 'กรอกเฉพาะผู้มีเลขประจำตัวประชาชน 13 หลัก ระบบจะตรวจรูปแบบให้อัตโนมัติ'})}
        <div class="grid-2">
          ${field('birth', 'วันเดือนปีเกิด', input('birth', v.birth, 'inputmode="numeric" maxlength="10" placeholder="เช่น 12/12/2553" data-oninput="bedate"'), {req: 1, err: e.birth, hint: 'วว/ดด/ปปปป (พ.ศ.)'})}
          ${field('phone', 'หมายเลขโทรศัพท์', input('phone', v.phone, 'inputmode="numeric" maxlength="10" placeholder="เช่น 0812345678" data-oninput="digits"'), {req: 1, err: e.phone})}
        </div>
        <div class="note info small">ใช้ <b>เลขประจำตัวประชาชน + วันเดือนปีเกิด + หมายเลขโทรศัพท์ 10 หลัก</b> ยืนยันตัวผู้สมัครทุกครั้งที่กลับมาแก้ไขใบสมัคร
          <b>ไม่มีการส่ง OTP</b> หากกรอกข้อมูลยืนยันผิดครบ 10 ครั้ง ระบบสามารถรีเซ็ตใบสมัครฉบับร่างและให้เริ่มกรอกใหม่ได้</div>
        ${e.form ? `<div class="note bad">${esc(e.form)}${tries ? ` (ผิด ${tries} จาก 10 ครั้ง)` : ''}</div>` : ''}
        ${tries >= 10 ? `<div class="note warn row between"><span>กรอกข้อมูลยืนยันผิดครบ 10 ครั้ง สามารถรีเซ็ตใบสมัครฉบับร่างและเริ่มกรอกใหม่</span>
          <button class="btn danger sm" type="button" data-action="student-reset-draft" data-cid="${esc(v.cid)}">รีเซ็ตฉบับร่าง</button></div>` : ''}
        <div class="row end"><button class="btn primary" type="submit">ดำเนินการต่อ</button></div>
      </form>
      <aside class="card"><h3>ทดลองใช้งาน</h3>
        <p class="small muted">กรอกเลขบัตรใหม่ที่ถูกต้องเพื่อเริ่มใบสมัครใหม่ หรือเลือกนักเรียนตัวอย่าง</p>
        ${sample ? `<button class="btn" data-action="student-sample" data-code="${sample.code}">นักเรียนที่กำลังกรอก</button>` : ''}
        ${sent ? `<button class="btn" data-action="student-sample" data-code="${sent.code}">นักเรียนที่ส่งแล้ว</button>` : ''}
        <button class="btn" data-action="student-newid">สร้างเลขบัตรใหม่สำหรับทดลอง</button>
        <p class="tiny muted">บันทึกร่างอัตโนมัติทุกครั้งที่กดถัดไป กลับมากรอกต่อได้หากอินเทอร์เน็ตหลุดหรือปิดหน้าเว็บ</p>
      </aside>
    </div>`, after: focusFirstError};
};
App.on('digits', function (el) { el.value = el.value.replace(/\D/g, '').slice(0, Number(el.maxLength) || 99); });
App.on('bedate', function (el) { el.value = maskBeDate(el.value); });
App.on('student-sample', function (el) {
  const s = this.studentByCode[el.dataset.code];
  this.go('student-entry', {values: {cid: s.citizen_id, birth: beDate(s.birth_date), phone: s.phone, received: s.type === 'CONT' ? 'yes' : 'no'}});
});
App.on('student-newid', function () {
  let id;
  do {
    const d = [1 + Math.floor(Math.random() * 8)].concat(Array.from({length: 11}, () => Math.floor(Math.random() * 10)));
    id = d.join('') + (11 - d.reduce((a, x, i) => a + x * (13 - i), 0) % 11) % 10;
  } while (this.db.students.some(s => s.citizen_id === id));
  this.go('student-entry', {values: {cid: id, birth: '15/06/2554', phone: '0800009999'}});
});
App.on('student-reset-draft', function (el) {
  const i = this.db.students.findIndex(s => s.citizen_id === el.dataset.cid && s.status === 'draft');
  if (i < 0) { this.toast('รีเซ็ตได้เฉพาะใบสมัครฉบับร่าง ใบสมัครที่ส่งแล้วกรุณาติดต่อครูผู้ดูแลทุนหรือมูลนิธิฯ'); return; }
  this.db.students.splice(i, 1);
  this._tries[el.dataset.cid] = 0;
  this.save();
  this.toast('รีเซ็ตใบสมัครฉบับร่างแล้ว กรุณาเริ่มกรอกใหม่');
  this.go('student-entry', {values: {cid: el.dataset.cid}});
});
App.on('student-login', function (form) {
  const v = formData(form);
  const e = {};
  if (!v.received) e.received = `กรุณาเลือกว่าปีการศึกษา ${this.db.cycle.history_year} ได้รับทุนจากมูลนิธิฯ หรือไม่`;
  if (!/^\d{13}$/.test(v.cid)) e.cid = 'กรุณากรอกเลขประจำตัวประชาชน 13 หลัก';
  else if (!validThaiId(v.cid)) e.cid = 'เลขประจำตัวประชาชนอาจไม่ผ่านการตรวจสอบรูปแบบ กรุณาตรวจสอบอีกครั้ง';
  const birth = parseBeDate(v.birth);
  if (!birth) e.birth = 'กรุณากรอกวันเดือนปีเกิดให้ถูกต้อง เช่น 12/12/2553';
  if (!/^\d{10}$/.test(v.phone)) e.phone = 'กรุณากรอกหมายเลขโทรศัพท์ 10 หลัก';
  const existing = this.db.students.find(s => s.citizen_id === v.cid);
  if (existing && !Object.keys(e).length && (existing.birth_date !== birth || existing.phone !== v.phone)) {
    this._tries = this._tries || {};
    this._tries[v.cid] = (this._tries[v.cid] || 0) + 1;
    e.form = 'วันเดือนปีเกิดหรือหมายเลขโทรศัพท์ไม่ตรงกับข้อมูลที่บันทึกไว้';
  }
  if (Object.keys(e).length) { this.go('student-entry', {values: v, errors: e}); return; }

  let s = existing;
  const type = v.received === 'yes' ? 'CONT' : 'NEW';
  if (!s) {
    const n = this.db.students.reduce((m, x) => Math.max(m, Number(x.code.slice(-6))), 0) + 1;
    s = {code: `TF${this.db.cycle.year}-${String(n).padStart(6, '0')}`, citizen_id: v.cid, birth_date: birth, phone: v.phone, type,
      status: 'draft', title: '', first_name: '', last_name: '', gender: '', home_address: '', current_address: '', same_address: false,
      school: '', group: '', class: '', next_class: '', stories: ['', '', '', '', '', ''], family: {family_status: [], assets: {}},
      siblings: [], docFiles: {}, history: []};
    addHistory(s, 'นักเรียนเริ่มกรอกใบสมัคร', 'started');
    this.db.students.push(s);
  } else if (['draft', 'returned_to_student'].includes(s.status)) {
    s.type = type;   // ประเภททุนพิจารณาจากคำตอบของผู้สมัครเท่านั้น (v28)
  }
  this.save();
  this.session = {role: 'student', code: s.code, who: s.first_name ? fullName(s) : s.code};
  this.toast('ประเภทใบสมัคร: ' + TYPE[s.type]);
  if (['draft', 'returned_to_student'].includes(s.status)) this.go('student-form', {step: s.step || 1}); else this.go('student-status');
});

/* ---------- หน้า 2–4: กรอกใบสมัคร ---------- */
App.views['student-form'] = function (p) {
  const s = this.me();
  const step = Number(p.step) || 1;
  const e = p.errors || {};
  const body = [null, stepStudent, stepFamily, stepStory][step].call(this, s, e, p.values);
  return {nav: this.studentNav(), html: `
    <div class="page-head"><div><h1>${STEPS[step - 1]}</h1><p class="sub"><span class="num">${s.code}</span> · ${TYPE[s.type]} · ขั้นตอน ${step} จาก 3</p></div></div>
    <ol class="stepper" style="--n:4">${STEPS.map((t, i) => `<li class="${i + 1 < step ? 'done' : i + 1 === step ? 'now' : ''}"><span>${i + 1}. ${t}</span></li>`).join('')}</ol>
    ${s.status === 'returned_to_student' && s.return_reason ? `<div class="note warn"><b>ครูเปิดสิทธิ์ให้แก้ไข:</b> ${esc(s.return_reason)}</div>` : ''}
    ${errNote(e)}
    <form class="stack" data-submit="student-step" data-step="${step}" data-when-form novalidate>
      ${body}
      <div class="row between no-print">
        ${step > 1 ? `<button class="btn" type="button" data-action="student-back" data-step="${step}">ย้อนกลับ</button>` : '<span></span>'}
        <button class="btn primary" type="submit" id="next-btn">${step < 3 ? 'ถัดไป' : 'ส่งใบสมัคร'}</button>
      </div>
    </form>`, after() { applyWhen(document.querySelector('form')); this.dispatch('student-loan'); focusFirstError(); }};
};

function stepStudent(s, e) {
  const sc = this.schoolById[s.school];
  const area = sc ? {region: sc.region, province: sc.province, district: sc.district, school: sc.id} : {};
  const age = ageAt(s.birth_date);
  return `
  <section class="card"><h3>ข้อมูลส่วนตัว</h3>
    <div class="grid-3">
      ${field('title', 'คำนำหน้าชื่อ', select('title', ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว'], s.title, 'กรุณาเลือก'), {req: 1, err: e.title})}
      ${field('first_name', 'ชื่อ', input('first_name', s.first_name, 'placeholder="กรอกชื่อให้ตรงกับบัตรประจำตัวประชาชน"'), {req: 1, err: e.first_name})}
      ${field('last_name', 'นามสกุล', input('last_name', s.last_name, 'placeholder="กรอกนามสกุลให้ตรงกับบัตรประจำตัวประชาชน"'), {req: 1, err: e.last_name})}
    </div>
    <div class="note warn small"><b>กรุณาตรวจสอบชื่อ–นามสกุลให้ตรงกับบัตรประจำตัวประชาชน</b> หากข้อมูลไม่ถูกต้อง มีผลต่อการรับทุน และอาจต้องสละสิทธิ์การได้รับทุน</div>
    <div class="grid-3">
      ${field('gender', 'เพศ', select('gender', ['ชาย', 'หญิง'], s.gender, 'กรุณาเลือก'), {req: 1, err: e.gender})}
      ${field('cid_ro', 'เลขประจำตัวประชาชน', input('cid_ro', s.citizen_id, 'readonly'))}
      ${field('birth_ro', 'วันเดือนปีเกิด', input('birth_ro', beDate(s.birth_date), 'readonly'))}
      ${field('age_ro', 'อายุ', input('age_ro', age === '' ? '' : `${age} ปี`, 'readonly'), {hint: 'ระบบจะคำนวณอีกครั้ง ณ วันที่ส่งใบสมัคร'})}
      ${field('phone_ro', 'หมายเลขโทรศัพท์', input('phone_ro', s.phone, 'readonly'), {hint: 'ดึงจากหน้าแรก และไม่ให้แก้ไขในหน้านี้'})}
    </div>
  </section>
  <section class="card"><h3>ที่อยู่</h3>
    ${field('home_address', 'ที่อยู่ตามภูมิลำเนา', textarea('home_address', s.home_address, 'rows="2" placeholder="บ้านเลขที่ หมู่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์" data-oninput="student-copy-address"'), {req: 1, err: e.home_address})}
    ${field('current_address', 'ที่อยู่ปัจจุบัน', textarea('current_address', s.current_address, `rows="2" placeholder="ที่อยู่ที่พักอาศัยอยู่จริงในปัจจุบัน เช่น หอพัก บ้านญาติ หรือบ้านเช่า" ${s.same_address ? 'readonly' : ''}`), {req: 1, err: e.current_address})}
    <label class="check"><input type="checkbox" name="same_address" ${s.same_address ? 'checked' : ''} data-onchange="student-copy-address"> <span>เหมือนกับที่อยู่ตามภูมิลำเนา</span></label>
  </section>
  <section class="card"><div class="card-head"><h3>ข้อมูลการศึกษา</h3><span class="sub">สถานศึกษาปัจจุบัน: ภาค → จังหวัด → อำเภอ / เขต → ชื่อสถานศึกษา</span></div>
    <div class="grid-2" data-area='${JSON.stringify({school: true, required: true, err: {school: e.school}})}'>${this.areaPicker('st', area, {school: true, required: true, err: {school: e.school}})}</div>
    <div id="class_box" class="stack">${classFields.call(this, s, e)}</div>
  </section>
  <section class="card"><h3>สถานศึกษาในปีถัดไป</h3>
    <div class="note info small"><b>คำถามสำคัญ:</b> คำตอบข้อนี้ใช้แยกขั้นตอนการพิจารณาทุนและการส่งหลักฐานย้ายสถานศึกษา</div>
    ${radioField('school_next', 'ปีการศึกษาถัดไปจะเรียนต่อที่ใด', [['same', 'เรียนต่อสถานศึกษาเดิม'], ['transfer', 'ย้ายสถานศึกษา']], s.school_next,
      {req: 1, err: e.school_next, hint: 'หากยังไม่แน่ใจ ให้เลือก “ย้ายสถานศึกษา” ระบบจะไม่ถามชื่อสถานศึกษาใหม่ในขั้นตอนนี้'})}
  </section>
  <section class="card"><h3>กยศ. / กรอ. และทุนจากหน่วยงานอื่น</h3>
    ${radioField('loan', 'ปัจจุบันได้รับเงินกู้ กยศ. หรือ กรอ. หรือไม่', [['no', 'ไม่ได้รับ'], ['yes', 'ได้รับ / กู้ยืม']], s.loan, {req: 1, err: e.loan, attrs: 'data-onchange="student-loan"'})}
    <div class="note bad" data-when="loan=yes">${LOAN_NOTE}</div>
    <div class="grid-2" data-when="loan=yes">
      ${field('loan_amount', 'จำนวนเงินที่ได้รับ', input('loan_amount', s.loan_amount, 'type="number" min="0" inputmode="numeric" placeholder="บาท"'))}
      ${field('loan_period', 'ได้รับเป็น', select('loan_period', ['ต่อภาคเรียน', 'ต่อปี'], s.loan_period || 'ต่อภาคเรียน'))}
    </div>
    ${radioField('other', 'ปัจจุบันได้รับทุนการศึกษาต่อเนื่องจากหน่วยงานอื่นหรือไม่', [['no', 'ไม่ได้รับ'], ['yes', 'ได้รับ']], s.other, {req: 1, err: e.other})}
    <div class="grid-3" data-when="other=yes">
      ${field('other_org', 'ชื่อหน่วยงาน', input('other_org', s.other_org), {req: 1, err: e.other_org})}
      ${field('other_amount', 'จำนวนเงิน', input('other_amount', s.other_amount, 'type="number" min="0" inputmode="numeric" placeholder="บาท"'))}
      ${field('other_period', 'ได้รับเป็น', select('other_period', ['ต่อภาคเรียน', 'ต่อปี'], s.other_period || 'ต่อภาคเรียน'))}
    </div>
  </section>`;
}
/* ช่วงชั้น → ระดับชั้นปัจจุบัน → (คณะ / ประเภทวิชา / รูปแบบการเรียน / หลักสูตรกี่ปี) → ระดับชั้นปีถัดไป */
function classFields(v, e = {}) {
  const g = v.group || groupOfClass(v.class);
  const classes = CLASS_GROUPS[g] || [];
  const nexts = nextOptions(v.class);
  const next = nexts.length === 1 && !NEXT_BRANCH[v.class] ? (nexts.includes(v.next_class) ? v.next_class : nexts[0]) : (nexts.includes(v.next_class) ? v.next_class : '');
  const rate = rateOf(next, v.pvs_type);
  return `<div class="grid-2">
      ${field('group', 'ช่วงชั้นที่กำลังศึกษา', select('group', EDU_GROUPS, g, 'กรุณาเลือกช่วงชั้น', 'data-onchange="student-class"'), {req: 1, err: e.group, hint: 'เลือกช่วงชั้นก่อน เพื่อลดความผิดพลาดในการเลือกระดับชั้น'})}
      ${field('class', 'ระดับชั้นปัจจุบัน', select('class', classes, v.class, g ? 'กรุณาเลือกระดับชั้น' : 'กรุณาเลือกช่วงชั้นก่อน', `data-onchange="student-class" ${g ? '' : 'disabled'}`), {req: 1, err: e.class})}
    </div>
    ${['voc', 'highvoc', 'bachelor'].includes(g) ? field('faculty', 'คณะ / สาขาวิชา', input('faculty', v.faculty, 'placeholder="กรุณาระบุคณะ / สาขาวิชา"'), {req: 1, err: e.faculty, hint: 'แสดงเฉพาะผู้ที่กำลังศึกษา ปวช. / ปวส. / ปริญญาตรี'}) : ''}
    ${g === 'highvoc' ? field('pvs_type', 'ประเภทวิชา', select('pvs_type', PVS_TYPES, v.pvs_type, 'กรุณาเลือก', 'data-onchange="student-class"'), {req: 1, err: e.pvs_type, hint: 'แสดงเฉพาะระดับ ปวส. โดยใช้คำเรียก “ประเภทวิชา” ตามหลักสูตรอาชีวศึกษา'}) : ''}
    ${['uppersec', 'voc', 'highvoc', 'bachelor'].includes(g) ? `<div class="grid-2">
      ${field('study_mode', 'รูปแบบการเรียนปัจจุบัน', select('study_mode', STUDY_MODES, v.study_mode, 'กรุณาเลือก'), {req: 1, err: e.study_mode, hint: 'หมายถึงรูปแบบการเรียนของระดับชั้นที่กำลังศึกษาอยู่ในปัจจุบัน'})}
      ${field('study_mode_other', 'กรุณาระบุรูปแบบการเรียน', input('study_mode_other', v.study_mode_other, 'placeholder="โปรดระบุ"'), {attrs: 'data-when="study_mode=other"', err: e.study_mode_other})}
    </div>` : ''}
    ${v.class === 'ปริญญาตรี ปี 4' ? field('program_years', 'หลักสูตรที่กำลังศึกษาเป็นหลักสูตรกี่ปี', select('program_years', ['4 ปี', '5 ปี', '6 ปี'], v.program_years, 'กรุณาเลือก'), {req: 1, err: e.program_years}) : ''}
    ${field('next_class', 'ระดับชั้นปีถัดไป', select('next_class', nexts, next, v.class ? (NEXT_BRANCH[v.class] ? 'กรุณาเลือกระดับชั้นปีถัดไป' : 'กรุณาเลือก') : 'กรุณาเลือกระดับชั้นปัจจุบันก่อน', 'data-onchange="student-class"'),
      {req: 1, err: e.next_class, hint: 'ระบบคำนวณให้ในกรณีทั่วไปและเด็กแก้ไขได้ ส่วน ม.3 / ม.6 / ปวช.3 / ปวส.2 จะให้เด็กเลือก'})}
    ${rate ? `<div class="note info small">อัตราทุนปีการศึกษา ${this.db.cycle.year}: <b>${baht(this.rateAmount(rate))}</b> (${esc(this.rateName(rate))})${g === 'bachelor' ? ' · ระดับปริญญาตรีอัปโหลดเอกสารเองและส่งถึงมูลนิธิฯ โดยตรง' : ''}</div>` : ''}`;
}
App.on('student-class', function (el) {
  const val = id => (document.getElementById(id) || {}).value || '';
  const v = {group: val('group'), class: val('class'), next_class: val('next_class'), pvs_type: val('pvs_type'), faculty: val('faculty'),
    study_mode: val('study_mode'), study_mode_other: val('study_mode_other'), program_years: val('program_years')};
  if (el.name === 'group') Object.assign(v, {class: '', next_class: '', pvs_type: '', faculty: '', study_mode: '', study_mode_other: ''});
  if (el.name === 'class') v.next_class = '';
  document.getElementById('class_box').innerHTML = classFields.call(this, v);
  applyWhen(document.querySelector('form'));
  const nextId = {group: 'class', class: 'next_class'}[el.name];
  if (nextId && document.getElementById(nextId)) document.getElementById(nextId).focus();
});
App.on('student-copy-address', function () {
  const same = document.querySelector('[name=same_address]').checked;
  const cur = document.getElementById('current_address');
  if (same) cur.value = document.getElementById('home_address').value;
  cur.readOnly = same;
});
App.on('student-loan', function () {
  const yes = (document.querySelector('[name=loan]:checked') || {}).value === 'yes';
  const btn = document.getElementById('next-btn');
  if (btn && document.querySelector('form[data-step="1"]')) btn.disabled = yes;
});

function stepFamily(s, e) {
  const f = s.family || {};
  const parent = (k, title) => {
    const it = f[k + '_income_type'] || '';
    return `<section class="card"><h3>ข้อมูล${title}</h3>
      ${field(k + '_status', `สถานะของ${title}`, select(k + '_status', PARENT_STATUS[k], f[k + '_status'], 'กรุณาเลือก'), {req: 1, err: e[k + '_status']})}
      <div class="stack" data-when="${k}_status=alive|">
        <div class="grid-3">
          ${field(k + '_name', `ชื่อ–นามสกุล${title}`, input(k + '_name', f[k + '_name']))}
          ${field(k + '_age', 'อายุ', input(k + '_age', f[k + '_age'], 'type="number" min="0" inputmode="numeric" placeholder="ปี"'))}
          ${field(k + '_occupation', 'อาชีพ', input(k + '_occupation', f[k + '_occupation']))}
        </div>
        <label class="check"><input type="checkbox" name="${k}_cannot_work" ${f[k + '_cannot_work'] ? 'checked' : ''}> <span>${title}ไม่สามารถประกอบอาชีพได้</span></label>
        ${field(k + '_income_type', 'ลักษณะรายได้', select(k + '_income_type', INCOME_TYPES, it, 'กรุณาเลือก'))}
        <div class="grid-2" data-when="${k}_income_type=daily">
          ${field(k + '_daily_wage', 'ค่าจ้างโดยประมาณ', input(k + '_daily_wage', f[k + '_daily_wage'], 'type="number" min="0" inputmode="numeric" placeholder="บาท / วัน"'))}
          <div class="field">${field(k + '_work_days', 'โดยเฉลี่ยมีงานทำ', input(k + '_work_days', f[k + '_work_days'], 'type="number" min="0" max="31" inputmode="numeric" placeholder="วัน / เดือน"'))}
            <label class="check"><input type="checkbox" name="${k}_days_unknown" ${f[k + '_days_unknown'] ? 'checked' : ''}> <span>ไม่ทราบจำนวนวัน</span></label></div>
        </div>
        <div data-when="${k}_income_type=salary">${field(k + '_salary', 'เงินเดือนโดยประมาณ', input(k + '_salary', it === 'salary' ? f[k + '_monthly_income'] : '', 'type="number" min="0" inputmode="numeric" placeholder="บาท / เดือน"'))}</div>
        <div data-when="${k}_income_type=other">${field(k + '_avg', 'รายได้โดยเฉลี่ยประมาณ', input(k + '_avg', it === 'other' ? f[k + '_monthly_income'] : '', 'type="number" min="0" inputmode="numeric" placeholder="บาท / เดือน"'))}</div>
      </div></section>`;
  };
  const yn = (name, v) => radios(name, [['no', name === 'rent_land' ? 'ไม่เช่า' : 'ไม่มี'], ['yes', name === 'rent_land' ? 'เช่า' : 'มี']], v === true ? 'yes' : v === false ? 'no' : v);
  return parent('father', 'บิดา') + parent('mother', 'มารดา') + `
  <section class="card"><h3>สถานภาพครอบครัว</h3>${checks('family_status', FAMILY_FLAGS, f.family_status || [])}</section>
  <section class="card"><h3>ข้อมูลพี่น้อง</h3>
    ${field('sib_count', 'ผู้สมัครมีพี่น้องทั้งหมดกี่คน (ไม่รวมตัวผู้สมัคร)', input('sib_count', (s.siblings || []).length, 'type="number" min="0" max="10" inputmode="numeric" data-onchange="student-sibs"'),
      {hint: 'รวมพี่น้องร่วมบิดามารดา พี่น้องต่างบิดา และพี่น้องต่างมารดา'})}
    <div id="sibs" class="stack">${siblingRows(s.siblings || [])}</div>
  </section>
  <section class="card"><h3>ที่อยู่อาศัยและที่ดินทำการเกษตร</h3>
    <div class="grid-2">
      ${field('housing_type', 'บ้านที่นักเรียนอาศัยอยู่ในปัจจุบันเป็นแบบใด', select('housing_type', HOUSING, f.housing_type, 'กรุณาเลือก'))}
      ${field('housing_cost', 'ค่าเช่า / ค่างวดผ่อน (ถ้ามี)', input('housing_cost', f.housing_cost, 'type="number" min="0" inputmode="numeric" placeholder="จ่ายประมาณ บาท / เดือน"'), {hint: 'กรอกเฉพาะกรณีมีค่าเช่าหรือค่างวดผ่อน'})}
    </div>
    <div class="grid-2">
      <div class="subcard"><span class="label">มีที่ดินของตนเองสำหรับทำการเกษตรหรือไม่</span>${yn('own_land', f.own_land)}
        <div class="grid-2" data-when="own_land=yes">${field('own_land_rai', '', input('own_land_rai', f.own_land_rai, 'type="number" min="0" inputmode="decimal" placeholder="ไร่" aria-label="ไร่"'))}${field('own_land_ngan', '', input('own_land_ngan', f.own_land_ngan, 'type="number" min="0" max="3" inputmode="decimal" placeholder="งาน" aria-label="งาน"'))}</div></div>
      <div class="subcard"><span class="label">เช่าที่ดินเพื่อทำการเกษตรหรือไม่</span>${yn('rent_land', f.rent_land)}
        <div class="stack" data-when="rent_land=yes"><div class="grid-2">${field('rent_land_rai', '', input('rent_land_rai', f.rent_land_rai, 'type="number" min="0" inputmode="decimal" placeholder="ไร่" aria-label="ไร่"'))}${field('rent_land_ngan', '', input('rent_land_ngan', f.rent_land_ngan, 'type="number" min="0" max="3" inputmode="decimal" placeholder="งาน" aria-label="งาน"'))}</div>
          ${field('rent_land_cost', '', input('rent_land_cost', f.rent_land_cost, 'type="number" min="0" inputmode="numeric" placeholder="ค่าเช่าประมาณ บาท / ปี" aria-label="ค่าเช่าต่อปี"'))}</div></div>
    </div>
  </section>
  <section class="card"><h3>ครอบครัวมีสิ่งของต่อไปนี้หรือไม่</h3>
    <div class="grid-2" id="assets">${ASSETS.map(([k, t, count]) => { const has = (f.assets || {})[k] != null;
      return `<label class="asset"><input type="checkbox" name="asset_${k}" ${has ? 'checked' : ''} ${f.no_assets ? 'disabled' : ''}> <span>${t}</span>
        ${count ? `<input class="input" name="asset_${k}_n" type="number" min="0" inputmode="numeric" placeholder="คัน" aria-label="จำนวน${t}" value="${has ? esc(f.assets[k]) : ''}" ${f.no_assets ? 'disabled' : ''}>` : ''}</label>`; }).join('')}
      <label class="asset"><input type="checkbox" name="no_assets" ${f.no_assets ? 'checked' : ''} data-onchange="student-noasset"> <span>ไม่มีสิ่งของตามรายการข้างต้น</span></label></div>
  </section>`;
}
function siblingRows(list) {
  return list.map((x, i) => `<div class="subcard" data-sib="${i}"><h4>พี่น้องคนที่ ${i + 1}</h4>
    <div class="grid-3">
      ${field(`sib${i}_name`, 'ชื่อ–นามสกุล', input(`sib${i}_name`, x.name))}
      ${field(`sib${i}_age`, 'อายุ', input(`sib${i}_age`, x.age, 'type="number" min="0" inputmode="numeric" placeholder="ปี"'))}
      ${field(`sib${i}_relation`, 'ความสัมพันธ์', select(`sib${i}_relation`, ['พี่/น้องร่วมบิดามารดา', 'พี่/น้องต่างบิดา', 'พี่/น้องต่างมารดา'], x.relation || 'พี่/น้องร่วมบิดามารดา'))}
    </div>
    <div class="grid-2">
      ${field(`sib${i}_residence`, 'การพักอาศัย', select(`sib${i}_residence`, ['อยู่บ้านเดียวกัน', 'แยกออกไปพักอาศัยที่อื่น'], x.residence || 'อยู่บ้านเดียวกัน'))}
      ${field(`sib${i}_status`, 'สถานะปัจจุบัน', select(`sib${i}_status`, SIB_STATUS, x.status, 'กรุณาเลือก'))}
    </div>
    <div class="grid-3" data-when="sib${i}_status=study">
      ${field(`sib${i}_edu`, 'ระดับการศึกษา', input(`sib${i}_edu`, x.edu_level))}
      ${field(`sib${i}_school`, 'ชื่อสถานศึกษา', input(`sib${i}_school`, x.school_name))}
      ${field(`sib${i}_loan`, 'กู้ กยศ./กรอ. หรือไม่', select(`sib${i}_loan`, [['no', 'ไม่กู้'], ['yes', 'กู้']], x.has_loan ? 'yes' : 'no'))}
    </div>
    <div data-when="sib${i}_status=work">${field(`sib${i}_job`, 'อาชีพ / ตำแหน่งงาน', input(`sib${i}_job`, x.occupation))}</div>
    <div data-when="sib${i}_status=none">${field(`sib${i}_detail`, 'กรุณาระบุรายละเอียด', input(`sib${i}_detail`, x.detail, 'placeholder="เช่น ยังไม่ถึงวัยเรียน / แม่บ้าน / บวช / อื่น ๆ"'))}</div>
  </div>`).join('');
}
function readSiblings(form) {
  const v = formData(form);
  const n = Math.max(0, Math.min(10, Number(v.sib_count) || 0));
  return Array.from({length: n}, (_, i) => ({name: v[`sib${i}_name`] || '', age: v[`sib${i}_age`] || '', relation: v[`sib${i}_relation`] || '',
    residence: v[`sib${i}_residence`] || '', status: v[`sib${i}_status`] || '', edu_level: v[`sib${i}_edu`] || '', school_name: v[`sib${i}_school`] || '',
    has_loan: v[`sib${i}_loan`] === 'yes', occupation: v[`sib${i}_job`] || '', detail: v[`sib${i}_detail`] || ''}));
}
App.on('student-sibs', function (el) {
  el.value = Math.max(0, Math.min(10, Number(el.value) || 0));
  const cur = readSiblings(el.form);
  document.getElementById('sibs').innerHTML = siblingRows(Array.from({length: Number(el.value)}, (_, i) => cur[i] || {}));
  applyWhen(el.form);
});
App.on('student-noasset', function (el) {
  document.querySelectorAll('#assets input').forEach(x => {
    if (x.name === 'no_assets') return;
    if (el.checked) { if (x.type === 'checkbox') x.checked = false; else x.value = ''; }
    x.disabled = el.checked;
  });
});

function stepStory(s, e) {
  const pd = this.db.pdpa;
  return `<section class="card"><p class="muted">กรุณาเล่าเรื่องราวตามจริง ข้อมูลนี้ใช้ประกอบการพิจารณาทุน</p>
    ${STORY_Q.map(([t, h, req, ph], i) => field('story_' + i, `${i + 1}. ${t}`,
      textarea('story_' + i, s.stories[i], `rows="4" data-oninput="count" maxlength="2000" placeholder="${ph}" aria-describedby="cnt_${i}"`) +
      `<div class="counter" id="cnt_${i}">${(s.stories[i] || '').length} / 2000</div>`, {req, hint: h, err: e['story_' + i]})).join('')}
  </section>
  <section class="card"><h3>ยืนยันก่อนส่ง</h3>
    <label class="check"><input type="checkbox" name="confirm" ${s.confirmed ? 'checked' : ''}> <span>ข้าพเจ้าขอยืนยันว่าข้อมูลที่กรอกเป็นความจริงและถูกต้องตามที่ทราบ <span class="req">*</span></span></label>
    ${e.confirm ? `<div class="err">${e.confirm}</div>` : ''}
    <label class="check"><input type="checkbox" name="pdpa" ${s.pdpa_ack ? 'checked' : ''}> <span>ข้าพเจ้าได้รับทราบประกาศความเป็นส่วนตัว (Privacy Notice) ของมูลนิธิทิสโก้ เพื่อการกุศลแล้ว <span class="req">*</span></span></label>
    ${e.pdpa ? `<div class="err">${e.pdpa}</div>` : ''}
    <a href="${esc(pd.url)}" target="_blank" rel="noopener noreferrer">อ่านประกาศความเป็นส่วนตัว (Privacy Notice) ฉบับ ${esc(pd.version)}</a>
    <div class="note info small">เมื่อกดส่งแล้ว ข้อมูลจะถูกล็อกไม่ให้แก้ไขเอง หากจำเป็นต้องแก้ไข ให้ครูผู้ดูแลทุนหรือเจ้าหน้าที่เป็นผู้เปิดสิทธิ์ให้แก้ไข</div>
  </section>`;
}
App.on('count', function (el) {
  const c = document.getElementById(el.getAttribute('aria-describedby'));
  if (c) c.textContent = `${el.value.length} / ${el.maxLength}`;
});

App.on('student-back', function (el) {
  this.dispatch('student-step', document.querySelector('form'), {draftOnly: true});
  this.go('student-form', {step: Number(el.dataset.step) - 1});
});
App.on('student-step', function (form, ev) {
  const s = this.me();
  const step = Number(form.dataset.step);
  const v = formData(form);
  const e = {};
  const need = (k, msg) => { if (!v[k]) e[k] = msg || 'กรุณากรอกข้อมูล'; };
  if (step === 1) {
    const area = this.readArea('st');
    const g = v.group;
    Object.assign(s, {title: v.title, first_name: v.first_name, last_name: v.last_name, gender: v.gender,
      home_address: v.home_address, same_address: !!v.same_address, current_address: v.same_address ? v.home_address : v.current_address,
      school: area.school, group: g, class: v.class, next_class: v.next_class, faculty: v.faculty || '', pvs_type: g === 'highvoc' ? v.pvs_type : '',
      study_mode: v.study_mode || '', study_mode_other: v.study_mode === 'other' ? v.study_mode_other : '', program_years: v.program_years || '',
      school_next: v.school_next, loan: v.loan, loan_amount: v.loan === 'yes' ? v.loan_amount : '', loan_period: v.loan === 'yes' ? v.loan_period : '',
      other: v.other, other_org: v.other === 'yes' ? v.other_org : '', other_amount: v.other === 'yes' ? v.other_amount : '', other_period: v.other === 'yes' ? v.other_period : ''});
    s.rate = rateOf(s.next_class, s.pvs_type);
    ['title', 'gender'].forEach(k => need(k, 'กรุณาเลือก'));
    ['first_name', 'last_name', 'home_address'].forEach(k => need(k));
    if (!s.current_address) e.current_address = 'กรุณากรอกข้อมูล';
    if (!area.school) e.school = 'กรุณาเลือกภาค จังหวัด อำเภอ และสถานศึกษา';
    need('group', 'กรุณาเลือกช่วงชั้น');
    need('class', 'กรุณาเลือกระดับชั้น');
    if (['voc', 'highvoc', 'bachelor'].includes(g)) need('faculty');
    if (g === 'highvoc') need('pvs_type', 'กรุณาเลือกประเภทวิชา');
    if (['uppersec', 'voc', 'highvoc', 'bachelor'].includes(g)) need('study_mode', 'กรุณาเลือกรูปแบบการเรียน');
    if (v.class === 'ปริญญาตรี ปี 4') need('program_years', 'กรุณาเลือก');
    need('next_class', 'กรุณาเลือกระดับชั้นปีถัดไป');
    need('school_next', 'กรุณาเลือกคำตอบ');
    need('loan', 'กรุณาเลือกคำตอบ');
    need('other', 'กรุณาเลือกคำตอบ');
    if (v.other === 'yes') need('other_org', 'กรุณาระบุชื่อหน่วยงาน');
    if (v.loan === 'yes' && !(ev && ev.draftOnly)) e.loan = LOAN_NOTE;
  } else if (step === 2) {
    const f = {family_status: arr(v.family_status), housing_type: v.housing_type, housing_cost: v.housing_cost,
      own_land: v.own_land ? v.own_land === 'yes' : null, own_land_rai: v.own_land_rai, own_land_ngan: v.own_land_ngan,
      rent_land: v.rent_land ? v.rent_land === 'yes' : null, rent_land_rai: v.rent_land_rai, rent_land_ngan: v.rent_land_ngan, rent_land_cost: v.rent_land_cost,
      no_assets: !!v.no_assets, assets: {}};
    ['father', 'mother'].forEach(k => {
      const it = v[k + '_income_type'];
      Object.assign(f, {[k + '_status']: v[k + '_status'], [k + '_name']: v[k + '_name'], [k + '_age']: v[k + '_age'],
        [k + '_occupation']: v[k + '_occupation'], [k + '_cannot_work']: !!v[k + '_cannot_work'], [k + '_income_type']: it,
        [k + '_daily_wage']: it === 'daily' ? v[k + '_daily_wage'] : '', [k + '_work_days']: it === 'daily' && !v[k + '_days_unknown'] ? v[k + '_work_days'] : '',
        [k + '_days_unknown']: it === 'daily' && !!v[k + '_days_unknown'],
        [k + '_monthly_income']: it === 'salary' ? v[k + '_salary'] : it === 'other' ? v[k + '_avg'] : ''});
      if (!v[k + '_status']) e[k + '_status'] = 'กรุณาเลือกสถานะ';
    });
    if (!f.no_assets) ASSETS.forEach(([k, , count]) => { if (v['asset_' + k]) f.assets[k] = count ? Number(v[`asset_${k}_n`] || 1) : 1; });
    s.family = f;
    s.siblings = readSiblings(form);
  } else {
    s.stories = STORY_Q.map((_, i) => v['story_' + i] || '');
    s.confirmed = !!v.confirm;
    s.pdpa_ack = !!v.pdpa;
    STORY_Q.forEach(([, , req], i) => { if (req && !s.stories[i]) e['story_' + i] = 'กรุณาเล่าเรื่องราวในข้อนี้'; });
    if (!v.confirm) e.confirm = 'กรุณายืนยันความถูกต้องของข้อมูลก่อนส่งใบสมัคร';
    if (!v.pdpa) e.pdpa = 'กรุณารับทราบประกาศความเป็นส่วนตัว (Privacy Notice) ก่อนส่งใบสมัคร';
  }
  s.step = step;
  this.session.who = s.first_name ? fullName(s) : s.code;
  this.save();
  if (ev && ev.draftOnly) return;
  if (Object.keys(e).length) { this.go('student-form', {step, errors: e}); return; }
  if (step < 3) { this.toast('บันทึกร่างแล้ว'); this.go('student-form', {step: step + 1}); return; }
  const missing = [1, 2].find(n => !stepComplete(s, n));
  if (missing) { this.toast(`ขั้นตอนที่ ${missing} ยังกรอกไม่ครบ`); this.go('student-form', {step: missing}); return; }
  const direct = s.group === 'bachelor';
  s.status = direct ? 'waiting_staff' : 'waiting_teacher';
  s.submitted_at = nowIso();
  s.age_at_submit = ageAt(s.birth_date);
  s.pdpa_version = this.db.pdpa.version;
  s.return_reason = '';
  s.step = 1;
  addHistory(s, direct ? 'นักศึกษาส่งใบสมัครถึงมูลนิธิฯ โดยตรง' : 'นักเรียนส่งข้อมูลให้ครู', 'submitted');
  this.save();
  this.toast('ส่งใบสมัครเรียบร้อยแล้ว');
  this.go('student-status');
});
function stepComplete(s, n) {
  if (n === 1) return s.first_name && s.last_name && s.home_address && s.school && s.class && s.next_class && s.school_next && s.loan === 'no' && s.other;
  return s.family && s.family.father_status && s.family.mother_status;
}

/* ---------- หน้า 5: ส่งเรียบร้อย / สถานะ ---------- */
App.views['student-status'] = function () {
  const s = this.me();
  const bachelor = s.group === 'bachelor';
  const flow = bachelor ? ['กรอกใบสมัคร', 'อัปโหลดเอกสารและส่งถึงมูลนิธิฯ', 'เจ้าหน้าที่ตรวจสอบ', 'ผู้จัดการพิจารณา', 'ประกาศผล']
    : ['กรอกใบสมัคร', 'ครูตรวจและแนบเอกสาร', 'เจ้าหน้าที่ตรวจสอบ', 'ผู้จัดการพิจารณา', 'ประกาศผล'];
  const pos = {draft: 0, returned_to_student: 0, waiting_teacher: 1, waiting_staff: 2, need_more_info: 2, waiting_manager: 3, decided: 4}[s.status];
  const editable = ['draft', 'returned_to_student'].includes(s.status);
  const t = this.teacherOf(s.school);
  const d = s.decision;
  const docs = docsFor(s);
  const files = s.docFiles || {};
  return {nav: this.studentNav(), html: `
    <div class="page-head"><div><h1>${editable ? 'สถานะใบสมัคร' : 'ส่งใบสมัครเรียบร้อยแล้ว'}</h1><p class="sub"><span class="num">${s.code}</span> · ${TYPE[s.type]}</p></div>${badge(s)}</div>
    ${editable ? `<div class="note ${s.status === 'returned_to_student' ? 'warn' : 'info'} row between"><span>${s.status === 'returned_to_student'
      ? '<b>ครูเปิดสิทธิ์ให้แก้ไข:</b> ' + esc(s.return_reason || '') : 'ใบสมัครยังไม่ได้ส่ง กรอกต่อให้ครบแล้วกดส่ง'}</span>
      <button class="btn primary" data-go="student-form" data-step="${s.step || 1}">กรอกใบสมัครต่อ</button></div>`
      : `<div class="note info"><b>สถานะหลังส่ง:</b> เมื่อผู้สมัครกดส่งแล้ว ข้อมูลจะถูกล็อกไม่ให้แก้ไขเอง หากจำเป็นต้องแก้ไข ให้ครูผู้ดูแลทุนหรือเจ้าหน้าที่เป็นผู้เปิดสิทธิ์ให้แก้ไข</div>`}
    ${d && d.result !== 'ineligible' ? `<div class="note ${d.result === 'approved' ? 'ok' : 'warn'}"><b>ผลการพิจารณา: ${DECISION[d.result].label}</b>${d.result === 'approved' ? ` · จำนวนเงินทุน ${baht(d.approved_amount)}` : ''}</div>` : ''}
    ${d && d.result === 'ineligible' ? `<div class="note bad"><b>ไม่เข้าเกณฑ์การพิจารณาทุน</b>${d.reason ? ' — ' + esc(d.reason) : ''}</div>` : ''}
    <div class="split">
      <div class="stack">
        ${!editable && !bachelor && s.status === 'waiting_teacher' ? `<section class="card"><h3>ขั้นตอนต่อไป กรุณาติดต่อครูผู้ดูแลทุนของสถานศึกษา</h3>
          <p>เพื่อแจ้งว่ากรอกข้อมูลเรียบร้อยแล้ว และนำเอกสารประกอบการสมัครไปส่งให้ครู</p>
          <div class="subcard"><span class="label">เอกสารที่นักเรียนควรเตรียมส่งให้ครู</span><ul class="small" style="margin:0;padding-left:20px">${docs.map(x => `<li>${x[1]}</li>`).join('')}</ul></div></section>` : ''}
        ${bachelor && !editable ? `<section class="card"><div class="card-head"><h3>สำหรับระดับปริญญาตรี</h3><span class="sub">ประเภททุน: ${TYPE[s.type]}</span></div>
          <p class="small">นักศึกษาอัปโหลดเอกสารด้วยตนเอง เมื่อกรอกข้อมูลและแนบเอกสารครบแล้ว ใบสมัครจะถูกส่งมายังมูลนิธิฯ โดยตรง</p>
          <div>${docs.map(([code, name, multi]) => docRow(s, code, name, multi, s.status === 'waiting_staff' || s.status === 'need_more_info', 'student-file')).join('')}</div></section>` : ''}
        <section class="card"><div class="card-head"><h3>สรุปใบสมัคร</h3>
          <button class="btn sm no-print" data-action="print">${icon('print')} พิมพ์ / บันทึกเป็น PDF</button></div>
          <p class="small muted no-print">ใบสมัครสรุป 1 หน้า A4 รูปแบบเดียวกันทุกคน สำหรับพิมพ์หรือบันทึกเป็น PDF เก็บไว้เป็นหลักฐาน ไม่ต้องส่งฉบับพิมพ์ให้มูลนิธิฯ</p>
          ${applicationPaper.call(this, s)}</section>
      </div>
      <aside class="stack no-print">
        <section class="card"><h3>ขั้นตอน</h3>
          <ol class="timeline">${flow.map((x, i) => `<li class="${i < pos ? 'done' : i === pos ? 'now' : ''}">${x}${i === pos ? `<small>${STATUS[s.status].label}</small>` : ''}</li>`).join('')}</ol></section>
        ${!bachelor ? `<section class="card"><h3>ครูผู้ดูแลทุน</h3><p class="small muted">${esc(this.schoolName(s.school))}</p>
          ${t ? `<div><b>${esc(t.name)}</b><div class="small"><span class="num">${esc(t.phone)}</span> · ${esc(t.email)}</div></div>` : '<p class="small muted">ระบบจะแสดงชื่อจากฐานข้อมูลสถานศึกษา</p>'}</section>` : ''}
      </aside>
    </div>`};
};
App.on('print', function () { this.print(); });

function docRow(s, code, name, multi, active, action) {
  const files = (s.docFiles || {})[code] || [];
  return `<div class="doc-row"><div><div>${name}</div><div class="code">${s.code}_${code}.pdf${multi ? ' · แนบได้หลายไฟล์' : ''}</div></div>
    <div class="row">${files.length ? `<span class="badge t-ok">${files.length > 1 ? files.length + ' ไฟล์' : esc(files[0])}</span>` : ''}
      ${active ? `<label class="btn sm">${icon('upload')} ${files.length ? 'เปลี่ยนไฟล์' : 'แนบไฟล์'}<input type="file" hidden ${multi ? 'multiple' : ''} accept=".pdf,.jpg,.jpeg,.png"
        data-onchange="${action}" data-code="${s.code}" data-doc="${code}"></label>` : files.length ? '' : '<span class="small muted">ยังไม่แนบ</span>'}</div></div>`;
}
function storeFiles(app, el) {
  const s = app.studentByCode[el.dataset.code];
  const files = [...el.files];
  if (!files.length) return null;
  if (files.some(f => f.size > 10 * 1024 * 1024)) { app.toast('ไฟล์ใหญ่เกิน 10 MB กรุณาเลือกไฟล์ใหม่'); return null; }
  s.docFiles = s.docFiles || {};
  s.docFiles[el.dataset.doc] = files.length > 1 ? files.map((f, i) => `${s.code}_${el.dataset.doc}_${i + 1}${f.name.slice(f.name.lastIndexOf('.'))}`)
    : [`${s.code}_${el.dataset.doc}${files[0].name.slice(files[0].name.lastIndexOf('.'))}`];
  return s;
}
App.on('student-file', function (el) {
  if (!storeFiles(this, el)) return;
  this.save();
  this.toast('แนบไฟล์แล้ว ระบบตั้งชื่อไฟล์ให้อัตโนมัติ');
  this.go('student-status');
});

function applicationPaper(s) {
  const sc = this.schoolById[s.school] || {};
  const age = s.age_at_submit !== undefined && s.age_at_submit !== '' ? s.age_at_submit : ageAt(s.birth_date);
  const row = (k, v) => `<div class="sr"><b>${k}</b><div>${v}</div></div>`;
  return `<div class="paper" id="paper">
    <h3>ใบสมัครขอรับทุนการศึกษา</h3><div class="c">มูลนิธิทิสโก้ เพื่อการกุศล | ปีการศึกษา ${this.db.cycle.year}</div>
    ${row('รหัสผู้สมัคร', s.code)}${row('ประเภททุน', TYPE[s.type])}${row('ชื่อ–นามสกุล', esc(fullName(s)))}
    ${row('เลขประจำตัวประชาชน', esc(s.citizen_id))}${row('วันเกิด / อายุ', `${beDate(s.birth_date)} / ${age} ปี`)}${row('หมายเลขโทรศัพท์', esc(s.phone))}
    ${row('สถานศึกษาปัจจุบัน', `${esc(sc.name || '-')} | ${esc(sc.district || '')} จังหวัด${esc(sc.province || '')}`)}
    ${row('ระดับชั้น', `${esc(s.class || '-')} → ปีถัดไป ${esc(s.next_class || '-')}`)}
    ${row('ปีถัดไป', s.school_next === 'same' ? 'เรียนต่อสถานศึกษาเดิม' : s.school_next === 'transfer' ? 'ย้ายสถานศึกษา' : '-')}
    ${row('ที่อยู่ตามภูมิลำเนา', esc(s.home_address || '-'))}${row('ที่อยู่ปัจจุบัน', esc(s.current_address || '-'))}
    ${s.submitted_at ? row('วันที่ส่งใบสมัคร', thDate(s.submitted_at, true)) : ''}
    <div class="foot">เอกสารฉบับนี้จัดทำจากข้อมูลที่ผู้สมัครกรอกในระบบ เพื่อเก็บไว้เป็นหลักฐาน</div></div>`;
}
