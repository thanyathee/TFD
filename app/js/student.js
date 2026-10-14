/* บทบาทนักเรียน (ตาม v28): ตรวจสอบสิทธิ์ → ข้อมูลผู้ขอทุนและการศึกษา → ครอบครัว → ข้อมูลเพิ่มเติมและเขียนเล่า → ส่งเรียบร้อย
   คำถามและตัวเลือกยึดตามแบบฟอร์มกระดาษของมูลนิธิฯ (ทุนใหม่ / ทุนต่อเนื่อง ฉบับแก้ไข 10/09/2569) */
'use strict';


/* ---------- ตัวเลือกตามแบบฟอร์มกระดาษ (ทุนใหม่ 4 หน้า / ทุนต่อเนื่อง 2 หน้า ฉบับแก้ไข 10/09/2569) ---------- */
const STORY_Q = [
  ['ครอบครัวและอาชีพของผู้ปกครอง', 'พ่อและแม่ของนักเรียนมีสถานะอย่างไร (เช่น อยู่ด้วยกัน แยกกันอยู่ หรือมีผู้ปกครองคนอื่นดูแล) พ่อและแม่ทำงานอะไร มีรายได้ประมาณเท่าใดต่อเดือน ปัจจุบันนักเรียนอาศัยอยู่กับใครบ้าง และสมาชิกแต่ละคนในบ้านทำอาชีพอะไร มีรายได้โดยประมาณเท่าใดต่อเดือน'],
  ['พี่น้องในครอบครัว', 'จำนวนพี่น้อง เด็ก หรือญาติที่อาศัยอยู่บ้านเดียวกัน และใครเป็นผู้ออกเงินเลี้ยงดู'],
  ['การเดินทางและค่าใช้จ่ายมาโรงเรียน', 'นักเรียนเดินทางมาโรงเรียนด้วยวิธีใด (เช่น เดิน จักรยาน รถจักรยานยนต์ รถโดยสาร ฯลฯ) ใช้เวลาเดินทางประมาณเท่าใด มีค่าใช้จ่ายในการเดินทางเท่าใดต่อวันหรือต่อเดือน และได้รับเงินไปโรงเรียนวันละเท่าใด'],
  ['ลักษณะบ้านและที่อยู่อาศัย', 'บ้านหรือที่พักอาศัยเป็นของใคร มีลักษณะอย่างไร และมีส่วนใดที่ชำรุดหรือจำเป็นต้องซ่อมแซมหรือไม่'],
  ['ค่าใช้จ่ายของครอบครัว / ภาระหนี้สินของครอบครัว', 'ครอบครัวของนักเรียนมีค่าใช้จ่ายเกี่ยวกับเรื่องใดบ้าง จำนวนเท่าใด เช่น ค่าเช่าบ้าน ค่าน้ำ ค่าไฟ ค่ากินอยู่ หรือค่าใช้จ่ายในการดูแลสุขภาพของคนในครอบครัว หากมีการยืมหรือกู้เงินมาใช้จ่ายสำหรับชีวิตประจำวัน โปรดระบุเพิ่มเติมด้วย'],
  ['เรื่องอื่น ๆ ที่อยากบอกเล่าให้มูลนิธิฯ ทราบ', ''],
];
const STEPS = ['ข้อมูลผู้ขอทุนและการศึกษา', 'ข้อมูลครอบครัว', 'ข้อมูลเพิ่มเติมและเขียนเล่าประวัติ', 'ส่งใบสมัครเรียบร้อย'];
const STUDY_MODES_PAPER = [['regular', 'ภาคปกติ'], ['special', 'ภาคพิเศษ (เรียนวันเสาร์–อาทิตย์ หรือภาคค่ำ)'],
  ['dual', 'ทวิภาคี (เรียนวันธรรมดาและมีการฝึกงานตามหลักสูตร)'], ['other', 'อื่น ๆ (ระบุ)']];

/* อาชีพ: ตอบได้มากกว่า 1 ข้อ — หมวดตามกระดาษ แล้วถามรายละเอียดเฉพาะหมวด */
const OCC_CATS = [['hire', 'รับจ้าง'], ['gov', 'รับราชการ'], ['trade', 'ค้าขาย'], ['farm', 'ทำนา / ทำไร่ / ทำสวน'], ['other', 'อาชีพอื่น ๆ']];
const HIRE_KINDS = ['รับจ้างทั่วไป (งานรายวัน / งานจร)', 'พนักงานโรงงาน', 'ลูกจ้างร้านค้า / บริษัท / หน่วยงาน', 'ก่อสร้าง / ช่าง',
  'ขับรถรับจ้าง / ขนส่ง', 'แม่บ้าน / ทำความสะอาด', 'รับจ้างภาคเกษตร (ตัดอ้อย กรีดยาง เก็บผลไม้ ฯลฯ)', 'อื่น ๆ'];
const SELL_WHERE = ['ตลาด / แผงลอย', 'หน้าบ้าน / ร้านของตนเอง', 'เร่ขาย / รถเข็น', 'ขายออนไลน์', 'อื่น ๆ'];
const FARM_KINDS = [['rice', 'ทำนา'], ['field', 'ทำไร่'], ['orchard', 'ทำสวน']];
const FARM_LAND = ['ที่ดินของตนเอง', 'เช่าที่ดินผู้อื่น', 'รับจ้างทำในที่ดินผู้อื่น'];
const PAY = [['daily', 'รายวัน'], ['monthly', 'รายเดือน (เงินเดือน)'], ['yearly', 'รายปี / ตามฤดูกาล'], ['irregular', 'ไม่แน่นอน']];
const WEEKS_PER_MONTH = 4.33;
/* แปลงรายได้ของแต่ละอาชีพเป็นต่อเดือน */
function occMonthly(o) {
  const n = k => Number(o[k]) || 0;
  if (o.pay === 'daily') return Math.round(n('wage') * n('days') * (o.per === 'week' ? WEEKS_PER_MONTH : 1));
  if (o.pay === 'yearly') return Math.round(n('amount') / 12);
  if (o.pay === 'monthly' || o.pay === 'irregular') return Math.round(n('amount'));
  return 0;
}
function personMonthly(p) { return p && p.status !== 'dead' && !p.no_occ ? (p.occs || []).reduce((a, o) => a + occMonthly(o), 0) : 0; }
function occText(o) {
  const cat = (OCC_CATS.find(c => c[0] === o.cat) || [, ''])[1];
  const d = o.cat === 'hire' ? `${o.hire_kind || ''}${o.detail ? ': ' + o.detail : ''}${o.position ? ' · ตำแหน่ง ' + o.position : ''}`
    : o.cat === 'gov' ? `ตำแหน่ง ${o.position || '-'}${o.agency ? ' · ' + o.agency : ''}`
    : o.cat === 'trade' ? `ขาย ${o.goods || '-'}${o.sell_where ? ' · ' + o.sell_where : ''}`
    : o.cat === 'farm' ? `${(o.farm_kinds || []).map(k => (FARM_KINDS.find(f => f[0] === k) || [, k])[1]).join(' / ')} ปลูก ${o.crops || '-'}${o.farm_land ? ' · ' + o.farm_land : ''}`
    : o.detail || '';
  const pay = o.pay === 'daily' ? `วันละ ${baht(o.wage)} × ${o.days || 0} วัน/${o.per === 'week' ? 'สัปดาห์' : 'เดือน'}`
    : o.pay === 'monthly' ? `เดือนละ ${baht(o.amount)}` : o.pay === 'yearly' ? `ปีละ ${baht(o.amount)}` : o.pay === 'irregular' ? `ไม่แน่นอน เฉลี่ย ${baht(o.amount)}/เดือน` : '';
  return `${cat} — ${d}${pay ? ` (${pay} ≈ ${baht(occMonthly(o))}/เดือน)` : ''}`;
}
const LIVE_WITH = [['father', 'บิดา'], ['mother', 'มารดา'], ['both', 'บิดา-มารดา'], ['guardian', 'ญาติ / ผู้อุปการะ']];
const HOUSING_P = [['own', 'บ้านและที่ดินเป็นของครอบครัว ไม่เสียค่าใช้จ่าย'], ['own_other_land', 'บ้านเป็นของครอบครัว แต่ที่ดินเป็นของผู้อื่น'],
  ['installment', 'บ้านของครอบครัว กำลังผ่อนชำระ'], ['rent', 'บ้านเช่า / ห้องเช่า / หอพัก'], ['other', 'อื่น ๆ (เช่น บ้านญาติ / บ้านพักสวัสดิการ / วัด / สถานสงเคราะห์)']];
const EQUIP = [['washer', 'เครื่องซักผ้า'], ['aircon', 'แอร์'], ['computer', 'คอมพิวเตอร์ / โน้ตบุ๊ก'], ['car', 'รถยนต์ (ไม่รวมรถกระบะ)'],
  ['pickup', 'รถกระบะ'], ['tractor', 'รถแทรกเตอร์'], ['etan', 'รถอีแต๋น'], ['other', 'อื่น ๆ']];
const LAND_UNITS = [['wa', 'ตารางวา'], ['rai', 'ไร่']];
const RELATIONS = [['together', 'บิดามารดาอยู่ด้วยกัน'], ['away_work', 'บิดา/มารดาไม่ได้อยู่ด้วยกัน เนื่องจากทำงานต่างจังหวัด/ต่างประเทศ'],
  ['divorced', 'หย่าร้างกัน'], ['father_new', 'บิดามีภรรยาใหม่'], ['mother_new', 'มารดามีสามีใหม่'], ['father_lost', 'บิดาขาดการติดต่อ'],
  ['mother_lost', 'มารดาขาดการติดต่อ'], ['father_prison', 'บิดาถูกจำคุก'], ['mother_prison', 'มารดาถูกจำคุก'], ['father_monk', 'บิดาบวช'],
  ['mother_monk', 'มารดาบวช'], ['father_dead', 'บิดาถึงแก่กรรม'], ['mother_dead', 'มารดาถึงแก่กรรม']];
