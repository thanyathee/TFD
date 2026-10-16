/* ลงทะเบียนครูผู้ดูแลทุน · ลืมรหัสผ่าน · แอดมินอนุมัติคำขอ (docs/future-plan.md ข้อ 7) */
'use strict';

const TR_LEVELS = [['kinder', 'ระดับอนุบาล'], ['primary', 'ระดับประถมศึกษา'], ['lowersec', 'ระดับมัธยมศึกษาตอนต้น'], ['uppersec', 'ระดับมัธยมศึกษาตอนปลาย'],
  ['voc', 'ระดับ ปวช.'], ['highvoc', 'ระดับ ปวส.'], ['bachelor', 'ระดับปริญญาตรี']];
const TR_MODES = [['regular', 'ภาคปกติ'], ['special', 'ภาคพิเศษ (เรียนวันเสาร์-อาทิตย์ หรือภาคค่ำ)'], ['dual', 'ทวิภาคี (เรียนวันธรรมดาและมีการฝึกงานตามหลักสูตร)']];
const TR_KIND = {new: 'ลงทะเบียนใหม่', newschool: 'สถานศึกษาใหม่ (ไม่มีในระบบ)', replace: 'ครูผู้ดูแลคนใหม่ (แทนคนเดิม)', reemail: 'ครูคนเดิม · เปลี่ยนอีเมล'};
const TR_STATE = {pending: ['รอตรวจ', 'info'], approved: ['อนุมัติแล้ว', 'ok'], rejected: ['ไม่อนุมัติ', 'bad']};
const TR_REASON = [['moved', 'ครูคนเดิมย้าย / ลาออก / เกษียณ'], ['assigned', 'โรงเรียนมอบหมายผู้ดูแลคนใหม่'], ['other', 'อื่นๆ']];
const TR_CHECK = [['name', 'ชื่อ-สกุลครูตรงกับเอกสาร'], ['school', 'ชื่อสถานศึกษาตรงกับเอกสาร'], ['doc', 'ไม่ใช่บัตรประชาชน / รูปเซลฟี่']];
const trBadge = st => `<span class="badge t-${TR_STATE[st][1]}">${TR_STATE[st][0]}</span>`;
const trClose = () => App.db.cycle.teacher_reg_close || '2027-01-29T17:00';
const trOpen = () => nowIso() <= trClose();
const maskEmail = m => { const [a, d] = String(m || '').split('@'); return a ? `${a.slice(0, 3)}•••@${d || ''}` : '-'; };
/* อีเมลแจ้งรหัสเข้าใช้งาน (รูปแบบเดียวกับที่มูลนิธิฯ ใช้อยู่) */
const TR_PHONE = '02-633-7506';
const TR_FROM = 'มูลนิธิทิสโก้ เพื่อการกุศล';
const TR_DOWNLOADS = [
  ['เอกสารและระเบียบการขอรับทุนการศึกษา', 'https://drive.google.com/file/d/1DsMsFn4TKd3lUZMInmIQO0CRpaFYQeRN/view?usp=sharing'],
  ['คู่มือการขอรับทุนการศึกษา', 'https://drive.google.com/file/d/1Eh7IVGGXflfFRvsGBvrXpZ1KtkLg_oGH/view?usp=sharing'],
  ['คู่มือการสมัครขอทุนระบบออนไลน์-คุณครูผู้ดูแลทุน', 'https://drive.google.com/file/d/1FZuMpXMTOwpyMYkO6OIwxv6o2oXHiOPT/view?usp=sharing']];
function trMailApprove(name, school, username, pw) {
  return `เรียน ${name}

Username และ Password สำหรับครู/อาจารย์ผู้ดูแลทุนโครงการทุนการศึกษาของมูลนิธิทิสโก้ เพื่อการกุศล
เข้าสู่ระบบ: scholarship.tiscofoundation.org

สถานศึกษา: ${school}
Username: ${username}
Password: ${pw}
⚠ เข้าระบบครั้งแรก ระบบจะให้ตั้งรหัสผ่านใหม่ของคุณครูเอง

เปิดรับสมัครขอทุน ระหว่างวันที่ 1 พฤศจิกายน – 31 มกราคม ของทุกปี
(รหัสเข้าใช้งานไม่มีวันหมดอายุ สามารถใช้รหัสเดิมได้ทุกปี · หากลืมรหัสผ่าน กด “ลืมรหัสผ่าน” ที่หน้าเข้าสู่ระบบ)

หากมีข้อสงสัย กรุณาติดต่อมูลนิธิทิสโก้ เพื่อการกุศล
โทร. ${TR_PHONE} หรือ E-mail : tiscofoundation@tiscofoundation.org

${TR_DOWNLOADS.map(([t, u]) => `ดาวน์โหลด: [${t}](${u})`).join('\n')}`;
}
function trMailReject(name, school, reason) {
  return `เรียน ${name}

คำขอลงทะเบียนครูผู้ดูแลทุนของ ${school} ยังไม่ได้รับการอนุมัติ
เหตุผล: ${reason}

กรุณาลงทะเบียนใหม่อีกครั้งพร้อมหลักฐานที่ถูกต้อง ที่ scholarship.tiscofoundation.org
หากมีข้อสงสัย โทร. ${TR_PHONE} หรือ E-mail : tiscofoundation@tiscofoundation.org`;
}
const trMailSubject = school => `${TR_FROM} รหัสเข้าใช้งานระบบทุนการศึกษาแบบออนไลน์ / ${school}`;
function trMailCard(m) {
  return `<div class="tr-mail"><div class="tr-mail-h"><b>${esc(m.subject)}</b><span class="small muted">TISCO Foundation &lt;tiscofoundation@tiscofoundation.org&gt; · ถึง ${esc(m.to)} · ${thDate(m.at, true)}</span></div>
    <div class="tr-mailbody">${esc(m.body).replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')}</div></div>`;
}
const schUser = id => 'sch' + String(id).replace(/^SCH-?/i, '').toLowerCase();