const relLabel = k => (RELATIONS.find(r => r[0] === k) || [, k])[1];
const PERSON_LABEL = {father: 'บิดา', mother: 'มารดา', guardian: 'ญาติ / ผู้อุปการะ'};
const needsGoal = s => s.class === 'ม.6' || ['voc', 'highvoc'].includes(s.group);
const storiesRequired = s => s.class !== 'ป.5';   // ป.5 ไม่ต้องเขียนเล่า มูลนิธิฯ พิจารณาจากความคิดเห็นของครูแทน

/* ---------- หน้า 2–4: กรอกใบสมัคร ---------- */
App.views['student-form'] = function (p) {
  const s = this.me();
  const step = Number(p.step) || 1;
  const e = p.errors || {};
  const fns = [null, stepStudent, stepFamily, stepMore];
  let start = 0;
  for (let i = 1; i < step; i++) start += numberSections(fns[i].call(this, s, {}), 0).count;
  const body = numberSections(fns[step].call(this, s, e), start).html;
  return {nav: this.studentNav(), html: `
    <div class="page-head"><div><h1>${STEPS[step - 1]}</h1><p class="sub"><span class="num">${s.code}</span> · แบบฟอร์มการขอรับทุนเพื่อการศึกษา-${TYPE[s.type]} · ขั้นตอน ${step} จาก 3</p></div></div>
    <ol class="stepper" style="--n:4">${STEPS.map((t, i) => `<li class="${i + 1 < step ? 'done' : i + 1 === step ? 'now' : ''}"><span>${i + 1}. ${t}</span></li>`).join('')}</ol>
    ${s.status === 'returned_to_student' && s.return_reason ? `<div class="note warn"><b>เปิดสิทธิ์ให้แก้ไข:</b> ${esc(s.return_reason)}</div>` : ''}
    ${errNote(e)}
    <form class="stack" data-submit="student-step" data-step="${step}" data-when-form novalidate>
      ${body}
      <div class="row between no-print">
        ${step > 1 ? `<button class="btn" type="button" data-action="student-back" data-step="${step}">ย้อนกลับ</button>` : '<span></span>'}
        <button class="btn primary" type="submit" id="next-btn">${step < 3 ? 'ถัดไป' : 'ส่งใบสมัคร'}</button>
      </div>
    </form>`, after() { const f = document.querySelector('form'); applyWhen(f); recalcIncome(); focusFirstError(); }};
};

/* ใส่เลขข้อให้หัวข้อทุกการ์ด ต่อเนื่องกันทุกขั้นตอน (คำถามย่อยใช้ § แทนเลขข้อ เช่น §.1 → 12.1) */
function numberSections(html, start) {
  let n = start;
  const parts = html.split('<section class="card">');
  const out = parts.map((c, i) => {
    if (!i || !c.includes('<h3>')) return c;
    n++;
    return c.replace('<h3>', `<h3><span class="qno">${n}.</span> `).replace(/§\./g, `${n}.`);
  });
  return {html: out.join('<section class="card">'), count: n - start};
}
function stepStudent(s, e) {
  const sc = this.schoolById[s.school];
  const area = sc ? {region: sc.region, province: sc.province, district: sc.district, school: sc.id} : {};
  const age = ageAt(s.birth_date);
  const y = this.db.cycle.year;
  return `
  <section class="card"><h3>ข้อมูลผู้ขอทุน</h3>
    <div class="grid-3">
      ${field('title', 'คำนำหน้าชื่อ', select('title', ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว'], s.title, 'กรุณาเลือก'), {req: 1, err: e.title})}
      ${field('first_name', 'ชื่อ', input('first_name', s.first_name, 'placeholder="กรอกชื่อให้ตรงกับบัตรประจำตัวประชาชน"'), {req: 1, err: e.first_name})}
      ${field('last_name', 'นามสกุล', input('last_name', s.last_name, 'placeholder="กรอกนามสกุลให้ตรงกับบัตรประจำตัวประชาชน"'), {req: 1, err: e.last_name})}
    </div>
    <div class="note warn small"><b>กรุณาตรวจสอบชื่อ–นามสกุลให้ตรงกับบัตรประจำตัวประชาชน</b> หากข้อมูลไม่ถูกต้อง มีผลต่อการรับทุน และอาจต้องสละสิทธิ์การได้รับทุน</div>
    <div class="grid-3">
      ${field('gender', 'เพศ', select('gender', ['ชาย', 'หญิง'], s.gender, 'กรุณาเลือก'), {req: 1, err: e.gender})}
      ${field('cid_ro', 'เลขประจำตัวประชาชน', input('cid_ro', s.citizen_id, 'readonly'))}
      ${field('birth_ro', 'วัน-เดือน-ปีเกิด / อายุ', input('birth_ro', `${beDate(s.birth_date)}${age === '' ? '' : ` / ${age} ปี`}`, 'readonly'), {hint: 'ระบบจะคำนวณอายุอีกครั้ง ณ วันที่ส่งใบสมัคร'})}
      ${field('phone_ro', 'หมายเลขโทรศัพท์ที่ติดต่อได้', input('phone_ro', s.phone, 'readonly'), {hint: 'ดึงจากหน้าแรก และไม่ให้แก้ไขในหน้านี้'})}
      ${field('email', 'E-mail', input('email', s.email, 'type="email" inputmode="email" placeholder="ถ้ามี"'), {err: e.email})}
    </div>
  </section>
  <section class="card"><h3>ที่อยู่</h3>
    ${field('home_address', 'ที่อยู่ตามภูมิลำเนา', textarea('home_address', s.home_address, 'rows="2" placeholder="บ้านเลขที่ หมู่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์" data-oninput="student-copy-address"'), {req: 1, err: e.home_address})}
    <div class="field ${e.current_address ? 'invalid' : ''}">
      <div class="row between"><label class="label" for="current_address">ที่อยู่ปัจจุบัน <span class="req">*</span></label>
        <label class="check small"><input type="checkbox" name="same_address" ${s.same_address ? 'checked' : ''} data-onchange="student-copy-address"> <span>เหมือนกับที่อยู่ตามภูมิลำเนา</span></label></div>
      ${textarea('current_address', s.current_address, `rows="2" placeholder="ที่อยู่ที่พักอาศัยอยู่จริงในปัจจุบัน เช่น หอพัก บ้านญาติ หรือบ้านเช่า" ${s.same_address ? 'readonly' : ''}`)}
      ${e.current_address ? `<div class="err">${esc(e.current_address)}</div>` : ''}</div>
  </section>
  <section class="card"><div class="card-head"><h3>สถานศึกษาปัจจุบัน</h3><span class="sub">เลือกภาค → จังหวัด → อำเภอ / เขต → ชื่อสถานศึกษา</span></div>
    <div class="grid-2" data-area='${JSON.stringify({school: true, required: true})}'>${this.areaPicker('st', area, {school: true, required: true,
      err: e.school ? {region: area.region ? '' : 'กรุณาเลือกภาค', province: area.province ? '' : 'กรุณาเลือกจังหวัด', district: area.district ? '' : 'กรุณาเลือกอำเภอ / เขต', school: e.school} : {}})}</div>
  </section>
  <section class="card"><h3>ระดับชั้นเรียน</h3>
    <div id="class_box" class="stack">${classFields.call(this, s, e)}</div>
  </section>
  <section class="card"><h3>ในปีการศึกษาหน้า (${y})</h3>
    <div id="next_box" class="stack">${nextFields.call(this, s, e)}</div>
    ${radioField('school_next', 'สถานศึกษาในปีการศึกษาหน้า', [['same', 'ศึกษาต่อสถานศึกษาเดิม'], ['transfer', 'ย้ายสถานศึกษาใหม่']], s.school_next, {req: 1, err: e.school_next})}
    <div class="stack" data-when="school_next=transfer">
      <div class="note bad"><b>⚠ ต้องส่งหลักฐานยืนยันการย้ายสถานศึกษาให้มูลนิธิฯ ทุกกรณี</b><br>
        ระดับ ป.6 และ ม.3 ที่ส่งภายใน <b>${thDate(this.db.cycle.first_cutoff)}</b> จะได้รับการพิจารณาใน<b>รอบแรก</b><br>
        ทุกระดับชั้นส่งได้ถึง <b>${thDate(this.db.cycle.transfer_close)}</b> และจะได้รับการพิจารณาใน<b>รอบที่ 2</b> (รอบรอฟังผล)<br>
        <b>หากไม่ส่งภายใน ${thDate(this.db.cycle.transfer_close)} ถือว่าสละสิทธิ์การรับทุน</b> (ตามระเบียบการขอรับทุนเพื่อการศึกษา ข้อ 7 กรณีมีการเปลี่ยนสถานศึกษาของผู้ขอทุน)</div>
      ${field('next_school_text', 'ไปศึกษาต่อที่', input('next_school_text', s.next_school_text, 'placeholder="ชื่อสถานศึกษาใหม่ (ถ้ายังไม่ทราบ ให้เว้นว่างไว้)"'))}
      <label class="check ${e.transfer_ack ? 'invalid' : ''}"><input type="checkbox" name="transfer_ack" ${s.transfer_ack ? 'checked' : ''}> <span>ข้าพเจ้ารับทราบว่าต้องส่งหลักฐานยืนยันการย้ายสถานศึกษาให้มูลนิธิฯ ภายในกำหนด มิฉะนั้นถือว่าสละสิทธิ์ <span class="req">*</span></span></label>
      ${e.transfer_ack ? `<div class="err">${e.transfer_ack}</div>` : ''}
    </div>
  </section>
  ${s.type === 'CONT' ? `<section class="card"><h3>ประวัติการได้รับทุนมูลนิธิฯ</h3><div class="grid-2">
    ${field('cont_since', 'ได้รับทุนมูลนิธิฯ ครั้งแรกตอนเรียนชั้น', select('cont_since', Object.values(CLASS_GROUPS).flat(), s.cont_since, 'เลือกระดับชั้น'), {req: 1, err: e.cont_since})}
    ${field('cont_years', 'รวม (ปี)', input('cont_years', s.cont_years, 'type="number" min="1" inputmode="numeric"'), {req: 1, err: e.cont_years})}</div></section>` : ''}`;
}
/* ช่วงชั้น → ระดับชั้นปัจจุบัน → คณะ/สาขา, หลักสูตรกี่ปี, รูปแบบการเรียน (ปวช. / ปวส. / ปริญญาตรี) */
function classFields(v, e = {}) {
  const g = v.group || groupOfClass(v.class);
  const classes = CLASS_GROUPS[g] || [];
  const higher = ['voc', 'highvoc', 'bachelor'].includes(g);
  return `<div class="grid-2">
      ${field('group', 'ช่วงชั้นที่กำลังศึกษา', select('group', EDU_GROUPS, g, 'กรุณาเลือกช่วงชั้น', 'data-onchange="student-class"'), {req: 1, err: e.group, hint: 'เลือกช่วงชั้นก่อน เพื่อลดความผิดพลาดในการเลือกระดับชั้น'})}
      ${field('class', 'กำลังศึกษาอยู่ระดับชั้น', select('class', classes, v.class, g ? 'กรุณาเลือกระดับชั้น' : 'กรุณาเลือกช่วงชั้นก่อน', `data-onchange="student-class" ${g ? '' : 'disabled'}`), {req: 1, err: e.class})}
    </div>
    ${higher ? `<div class="grid-2">
      ${field('faculty', 'คณะ / สาขา', input('faculty', v.faculty, 'placeholder="เช่น ช่างยนต์ / การบัญชี / พยาบาลศาสตร์"'), {req: 1, err: e.faculty})}
      ${field('program_years', 'หลักสูตร (ปี)', select('program_years', ['2', '3', '4', '5', '6'], v.program_years, 'กรุณาเลือก'), {req: 1, err: e.program_years, hint: 'เฉพาะผู้ขอรับทุนที่กำลังศึกษาอยู่ในระดับ ปวช., ปวส. หรือปริญญาตรี'})}
    </div>
    ${g === 'highvoc' ? radioField('pvs_type', 'เรียน ปวส. ประเภทวิชาอุตสาหกรรมหรือไม่', PVS_TYPES, v.pvs_type, {req: 1, err: e.pvs_type, hint: 'เช่น ช่างยนต์ ช่างไฟฟ้า อิเล็กทรอนิกส์ ช่างกลโรงงาน ก่อสร้าง · สายบัญชี การตลาด ท่องเที่ยว คหกรรม ฯลฯ ให้เลือก “ไม่ใช่”'}) : ''}
    ${radioField('study_mode', 'รูปแบบการเรียน', STUDY_MODES_PAPER, v.study_mode, {req: 1, err: e.study_mode, col: 1})}
    <div data-when="study_mode=other">${field('study_mode_other', 'ระบุรูปแบบการเรียน', input('study_mode_other', v.study_mode_other), {err: e.study_mode_other})}</div>` : ''}`;
}
/* ระดับชั้นปีหน้า: ระบบเลือกให้เมื่อมีทางเดียว ส่วน ม.3 / ม.6 / ปวช.3 / ปวส.2 ให้เลือก */
function nextFields(v, e = {}) {
  const nexts = nextOptions(v.class);
  const next = NEXT_BRANCH[v.class] ? (nexts.includes(v.next_class) ? v.next_class : '') : (nexts[0] || '');
  const nextHigher = /^(ปวช|ปวส|ปริญญาตรี)/.test(next);
  return `<div class="grid-2">
      ${field('next_class', 'ผู้ขอทุนจะศึกษาต่อในระดับชั้น', select('next_class', nexts, next, v.class ? (NEXT_BRANCH[v.class] ? 'กรุณาเลือกระดับชั้นปีหน้า' : 'กรุณาเลือก') : 'กรุณาเลือกระดับชั้นปัจจุบันก่อน', 'data-onchange="student-next"'),
        {req: 1, err: e.next_class, hint: 'ระบบคำนวณให้ในกรณีทั่วไป ส่วน ม.3 / ม.6 / ปวช.3 / ปวส.2 ให้เลือกเอง'})}
      ${nextHigher ? field('next_faculty', 'คณะ / สาขา (ปีหน้า)', input('next_faculty', v.next_faculty, 'placeholder="ถ้าทราบแล้ว"')) : ''}
    </div>
    ${/^ปวส/.test(next) && v.group !== 'highvoc' ? radioField('next_pvs_type', 'ปวส. ที่จะเรียนเป็นประเภทวิชาอุตสาหกรรมหรือไม่', PVS_TYPES, v.next_pvs_type, {req: 1, err: e.next_pvs_type, hint: 'เช่น ช่างยนต์ ช่างไฟฟ้า อิเล็กทรอนิกส์ ช่างกลโรงงาน ก่อสร้าง · สายบัญชี การตลาด ท่องเที่ยว คหกรรม ฯลฯ ให้เลือก “ไม่ใช่”', attrs: 'data-onchange="student-next"'}) : ''}
`;
}
App.on('student-class', function (el) {
  const val = id => ((document.querySelector(`[name="${id}"]:checked`) || document.getElementById(id) || {}).value || '');
  const mode = (document.querySelector('[name=study_mode]:checked') || {}).value || '';
  const v = {group: val('group'), class: val('class'), faculty: val('faculty'), program_years: val('program_years'), pvs_type: val('pvs_type'),
    study_mode: mode, study_mode_other: val('study_mode_other'), next_class: val('next_class'), next_faculty: val('next_faculty'), next_pvs_type: val('next_pvs_type')};
  if (el.name === 'group') Object.assign(v, {class: '', faculty: '', program_years: '', pvs_type: '', study_mode: '', next_class: ''});
  if (el.name === 'class') v.next_class = '';
  document.getElementById('class_box').innerHTML = classFields.call(this, v);
  document.getElementById('next_box').innerHTML = nextFields.call(this, v);
  applyWhen(document.querySelector('form'));
  const nextId = {group: 'class', class: 'next_class'}[el.name];
  const nx = nextId && document.getElementById(nextId);
  if (nx && !nx.disabled) nx.focus();
});
App.on('student-next', function () {
  const val = id => ((document.querySelector(`[name="${id}"]:checked`) || document.getElementById(id) || {}).value || '');
  const v = {group: val('group'), class: val('class'), pvs_type: val('pvs_type'), next_class: val('next_class'), next_faculty: val('next_faculty'), next_pvs_type: val('next_pvs_type')};
  document.getElementById('next_box').innerHTML = nextFields.call(this, v);
});
App.on('student-copy-address', function () {
  const same = document.querySelector('[name=same_address]').checked;
  const cur = document.getElementById('current_address');
  if (same) cur.value = document.getElementById('home_address').value;
  cur.readOnly = same;
});

/* ---------- ข้อมูลครอบครัว ---------- */
function occCard(k, i, o = {}, e = {}) {
  const er = x => ({req: 1, err: e[`${k}_occ${i}_${x}`]});
  const n = x => `${k}_occ${i}_${x}`;
  const kinds = o.farm_kinds || [];
  return `<div class="subcard" data-occ="${k}:${i}">
    <div class="row between"><b>อาชีพที่ ${i + 1}</b><button class="btn ghost sm" type="button" data-action="occ-remove" data-person="${k}" data-i="${i}">ลบ</button></div>
    ${field(n('cat'), 'หมวดอาชีพ', select(n('cat'), OCC_CATS, o.cat, 'กรุณาเลือก'), er('cat'))}
    <div class="stack" data-when="${n('cat')}=hire">
      ${field(n('hire_kind'), 'ลักษณะงานรับจ้าง', select(n('hire_kind'), HIRE_KINDS, o.hire_kind, 'กรุณาเลือก'))}
      <div class="grid-2">${field(n('detail_h'), 'งานที่ทำโดยละเอียด', input(n('detail_h'), o.cat === 'hire' ? o.detail : '', 'placeholder="เช่น ทาสีบ้าน ตัดหญ้า ประกอบชิ้นส่วนอิเล็กทรอนิกส์"'), er('detail_h'))}
        ${field(n('position_h'), 'ตำแหน่ง / แผนก', input(n('position_h'), o.cat === 'hire' ? o.position : '', 'placeholder="เช่น พนักงานฝ่ายผลิต หัวหน้าไลน์ ไม่มีตำแหน่ง"'))}</div>
    </div>
    <div class="grid-2" data-when="${n('cat')}=gov">
      ${field(n('position_g'), 'ตำแหน่ง', input(n('position_g'), o.cat === 'gov' ? o.position : '', 'placeholder="เช่น ครู พยาบาล เจ้าหน้าที่ธุรการ"'), er('position_g'))}
      ${field(n('agency'), 'หน่วยงาน', input(n('agency'), o.agency))}
    </div>
    <div class="grid-2" data-when="${n('cat')}=trade">
      ${field(n('goods'), 'สินค้าที่ขาย', input(n('goods'), o.goods, 'placeholder="เช่น ข้าวแกง ผักสด เสื้อผ้ามือสอง"'), er('goods'))}
      ${field(n('sell_where'), 'ขายที่ไหน', select(n('sell_where'), SELL_WHERE, o.sell_where, 'กรุณาเลือก'))}
    </div>
    <div class="stack" data-when="${n('cat')}=farm">
      <div class="choices">${FARM_KINDS.map(([fk, t]) => `<label class="choice"><input type="checkbox" name="${n('farm_kinds')}" value="${fk}" ${kinds.includes(fk) ? 'checked' : ''}> ${t}</label>`).join('')}</div>
      <div class="grid-2">${field(n('crops'), 'ปลูกอะไร / เลี้ยงอะไร (ระบุ)', input(n('crops'), o.crops, 'placeholder="เช่น ข้าวเหนียว มันสำปะหลัง อ้อย สวนยาง ลำไย"'), er('crops'))}
        ${field(n('farm_land'), 'ที่ดินที่ทำ', select(n('farm_land'), FARM_LAND, o.farm_land, 'กรุณาเลือก'))}</div>
    </div>
    <div data-when="${n('cat')}=other">${field(n('detail_o'), 'ระบุอาชีพ', input(n('detail_o'), o.cat === 'other' ? o.detail : '', 'placeholder="เช่น ขับวินมอเตอร์ไซค์ ทำขนมขาย ช่างตัดผม"'), er('detail_o'))}</div>
    <div class="stack" data-when="${n('cat')}=hire|gov|trade|farm|other">
      ${field(n('pay'), 'ลักษณะรายได้', select(n('pay'), PAY, o.pay, 'กรุณาเลือก'), er('pay'))}
      <div class="grid-3" data-when="${n('pay')}=daily">
        ${field(n('wage'), 'ค่าจ้างวันละ (บาท)', input(n('wage'), o.wage, 'type="number" min="0" inputmode="numeric" placeholder="เช่น 300"'), er('wage'))}
        ${field(n('days'), 'ทำงานกี่วัน', input(n('days'), o.days, 'type="number" min="0" max="31" inputmode="numeric" placeholder="เช่น 2"'), er('days'))}
        ${field(n('per'), 'ต่อ', select(n('per'), [['week', 'สัปดาห์'], ['month', 'เดือน']], o.per || 'week'))}
      </div>
      <div data-when="${n('pay')}=monthly">${field(n('amount_m'), 'เงินเดือน (บาท / เดือน)', input(n('amount_m'), o.pay === 'monthly' ? o.amount : '', 'type="number" min="0" inputmode="numeric"'), er('amount_m'))}</div>
      <div data-when="${n('pay')}=yearly">${field(n('amount_y'), 'รายได้ต่อปี / ต่อฤดูกาล (บาท)', input(n('amount_y'), o.pay === 'yearly' ? o.amount : '', 'type="number" min="0" inputmode="numeric" placeholder="เช่น ขายข้าวได้ปีละ 40000"'), er('amount_y'))}</div>
      <div data-when="${n('pay')}=irregular">${field(n('amount_i'), 'รายได้เฉลี่ยประมาณ (บาท / เดือน)', input(n('amount_i'), o.pay === 'irregular' ? o.amount : '', 'type="number" min="0" inputmode="numeric"'), er('amount_i'))}</div>
      <div class="hint" data-occ-sum="${k}:${i}"></div>
    </div>
  </div>`;
}
function personBlock(k, p = {}, e = {}) {
  p = p || {};
  const occs = p.occs && p.occs.length ? p.occs : [{}];
  const parent = k !== 'guardian';
  return `<div class="stack" data-person="${k}">
    ${parent ? `<div class="grid-3">
      ${field(`${k}_name`, `ชื่อ–สกุล${PERSON_LABEL[k]}`, input(`${k}_name`, p.name), {req: 1, err: e[k + '_name'], hint: 'กรอกทุกกรณี แม้ถึงแก่กรรมหรือขาดการติดต่อ'})}
      ${field(`${k}_age`, 'อายุ (ปี)', input(`${k}_age`, p.age, 'type="number" min="0" inputmode="numeric"'))}
      ${radioField(`${k}_status`, 'สถานะ', [['alive', 'ยังมีชีวิตอยู่'], ['dead', 'ถึงแก่กรรม']], p.status, {req: 1, err: e[k + '_status']})}
    </div>` : `<div class="grid-3">
      ${field('guardian_relation', 'มีความสัมพันธ์เป็น', input('guardian_relation', p.relation, 'placeholder="เช่น ยาย ป้า น้า พี่"'), {req: 1, err: e.guardian_relation})}
      ${field('guardian_name', 'ชื่อ–สกุล', input('guardian_name', p.name))}
      ${field('guardian_age', 'อายุ (ปี)', input('guardian_age', p.age, 'type="number" min="0" inputmode="numeric"'))}
    </div>`}
    <div class="stack" ${parent ? `data-when="${k}_status=alive|"` : ''}>
      <div class="row between"><span class="label">อาชีพ <span class="muted">(ตอบได้มากกว่า 1 อาชีพ)</span></span>
        <label class="check small"><input type="checkbox" name="${k}_no_occ" ${p.no_occ ? 'checked' : ''}> <span>ไม่มีอาชีพ / ไม่มีรายได้ / ไม่ทราบ</span></label></div>
      <div class="stack" data-when="!${k}_no_occ=on">
        <div class="stack" id="${k}_occs">${occs.map((o, i) => occCard(k, i, o, e)).join('')}</div>
        <button class="btn add" type="button" data-action="occ-add" data-person="${k}">+ เพิ่มอาชีพ</button>
        ${e[k + '_occ'] ? `<div class="err">${e[k + '_occ']}</div>` : ''}
        <div class="grid-2">
          ${field(`${k}_workplace`, 'สถานที่ทำงาน', input(`${k}_workplace`, p.workplace, 'placeholder="เช่น โรงงานในนิคมฯ บ้านตนเอง ตลาดสด"'))}
          ${field(`${k}_work_province`, 'จังหวัด', select(`${k}_work_province`, App.data.geo.provinces.map(x => x.th).sort((a, b) => a.localeCompare(b, 'th')), p.work_province, 'กรุณาเลือก'))}
        </div>
        <div class="note info small" data-person-sum="${k}"></div>
      </div>
    </div>
  </div>`;
}
function readOccs(v, k) {
  const out = [];
  for (let i = 0; i < 20; i++) {
    const g = x => v[`${k}_occ${i}_${x}`];
    if (g('cat') === undefined) continue;
    const cat = g('cat') || '';
    const pay = g('pay') || '';
    out.push({cat, hire_kind: cat === 'hire' ? g('hire_kind') || '' : '', detail: cat === 'hire' ? g('detail_h') || '' : cat === 'other' ? g('detail_o') || '' : '',
      position: cat === 'hire' ? g('position_h') || '' : cat === 'gov' ? g('position_g') || '' : '', agency: cat === 'gov' ? g('agency') || '' : '',
      goods: cat === 'trade' ? g('goods') || '' : '', sell_where: cat === 'trade' ? g('sell_where') || '' : '',
      farm_kinds: cat === 'farm' ? arr(g('farm_kinds')) : [], crops: cat === 'farm' ? g('crops') || '' : '', farm_land: cat === 'farm' ? g('farm_land') || '' : '',
      pay, wage: pay === 'daily' ? g('wage') || '' : '', days: pay === 'daily' ? g('days') || '' : '', per: pay === 'daily' ? g('per') || 'week' : '',
      amount: pay === 'monthly' ? g('amount_m') || '' : pay === 'yearly' ? g('amount_y') || '' : pay === 'irregular' ? g('amount_i') || '' : ''});
  }
  return out;
}
function readPerson(v, k) {
  const p = {occs: readOccs(v, k), no_occ: !!v[`${k}_no_occ`], workplace: v[`${k}_workplace`] || '', work_province: v[`${k}_work_province`] || ''};
  if (k === 'guardian') Object.assign(p, {relation: v.guardian_relation || '', name: v.guardian_name || '', age: v.guardian_age || ''});
  else Object.assign(p, {name: v[`${k}_name`] || '', age: v[`${k}_age`] || '', status: v[`${k}_status`] || ''});
  return p;
}
/* ตรวจอาชีพทีละช่อง: คืน {ชื่อช่อง: ข้อความ} เพื่อทำช่องที่ยังไม่กรอกเป็นสีแดง */
function occErrors(p, k) {
  const out = {};
  if (p.no_occ || p.status === 'dead') return out;
  if (!p.occs.length) { out[k + '_occ'] = 'กรุณาเพิ่มอาชีพอย่างน้อย 1 อาชีพ หรือติ๊ก “ไม่มีอาชีพ / ไม่มีรายได้ / ไม่ทราบ”'; return out; }
  p.occs.forEach((o, i) => {
    const miss = (x, msg) => { out[`${k}_occ${i}_${x}`] = msg || 'กรุณากรอกข้อมูล'; };
    if (!o.cat) { miss('cat', 'กรุณาเลือกหมวดอาชีพ'); return; }
    if (o.cat === 'hire' && !o.detail) miss('detail_h');
    if (o.cat === 'gov' && !o.position) miss('position_g');
    if (o.cat === 'trade' && !o.goods) miss('goods');
    if (o.cat === 'farm' && !o.crops) miss('crops');
    if (o.cat === 'other' && !o.detail) miss('detail_o');
    if (!o.pay) { miss('pay', 'กรุณาเลือกลักษณะรายได้'); return; }
    if (o.pay === 'daily') { if (!o.wage) miss('wage'); if (!o.days) miss('days'); }
    else if (!o.amount) miss({monthly: 'amount_m', yearly: 'amount_y', irregular: 'amount_i'}[o.pay]);
  });
  return out;
}
/* คำนวณรายได้เฉลี่ยต่อเดือนให้เห็นทันทีขณะกรอก */
function recalcIncome() {
  const form = document.querySelector('form[data-step="2"]');
  if (!form) return;
  const v = formData(form);
  let total = 0;
  ['father', 'mother', 'guardian'].forEach(k => {
    const p = readPerson(v, k);
    const box = form.querySelector(`[data-person-sum="${k}"]`);
    p.occs.forEach((o, i) => {
      const el = form.querySelector(`[data-occ-sum="${k}:${i}"]`);
      if (el) el.textContent = o.pay ? `คิดเป็นรายได้ประมาณ ${baht(occMonthly(o))} / เดือน` : '';
    });
    const m = personMonthly(p);
    const shown = box && !box.closest('[hidden]');
    if (shown) total += m;
    if (box) box.innerHTML = `รายได้รวมของ${PERSON_LABEL[k]}ประมาณ <b>${baht(m)} / เดือน</b>`;
  });
  const t = document.getElementById('family_total');
  if (t) t.innerHTML = `รายได้รวมของผู้ปกครองประมาณ <b>${baht(total)} / เดือน</b> (ระบบคำนวณจากข้อมูลที่กรอก: รายวัน × จำนวนวัน, รายปี ÷ 12)`;
}
document.addEventListener('input', e => { if (e.target.closest('form[data-step="2"]')) recalcIncome(); });
document.addEventListener('change', e => { if (e.target.closest('form[data-step="2"]')) recalcIncome(); });
App.on('occ-add', function (el) {
  const k = el.dataset.person;
  const v = formData(el.form);
  const occs = readOccs(v, k);
  occs.push({});
  document.getElementById(`${k}_occs`).innerHTML = occs.map((o, i) => occCard(k, i, o)).join('');
  applyWhen(el.form);
  recalcIncome();
  document.getElementById(`${k}_occ${occs.length - 1}_cat`).focus();
});
App.on('occ-remove', function (el) {
  const k = el.dataset.person;
  const occs = readOccs(formData(el.form), k);
  occs.splice(Number(el.dataset.i), 1);
  document.getElementById(`${k}_occs`).innerHTML = (occs.length ? occs : [{}]).map((o, i) => occCard(k, i, o)).join('');
  applyWhen(el.form);
  recalcIncome();
});