/* ---------- เงื่อนไข (ใช้ทั้งหน้าเข้าสู่ระบบและฟอร์ม) ---------- */
function trRules() {
  return `<ul class="tr-rules">
    <li>ระบบลงทะเบียนเปิดให้บริการจนถึง <b>${thDate(trClose().slice(0, 10))} เวลา ${trClose().slice(11, 16).replace(':', '.')} น.</b></li>
    <li>จำกัด <b>1 สถานศึกษา ต่อ 1 รหัสผู้ใช้งาน</b></li>
    <li>คุณครูที่มีรหัสผ่านเดิมอยู่แล้ว สามารถใช้รหัสผ่านเดิมเข้าระบบได้เลยค่ะ</li>
    <li>หากลืมรหัสผ่าน กด <b>“ลืมรหัสผ่าน”</b> ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลที่ลงทะเบียนไว้</li>
    <li>สถานศึกษาที่ดูแลนักศึกษา<b>ระดับปริญญาตรี ไม่ต้องลงทะเบียน</b> เนื่องจากข้อมูลการสมัครของนักศึกษาจะส่งถึงมูลนิธิฯ โดยตรง</li></ul>`;
}

/* ---------- ฟอร์มลงทะเบียน ---------- */
App.views['teacher-register'] = function (p) {
  this.session = {role: null};
  const v = p.values || {};
  const e = p.errors || {};
  if (!trOpen()) return {html: `<button class="back" data-go="teacher-entry">${icon('back')} เข้าสู่ระบบครู</button>
    <section class="card"><h2>ปิดรับลงทะเบียนแล้ว</h2><p>ระบบลงทะเบียนเปิดให้บริการถึง ${thDate(trClose().slice(0, 10))} · หากมีข้อสงสัย โทร 02-638-0660</p></section>`};
  const file = this._trFile;
  return {html: `
    <button class="back" data-go="teacher-entry">${icon('back')} เข้าสู่ระบบครู</button>
    <div class="page-head"><div><h1>ลงทะเบียนครูผู้ดูแลทุน</h1><p class="sub">ขอรับ Username และ Password สำหรับเข้าระบบการสมัครขอรับทุนการศึกษาออนไลน์ของมูลนิธิฯ</p></div></div>
    ${errNote(e)}
    <form class="stack tr-form" data-submit="tr-submit" novalidate>
      <section class="card stack"><h3><span class="tr-n">1</span> กรุณาอ่านก่อนลงทะเบียน</h3>${trRules()}
        <label class="choice ${e.ack ? 'tp-ack-err' : ''}"><input type="checkbox" name="ack" value="1" ${v.ack ? 'checked' : ''}> รับทราบข้อมูลข้างต้นแล้ว และขอลงทะเบียนสำหรับคุณครูผู้ดูแลทุน</label>
        ${e.ack ? `<div class="err">${esc(e.ack)}</div>` : ''}</section>

      <section class="card stack"><h3><span class="tr-n">2</span> สถานศึกษา</h3>
        <p class="small muted">เลือกภาค → จังหวัด → อำเภอ → สถานศึกษา · ถ้าไม่พบ เลือก “ไม่พบในรายชื่อ (ระบุเอง)” ท้ายรายการ</p>
        <div class="grid-2" data-after="tr-school" data-area='{"school":true,"required":true,"schoolLabel":"ชื่อสถานศึกษา","otherLabel":"── ไม่พบในรายชื่อ (ระบุเอง) ──"}'>${this.areaPicker('trg', v, {school: true, required: true,
          schoolLabel: 'ชื่อสถานศึกษา', otherLabel: '── ไม่พบในรายชื่อ (ระบุเอง) ──', err: {region: e.region, province: e.province, district: e.district, school: e.school}})}</div>
        <div id="tr_other" ${v.school === '__other' ? '' : 'hidden'}>${field('tr_sname', 'ชื่อเต็มของสถานศึกษา (พิมพ์เอง)', input('tr_sname', v.sname, 'placeholder="เช่น โรงเรียนบ้านหนองบัววิทยา"'),
          {req: 1, err: e.sname, hint: '<b>พิมพ์ชื่อเต็ม ไม่ใช้ตัวย่อ และสะกดให้ถูกต้อง</b>'})}</div>
        <div id="tr_check">${trSchoolCheck.call(this, v.school, v, e)}</div></section>

      <section class="card stack"><h3><span class="tr-n">3</span> ข้อมูลคุณครูผู้ดูแลทุน</h3>
        <div class="grid-2">
          ${field('tr_name', 'ชื่อ-สกุล', input('tr_name', v.name, 'autocomplete="name" placeholder="เช่น นางสาว กัญญา ใจดี"'), {req: 1, err: e.name, hint: 'กรุณาตรวจสอบตัวสะกดให้ถูกต้อง'})}
          ${field('tr_pos', 'ตำแหน่ง', input('tr_pos', v.pos, 'placeholder="เช่น ครูชำนาญการ / ครูแนะแนว"'))}
          ${field('tr_phone', 'เบอร์โทรศัพท์ที่ติดต่อได้', input('tr_phone', v.phone, 'inputmode="numeric" maxlength="10" data-oninput="digits" placeholder="08xxxxxxxx"'), {req: 1, err: e.phone})}
          <div></div>
          ${field('tr_email', 'อีเมล', input('tr_email', v.email, 'type="email" autocomplete="email"'), {req: 1, err: e.email, hint: 'มูลนิธิฯ จะส่ง Username และ Password ไปที่อีเมลนี้'})}
          ${field('tr_email2', 'ยืนยันอีเมล (พิมพ์ซ้ำ)', input('tr_email2', v.email2, 'type="email" autocomplete="off"'), {req: 1, err: e.email2})}
        </div></section>

      <section class="card stack"><h3><span class="tr-n">4</span> ข้อมูลสถานศึกษา</h3>
        ${field('tr_addr', 'ที่อยู่สถานศึกษา', textarea('tr_addr', v.addr, 'rows="2" placeholder="เลขที่ / หมู่ที่ / ถนน / ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์"'), {req: 1, err: e.addr})}
        ${field('tr_count', 'ปัจจุบันสถานศึกษามีนักเรียนกี่คน', input('tr_count', v.count, 'inputmode="numeric" data-oninput="digits" maxlength="6"'), {req: 1, err: e.count})}
        <div class="field ${e.levels ? 'invalid' : ''}"><span class="label">เปิดสอนระดับชั้นไหนบ้าง (เลือกได้มากกว่า 1 ข้อ) <span class="req">*</span></span>
          ${checks('tr_levels', TR_LEVELS, v.levels || [])}${field('tr_levels_other', '', input('tr_levels_other', v.levels_other, 'placeholder="อื่นๆ (ถ้ามี)"'))}
          ${e.levels ? `<div class="err">${esc(e.levels)}</div>` : ''}</div>
        <div class="field ${e.modes ? 'invalid' : ''}"><span class="label">มีการจัดการเรียนการสอนในรูปแบบใดบ้าง (เลือกได้มากกว่า 1 ข้อ) <span class="req">*</span></span>
          ${checks('tr_modes', TR_MODES, v.modes || [])}${field('tr_modes_other', '', input('tr_modes_other', v.modes_other, 'placeholder="อื่นๆ (ถ้ามี)"'))}
          ${e.modes ? `<div class="err">${esc(e.modes)}</div>` : ''}</div></section>

      <section class="card stack"><h3><span class="tr-n">5</span> หลักฐานยืนยันตัวตน</h3>
        <div class="note info small">เพื่อยืนยันว่าเป็นบุคลากรที่ปฏิบัติงานอยู่ในสถานศึกษาจริง เช่น บัตรประจำตัวข้าราชการ/พนักงาน หรือหนังสือประกาศแต่งตั้งจากสถานศึกษา<br>
          ✔️ ต้องมี <b>ชื่อ-สกุลคุณครูผู้ดูแลทุน</b> และ <b>ชื่อสถานศึกษา</b> ระบุในเอกสารชัดเจน<br>❌ บัตรประจำตัวประชาชน และรูปถ่ายเซลฟี่ ใช้ยืนยันตัวตนไม่ได้</div>
        <div class="field ${e.file ? 'invalid' : ''}"><span class="label">ไฟล์หลักฐาน (jpg / png / pdf · 1 ไฟล์ ไม่เกิน 10 MB) <span class="req">*</span></span>
          <div class="tp-flist">${file ? `<div class="tp-fitem"><span>📎 ${esc(file)}</span><button class="btn ghost sm" type="button" data-action="tr-file-rm">ลบ</button></div>` : '<span class="small muted">ยังไม่ได้เลือกไฟล์</span>'}</div>
          ${file ? '' : `<div class="row tp-file"><label class="btn"><input type="file" id="tr_file" accept="image/jpeg,image/png,.pdf" data-onchange="tr-file" hidden>${icon('upload')} เลือกไฟล์</label>
            <button class="btn ghost sm" type="button" data-action="tr-sample">ใช้ไฟล์ตัวอย่าง (ทดลอง)</button></div>`}
          ${e.file ? `<div class="err">${esc(e.file)}</div>` : ''}</div></section>

      <section class="card stack"><div class="note info small">มูลนิธิฯ จะจัดส่ง Username และ Password ไปทางอีเมล <b>ภายใน 2 วันทำการ</b>
        · เปิดทำการ จันทร์-ศุกร์ 08.30-17.00 น. (หยุดเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์) · หากมีข้อสงสัย โทร 02-638-0660</div>
        <button class="btn primary block" type="submit">ส่งคำขอลงทะเบียน</button></section>
    </form>`, after: focusFirstError};
};
/* ตรวจสถานศึกษาที่เลือก: ปริญญาตรี → ไม่ต้องลงทะเบียน · มีบัญชีแล้ว → เลือกลืมรหัส / ครูคนใหม่ */
function trSchoolCheck(id, v = {}, e = {}) {
  if (!id || id === '__other') return '';
  const sc = this.schoolById[id] || {};
  if (sc.type === 'university') return `<div class="note bad"><b>${esc(sc.name)} เป็นสถานศึกษาระดับปริญญาตรี — ไม่ต้องลงทะเบียน</b><br>ข้อมูลการสมัครของนักศึกษาจะส่งถึงมูลนิธิฯ โดยตรง</div>`;
  const t = this.teacherOf(id);
  if (!t || t.active === false) return `<div class="note ok small">สถานศึกษานี้ยังไม่มีบัญชีครูผู้ดูแลทุน — ลงทะเบียนได้</div>`;
  return `<div class="note warn stack"><div><b>⚠ ${esc(sc.name)} มีบัญชีครูผู้ดูแลทุนแล้ว</b><br><span class="small">ครูผู้ดูแล: ${esc(t.name)} · อีเมล ${esc(maskEmail(t.email))}</span></div>
    ${radioField('tr_kind', 'คุณคือ', [['forgot', 'ฉันคือครูคนเดิม ลืมรหัสผ่าน', 'ไปหน้าลืมรหัสผ่าน — รับลิงก์ทางอีเมลที่ลงทะเบียนไว้'],
      ['reemail', 'ฉันคือครูคนเดิม แต่ไม่ได้ใช้อีเมลเดิมแล้ว', 'ลงทะเบียนพร้อมอีเมลใหม่ เจ้าหน้าที่ตรวจหลักฐานก่อนเปลี่ยนให้'],
      ['replace', 'ฉันเป็นครูผู้ดูแลทุนคนใหม่ (แทนคนเดิม)', 'อนุมัติแล้วบัญชีเดิมจะถูกปิด นักเรียนทั้งหมดอยู่ในบัญชีของครูคนใหม่']], v.kind, {col: 1, req: 1, err: e.kind, attrs: 'data-onchange="tr-kind"'})}
    <div id="tr_reason_box" ${v.kind === 'replace' ? '' : 'hidden'}>${radioField('tr_reason', 'เหตุผล', TR_REASON, v.reason, {col: 1, req: 1, err: e.reason})}
      ${field('tr_reason_text', '', input('tr_reason_text', v.reason_text, 'placeholder="ระบุเพิ่มเติม (ถ้ามี)"'))}
      <p class="small muted">แนะนำให้แนบหนังสือแต่งตั้ง / คำสั่งมอบหมายจากสถานศึกษาในขั้นที่ 5</p></div></div>`;
}
App.on('tr-school', function () {
  const id = (document.getElementById('trg-school') || {}).value;
  const box = document.getElementById('tr_other'); if (box) box.hidden = id !== '__other';
  const ck = document.getElementById('tr_check'); if (ck) ck.innerHTML = trSchoolCheck.call(this, id);
  /* ดึงที่อยู่จากระบบ */
  const sc = this.schoolById[id];
  const addr = document.getElementById('tr_addr');
  /* เติมให้เฉพาะตอนช่องว่าง หรือยังเป็นค่าที่ระบบเติมไว้ก่อนหน้า */
  if (addr && (!addr.value || addr.value === addr.dataset.auto)) {
    addr.value = sc && sc.type !== 'university' ? [sc.address, sc.subdistrict, sc.district, 'จ.' + sc.province, sc.postcode].filter(Boolean).join(' ') : '';
    addr.dataset.auto = addr.value;
  }
});
App.on('tr-kind', function (el) {
  if (el.value === 'forgot') { this.go('teacher-forgot', {q: (this.teacherOf(document.getElementById('trg-school').value) || {}).username}); return; }
  const b = document.getElementById('tr_reason_box'); if (b) b.hidden = el.value !== 'replace';
});
App.on('tr-file', function (el) {
  const f = el.files && el.files[0]; if (!f) return;
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) { this.toast('รองรับเฉพาะ jpg / png / pdf'); return; }
  if (f.size > 10 * 1048576) { this.toast('ไฟล์ใหญ่เกิน 10 MB'); return; }
  this._trFile = f.name;
  this.go('teacher-register', {values: trValues()});
});
App.on('tr-sample', function () { this._trFile = 'หนังสือแต่งตั้งครูผู้ดูแลทุน.pdf'; this.go('teacher-register', {values: trValues()}); });
App.on('tr-file-rm', function () { this._trFile = null; this.go('teacher-register', {values: trValues()}); });
function trValues() {
  const form = document.querySelector('.tr-form'); if (!form) return {};
  const v = formData(form), a = App.readArea('trg');
  const all = n => [...form.querySelectorAll(`[name=${n}]:checked`)].map(x => x.value);
  return {...a, ack: !!v.ack, sname: v.tr_sname, name: v.tr_name, pos: v.tr_pos, phone: v.tr_phone, email: v.tr_email, email2: v.tr_email2, addr: v.tr_addr, count: v.tr_count,
    levels: all('tr_levels'), levels_other: v.tr_levels_other, modes: all('tr_modes'), modes_other: v.tr_modes_other, kind: v.tr_kind, reason: v.tr_reason, reason_text: v.tr_reason_text};
}
App.on('tr-submit', function () {
  const v = trValues();
  const e = {};
  const mail = x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x || '');
  if (!v.ack) e.ack = 'กรุณาติ๊กรับทราบข้อมูล';
  if (!v.region) e.region = 'กรุณาเลือกภาค'; else if (!v.province) e.province = 'กรุณาเลือกจังหวัด'; else if (!v.district) e.district = 'กรุณาเลือกอำเภอ / เขต';
  if (!v.school) e.school = 'กรุณาเลือกสถานศึกษา ถ้าไม่พบ เลือก “ไม่พบในรายชื่อ (ระบุเอง)”';
  if (v.school === '__other' && !v.sname) e.sname = 'กรุณาพิมพ์ชื่อเต็มของสถานศึกษา';
  const sc = this.schoolById[v.school];
  if (sc && sc.type === 'university') e.school = 'สถานศึกษาระดับปริญญาตรีไม่ต้องลงทะเบียน';
  const has = sc && this.teacherOf(sc.id) && this.teacherOf(sc.id).active !== false;
  if (has && !v.kind) e.kind = 'กรุณาเลือกว่าคุณคือครูคนเดิมหรือครูคนใหม่';
  if (has && v.kind === 'replace' && !v.reason) e.reason = 'กรุณาเลือกเหตุผล';
  if (!v.name) e.name = 'กรุณากรอกชื่อ-สกุล';
  if (!/^0\d{8,9}$/.test(v.phone || '')) e.phone = 'กรุณากรอกเบอร์โทรศัพท์ 9-10 หลัก';
  if (!mail(v.email)) e.email = 'รูปแบบอีเมลไม่ถูกต้อง';
  if (v.email2 !== v.email) e.email2 = 'อีเมลทั้งสองช่องไม่ตรงกัน';
  if (!v.addr) e.addr = 'กรุณากรอกที่อยู่สถานศึกษา';
  if (!v.count) e.count = 'กรุณากรอกจำนวนนักเรียน';
  if (!v.levels.length && !v.levels_other) e.levels = 'กรุณาเลือกระดับชั้นอย่างน้อย 1 ข้อ';
  if (!v.modes.length && !v.modes_other) e.modes = 'กรุณาเลือกรูปแบบการเรียนการสอนอย่างน้อย 1 ข้อ';
  if (!this._trFile) e.file = 'กรุณาแนบไฟล์หลักฐานยืนยันตัวตน';
  if (Object.keys(e).length) { this.go('teacher-register', {values: v, errors: e}); return; }
  this.db.teacherRegs = this.db.teacherRegs || [];
  const id = 'REG-' + String(this.db.teacherRegs.length + 1).padStart(4, '0');
  const kind = v.school === '__other' ? 'newschool' : has ? v.kind : 'new';
  this.db.teacherRegs.push({id, at: nowIso(), state: 'pending', kind, school: v.school === '__other' ? '' : v.school, school_text: v.sname || '', region: v.region, province: v.province, district: v.district,
    name: v.name, pos: v.pos, phone: v.phone, email: v.email, addr: v.addr, count: Number(v.count), levels: v.levels, levels_other: v.levels_other, modes: v.modes, modes_other: v.modes_other,
    reason: kind === 'replace' ? [(TR_REASON.find(r => r[0] === v.reason) || [])[1], v.reason_text].filter(Boolean).join(' — ') : '', file: `${id}_IDPROOF.${(this._trFile.split('.').pop() || 'pdf').toLowerCase()}`, file_name: this._trFile});
  this._trFile = null;
  this.save();
  this.go('teacher-reg-done', {id});
});
App.views['teacher-reg-done'] = function (p) {
  const r = (this.db.teacherRegs || []).find(x => x.id === p.id) || {};
  return {html: `<section class="card stack tr-done"><div class="tr-ok">✓</div><h1>ส่งคำขอลงทะเบียนเรียบร้อย</h1>
    <dl class="kv"><div><dt>เลขที่คำขอ</dt><dd class="num"><b>${esc(r.id)}</b></dd></div><div><dt>ประเภทคำขอ</dt><dd>${TR_KIND[r.kind] || '-'}</dd></div>
      <div><dt>อีเมลที่จะได้รับรหัส</dt><dd>${esc(r.email)}</dd></div></dl>
    <div class="note info">มูลนิธิฯ จะส่ง Username และ Password ไปที่อีเมลข้างต้น <b>ภายใน 2 วันทำการ</b><br>หากมีข้อสงสัย โทร 02-638-0660 (จันทร์-ศุกร์ 08.30-17.00 น.)</div>
    <button class="btn" data-go="teacher-entry">กลับหน้าเข้าสู่ระบบ</button></section>`};
};

/* ---------- ลืมรหัสผ่าน: ลิงก์ทางอีเมล (ต้นแบบ: จำลองอีเมลบนหน้าจอ) ---------- */
App.views['teacher-forgot'] = function (p) {
  this.session = {role: null};
  const t = p.sent ? this.db.teachers.find(x => x.username === p.sent) : null;
  return {html: `<button class="back" data-go="teacher-entry">${icon('back')} เข้าสู่ระบบครู</button>
    <div class="page-head"><div><h1>ลืมรหัสผ่าน</h1><p class="sub">ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลที่ลงทะเบียนไว้</p></div></div>
    <div class="split"><div class="stack">
      ${t ? `<section class="card stack"><div class="note ok">ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่ <b>${esc(maskEmail(t.email))}</b> แล้ว · ลิงก์ใช้ได้ภายใน 24 ชั่วโมง และใช้ได้ครั้งเดียว</div>
          <div class="tr-mail"><div class="small muted">ตัวอย่างอีเมล (ต้นแบบ — ระบบจริงส่งเข้ากล่องอีเมล)</div>
            <b>มูลนิธิทิสโก้ฯ — ตั้งรหัสผ่านใหม่</b><p class="small">เรียน ${esc(t.name)}<br>มีการขอตั้งรหัสผ่านใหม่สำหรับบัญชี <b>${esc(t.username)}</b> (${esc(this.schoolName(t.school))}) กดปุ่มด้านล่างภายใน 24 ชั่วโมง หากไม่ได้ขอ ไม่ต้องดำเนินการใดๆ</p>
            <button class="btn primary" data-go="teacher-reset" data-u="${esc(t.username)}">ตั้งรหัสผ่านใหม่</button></div>
          <p class="small muted">ไม่ได้รับอีเมล? ตรวจโฟลเดอร์ Junk/Spam หรือ <button class="btn ghost sm" data-go="teacher-forgot">ลองอีกครั้ง</button></p></section>`
      : `<form class="card stack" data-submit="tr-forgot" novalidate>
          ${field('fq', 'Username หรืออีเมลที่ลงทะเบียนไว้', input('fq', p.q || '', 'autocomplete="username" autocapitalize="off" placeholder="เช่น sch001 หรือ kru@example.com"'), {req: 1, err: p.err})}
          <button class="btn primary block" type="submit">ส่งลิงก์ตั้งรหัสผ่านใหม่</button></form>`}
      </div>
      <aside class="card stack"><h3>ใช้วิธีนี้ไม่ได้?</h3><ul class="small tr-rules">
        <li>จำ Username และอีเมลไม่ได้ หรือไม่ได้ใช้อีเมลเดิมแล้ว → <b>ลงทะเบียน</b> แล้วเลือก “ฉันคือครูคนเดิม แต่ไม่ได้ใช้อีเมลเดิมแล้ว”</li>
        <li>ครูผู้ดูแลทุนคนใหม่มาแทน → <b>ลงทะเบียน</b> แล้วเลือก “ฉันเป็นครูผู้ดูแลทุนคนใหม่ (แทนคนเดิม)”</li></ul>
        <button class="btn" data-go="teacher-register">ลงทะเบียน</button><p class="tiny muted">ทดลอง: กรอก sch001</p></aside></div>`, after: focusFirstError};
};
App.on('tr-forgot', function (form) {
  const q = (formData(form).fq || '').toLowerCase();
  const t = this.db.teachers.find(x => x.active !== false && (x.username === q || (x.email || '').toLowerCase() === q));
  if (!q) { this.go('teacher-forgot', {err: 'กรุณากรอก Username หรืออีเมล'}); return; }
  if (!t) { this.go('teacher-forgot', {q, err: 'ไม่พบบัญชีนี้ — ตรวจตัวสะกด หรือลงทะเบียนใหม่'}); return; }
  (this.db.mails = this.db.mails || []).push({at: nowIso(), code: t.username, to: t.email, who: 'ครู ' + t.name, subject: 'ตั้งรหัสผ่านใหม่', body: 'ลิงก์ใช้ได้ 24 ชั่วโมง'});
  this.save();
  this.go('teacher-forgot', {sent: t.username});
});
App.views['teacher-reset'] = function (p) {
  const t = this.db.teachers.find(x => x.username === p.u);
  const e = p.errors || {};
  return {html: `<div class="page-head"><div><h1>${p.first ? 'ตั้งรหัสผ่านใหม่ (เข้าใช้ครั้งแรก)' : 'ตั้งรหัสผ่านใหม่'}</h1><p class="sub">${esc(t.username)} — ${esc(this.schoolName(t.school))}</p></div></div>
    <form class="card stack tr-reset" data-submit="tr-reset" data-u="${esc(t.username)}" data-first="${p.first ? 1 : ''}" novalidate>
      ${field('np1', 'รหัสผ่านใหม่', input('np1', '', 'type="password" autocomplete="new-password"'), {req: 1, err: e.np1, hint: 'อย่างน้อย 8 ตัว มีทั้งตัวอักษรภาษาอังกฤษและตัวเลข'})}
      ${field('np2', 'ยืนยันรหัสผ่านใหม่', input('np2', '', 'type="password" autocomplete="new-password"'), {req: 1, err: e.np2})}
      <button class="btn primary block" type="submit">บันทึกรหัสผ่าน</button></form>`, after: focusFirstError};
};
App.on('tr-reset', function (form) {
  const v = formData(form);
  const e = {};
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v.np1 || '')) e.np1 = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว มีตัวอักษรภาษาอังกฤษและตัวเลข';
  if (v.np2 !== v.np1) e.np2 = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
  if (Object.keys(e).length) { this.go('teacher-reset', {u: form.dataset.u, first: form.dataset.first, errors: e}); return; }
  const t = this.db.teachers.find(x => x.username === form.dataset.u);
  t.password = v.np1;
  delete t.must_change;
  this.save();
  if (form.dataset.first) { this.session = {role: 'teacher', teacher: t.username, school: t.school, who: this.schoolName(t.school)}; this.toast('ตั้งรหัสผ่านแล้ว'); this.go('teacher-home'); return; }
  this.toast('ตั้งรหัสผ่านใหม่แล้ว — เข้าสู่ระบบด้วยรหัสผ่านใหม่');
  this.go('teacher-entry', {values: {username: t.username}});
});