function stepFamily(s, e) {
  const f = s.family || {};
  const eq = f.equipment || [];
  return `
  <section class="card"><h3>ความสัมพันธ์ในครอบครัว <span class="muted small">(ตอบได้มากกว่า 1 ข้อ)</span></h3>
    <div class="choice-grid">${RELATIONS.map(([k, t]) => `<label class="choice"><input type="checkbox" name="relations" value="${k}" ${(f.relations || []).includes(k) ? 'checked' : ''}> ${t}</label>`).join('')}</div>
  </section>
  <section class="card"><h3>ข้อมูลบิดา</h3>${personBlock('father', f.father, e)}</section>
  <section class="card"><h3>ข้อมูลมารดา</h3>${personBlock('mother', f.mother, e)}</section>
  <section class="card"><h3>ผู้ขอทุนอาศัยอยู่กับ</h3>
    ${radioField('live_with', 'ปัจจุบันอาศัยอยู่กับ', LIVE_WITH, f.live_with, {req: 1, err: e.live_with})}
    <div data-when="live_with=guardian">${personBlock('guardian', f.guardian, e)}</div>
  </section>
  <section class="card"><h3>พี่น้อง (บิดามารดาเดียวกัน)</h3>
    <div class="grid-2">
      ${field('sib_count', 'จำนวนพี่น้อง (ไม่รวมผู้ขอทุน)', stepper('sib_count', (s.siblings || []).length, 15, 'data-onchange="sib-count"'), {hint: 'กด − / + ระบบจะแสดงช่องให้กรอกตามจำนวน'})}
      <div class="field"><span class="label">แยกตามที่พักอาศัย</span><div class="sib-counts" id="sib_counts" aria-live="polite">${sibCounts(s.siblings || [])}</div>
        <div class="hint">นับให้อัตโนมัติจากที่เลือกในแต่ละคนด้านล่าง</div></div>
    </div>
    <div id="sibs" class="stack">${siblingRows(s.siblings || [], e)}</div>
  </section>
  <div class="note info" id="family_total"></div>
  <section class="card"><h3>สภาพที่อยู่ปัจจุบัน</h3>
    ${radioField('housing', 'บ้านที่อยู่ปัจจุบันเป็นแบบใด', HOUSING_P, f.housing, {req: 1, err: e.housing, col: 1})}
    <div data-when="housing=own_other_land">${field('housing_land_owner', 'ที่ดินเป็นของ (ระบุ)', input('housing_land_owner', f.housing_land_owner, 'placeholder="เช่น ที่ดินของวัด ที่ดินของญาติ"'), {req: 1, err: e.housing_land_owner})}</div>
    <div data-when="housing=installment">${field('housing_installment', 'ผ่อนชำระเดือนละ (บาท)', input('housing_installment', f.housing === 'installment' ? f.housing_cost : '', 'type="number" min="0" inputmode="numeric"'), {req: 1, err: e.housing_installment})}</div>
    <div data-when="housing=rent">${field('housing_rent', 'ค่าเช่าเดือนละ (บาท)', input('housing_rent', f.housing === 'rent' ? f.housing_cost : '', 'type="number" min="0" inputmode="numeric"'), {req: 1, err: e.housing_rent})}</div>
    <div data-when="housing=other">${field('housing_other', 'ระบุ', input('housing_other', f.housing_other), {req: 1, err: e.housing_other})}</div>
    <div class="field"><span class="label">บ้านที่อยู่อาศัยมีอุปกรณ์ดังนี้ <span class="muted">(ตอบได้มากกว่า 1 ข้อ)</span></span>
      <div class="choice-grid" id="equip">${EQUIP.map(([k, t]) => `<label class="choice"><input type="checkbox" name="equipment" value="${k}" ${eq.includes(k) ? 'checked' : ''} ${f.no_equipment ? 'disabled' : ''}> ${t}</label>`).join('')}
        <label class="choice"><input type="checkbox" name="no_equipment" ${f.no_equipment ? 'checked' : ''} data-onchange="student-noequip"> ไม่มีอุปกรณ์ตามรายการ</label></div>
      <input type="hidden" name="equipment_other_on" value="${eq.includes('other') ? 'on' : ''}">
      <div data-when="equipment_other_on=on">${field('equipment_other', 'อุปกรณ์อื่น ๆ (ระบุ)', input('equipment_other', f.equipment_other), {req: 1, err: e.equipment_other})}</div>
      ${field('equipment_note', 'อธิบายเพิ่มเติม <span class="muted">(ถ้ามี)</span>', textarea('equipment_note', f.equipment_note, 'rows="2" placeholder="เช่น รถกระบะเก่ามือสอง ซ่อมบ่อย / คอมพิวเตอร์ได้รับบริจาค"'))}</div>
  </section>
  <section class="card"><h3>ที่ดินทำกินของครอบครัว <span class="muted small">(ตอบได้มากกว่า 1 ข้อ)</span></h3>
    <div class="grid-2">
      <div class="subcard"><label class="check"><input type="checkbox" name="own_land" ${f.own_land ? 'checked' : ''}> <span>เป็นของตนเอง</span></label>
        <div class="grid-2" data-when="own_land=on">${field('own_land_amt', 'ขนาด', input('own_land_amt', f.own_land_amt, 'type="number" min="0" inputmode="decimal"'))}${field('own_land_unit', 'หน่วย', select('own_land_unit', LAND_UNITS, f.own_land_unit || 'rai'))}</div></div>
      <div class="subcard"><label class="check"><input type="checkbox" name="rent_land" ${f.rent_land ? 'checked' : ''}> <span>เช่าผู้อื่น</span></label>
        <div class="stack" data-when="rent_land=on"><div class="grid-2">${field('rent_land_amt', 'ขนาด', input('rent_land_amt', f.rent_land_amt, 'type="number" min="0" inputmode="decimal"'))}${field('rent_land_unit', 'หน่วย', select('rent_land_unit', LAND_UNITS, f.rent_land_unit || 'rai'))}</div>
          <div class="grid-2">${field('rent_land_cost', 'ค่าเช่า (บาท)', input('rent_land_cost', f.rent_land_cost, 'type="number" min="0" inputmode="numeric"'))}${field('rent_land_per', 'ต่อ', select('rent_land_per', [['month', 'เดือน'], ['year', 'ปี']], f.rent_land_per || 'year'))}</div></div></div>
    </div>
  </section>`;
}
function siblingRows(list, e = {}) {
  if (!list.length) return '';
  return list.map((x, i) => `<div class="subcard" data-sib="${i}">
    <div class="row between"><b>พี่น้องคนที่ ${i + 1}</b><button class="btn ghost sm" type="button" data-action="sib-remove" data-i="${i}">ลบ</button></div>
    ${radioField(`sib${i}_res`, 'ปัจจุบันพักอาศัย', SIB_RES, x.residence, {req: 1, err: e[`sib${i}_res`], attrs: 'data-onchange="sib-moved"'})}
    <div class="grid-3">
      ${field(`sib${i}_gender`, 'เพศ', select(`sib${i}_gender`, ['ชาย', 'หญิง'], x.gender, 'เลือก'))}
      ${field(`sib${i}_name`, 'ชื่อ-สกุล', input(`sib${i}_name`, x.name))}
      ${field(`sib${i}_age`, 'อายุ', `<div class="age-unit">${input(`sib${i}_age`, x.age, 'type="number" min="0" max="80" inputmode="numeric"')}
        <div class="unit-seg" role="radiogroup" aria-label="หน่วยอายุ">${AGE_UNITS.map(([k, t]) => `<label><input type="radio" name="sib${i}_age_unit" value="${k}" ${(x.age_unit || 'y') === k ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>`, {hint: 'กดเลือก ปี หรือ เดือน'})}
      ${field(`sib${i}_edu`, 'การศึกษา / ระดับชั้น', input(`sib${i}_edu`, x.edu, 'placeholder="เช่น ม.2 / จบ ป.6 / ยังไม่เข้าเรียน"'))}
      ${field(`sib${i}_job`, 'อาชีพ / ตำแหน่ง', input(`sib${i}_job`, x.occupation, 'placeholder="เช่น นักเรียน / พนักงานโรงงาน"'))}
      ${field(`sib${i}_place`, 'สถานที่ทำงาน หรือสถานที่ศึกษา', input(`sib${i}_place`, x.place))}
    </div>
    ${field(`sib${i}_note`, 'หมายเหตุ <span class="muted">(ถ้ามี)</span>', input(`sib${i}_note`, x.note, 'placeholder="เช่น ยังเล็กไม่ถึงวัยเรียน / พิการ ต้องมีคนดูแล / ป่วย ไม่ได้ทำงาน"'))}
  </div>`).join('');
}
function readSiblings(form) {
  const v = formData(form);
  const out = [];
  for (let i = 0; i < 20; i++) {
    if (v[`sib${i}_name`] === undefined) continue;
    out.push({gender: v[`sib${i}_gender`] || '', name: v[`sib${i}_name`] || '', age: v[`sib${i}_age`] || '', age_unit: v[`sib${i}_age_unit`] || 'y',
      edu: v[`sib${i}_edu`] || '', occupation: v[`sib${i}_job`] || '', place: v[`sib${i}_place`] || '', note: v[`sib${i}_note`] || '',
      residence: v[`sib${i}_res`] || ''});
  }
  return out;
}
const SIB_RES = [['home', 'อยู่บ้านเดียวกัน'], ['out', 'แยกออกไปอยู่ข้างนอก'], ['family', 'แยกออกไปมีครอบครัวแล้ว']];
const AGE_UNITS = [['y', 'ปี'], ['m', 'เดือน']];
const movedCount = list => list.filter(x => x.residence === 'family').length;
const outCount = list => list.filter(x => x.residence === 'out').length;
const sibCounts = list => SIB_RES.map(([k, t]) => `<div><b>${list.filter(x => x.residence === k).length}</b><span>${t.replace('แยกออกไป', 'แยกไป')}</span></div>`).join('');
const sibAge = x => x.age !== '' && x.age != null ? `${x.age} ${x.age_unit === 'm' ? 'เดือน' : 'ปี'}` : '';
function renderSibs(form, list) {
  document.getElementById('sibs').innerHTML = siblingRows(list);
  document.getElementById('sib_count').value = list.length;
  document.getElementById('sib_counts').innerHTML = sibCounts(list);
  applyWhen(form);
}
App.on('sib-count', function (el) {
  const n = Math.max(0, Math.min(15, Number(el.value) || 0));
  const list = readSiblings(el.form).slice(0, n);
  while (list.length < n) list.push({});
  renderSibs(el.form, list);
});
App.on('sib-remove', function (el) {
  const list = readSiblings(el.form);
  list.splice(Number(el.dataset.i), 1);
  renderSibs(el.form, list);
});
App.on('sib-moved', function (el) {
  document.getElementById('sib_counts').innerHTML = sibCounts(readSiblings(el.form));
});
/* ช่องจำนวนแบบกด − / + (พิมพ์ได้ แต่กด Enter ไม่ส่งฟอร์ม) */
function stepper(id, value, max, attrs = '') {
  return `<div class="stepper-num"><button class="btn sm" type="button" data-action="num-step" data-for="${id}" data-d="-1" aria-label="ลด">−</button>
    ${input(id, value, `type="number" min="0" max="${max}" inputmode="numeric" ${attrs}`)}
    <button class="btn sm" type="button" data-action="num-step" data-for="${id}" data-d="1" aria-label="เพิ่ม">+</button></div>`;
}
App.on('num-step', function (el) {
  const x = document.getElementById(el.dataset.for);
  x.value = Math.max(0, Math.min(Number(x.max) || 99, (Number(x.value) || 0) + Number(el.dataset.d)));
  x.dispatchEvent(new Event('change', {bubbles: true}));
});
App.on('student-noequip', function (el) {
  document.querySelectorAll('#equip input[name=equipment]').forEach(x => { if (el.checked) x.checked = false; x.disabled = el.checked; });
});
/* ช่อง "อื่น ๆ (ระบุ)" ของอุปกรณ์ */
document.addEventListener('change', e => {
  if (e.target.name === 'equipment' && e.target.value === 'other') {
    const h = e.target.form.querySelector('[name=equipment_other_on]');
    h.value = e.target.checked ? 'on' : '';
    applyWhen(e.target.form);
  }
});

/* ---------- ข้อมูลเพิ่มเติม + เขียนเล่าประวัติ ---------- */
const LOAN_WHO = [['self', 'ผู้ขอทุน'], ['sibling', 'พี่น้อง']];
const LOAN_FUND = ['กยศ.', 'กรอ.'];
function loanRows(list, e = {}) {
  return list.map((x, i) => `<div class="subcard" data-loan="${i}">
    <b>ผู้กู้ยืมคนที่ ${i + 1}</b>
    <div class="grid-2">
      ${field(`loan${i}_name`, 'ชื่อ-สกุล', input(`loan${i}_name`, x.name), {req: 1, err: e[`loan${i}_name`]})}
      ${radioField(`loan${i}_who`, 'เป็น', LOAN_WHO, x.who, {req: 1, err: e[`loan${i}_who`]})}
      ${radioField(`loan${i}_fund`, 'กองทุน', LOAN_FUND.map(f => [f, f]), x.fund || 'กยศ.')}
      ${field(`loan${i}_amount`, 'ได้รับ (บาท / ปี)', input(`loan${i}_amount`, x.amount, 'type="number" min="0" inputmode="numeric"'))}
    </div></div>`).join('');
}
function readLoans(form) {
  const v = formData(form);
  const out = [];
  for (let i = 0; i < 10; i++) {
    if (v[`loan${i}_name`] === undefined) continue;
    out.push({name: v[`loan${i}_name`] || '', who: v[`loan${i}_who`] || '', fund: v[`loan${i}_fund`] || 'กยศ.', amount: v[`loan${i}_amount`] || ''});
  }
  return out;
}
App.on('loan-count', function (el) {
  const n = Math.max(1, Math.min(10, Number(el.value) || 1));
  const list = readLoans(el.form).slice(0, n);
  while (list.length < n) list.push({});
  document.getElementById('loans').innerHTML = loanRows(list);
  el.value = n;
});
function stepMore(s, e) {
  const pd = this.db.pdpa;
  const req = storiesRequired(s);
  return `
  <section class="card"><h3>ข้อมูลเพิ่มเติม</h3>
    ${field('allowance', '§.1 นักเรียนได้เงินมาใช้จ่ายวันละ (บาท)', input('allowance', s.allowance, 'type="number" min="0" inputmode="numeric"'), {req: 1, err: e.allowance})}
    ${radioField('other', '§.2 ปัจจุบันผู้ขอทุนได้รับทุนต่อเนื่องอื่น ๆ หรือไม่', [['no', 'ไม่ได้รับ'], ['yes', 'ได้รับ']], s.other, {req: 1, err: e.other})}
    <div class="grid-3" data-when="other=yes">
      ${field('other_org', 'ชื่อทุน', input('other_org', s.other_org), {req: 1, err: e.other_org})}
      ${field('other_amount', 'ทุนละ (บาท)', input('other_amount', s.other_amount, 'type="number" min="0" inputmode="numeric"'))}
      ${field('other_period', 'ต่อ', select('other_period', ['ต่อเทอม', 'ต่อปี'], s.other_period || 'ต่อปี'))}
    </div>
    ${radioField('loan', '§.3 ปัจจุบันผู้ขอทุนหรือพี่น้องของผู้ขอทุนที่กำลังศึกษาอยู่ ได้รับทุนกู้ยืม กยศ. หรือ กรอ. บ้างหรือไม่', [['no', 'ไม่มี'], ['yes', 'มี']], s.loan,
      {req: 1, err: e.loan, hint: 'ต้องระบุตามความเป็นจริง มิฉะนั้นจะไม่ได้รับการพิจารณา — มูลนิธิฯ จะพิจารณาเป็นรายกรณี'})}
    <div class="stack" data-when="loan=yes">
      ${field('loan_count', 'จำนวน (คน)', stepper('loan_count', (s.loans || []).length || 1, 10, 'data-onchange="loan-count"'), {req: 1, err: e.loan_count, hint: 'กด − / + ระบบจะแสดงช่องให้กรอกตามจำนวน'})}
      <div id="loans" class="stack">${loanRows((s.loans || []).length ? s.loans : [{}], e)}</div>
    </div>
    ${radioField('part_time', '§.4 หลังเลิกเรียน / วันหยุด / ปิดเทอม', [['no', 'ไม่ได้ทำงานหารายได้พิเศษ'], ['yes', 'ทำงานพิเศษ']], s.part_time, {req: 1, err: e.part_time})}
    <div class="grid-3" data-when="part_time=yes">
      ${field('part_job', 'ระบุงานที่ทำ', input('part_job', s.part_job, 'placeholder="เช่น ช่วยขายของ ล้างจาน รับจ้างเก็บผลไม้"'), {req: 1, err: e.part_job})}
      ${field('part_income', 'รายได้ (บาท)', input('part_income', s.part_income, 'type="number" min="0" inputmode="numeric"'))}
      ${field('part_per', 'ต่อ', select('part_per', [['day', 'วัน'], ['month', 'เดือน']], s.part_per || 'day'))}
    </div>
  </section>
  ${s.type === 'CONT' ? `<section class="card"><h3>เหตุผลในการขอรับทุนต่อเนื่อง</h3>
    ${field('reason', needsGoal(s) ? '§.1 เหตุผลในการขอรับทุนต่อเนื่อง' : '', textarea('reason', s.reason, 'rows="3" aria-label="เหตุผลในการขอรับทุนต่อเนื่อง"'), {req: req, err: e.reason})}
    ${needsGoal(s) ? field('goal', '§.2 เป้าหมายในการขอรับทุนเพื่อการศึกษาต่อในระดับอุดมศึกษา', textarea('goal', s.goal, 'rows="3"'), {req: 1, err: e.goal, hint: 'สำหรับผู้ขอทุนระดับ ม.6 / ปวช. / ปวส.'}) : ''}
  </section>` : !req ? '' : `<section class="card"><h3>เขียนเล่าประวัติและสภาพความเป็นอยู่</h3>
    <p class="small muted">${req ? 'กรุณาเล่าเรื่องราวตามจริง ข้อมูลนี้ใช้ประกอบการพิจารณาทุน' : 'ระดับประถมศึกษาปีที่ 5 ไม่บังคับกรอกส่วนนี้'}</p>
    ${STORY_Q.map(([t, h], i) => field('story_' + i, `§.${i + 1} ${t}`,
      textarea('story_' + i, (s.stories || [])[i], `rows="4" data-oninput="count" maxlength="2000" aria-describedby="cnt_${i}"`) +
      `<div class="counter" id="cnt_${i}">${((s.stories || [])[i] || '').length} / 2000</div>`, {req: req && i < 5, hint: h, err: e['story_' + i]})).join('')}
    ${field('reason', `§.${STORY_Q.length + 1} เหตุผลในการขอรับทุน${s.type === 'CONT' ? 'ต่อเนื่อง' : ''}`, textarea('reason', s.reason, 'rows="3"'), {req: req, err: e.reason})}
    ${needsGoal(s) ? field('goal', `§.${STORY_Q.length + 2} เป้าหมายในการขอรับทุนเพื่อการศึกษาต่อในระดับอุดมศึกษา`, textarea('goal', s.goal, 'rows="3"'), {req: 1, err: e.goal, hint: 'สำหรับผู้ขอทุนระดับ ม.6 / ปวช. / ปวส.'}) : ''}
  </section>`}
  <section class="card"><h3>ยืนยันก่อนส่ง</h3>
    <label class="check ${e.confirm ? 'invalid' : ''}"><input type="checkbox" name="confirm" ${s.confirmed ? 'checked' : ''}> <span>ข้าพเจ้าขอรับรองว่าข้อมูลทั้งหมดที่ได้ให้ไว้ในแบบฟอร์มนี้ เป็นความจริงทุกประการ <span class="req">*</span></span></label>
    ${e.confirm ? `<div class="err">${e.confirm}</div>` : ''}
    <label class="check ${e.pdpa ? 'invalid' : ''}"><input type="checkbox" name="pdpa" ${s.pdpa_ack ? 'checked' : ''}> <span>ข้าพเจ้าได้อ่านและรับทราบเงื่อนไขในการขอรับทุนตามแบบฟอร์มฉบับนี้ ระเบียบการขอรับทุนเพื่อการศึกษา และประกาศความเป็นส่วนตัว (Privacy Notice) ของมูลนิธิทิสโก้ เพื่อการกุศลแล้ว <span class="req">*</span></span></label>
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
    const higher = ['voc', 'highvoc', 'bachelor'].includes(g);
    Object.assign(s, {title: v.title, first_name: v.first_name, last_name: v.last_name, gender: v.gender, email: v.email || '',
      home_address: v.home_address, same_address: !!v.same_address, current_address: v.same_address ? v.home_address : v.current_address,
      school: area.school, group: g, class: v.class, faculty: higher ? v.faculty : '', program_years: higher ? v.program_years : '',
      pvs_type: g === 'highvoc' ? v.pvs_type : '', study_mode: higher ? v.study_mode || '' : '', study_mode_other: v.study_mode === 'other' ? v.study_mode_other : '',
      next_class: v.next_class, next_faculty: v.next_faculty || '', next_pvs_type: v.next_pvs_type || '',
      school_next: v.school_next, next_school_text: v.school_next === 'transfer' ? v.next_school_text || '' : '', transfer_ack: v.school_next === 'transfer' && !!v.transfer_ack,
      cont_since: v.cont_since || '', cont_years: v.cont_years || ''});
    s.rate = rateOf(s.next_class, /^ปวส/.test(s.next_class) ? (s.next_pvs_type || s.pvs_type) : '');
    ['title', 'gender'].forEach(k => need(k, 'กรุณาเลือก'));
    ['first_name', 'last_name', 'home_address'].forEach(k => need(k));
    if (!s.current_address) e.current_address = 'กรุณากรอกข้อมูล';
    if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) e.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    if (!area.school) e.school = 'กรุณาเลือกสถานศึกษา';
    need('group', 'กรุณาเลือกช่วงชั้น');
    need('class', 'กรุณาเลือกระดับชั้น');
    if (higher) { need('faculty'); need('program_years', 'กรุณาเลือก'); need('study_mode', 'กรุณาเลือกรูปแบบการเรียน'); }
    if (g === 'highvoc') need('pvs_type', 'กรุณาเลือกว่าเป็นประเภทวิชาอุตสาหกรรมหรือไม่');
    if (v.study_mode === 'other') need('study_mode_other', 'กรุณาระบุรูปแบบการเรียน');
    need('next_class', 'กรุณาเลือกระดับชั้นปีหน้า');
    if (/^ปวส/.test(v.next_class) && g !== 'highvoc') need('next_pvs_type', 'กรุณาเลือกว่าเป็นประเภทวิชาอุตสาหกรรมหรือไม่');
    need('school_next', 'กรุณาเลือกคำตอบ');
    if (v.school_next === 'transfer' && !v.transfer_ack) e.transfer_ack = 'กรุณารับทราบเงื่อนไขการส่งหลักฐานการย้ายสถานศึกษา';
    if (s.type === 'CONT') { need('cont_since'); need('cont_years'); }
  } else if (step === 2) {
    const fam = {father: readPerson(v, 'father'), mother: readPerson(v, 'mother'), live_with: v.live_with || '',
      guardian: v.live_with === 'guardian' ? readPerson(v, 'guardian') : null,
      housing: v.housing || '', housing_land_owner: v.housing === 'own_other_land' ? v.housing_land_owner || '' : '',
      housing_cost: v.housing === 'installment' ? v.housing_installment || '' : v.housing === 'rent' ? v.housing_rent || '' : '',
      housing_other: v.housing === 'other' ? v.housing_other || '' : '',
      equipment: v.no_equipment ? [] : arr(v.equipment), equipment_other: arr(v.equipment).includes('other') ? v.equipment_other || '' : '', no_equipment: !!v.no_equipment, equipment_note: (v.equipment_note || '').trim(),
      own_land: !!v.own_land, own_land_amt: v.own_land ? v.own_land_amt || '' : '', own_land_unit: v.own_land_unit || 'rai',
      rent_land: !!v.rent_land, rent_land_amt: v.rent_land ? v.rent_land_amt || '' : '', rent_land_unit: v.rent_land_unit || 'rai',
      rent_land_cost: v.rent_land ? v.rent_land_cost || '' : '', rent_land_per: v.rent_land_per || 'year',
      relations: arr(v.relations), sib_moved: '', sib_out: ''};
    ['father', 'mother'].forEach(k => {
      if (!fam[k].name) e[k + '_name'] = 'กรุณากรอกชื่อ–สกุล (กรอกทุกกรณี)';
      if (!fam[k].status) e[k + '_status'] = 'กรุณาเลือกสถานะ';
      Object.assign(e, occErrors(fam[k], k));
    });
    if (!fam.live_with) e.live_with = 'กรุณาเลือกว่าผู้ขอทุนอาศัยอยู่กับใคร';
    if (fam.guardian) {
      if (!fam.guardian.relation) e.guardian_relation = 'กรุณาระบุความสัมพันธ์';
      Object.assign(e, occErrors(fam.guardian, 'guardian'));
    }
    if (!fam.housing) e.housing = 'กรุณาเลือกสภาพที่อยู่ปัจจุบัน';
    if (fam.housing === 'own_other_land' && !fam.housing_land_owner) e.housing_land_owner = 'กรุณาระบุว่าที่ดินเป็นของใคร';
    if (fam.housing === 'installment' && !fam.housing_cost) e.housing_installment = 'กรุณาระบุจำนวนเงินผ่อนต่อเดือน';
    if (fam.housing === 'rent' && !fam.housing_cost) e.housing_rent = 'กรุณาระบุค่าเช่าต่อเดือน';
    if (fam.housing === 'other' && !fam.housing_other) e.housing_other = 'กรุณาระบุสภาพที่อยู่';
    if (fam.equipment.includes('other') && !fam.equipment_other) e.equipment_other = 'กรุณาระบุอุปกรณ์อื่น ๆ';
    s.family = fam;
    s.siblings = readSiblings(form);
    fam.sib_moved = String(movedCount(s.siblings));
    fam.sib_out = String(outCount(s.siblings));
    s.siblings.forEach((x, i) => {
      if (!x.residence) e[`sib${i}_res`] = 'กรุณาเลือกว่าพักอาศัยที่ไหน';
    });
  } else {
    Object.assign(s, {allowance: v.allowance || '', other: v.other, other_org: v.other === 'yes' ? v.other_org || '' : '', other_amount: v.other === 'yes' ? v.other_amount || '' : '',
      other_period: v.other === 'yes' ? v.other_period : '', loan: v.loan, loans: v.loan === 'yes' ? readLoans(form) : [], part_time: v.part_time, part_job: v.part_time === 'yes' ? v.part_job || '' : '',
      part_income: v.part_time === 'yes' ? v.part_income || '' : '', part_per: v.part_time === 'yes' ? v.part_per : '',
      stories: s.type === 'CONT' || !storiesRequired(s) ? [] : STORY_Q.map((_, i) => v['story_' + i] || ''), reason: v.reason || '', goal: v.goal || '', confirmed: !!v.confirm, pdpa_ack: !!v.pdpa});
    need('allowance');
    need('other', 'กรุณาเลือกคำตอบ');
    if (v.other === 'yes') need('other_org', 'กรุณาระบุชื่อทุน');
    need('loan', 'กรุณาเลือกคำตอบ');
    s.loan_count = String(s.loans.length || '');
    s.loan_names = s.loans.map(x => x.name).filter(Boolean).join(', ');
    s.loan_amount = (s.loans.find(x => x.who === 'self') || {}).amount || '';
    s.loans.forEach((x, i) => {
      if (!x.name.trim()) e[`loan${i}_name`] = 'กรุณาระบุชื่อผู้กู้ยืม';
      if (!x.who) e[`loan${i}_who`] = 'กรุณาเลือกว่าเป็นผู้ขอทุนหรือพี่น้อง';
    });
    need('part_time', 'กรุณาเลือกคำตอบ');
    if (v.part_time === 'yes') need('part_job', 'กรุณาระบุงานที่ทำ');
    if (storiesRequired(s)) {
      if (s.type !== 'CONT') STORY_Q.forEach((_, i) => { if (i < 5 && !s.stories[i]) e['story_' + i] = 'กรุณาเล่าเรื่องราวในข้อนี้'; });
      need('reason', 'กรุณาระบุเหตุผลในการขอรับทุน');
    }
    if (needsGoal(s)) need('goal', 'กรุณาระบุเป้าหมายในการศึกษาต่อ');
    if (!v.confirm) e.confirm = 'กรุณารับรองว่าข้อมูลเป็นความจริงก่อนส่งใบสมัคร';
    if (!v.pdpa) e.pdpa = 'กรุณารับทราบเงื่อนไขและประกาศความเป็นส่วนตัว (Privacy Notice) ก่อนส่งใบสมัคร';
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
  if (n === 1) return s.first_name && s.last_name && s.home_address && s.school && s.class && s.next_class && s.school_next;
  const f = s.family || {};
  return f.father && f.father.name && f.mother && f.mother.name && f.live_with && f.housing;
}


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
  return {html: `
    <div class="page-head"><div><h1>เริ่มสมัครขอรับทุนการศึกษา</h1><p class="sub">ตรวจสอบสิทธิ์และเลือกประเภทใบสมัคร</p></div></div>
    <div class="split">
      <form class="card" data-submit="student-login" novalidate>
        ${radioField('received', `ได้รับทุนการศึกษาจากมูลนิธิทิสโก้ เพื่อการกุศล ในปีการศึกษา ${y} หรือไม่`,
          [['yes', 'ได้รับทุน', 'ทุนต่อเนื่อง'], ['no', 'ไม่ได้รับทุน', 'ทุนใหม่']], v.received, {req: 1, err: e.received, cls: 'key-q',
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
        ${[['draft', 'NEW', 'ป.5'], ['draft', 'CONT'], ['returned_to_student'], ['waiting_teacher'], ['waiting_staff'], ['decided']].map(([st, ty, cl]) =>
          this.db.students.find(x => x.demo_note && x.status === st && (!ty || x.type === ty) && (!cl || x.class === cl))).filter(Boolean).map(x =>
          `<button class="btn sample" data-action="student-sample" data-code="${x.code}"><b>${esc(x.class)} ${TYPE[x.type]}</b><span>${esc(STATUS[x.status].label)}</span></button>`).join('')}
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


/* กำหนดส่งหลักฐานการย้ายสถานศึกษา: ทุกระดับส่งได้ถึงวันสุดท้าย (transfer_close) → พิจารณารอบที่ 2 (รอบรอฟังผล)
   เฉพาะ ป.6 / ม.3 ที่ส่งภายในวันตัดรอบแรก (first_cutoff) → พิจารณารอบแรก */
function transferDeadline(s) { return this.db.cycle.transfer_close; }
function transferDeadlineText(s) {
  const last = `ส่งได้ถึง ${thDate(this.db.cycle.transfer_close)} (พิจารณารอบที่ 2)`;
  return ['ป.6', 'ม.3'].includes(s.class) ? `ส่งภายใน ${thDate(this.db.cycle.first_cutoff)} พิจารณารอบแรก · ${last}` : last;
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
        ${s.school_next === 'transfer' ? `<section class="card" style="outline:2px solid var(--bad)"><h3>⚠ อย่าลืมส่งหลักฐานยืนยันการย้ายสถานศึกษา</h3>
          <p>คุณแจ้งว่าจะ <b>ย้ายสถานศึกษาใหม่</b>${s.next_school_text ? ` ไปที่ <b>${esc(s.next_school_text)}</b>` : ''} ในปีการศึกษา ${this.db.cycle.year}</p>
          <div class="note bad">ต้องส่งหลักฐานยืนยันการย้ายสถานศึกษาให้มูลนิธิฯ — <b>${transferDeadlineText.call(this, s)}</b><br>หากไม่ส่งภายใน ${thDate(transferDeadline.call(this, s))} ถือว่าสละสิทธิ์</div>
          <p class="small muted">หลักฐาน เช่น หนังสือรับรองสถานภาพนักเรียนจากสถานศึกษาใหม่ หรือหลักฐานการมอบตัว</p></section>` : ''}
        ${!editable && !bachelor && s.status === 'waiting_teacher' ? `<section class="card"><h3>ขั้นตอนต่อไป กรุณาติดต่อครูผู้ดูแลทุนของสถานศึกษา</h3>
          <p>เพื่อแจ้งว่ากรอกข้อมูลเรียบร้อยแล้ว และนำเอกสารประกอบการสมัครไปส่งให้ครู</p>
          <div class="subcard"><span class="label">เอกสารที่นักเรียนควรเตรียมส่งให้ครู</span><ul class="small" style="margin:0;padding-left:20px">${docs.map(x => `<li>${x[1]}</li>`).join('')}</ul></div></section>` : ''}
        ${bachelor && !editable ? `<section class="card"><div class="card-head"><h3>สำหรับระดับปริญญาตรี</h3><span class="sub">ประเภททุน: ${TYPE[s.type]}</span></div>
          <p class="small">นักศึกษาอัปโหลดเอกสารด้วยตนเอง เมื่อกรอกข้อมูลและแนบเอกสารครบแล้ว ใบสมัครจะถูกส่งมายังมูลนิธิฯ โดยตรง</p>
          <div>${docs.map(([code, name, multi, opt]) => docRow(s, code, name, multi, s.status === 'waiting_staff' || s.status === 'need_more_info', 'student-file', opt)).join('')}</div></section>` : ''}
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

function docRow(s, code, name, multi, active, action, optional) {
  const files = (s.docFiles || {})[code] || [];
  return `<div class="doc-row"><div><div>${name}${optional ? ' <span class="muted small">(ถ้ามี)</span>' : ''}</div><div class="code">${s.code}_${code}.pdf${multi ? ' · แนบได้หลายไฟล์' : ''}</div></div>
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
    ${row('ปีถัดไป', s.school_next === 'same' ? 'ศึกษาต่อสถานศึกษาเดิม' : s.school_next === 'transfer' ? `ย้ายสถานศึกษาใหม่${s.next_school_text ? ' ไป ' + esc(s.next_school_text) : ''}` : '-')}${s.email ? row('E-mail', esc(s.email)) : ''}
    ${row('ที่อยู่ตามภูมิลำเนา', esc(s.home_address || '-'))}${row('ที่อยู่ปัจจุบัน', esc(s.current_address || '-'))}
    ${s.family && s.family.father ? row('รายได้ผู้ปกครอง (ประมาณ)', `${baht(personMonthly(s.family.father) + personMonthly(s.family.mother) + (s.family.live_with === 'guardian' ? personMonthly(s.family.guardian) : 0))} / เดือน`) : ''}
    ${s.submitted_at ? row('วันที่ส่งใบสมัคร', thDate(s.submitted_at, true)) : ''}
    ${s.school_next === 'transfer' ? `<div class="sr"><b>หมายเหตุ</b><div><b>ต้องส่งหลักฐานยืนยันการย้ายสถานศึกษา ${transferDeadlineText.call(this, s)} หากไม่ส่งภายใน ${thDate(transferDeadline.call(this, s))} ถือว่าสละสิทธิ์</b></div></div>` : ''}
    <div class="foot">เอกสารฉบับนี้จัดทำจากข้อมูลที่ผู้สมัครกรอกในระบบ เพื่อเก็บไว้เป็นหลักฐาน</div></div>`;
}

/* กด Enter ในช่องกรอกของใบสมัคร = ไปช่องถัดไป (ไม่ส่งฟอร์ม/ไม่ข้ามหน้า) — คนส่วนใหญ่กด Enter เพื่อยืนยันค่าที่พิมพ์ ไม่ได้ตั้งใจไปหน้าถัดไป */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing) return;
  const el = e.target;
  const form = el.closest && el.closest('form[data-when-form]');
  if (!form || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON') return;
  e.preventDefault();
  const items = [...form.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(x => !x.disabled && !x.readOnly && !x.closest('[hidden]') && x.offsetParent !== null);
  const next = items[items.indexOf(el) + 1];
  if (next) next.focus();
});

/* ความสัมพันธ์ "บิดา/มารดาถึงแก่กรรม" กับสถานะในข้อมูลบิดา/มารดา ให้ตรงกันเสมอ (เลือกที่ไหนก็อัปเดตอีกที่) */
document.addEventListener('change', e => {
  const t = e.target;
  const form = t.form;
  if (!form || !form.matches('form[data-step="2"]')) return;
  let who, dead;
  if (t.name === 'relations' && /^(father|mother)_dead$/.test(t.value)) { who = t.value.split('_')[0]; dead = t.checked; }
  else if (/^(father|mother)_status$/.test(t.name) && t.checked) { who = t.name.split('_')[0]; dead = t.value === 'dead'; }
  else return;
  const rel = form.querySelector(`[name=relations][value=${who}_dead]`);
  if (rel) rel.checked = dead;
  const radio = form.querySelector(`[name=${who}_status][value=${dead ? 'dead' : 'alive'}]`);
  if (radio && (dead || form.querySelector(`[name=${who}_status][value=dead]`).checked)) radio.checked = true;
  [rel, radio].forEach(x => x && x.dispatchEvent(new Event('input', {bubbles: true})));
  applyWhen(form);
  recalcIncome();
});