/* ---------- แอดมิน: คำขอลงทะเบียนครู ---------- */
App.views['staff-regs'] = function (p) {
  const regs = this.db.teacherRegs || [];
  const f = p.f || 'pending';
  const list = regs.filter(r => f === 'all' || r.state === f).slice().sort((a, b) => a.at.localeCompare(b.at));
  const sch = r => r.school ? this.schoolName(r.school) : r.school_text;
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <div class="page-head"><div><h1>คำขอเพิ่มครูผู้ดูแลทุน</h1><p class="sub">ตรวจหลักฐาน → อนุมัติ: ระบบเพิ่มสถานศึกษา (ถ้ายังไม่มี) สร้าง Username/รหัสผ่าน และส่งอีเมลให้ครูอัตโนมัติ</p></div></div>
    <div class="note info small">เปิดรับลงทะเบียนถึง ${thDate(trClose().slice(0, 10))} ${trClose().slice(11, 16)} น. (แก้ได้ที่หน้า “รอบรับสมัคร”)</div>
    <div class="stats">${[['pending', 'รอตรวจ'], ['approved', 'อนุมัติแล้ว'], ['rejected', 'ไม่อนุมัติ'], ['all', 'ทั้งหมด']].map(([k, t]) =>
      `<button class="stat${k === 'pending' && regs.some(r => r.state === 'pending') ? ' hot' : ''}" data-go="staff-regs" data-f="${k}" aria-pressed="${f === k}"><span>${t}</span><b>${k === 'all' ? regs.length : regs.filter(r => r.state === k).length}</b></button>`).join('')}</div>
    <div class="tlist rg-list" role="table" aria-label="คำขอเพิ่มครูผู้ดูแลทุน">
      <div class="tlist-head" role="row"><span class="n">ลำดับ</span><span>เลขที่คำขอ</span><span>ชื่อครู</span><span>สถานศึกษา</span><span>ประเภทคำขอ</span><span>ส่งเมื่อ</span><span>สถานะ</span></div>
      ${list.length ? list.map((r, i) => `<button class="trow" role="row" data-go="staff-reg" data-id="${r.id}">
        <span class="n">${i + 1}</span><span class="num">${r.id}</span><span class="c-name">${esc(r.name)}<small>${esc(r.email)}</small></span>
        <span>${esc(sch(r))}<small class="muted"> · จ.${esc(r.province)}</small></span><span><span class="badge t-${r.kind === 'replace' ? 'violet' : r.kind === 'newschool' ? 'warn' : 'idle'}">${TR_KIND[r.kind]}</span></span>
        <span class="small">${thDate(r.at, true)}</span><span>${trBadge(r.state)}</span></button>`).join('') : '<div class="empty">ไม่มีคำขอในสถานะนี้</div>'}
    </div>`};
};
App.views['staff-reg'] = function (p) {
  const r = this.db.teacherRegs.find(x => x.id === p.id);
  const e = p.errors || {};
  const sc = r.school ? this.schoolById[r.school] : null;
  const old = sc ? this.teacherOf(sc.id) : null;
  const lv = r.levels.map(k => (TR_LEVELS.find(x => x[0] === k) || [, k])[1]).concat(r.levels_other ? [r.levels_other] : []).join(', ');
  const md = r.modes.map(k => (TR_MODES.find(x => x[0] === k) || [, k])[1].replace(/ \(.*/, '')).concat(r.modes_other ? [r.modes_other] : []).join(', ');
  const fileSrc = pvMock({first_name: '', last_name: '', title: '', ...r}, 'TP', 'หนังสือแต่งตั้ง / บัตรเจ้าหน้าที่', r.file, 0);
  const mails = (this.db.mails || []).filter(m => m.code === r.id).slice().reverse();
  const sug = !r.school ? this.tpSuggest({school_text: r.school_text, province: r.province}) : [];
  let panel;
  if (r.state !== 'pending') panel = `<div class="note ${r.state === 'approved' ? 'ok' : 'bad'} small"><b>${TR_STATE[r.state][0]}</b> โดย ${esc(r.by || '')} · ${thDate(r.done_at, true)}
      ${r.username ? `<br>Username: <b>${esc(r.username)}</b> · ส่งรหัสผ่านทางอีเมลแล้ว` : ''}${r.reject_reason ? `<br>เหตุผล: ${esc(r.reject_reason)}` : ''}</div>
    ${r.state === 'approved' && r.school ? `<button class="btn block" type="button" data-go="staff-school" data-id="${esc(r.school)}">ดูสถานศึกษา / บัญชีครู →</button>` : ''}`;
  else panel = `<div class="tp-checks">${TR_CHECK.map(([k, l]) => `<label class="choice"><input type="checkbox" name="rck" value="${k}"> <span>${l}</span></label>`).join('')}</div>
    ${!r.school ? `<div class="subcard stack"><span class="label">สถานศึกษาที่พิมพ์เอง: ${esc(r.school_text)}</span>
        ${sug.length ? radioField('rg_match', 'มีอยู่แล้วในระบบ? (ชื่อคล้ายกัน)', sug.map(x => [x.id, x.name, `${x.district} จ.${x.province}`]).concat([['__new', 'ไม่ตรง — เพิ่มเป็นสถานศึกษาใหม่', '']]), '__new', {col: 1}) : '<p class="small muted">ไม่พบชื่อคล้ายกัน — จะเพิ่มเป็นสถานศึกษาใหม่</p>'}
        ${field('rg_sname', 'ชื่อสถานศึกษาที่จะเพิ่ม (แก้ได้)', input('rg_sname', r.school_text))}
        ${field('rg_stype', 'ประเภท', select('rg_stype', [['school', 'โรงเรียน'], ['college', 'วิทยาลัย']], /วิทยาลัย/.test(r.school_text) ? 'college' : 'school'))}</div>` : ''}
    ${r.kind === 'replace' || r.kind === 'reemail' ? `<div class="note warn small">${r.kind === 'replace' ? `อนุมัติแล้วจะ<b>ปิดบัญชีครูคนเดิม</b> (${esc(old ? old.name : '-')}) และให้ครูคนใหม่ใช้ Username เดิม` : 'อนุมัติแล้วจะเปลี่ยนอีเมลของบัญชีเดิม และส่งรหัสผ่านใหม่'}</div>` : ''}
    ${e.ok ? `<div class="err">${esc(e.ok)}</div>` : ''}
    ${field('rg_reason', 'เหตุผล (ถ้าไม่อนุมัติ)', textarea('rg_reason', '', 'rows="2" placeholder="เช่น เอกสารไม่มีชื่อสถานศึกษา / ใช้บัตรประชาชน"'), {err: e.reason})}
    <div class="row tp-btns"><button class="btn primary" type="button" data-action="rg-decide" data-ok="1" data-id="${r.id}">✓ อนุมัติ</button>
      <button class="btn danger" type="button" data-action="rg-decide" data-ok="0" data-id="${r.id}">✕ ไม่อนุมัติ</button></div>
    <p class="tiny muted">อนุมัติ → ระบบสร้างบัญชี + รหัสผ่านชั่วคราว และส่งอีเมลให้ครูอัตโนมัติ · เข้าครั้งแรกต้องเปลี่ยนรหัสผ่าน</p>`;
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <button class="back" data-go="staff-regs">${icon('back')} คำขอเพิ่มครูผู้ดูแลทุน</button>
    <div class="page-head"><div><h1><span class="num">${r.id}</span> — ${esc(r.name)}</h1><p class="sub">${TR_KIND[r.kind]} · ส่งเมื่อ ${thDate(r.at, true)}</p></div>${trBadge(r.state)}</div>
    <div class="split">
      <div class="rv-left"><div class="stack">
        <section class="card"><h3>ข้อมูลคุณครู</h3><dl class="kv tp-kv">
          <div><dt>ชื่อ-สกุล</dt><dd>${esc(r.name)}</dd></div><div><dt>ตำแหน่ง</dt><dd>${esc(r.pos || '-')}</dd></div>
          <div><dt>โทรศัพท์</dt><dd class="num">${esc(r.phone)}</dd></div><div><dt>อีเมล</dt><dd>${esc(r.email)}</dd></div>
          ${r.reason ? `<div><dt>เหตุผลที่เปลี่ยนครู</dt><dd>${esc(r.reason)}</dd></div>` : ''}</dl></section>
        <section class="card"><h3>ข้อมูลสถานศึกษา</h3><dl class="kv tp-kv">
          <div><dt>สถานศึกษา</dt><dd>${sc ? esc(sc.name) : `${esc(r.school_text)} <span class="badge t-warn">พิมพ์เอง</span>`}<div class="small muted">${esc(r.district)} จ.${esc(r.province)}</div></dd></div>
          <div><dt>บัญชีครูเดิม</dt><dd>${old ? `${esc(old.name)} <span class="small muted">(${esc(old.username)} · ${esc(old.email)})</span>` : '<span class="muted">ไม่มี</span>'}</dd></div>
          <div><dt>ที่อยู่</dt><dd>${esc(r.addr)}</dd></div><div><dt>จำนวนนักเรียน</dt><dd>${Number(r.count).toLocaleString()} คน</dd></div>
          <div><dt>ระดับชั้นที่เปิดสอน</dt><dd>${esc(lv)}</dd></div><div><dt>รูปแบบการเรียนการสอน</dt><dd>${esc(md)}</dd></div></dl></section>
        <section class="card stack"><h3>${mails.length ? `อีเมลที่ระบบส่ง (${mails.length})` : 'ตัวอย่างอีเมลที่จะส่งเมื่ออนุมัติ'}</h3>
          ${mails.length ? mails.map(trMailCard).join('') : trMailCard({subject: trMailSubject(sc ? sc.name : r.school_text), to: r.email, at: nowIso(),
            body: trMailApprove(r.name, sc ? sc.name : r.school_text, old ? old.username : (sc ? schUser(sc.id) : '(ระบบตั้งให้เมื่ออนุมัติ)'), '(รหัสผ่านชั่วคราว — ระบบสร้างเมื่ออนุมัติ)')})}</section>
        <section class="card"><h3>หลักฐานยืนยันตัวตน</h3>${pvViewerG([{title: esc(r.file_name || r.file), files: [{k: 'rg', f: r.file, title: 'หลักฐานยืนยันตัวตน', src: fileSrc}]}], {open: true})}</section>
      </div></div>
      <aside class="stack rv-side" id="rv-side"><section class="card"><div class="rv-sheet-head"><h3>ตรวจคำขอ</h3><button class="btn sm rv-close" type="button" data-action="rv-sheet">ปิด</button></div>
        <div class="stack" id="rg-panel">${panel}</div></section></aside>
    </div>
    <div class="rv-bar"><span>ตรวจคำขอ</span><button class="btn primary sm" type="button" data-action="rv-sheet">อนุมัติ / ไม่อนุมัติ</button></div>
    <div class="rv-dim" data-action="rv-sheet"></div>`,
    after() { focusFirstError(); const th = document.querySelector('#pv .pv-th'); if (th && innerWidth > 900) App.dispatch('pv-pick', th); }};
};
App.on('rg-decide', function (el) {
  const r = this.db.teacherRegs.find(x => x.id === el.dataset.id);
  const box = document.getElementById('rg-panel');
  const ck = [...box.querySelectorAll('[name=rck]:checked')].map(x => x.value);
  const reason = document.getElementById('rg_reason').value.trim();
  if (el.dataset.ok !== '1') {
    const why = TR_CHECK.filter(([k]) => !ck.includes(k)).map(([, l]) => 'ไม่ผ่าน: ' + l).concat(reason ? [reason] : []);
    if (!why.length) { this.go('staff-reg', {id: r.id, errors: {reason: 'ติ๊กครบทุกข้อแล้ว — ถ้าไม่อนุมัติ กรุณาระบุเหตุผล'}}); return; }
    Object.assign(r, {state: 'rejected', reject_reason: why.join(', '), by: this.session.name, done_at: nowIso()});
    const sn = r.school ? this.schoolName(r.school) : r.school_text;
    (this.db.mails = this.db.mails || []).push({at: nowIso(), code: r.id, to: r.email, who: 'ครู ' + r.name, subject: `${TR_FROM} คำขอลงทะเบียนครูผู้ดูแลทุนไม่ได้รับการอนุมัติ / ${sn}`, body: trMailReject(r.name, sn, r.reject_reason)});
    this.save(); this.toast('ไม่อนุมัติ · ส่งอีเมลแจ้งครูแล้ว'); this.go('staff-regs'); return;
  }
  if (ck.length < TR_CHECK.length) { this.go('staff-reg', {id: r.id, errors: {ok: 'อนุมัติได้เมื่อติ๊กครบทุกข้อ'}}); return; }
  /* สถานศึกษา: ใช้ที่มี / จับคู่ / เพิ่มใหม่ */
  let sid = r.school;
  if (!sid) {
    const m = (document.querySelector('[name=rg_match]:checked') || {}).value;
    if (m && m !== '__new') sid = m;
    else {
      const name = (document.getElementById('rg_sname').value || r.school_text).trim();
      const type = document.getElementById('rg_stype').value;
      sid = 'SCH-N' + String(this.db.schools.filter(x => /^SCH-N/.test(x.id)).length + 1).padStart(3, '0');
      this.db.schools.push({id: sid, name, type, region: r.region, province: r.province, district: r.district, subdistrict: '', address: r.addr, postcode: (r.addr.match(/\d{5}/) || [''])[0],
        levels: r.levels, special_rate: false, modes: r.modes.length ? r.modes : ['regular'], added_by: this.session.name, added_at: nowIso()});
    }
  }
  const sc = this.schoolById[sid] || this.db.schools.find(x => x.id === sid);
  if (sc) Object.assign(sc, {address: sc.address || r.addr, students: r.count, levels: r.levels.length ? r.levels : sc.levels, modes: r.modes.length ? r.modes : sc.modes});
  const pw = 'Tf' + Math.random().toString(36).slice(2, 8) + '9';
  let t = this.db.teachers.find(x => x.school === sid && x.active !== false);
  if (t && r.kind === 'replace') { t.active = false; t.closed_at = nowIso(); t.closed_reason = 'เปลี่ยนครูผู้ดูแล: ' + r.id; }
  const username = t ? t.username : schUser(sid);
  if (t && r.kind === 'reemail') Object.assign(t, {email: r.email, phone: r.phone, password: pw, must_change: true});
  else {
    this.db.teachers = this.db.teachers.filter(x => !(x.username === username && x.active === false && r.kind !== 'replace'));
    if (t && r.kind === 'replace') t.username = username + '-old-' + this.db.teachers.length;
    this.db.teachers.push({username, name: r.name, position: r.pos || 'ครู', department: '', school: sid, phone: r.phone, email: r.email, active: true, password: pw, must_change: true, reg: r.id, created_at: nowIso()});
  }
  Object.assign(r, {state: 'approved', school: sid, username, by: this.session.name, done_at: nowIso()});
  const sname = (sc && sc.name) || this.schoolName(sid);
  (this.db.mails = this.db.mails || []).push({at: nowIso(), code: r.id, to: r.email, who: 'ครู ' + r.name, subject: trMailSubject(sname), body: trMailApprove(r.name, sname, username, pw)});
  if (r.kind === 'replace' && t) this.db.mails.push({at: nowIso(), code: r.id, to: t.email, who: 'ครู ' + t.name, subject: `${TR_FROM} แจ้งเปลี่ยนครูผู้ดูแลทุน / ${sname}`,
    body: `เรียน ${t.name}\n\nมูลนิธิฯ ได้เปลี่ยนครูผู้ดูแลทุนของ ${sname} เป็น ${r.name} ตามคำขอของสถานศึกษา\nบัญชีเดิมของคุณครูถูกปิดการใช้งานแล้ว\n\nหากไม่ถูกต้อง กรุณาติดต่อ โทร. ${TR_PHONE}`});
  this.save();
  this.toast(`อนุมัติแล้ว · Username ${username} · รหัสชั่วคราว ${pw} (ส่งทางอีเมลแล้ว)`);
  this.go('staff-reg', {id: r.id});
});
