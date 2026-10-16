/* ย้ายสถานศึกษา: นักเรียน / ครูโรงเรียนเดิมส่งหลักฐาน → จนท. ตรวจ 4 จุด → แจ้งอีเมล (docs/future-plan.md ข้อ 6) */
'use strict';

const TP_PROOF = [['studentcard', 'บัตรประจำตัวนักเรียน/นักศึกษาของสถานศึกษาใหม่'], ['receipt', 'ใบเสร็จค่าบำรุงการศึกษาของสถานศึกษาใหม่'],
  ['cert', 'หนังสือรับรองสถานภาพการเป็นนักเรียน/นักศึกษาจากสถานศึกษาใหม่']];
const TP_CHECK = [['name', 'ชื่อผู้ขอทุน'], ['school', 'ชื่อสถานศึกษา'], ['cls', 'ระดับชั้น'], ['year', 'ปีการศึกษา']];
const TP_BAD = [['blur', 'ภาพไม่ชัด / อ่านไม่ออก'], ['type', 'ไม่ใช่เอกสาร 3 ประเภทที่กำหนด']];
const TP_STATE = {todo: ['ยังไม่ส่ง', 'idle'], pending: ['รอตรวจ', 'info'], rejected: ['ไม่ผ่าน', 'bad'], done: ['ผ่านแล้ว', 'ok'], closed: ['หมดเขต ยังไม่ผ่าน', 'bad']};
const TP_BY = {student: 'นักเรียน', teacher: 'ครู', staff: 'เจ้าหน้าที่'};
const TP_MAX_MB = 10;
const TP_EXT = ['jpg', 'jpeg', 'png', 'pdf', 'heic', 'heif'];
const tpBadge = st => `<span class="badge t-${TP_STATE[st][1]}">${TP_STATE[st][0]}</span>`;
const tpProofName = k => (TP_PROOF.find(x => x[0] === k) || [, '-'])[1];

Object.assign(App, {
  /* ครูผู้ดูแลในปีที่ย้าย = โรงเรียนเดิม (ครูโรงเรียนใหม่ยังไม่เห็นข้อมูล) */
  careSchool(s) { return s.home_school || s.school; },
  tpOpen() { return nowIso().slice(0, 10) <= this.db.cycle.transfer_close; },
  tpDaysLeft() { return Math.max(0, Math.ceil((new Date(this.db.cycle.transfer_close + 'T23:59') - new Date()) / 864e5)); },
  tpLast(s) { return ((s.tp || {}).subs || []).slice(-1)[0]; },
  tpState(s) {
    const tp = s.tp || {};
    if (tp.state === 'pending') return 'pending';
    if (tp.state === 'approved') return 'done';
    if (tp.state !== 'reopened' && this.db.transfers.some(t => t.code === s.code)) return 'done';
    if (!this.tpOpen()) return 'closed';
    return tp.state === 'rejected' ? 'rejected' : 'todo';
  },
  /* ส่งได้เมื่อใบสมัครถึงมูลนิธิฯ แล้ว และยังไม่ผ่าน / ยังไม่หมดเขต */
  tpCanSend(s) {
    return s.school_next === 'transfer' && ['waiting_transfer_proof', 'waiting_staff', 'need_more_info', 'waiting_manager'].includes(s.status)
      && ['todo', 'rejected'].includes(this.tpState(s));
  },
  tpSchoolOf(sub) {
    if (!sub) return null;
    return sub.school ? this.schoolById[sub.school] || {name: sub.school} : {name: sub.school_text, province: sub.province, district: sub.district, typed: true};
  },
  /* อีเมลแจ้ง: ครูโรงเรียนเดิมทุกครั้ง + นักเรียนเฉพาะคนที่ให้อีเมลไว้ */
  tpMail(s, subject, body) {
    const t = this.teacherOf(this.careSchool(s));
    const sub = this.tpLast(s) || {};
    const to = [];
    if (t && t.email) to.push({to: t.email, who: 'ครู ' + t.name});
    const se = sub.email != null ? sub.email : s.email;
    if (se) to.push({to: se, who: 'นักเรียน'});
    this.db.mails = this.db.mails || [];
    to.forEach(m => this.db.mails.push({at: nowIso(), code: s.code, to: m.to, who: m.who, subject, body}));
    return to.length;
  },
  tpRoundHint(s) {
    const c = this.db.cycle;
    return ['ป.6', 'ม.3'].includes(s.class) ? `ส่งครั้งแรกภายใน ${thDate(c.first_cutoff)} → พิจารณารอบที่ 1 · หลังจากนั้นถึง ${thDate(c.transfer_close)} → รอบที่ 2`
      : `ส่งได้ถึง ${thDate(c.transfer_close)}`;
  },
  /* สถานศึกษาที่ชื่อคล้ายกัน (สำหรับแอดมินจับคู่ชื่อที่นักเรียนพิมพ์เอง) */
  tpSuggest(sub) {
    const norm = x => String(x || '').replace(/\(จำลอง\)|โรงเรียน|วิทยาลัย|มหาวิทยาลัย|\s/g, '');
    const a = norm(sub.school_text);
    const grams = x => new Set(Array.from({length: Math.max(0, x.length - 1)}, (_, i) => x.slice(i, i + 2)));
    const ga = grams(a);
    const score = sc => { const gb = grams(norm(sc.name)); let n = 0; ga.forEach(g => { if (gb.has(g)) n++; }); return n / Math.max(1, Math.max(ga.size, gb.size)); };
    return this.db.schools.map(sc => ({sc, v: score(sc) + (sc.province === sub.province ? .15 : 0)}))
      .filter(x => x.v > .2).sort((x, y) => y.v - x.v).slice(0, 5).map(x => x.sc);
  },
});

/* ---------- ฟอร์มส่งหลักฐาน (นักเรียน / ครู) ---------- */
function tpForm(s, who, p) {
  const e = p.tpe || {};
  const last = this.tpLast(s);
  const ls = last && last.school ? this.schoolById[last.school] : null;
  const v = p.tpv || (last ? {region: ls ? ls.region : last.region, province: ls ? ls.province : last.province, district: ls ? ls.district : last.district,
    school: last.school || '', none: !last.school, text: last.school_text || '', cls: last.cls, proof: '', email: last.email}
    : {cls: s.next_class, email: who === 'student' ? s.email : s.email || ''});
  const file = this._tpFile && this._tpFile.code === s.code ? this._tpFile : null;
  const allClasses = Object.values(CLASS_GROUPS).flat();
  return `${errNote(e)}<form class="stack tp-form" data-submit="tp-submit" data-code="${s.code}" data-who="${who}" novalidate>
    <h4 class="tp-h">1. สถานศึกษาใหม่</h4>
    <div class="grid-2" data-area='{"school":true,"schoolLabel":"ชื่อสถานศึกษาใหม่"}'>${this.areaPicker('tp', v, {school: true, schoolLabel: 'ชื่อสถานศึกษาใหม่', err: {school: e.school}})}</div>
    <label class="choice tp-none"><input type="checkbox" name="tp_none" value="1" ${v.none ? 'checked' : ''} data-onchange="tp-none"> ไม่พบสถานศึกษาในรายชื่อ — พิมพ์ชื่อเอง</label>
    <div id="tp_none_box" ${v.none ? '' : 'hidden'}>${field('tp_text', 'ชื่อสถานศึกษาใหม่ (พิมพ์เอง)', input('tp_text', v.text, 'placeholder="เช่น โรงเรียน…วิทยาคม"'),
      {req: 1, err: e.text, hint: 'เลือกภาค / จังหวัด / อำเภอด้านบนด้วย · เจ้าหน้าที่จะตรวจสอบก่อนเพิ่มเข้าระบบ'})}</div>
    ${field('tp_cls', 'ระดับชั้นที่เรียนในสถานศึกษาใหม่', select('tp_cls', allClasses, v.cls, 'เลือกระดับชั้น'), {req: 1, err: e.cls, hint: `แจ้งไว้ในใบสมัคร: ${esc(s.next_class || '-')}`})}
    <h4 class="tp-h">2. หลักฐานการย้าย (อย่างใดอย่างหนึ่ง)</h4>
    ${radioField('tp_proof', '', TP_PROOF, v.proof, {col: 1, err: e.proof})}
    <div class="note info small">เอกสารต้องเห็นชัด 4 อย่าง: <b>ชื่อผู้ขอทุน · ชื่อสถานศึกษา · ระดับชั้น · ปีการศึกษา</b></div>
    <div class="field ${e.file ? 'invalid' : ''}"><span class="label">ไฟล์หลักฐาน <span class="req">*</span></span>
      <div class="row tp-file"><label class="btn"><input type="file" id="tp_file" accept="image/*,.pdf,.heic,.heif" data-onchange="tp-file" data-code="${s.code}" hidden>${icon('upload')} เลือกไฟล์</label>
        <button class="btn ghost sm" type="button" data-action="tp-sample" data-code="${s.code}">ใช้ไฟล์ตัวอย่าง (ทดลอง)</button></div>
      <div class="small" id="tp_file_name">${file ? `📎 ${esc(file.name)}${file.note ? ` <span class="muted">· ${esc(file.note)}</span>` : ''}` : '<span class="muted">ยังไม่ได้เลือกไฟล์</span>'}</div>
      <div class="hint">JPG / PNG / PDF / HEIC ไม่เกิน ${TP_MAX_MB} MB · ไฟล์ HEIC จาก iPhone ระบบแปลงเป็น JPG ให้อัตโนมัติ · รูปใหญ่ระบบย่อให้</div>
      ${e.file ? `<div class="err">${esc(e.file)}</div>` : ''}</div>
    <h4 class="tp-h">3. อีเมลสำหรับแจ้งผล</h4>
    ${field('tp_email', who === 'student' ? 'อีเมลของนักเรียน' : 'อีเมลของนักเรียน (ถ้ามี)', input('tp_email', v.email, 'type="email" inputmode="email" autocomplete="email" placeholder="ไม่มี เว้นว่างได้"'),
      {err: e.email, hint: 'ใช้แจ้งผลการตรวจหลักฐานว่าใช้ได้หรือไม่ · หากไม่มีอีเมล ระบบจะแจ้งผ่านครูผู้ดูแลทุน และดูสถานะได้ในหน้านี้'})}
    <button class="btn primary block" type="submit">ส่งหลักฐานการย้าย</button>
  </form>`;
}

/* การ์ดสถานะ + ฟอร์ม ใช้ทั้งหน้านักเรียนและหน้าครู */
function tpCard(s, who, p = {}) {
  const st = this.tpState(s);
  const last = this.tpLast(s);
  const subs = (s.tp || {}).subs || [];
  const tr = this.db.transfers.filter(t => t.code === s.code).slice(-1)[0];
  const sentToFdn = ['waiting_transfer_proof', 'waiting_staff', 'need_more_info', 'waiting_manager', 'decided'].includes(s.status);
  const dl = `<div class="tp-deadline">หมดเขตส่งหลักฐาน <b>${thDate(this.db.cycle.transfer_close)}</b>${this.tpOpen() ? ` · เหลืออีก <b>${this.tpDaysLeft()}</b> วัน` : ''}${['ป.6', 'ม.3'].includes(s.class) ? `<div class="small muted">${esc(this.tpRoundHint(s))}</div>` : ''}</div>`;
  const sum = sub => { const sc = this.tpSchoolOf(sub);
    return `<dl class="kv tp-kv"><div><dt>สถานศึกษาใหม่</dt><dd>${esc(sc.name)}${sc.typed ? ' <span class="badge t-warn">พิมพ์เอง</span>' : ''}<div class="small muted">${esc(sc.district || '')} จ.${esc(sc.province || '')}</div></dd></div>
      <div><dt>ระดับชั้น</dt><dd>${esc(sub.cls)}</dd></div><div><dt>หลักฐาน</dt><dd>${esc(tpProofName(sub.proof))}<div class="small muted">📎 ${esc(sub.file)}</div></dd></div>
      <div><dt>ส่งโดย</dt><dd>${TP_BY[sub.by]}${sub.by_name ? ` (${esc(sub.by_name)})` : ''}<div class="small muted">${thDate(sub.at, true)} · ครั้งที่ ${sub.n}</div></dd></div></dl>`; };
  let body;
  if (!sentToFdn) body = `<div class="note info">ส่งหลักฐานการย้ายได้หลังใบสมัครถึงมูลนิธิฯ แล้ว</div>`;
  else if (st === 'pending') body = `<div class="note info"><b>ส่งหลักฐานแล้ว — รอเจ้าหน้าที่ตรวจ</b><br><span class="small">ระหว่างรอตรวจแก้ไขไม่ได้ · ผลการตรวจจะแจ้งทางอีเมลและแสดงในหน้านี้</span></div>${sum(last)}`;
  else if (st === 'done') body = `<div class="note ok"><b>✓ เจ้าหน้าที่ตรวจหลักฐานแล้ว ถูกต้อง</b>${tr ? `<br><span class="small">ย้ายไป ${esc(this.schoolName(tr.to))} · ชั้น ${esc(tr.cls)}</span>` : ''}</div>
    ${last && s.tp && s.tp.state === 'approved' ? sum(last) : ''}<p class="small muted">หากย้ายสถานศึกษาอีกครั้ง กรุณาโทรแจ้งเจ้าหน้าที่มูลนิธิฯ เพื่อเปิดสิทธิ์แจ้งย้ายใหม่</p>`;
  else if (st === 'closed') body = `<div class="note bad"><b>หมดเขตส่งหลักฐานแล้ว</b> (${thDate(this.db.cycle.transfer_close)}) — ไม่รับเอกสารเพิ่ม</div>${last ? sum(last) : ''}`;
  else if (st === 'rejected') body = `<div class="note bad"><b>หลักฐานไม่ผ่าน — กรุณาอัปโหลดใหม่</b><ul class="tp-why">${(last.reasons || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      <span class="small">ตรวจโดย ${esc(last.reviewer || '')} · ${thDate(last.reviewed_at, true)}</span></div>${dl}${tpForm.call(this, s, who, p)}`;
  else body = `<div class="note warn">${who === 'student' ? 'คุณแจ้งว่าจะ <b>ย้ายสถานศึกษา</b>' : 'นักเรียนแจ้งว่าจะ <b>ย้ายสถานศึกษา</b>'}${s.next_school_text ? ` ไปที่ <b>${esc(s.next_school_text)}</b>` : ''}
      — กรุณาส่งหลักฐานการย้าย หากไม่ส่งภายในกำหนดถือว่าสละสิทธิ์</div>${dl}${tpForm.call(this, s, who, p)}`;
  const hist = subs.length ? `<details class="more tp-hist"${st === 'rejected' ? ' open' : ''}><summary>ประวัติการส่ง (${subs.length})</summary><ol class="timeline">${subs.slice().reverse().map(x =>
    `<li class="${x.result === 'approved' ? 'done' : x.result === 'rejected' ? 'bad' : 'now'}">ครั้งที่ ${x.n} · ${TP_BY[x.by]} · ${x.result === 'approved' ? 'ผ่าน' : x.result === 'rejected' ? 'ไม่ผ่าน' : 'รอตรวจ'}
      <small>${thDate(x.at, true)}${x.reasons && x.reasons.length ? ' · ' + esc(x.reasons.join(', ')) : ''}</small></li>`).join('')}</ol></details>` : '';
  return `<section class="card tp-card tp-${st}" id="tp-card"><div class="card-head"><h3>แจ้งย้ายสถานศึกษา</h3>${tpBadge(st)}</div>${body}${hist}</section>`;
}

App.on('tp-none', function (el) {
  const box = document.getElementById('tp_none_box');
  if (box) box.hidden = !el.checked;
  if (el.checked) { const t = document.getElementById('tp_text'); if (t) t.focus(); }
});
/* ไฟล์: จำกัดขนาด · HEIC → JPG · ย่อรูปใหญ่ (ต้นแบบ: เปลี่ยนชื่อ/แจ้งผล ไม่ได้แปลงจริง) */
App.on('tp-file', function (el) {
  const f = el.files && el.files[0];
  if (!f) return;
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if (!TP_EXT.includes(ext)) { this.toast('รองรับเฉพาะ JPG / PNG / PDF / HEIC'); el.value = ''; return; }
  if (f.size > TP_MAX_MB * 1048576) { this.toast(`ไฟล์ใหญ่เกิน ${TP_MAX_MB} MB`); el.value = ''; return; }
  const heic = ['heic', 'heif'].includes(ext);
  const notes = [];
  if (heic) notes.push('แปลง HEIC เป็น JPG แล้ว');
  if (ext !== 'pdf' && f.size > 2 * 1048576) notes.push('ย่อขนาดรูปอัตโนมัติ');
  this._tpFile = {code: el.dataset.code, name: heic ? f.name.replace(/\.[^.]+$/, '.jpg') : f.name, ext: heic ? 'jpg' : ext === 'jpeg' ? 'jpg' : ext, note: notes.join(' · ')};
  const out = document.getElementById('tp_file_name');
  if (out) out.innerHTML = `📎 ${esc(this._tpFile.name)}${this._tpFile.note ? ` <span class="muted">· ${esc(this._tpFile.note)}</span>` : ''}`;
});
App.on('tp-sample', function (el) {
  this._tpFile = {code: el.dataset.code, name: 'IMG_2041.HEIC → IMG_2041.jpg', ext: 'jpg', note: 'แปลง HEIC เป็น JPG แล้ว · ย่อขนาดรูปอัตโนมัติ'};
  const out = document.getElementById('tp_file_name');
  if (out) out.innerHTML = `📎 IMG_2041.jpg <span class="muted">· ${esc(this._tpFile.note)}</span>`;
});
App.on('tp-submit', function (form) {
  const s = this.studentByCode[form.dataset.code];
  const who = form.dataset.who;
  if (!this.tpCanSend(s)) { this.toast('ส่งหลักฐานไม่ได้ในสถานะนี้'); return; }
  const v = formData(form);
  const a = this.readArea('tp');
  const none = !!v.tp_none;
  const file = this._tpFile && this._tpFile.code === s.code ? this._tpFile : null;
  const e = {};
  if (none) { if (!v.tp_text) e.text = 'กรุณาพิมพ์ชื่อสถานศึกษาใหม่'; if (!a.province) e.school = 'กรุณาเลือกภาค / จังหวัด / อำเภอของสถานศึกษาใหม่'; }
  else if (!a.school) e.school = 'กรุณาเลือกสถานศึกษาใหม่ หรือติ๊ก “ไม่พบสถานศึกษาในรายชื่อ”';
  if (!v.tp_cls) e.cls = 'กรุณาเลือกระดับชั้น';
  if (!v.tp_proof) e.proof = 'กรุณาเลือกประเภทหลักฐาน';
  if (!file) e.file = 'กรุณาแนบไฟล์หลักฐาน';
  if (v.tp_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.tp_email)) e.email = 'รูปแบบอีเมลไม่ถูกต้อง';
  if (Object.keys(e).length) {
    this.go(this.view.name, {...this.view.params, tpe: e, tpv: {...a, none, text: v.tp_text, cls: v.tp_cls, proof: v.tp_proof, email: v.tp_email}});
    setTimeout(() => { const c = document.getElementById('tp-card'); if (c) c.scrollIntoView({block: 'start'}); }, 0);
    return;
  }
  s.tp = s.tp || {subs: []};
  const n = s.tp.subs.length + 1;
  s.tp.subs.push({n, at: nowIso(), by: who, by_name: who === 'teacher' ? (this.teacherOf(this.careSchool(s)) || {}).name || '' : '',
    school: none ? '' : a.school, school_text: none ? v.tp_text : '', region: a.region, province: a.province, district: a.district,
    cls: v.tp_cls, proof: v.tp_proof, file: `${s.code}_14_TRANSFER_${n}.${file.ext}`, file_note: file.note, email: v.tp_email || ''});
  s.tp.state = 'pending';
  this._tpFile = null;
  addHistory(s, `${who === 'teacher' ? 'ครูโรงเรียนเดิม' : 'นักเรียน'}ส่งหลักฐานการย้ายสถานศึกษา (ครั้งที่ ${n}) — รอเจ้าหน้าที่ตรวจ`, 'transfer_submit');
  const m = this.tpMail(s, 'ได้รับหลักฐานการย้ายสถานศึกษาแล้ว — รอเจ้าหน้าที่ตรวจ', `${fullName(s)} (${s.code}) ส่งหลักฐานครั้งที่ ${n} แล้ว`);
  this.save();
  this.toast(`ส่งหลักฐานแล้ว · แจ้งทางอีเมล ${m} ฉบับ`);
  this.go(this.view.name, {code: (this.view.params || {}).code});
});

/* ---------- หน้าครู: นักเรียนที่แจ้งย้าย ---------- */
function tpTeacherSection() {
  const list = this.myStudents().filter(s => s.school_next === 'transfer' || s.tp);
  if (!list.length) return '';
  const cnt = k => list.filter(s => this.tpState(s) === k).length;
  const bad = cnt('rejected');
  return `<section class="card tp-tcard"><div class="card-head"><div><h3>นักเรียนที่แจ้งย้ายสถานศึกษา</h3>
      <div class="small muted">หมดเขตส่งหลักฐาน ${thDate(this.db.cycle.transfer_close)}${this.tpOpen() ? ` · เหลืออีก ${this.tpDaysLeft()} วัน` : ''} · ครูอัปโหลดแทนนักเรียนได้</div></div>
      <div class="row tp-chips">${['todo', 'pending', 'rejected', 'done'].map(k => `<span class="tp-chip">${TP_STATE[k][0]} <b>${cnt(k)}</b></span>`).join('')}</div></div>
    ${bad ? `<div class="note bad small">มีนักเรียน <b>${bad} คน</b> ที่หลักฐานไม่ผ่าน ต้องอัปโหลดใหม่</div>` : ''}
    <div class="tp-tlist">${list.map(s => { const st = this.tpState(s), last = this.tpLast(s);
      const tr = st === 'done' ? this.db.transfers.filter(t => t.code === s.code).slice(-1)[0] : null;
      const sc = tr ? {name: this.schoolName(tr.to)} : this.tpSchoolOf(last);
      const act = this.tpCanSend(s) ? (st === 'rejected' ? 'อัปโหลดใหม่' : 'อัปโหลดแทน') : 'ดู';
      return `<button class="tp-trow" data-go="teacher-transfer" data-code="${s.code}">
        <span class="c-name">${esc(fullName(s))}<small class="num">${s.code} · ${esc(s.class || '-')} → ${esc((last && last.cls) || s.next_class || '-')}</small></span>
        <span class="c-to">${sc ? esc(sc.name) : `<span class="muted">${esc(s.next_school_text || 'ยังไม่ระบุ')}</span>`}</span>
        <span class="c-st">${tpBadge(st)}${st === 'rejected' && last ? `<small class="bad-t">${esc((last.reasons || [])[0] || '')}</small>` : ''}</span>
        <span class="c-by">${last ? `ส่งโดย${TP_BY[last.by]}` : '—'}</span>
        <span class="c-act"><span class="btn sm ${act === 'ดู' ? '' : 'primary'}">${act}</span></span></button>`; }).join('')}</div></section>`;
}
App.views['teacher-transfer'] = function (p) {
  const s = this.studentByCode[p.code];
  if (!s || this.careSchool(s) !== this.session.school) return this.views['teacher-home'].call(this, {});
  return {nav: this.teacherNav(), html: `
    <button class="back" data-go="teacher-home">${icon('back')} รายชื่อนักเรียน</button>
    <div class="page-head"><div><h1>${esc(fullName(s))}</h1><p class="sub"><span class="num">${s.code}</span> · แจ้งย้ายสถานศึกษา</p></div></div>
    <div class="split"><div class="stack">${tpCard.call(this, s, 'teacher', p)}</div>
      <aside class="stack"><section class="card"><h3>ข้อมูลนักเรียน</h3><dl class="kv">
        <div><dt>สถานศึกษาเดิม</dt><dd>${esc(this.schoolName(this.careSchool(s)))}</dd></div>
        <div><dt>ชั้นปีนี้ → ปีหน้า</dt><dd>${esc(s.class || '-')} → ${esc(s.next_class || '-')}</dd></div>
        <div><dt>นักเรียนแจ้งว่าจะไปเรียนที่</dt><dd>${esc(s.next_school_text || 'ยังไม่ทราบ')}</dd></div>
        <div><dt>ประเภททุน</dt><dd>${TYPE[s.type]}</dd></div></dl>
        <p class="small muted">ครูไม่ต้องให้ความเห็นเพิ่ม หลักฐานส่งตรงถึงมูลนิธิฯ</p></section></aside></div>`};
};

/* ---------- หน้าเจ้าหน้าที่: ตรวจหลักฐานรายคน ---------- */
App.views['staff-tp'] = function (p) {
  const s = this.studentByCode[p.code];
  const role = this.session.staffRole;
  const st = this.tpState(s);
  const tp = s.tp || {subs: []};
  const last = this.tpLast(s);
  const sc = this.tpSchoolOf(last);
  const from = this.schoolById[this.careSchool(s)] || {};
  const t = this.teacherOf(this.careSchool(s));
  const admin = role === 'admin';
  const e = p.errors || {};
  const groups = tp.subs.slice().reverse().map(x => ({title: `ครั้งที่ ${x.n} · ${tpProofName(x.proof)} · ${x.result === 'approved' ? 'ผ่าน' : x.result === 'rejected' ? 'ไม่ผ่าน' : 'รอตรวจ'}`,
    files: [{k: 'tp' + x.n, f: x.file, title: `ครั้งที่ ${x.n} — ${tpProofName(x.proof)}`, src: pvMock(s, x.proof === 'studentcard' ? '01_IDCARD' : 'TP', tpProofName(x.proof), x.file, x.n)}]}));
  const mails = (this.db.mails || []).filter(m => m.code === s.code).slice().reverse();
  const ac = s.amount_check;
  /* แผงขวา */
  let panel = '';
  if (s.school_next !== 'transfer') {
    panel = `<p class="small">นักเรียนแจ้งว่า <b>เรียนต่อที่เดิม</b> — ถ้านักเรียนโทรแจ้งว่าย้ายจริง เปิดสิทธิ์ให้นักเรียน / ครูส่งหลักฐานการย้ายได้</p>
      ${s.status === 'decided' ? '<div class="note warn small">พิจารณาผลแล้ว เปิดสิทธิ์ไม่ได้</div>' : `${field('tp_reopen', 'เหตุผล', textarea('tp_reopen', '', 'rows="2" placeholder="เช่น ผู้ปกครองโทรแจ้งวันที่ …"'), {req: 1, err: e.reopen})}
      <button class="btn primary block" type="button" data-action="tp-reopen" data-code="${s.code}">เปิดสิทธิ์แจ้งย้ายสถานศึกษา</button>`}`;
  } else if (st === 'pending') {
    const noSchool = !last.school;
    panel = `<div class="subcard"><span class="label">ตรวจหลักฐาน: ${esc(tpProofName(last.proof))}</span><span class="small">เอกสารต้องเห็นชัดและตรงกับข้อมูล</span></div>
      <div class="tp-checks">${TP_CHECK.map(([k, l]) => `<label class="choice"><input type="checkbox" name="ck" value="${k}"> <span>${l}${k === 'school' ? ` <span class="small muted">(${esc(sc.name)})</span>` : k === 'cls' ? ` <span class="small muted">(${esc(last.cls)})</span>` : k === 'year' ? ` <span class="small muted">(${this.db.cycle.year})</span>` : ''}</span></label>`).join('')}</div>
      <div class="tp-checks bad">${TP_BAD.map(([k, l]) => `<label class="choice"><input type="checkbox" name="bad" value="${k}"> ${l}</label>`).join('')}</div>
      ${field('tp_reason', 'เหตุผลเพิ่มเติม (ถ้าไม่ผ่าน)', textarea('tp_reason', '', 'rows="2" placeholder="ระบบใส่เหตุผลจากข้อที่ไม่ได้ติ๊กให้อัตโนมัติ"'), {err: e.reason})}
      ${noSchool ? `<div class="note warn small"><b>สถานศึกษาที่พิมพ์เอง:</b> ${esc(last.school_text)} (จ.${esc(last.province || '-')})<br>${admin ? 'ยืนยันสถานศึกษาด้านล่างก่อนกด “ผ่าน”' : 'รอแอดมินยืนยันสถานศึกษาก่อน จึงกด “ผ่าน” ได้ · กด “ไม่ผ่าน” ได้ตามปกติ'}</div>` : ''}
      ${e.ok ? `<div class="err">${esc(e.ok)}</div>` : ''}
      <div class="row tp-btns"><button class="btn primary" type="button" data-action="tp-decide" data-ok="1" data-code="${s.code}" ${noSchool ? 'disabled' : ''}>✓ ผ่าน</button>
        <button class="btn danger" type="button" data-action="tp-decide" data-ok="0" data-code="${s.code}">✕ ไม่ผ่าน</button></div>
      <p class="tiny muted">กดแล้วระบบแจ้งอีเมลครูโรงเรียนเดิม (และนักเรียนถ้ามีอีเมล) แล้วเปิดคนถัดไปที่รอตรวจ</p>`;
  } else if (st === 'done') {
    panel = `<div class="note ok small"><b>หลักฐานผ่านแล้ว</b> · นักเรียน / ครูแก้ไขไม่ได้</div>
      ${s.status === 'decided' ? '' : `<details class="more"><summary>นักเรียนโทรแจ้งว่าย้ายอีก?</summary><div class="stack">
        ${field('tp_reopen', 'เหตุผลที่เปิดสิทธิ์', textarea('tp_reopen', '', 'rows="2"'), {req: 1, err: e.reopen})}
        <button class="btn block" type="button" data-action="tp-reopen" data-code="${s.code}">เปิดสิทธิ์แจ้งย้ายครั้งที่ ${(tp.reopens || []).length + 2}</button></div></details>`}`;
  } else {
    panel = `<div class="note ${st === 'rejected' || st === 'closed' ? 'bad' : 'warn'} small">${st === 'rejected' ? 'ตีกลับแล้ว รอนักเรียน / ครูอัปโหลดใหม่' : st === 'closed' ? 'หมดเขตแล้ว ยังไม่ผ่าน — เจ้าหน้าที่ตัดสินใจ' : 'ยังไม่ส่งหลักฐาน'}</div>
      ${st === 'closed' ? '' : `<button class="btn block" type="button" data-action="tp-remind-one" data-code="${s.code}">ส่งอีเมลเตือน</button>`}
      <button class="btn block" type="button" data-go="staff-transfer" data-code="${s.code}">บันทึกการย้ายแทน (แจ้งทางโทรศัพท์ / กระดาษ)</button>`;
  }
  const schoolBox = admin && st === 'pending' && last && !last.school ? (() => { const sug = this.tpSuggest(last);
    return `<section class="card stack"><h3>ยืนยันสถานศึกษาใหม่ (แอดมิน)</h3>
      <p class="small">นักเรียนพิมพ์: <b>${esc(last.school_text)}</b> · ${esc(last.district || '')} จ.${esc(last.province || '-')}</p>
      ${sug.length ? `${radioField('tp_match', 'มีอยู่แล้วในระบบ? (ชื่อคล้ายกัน)', sug.map(x => [x.id, x.name, `${x.district} จ.${x.province}`]), '', {col: 1})}
        <button class="btn block" type="button" data-action="tp-school-match" data-code="${s.code}">ใช้สถานศึกษาที่เลือก</button>` : '<p class="small muted">ไม่พบชื่อคล้ายกันในระบบ</p>'}
      <div class="subcard stack"><span class="label">หรือเพิ่มเป็นสถานศึกษาใหม่</span>
        ${field('tp_new_name', 'ชื่อสถานศึกษา (แก้ได้)', input('tp_new_name', last.school_text), {err: e.newName})}
        ${field('tp_new_type', 'ประเภท', select('tp_new_type', [['school', 'โรงเรียน'], ['college', 'วิทยาลัย'], ['university', 'มหาวิทยาลัย']], /วิทยาลัย/.test(last.school_text) ? 'college' : /มหาวิทยาลัย/.test(last.school_text) ? 'university' : 'school'))}
        <button class="btn block" type="button" data-action="tp-school-add" data-code="${s.code}">ยืนยันเพิ่มเข้าระบบ</button></div></section>`; })() : '';
  const amountBox = ac && ac.state === 'pending' ? (admin ? `<section class="card stack tp-amount"><h3>ยอดเงินเปลี่ยนจากการย้าย (แอดมิน)</h3>
      <p class="small">การย้ายทำให้อัตราทุนเปลี่ยน — เลือกยอดที่ใช้ พิจารณาเป็นรายคน</p>
      ${radioField('tp_amt', 'ยอดเงินทุน', [['old', `ใช้ยอดเดิม ${baht(ac.before)}`, ac.before_label || ''], ['new', `ใช้ยอดใหม่ ${baht(ac.after)}`, ac.after_label || '']], '', {col: 1, req: 1, err: e.amt})}
      ${field('tp_amt_reason', 'เหตุผล', textarea('tp_amt_reason', '', 'rows="2"'), {req: 1, err: e.amtReason})}
      <button class="btn primary block" type="button" data-action="tp-amount" data-code="${s.code}">ยืนยันยอดเงิน</button></section>`
    : `<div class="note warn small"><b>ยอดเงินเปลี่ยนจากการย้าย</b> ${baht(ac.before)} → ${baht(ac.after)} · รอแอดมินยืนยัน (ผู้จัดการพิจารณาได้หลังยืนยัน)</div>`) : '';
  return {nav: this.staffNav(), html: `${this.roleBar()}
    <button class="back" data-go="staff-transfer">${icon('back')} รายชื่อนักเรียนแจ้งย้าย</button>
    <div class="page-head"><div><h1><span class="num">${s.code}</span> — ${esc(fullName(s))}</h1><p class="sub">ตรวจหลักฐานการย้ายสถานศึกษา</p></div>
      <div class="row">${tpBadge(st)}${badge(s)}<button class="btn sm" data-go="staff-app" data-code="${s.code}">เปิดใบสมัคร</button></div></div>
    <div class="split">
      <div class="rv-left"><div class="stack">
        <section class="card"><dl class="kv tp-kv">
          <div><dt>สถานศึกษาเดิม</dt><dd>${esc(from.name || '-')}<div class="small muted">${esc(from.district || '')} จ.${esc(from.province || '')}</div></dd></div>
          <div><dt>→ สถานศึกษาใหม่</dt><dd>${sc ? `${esc(sc.name)}${sc.typed ? ' <span class="badge t-warn">พิมพ์เอง</span>' : ''}<div class="small muted">${esc(sc.district || '')} จ.${esc(sc.province || '')}</div>` : '<span class="muted">ยังไม่ส่ง</span>'}</dd></div>
          <div><dt>ชั้นปีนี้ → ปีหน้า</dt><dd>${esc(s.class || '-')} → ${esc((last && last.cls) || s.next_class || '-')}${last && last.cls !== s.next_class && st !== 'done' ? `<div class="small muted">ใบสมัครแจ้ง ${esc(s.next_class || '-')}</div>` : ''}</dd></div>
          <div><dt>ส่งโดย</dt><dd>${last ? `${TP_BY[last.by]} · ครั้งที่ ${last.n}<div class="small muted">${thDate(last.at, true)}</div>` : '—'}</dd></div>
          <div><dt>ครูผู้ดูแล (รับอีเมล)</dt><dd>${t ? `${esc(t.name)}<div class="small muted">${esc(t.email)}</div>` : '<span class="badge t-bad">ไม่มีข้อมูลครูผู้ดูแล</span>'}</dd></div>
          <div><dt>อีเมลนักเรียน</dt><dd>${esc((last && last.email) || '—')}</dd></div>
          <div><dt>กำหนดส่ง</dt><dd>${esc(this.tpRoundHint(s))}</dd></div></dl></section>
        ${groups.length ? `<section class="card"><h3>ไฟล์หลักฐาน</h3>${pvViewerG(groups, {open: true})}</section>` : ''}
        <section class="card"><h3>หมายเหตุของเจ้าหน้าที่</h3>
          ${field('tp_note', '', textarea('tp_note', tp.note || '', 'rows="2" placeholder="เช่น เอกสารน่าสงสัย โทรสอบถามโรงเรียนแล้ว"'))}
          <div class="row end"><button class="btn sm" type="button" data-action="tp-note" data-code="${s.code}">บันทึกหมายเหตุ</button></div></section>
        <section class="card"><h3>ประวัติ</h3>${tp.subs.length || (tp.reopens || []).length ? `<ol class="timeline">${[...tp.subs.map(x => ({at: x.reviewed_at || x.at,
          txt: `ครั้งที่ ${x.n} · ส่งโดย${TP_BY[x.by]} ${thDate(x.at, true)} · ${x.result === 'approved' ? `ผ่าน (${esc(x.reviewer)})` : x.result === 'rejected' ? `ไม่ผ่าน (${esc(x.reviewer)}): ${esc((x.reasons || []).join(', '))}` : 'รอตรวจ'}`})),
          ...(tp.reopens || []).map(r => ({at: r.at, txt: `${esc(r.by)} เปิดสิทธิ์แจ้งย้าย: ${esc(r.reason)}`}))].sort((a, b) => b.at.localeCompare(a.at)).map(x => `<li class="done">${x.txt}<small>${thDate(x.at, true)}</small></li>`).join('')}</ol>` : '<p class="small muted">ยังไม่มีการส่งหลักฐาน</p>'}</section>
        <section class="card"><h3>อีเมลที่ระบบส่ง (${mails.length})</h3>${mails.length ? `<div class="tp-mails">${mails.map(m => `<div class="tp-mail"><b>${esc(m.subject)}</b><span class="small muted">ถึง ${esc(m.who)} · ${esc(m.to)} · ${thDate(m.at, true)}</span></div>`).join('')}</div>` : '<p class="small muted">ยังไม่มี</p>'}</section>
      </div></div>
      <aside class="stack rv-side" id="rv-side"><section class="card"><div class="rv-sheet-head"><h3>ตรวจหลักฐาน</h3><button class="btn sm rv-close" type="button" data-action="rv-sheet">ปิด</button></div>
        <div class="stack" id="tp-panel">${panel}</div></section>${schoolBox}${amountBox}</aside>
    </div>
    <div class="rv-bar"><span>ตรวจหลักฐาน</span><button class="btn primary sm" type="button" data-action="rv-sheet">${st === 'pending' ? 'ผ่าน / ไม่ผ่าน' : 'จัดการ'}</button></div>
    <div class="rv-dim" data-action="rv-sheet"></div>`,
    after() { focusFirstError(); const th = document.querySelector('#pv .pv-th'); if (th && innerWidth > 900) App.dispatch('pv-pick', th); }};
};

/* ผ่าน: บันทึกการย้าย (ใช้วันที่ส่งครั้งแรกนับรอบ) · ยอดเงินเปลี่ยน → รอแอดมินยืนยัน */
function tpApply(s, sub) {
  const before = this.stdRate(s), beforeName = this.rateName(s.rate);
  const from = s.school;
  this.db.transfers.push({code: s.code, from, to: sub.school, cls: sub.cls, date: s.tp.subs[0].at.slice(0, 10),
    note: `ตรวจหลักฐานผ่าน (${tpProofName(sub.proof)} · ส่งโดย${TP_BY[sub.by]})`, by: this.session.name, at: nowIso(), via: 'proof'});
  s.home_school = s.home_school || from;
  s.school = sub.school;
  const clsChanged = sub.cls !== s.next_class;
  s.next_class = sub.cls;
  s.rate = rateOf(sub.cls, /^ปวส/.test(sub.cls) ? (s.next_pvs_type || s.pvs_type) : '') || s.rate;
  const after = this.stdRate(s);
  if (after.amount !== before.amount) {
    s.amount_check = {state: 'pending', before: before.amount, after: after.amount, at: nowIso(),
      before_label: `${beforeName}${before.special ? ' (อัตราพิเศษ)' : ''}`, after_label: `${this.rateName(s.rate)}${after.special ? ' (อัตราพิเศษ)' : ''}${clsChanged ? ' · ระดับชั้นเปลี่ยน' : ''}`};
    addHistory(s, `ยอดเงินทุนเปลี่ยนจากการย้าย ${baht(before.amount)} → ${baht(after.amount)} — รอแอดมินยืนยัน`, 'amount_check');
  }
  addHistory(s, `${this.session.name} ตรวจหลักฐานการย้ายผ่าน: ${this.schoolName(from)} → ${this.schoolName(sub.school)} ชั้น ${sub.cls}`, 'transfer');
  if (s.status === 'waiting_transfer_proof') { s.status = 'waiting_staff'; addHistory(s, 'ได้รับหลักฐานการย้ายสถานศึกษาแล้ว — รอเจ้าหน้าที่ดำเนินการ', 'transfer_proof'); }
}
App.on('tp-decide', function (el) {
  const s = this.studentByCode[el.dataset.code];
  const sub = this.tpLast(s);
  const box = document.getElementById('tp-panel');
  const ck = [...box.querySelectorAll('[name=ck]:checked')].map(x => x.value);
  const bad = [...box.querySelectorAll('[name=bad]:checked')].map(x => x.value);
  const reason = (document.getElementById('tp_reason') || {}).value.trim();
  const ok = el.dataset.ok === '1';
  if (ok) {
    if (ck.length < 4 || bad.length) { this.go('staff-tp', {code: s.code, errors: {ok: 'กด “ผ่าน” ได้เมื่อติ๊กครบ 4 จุด และไม่มีข้อที่ไม่ผ่าน'}}); return; }
    if (!sub.school) { this.toast('รอแอดมินยืนยันสถานศึกษาก่อน'); return; }
    sub.result = 'approved';
    s.tp.state = 'approved';
    tpApply.call(this, s, sub);
  } else {
    const reasons = TP_CHECK.filter(([k]) => !ck.includes(k)).map(([, l]) => `ไม่เห็น${l}ชัดเจน หรือไม่ตรงกับข้อมูล`)
      .concat(TP_BAD.filter(([k]) => bad.includes(k)).map(([, l]) => l)).concat(reason ? [reason] : []);
    if (ck.length === 4 && !bad.length && !reason) { this.go('staff-tp', {code: s.code, errors: {reason: 'ติ๊กครบ 4 จุดแล้ว — ถ้าไม่ผ่าน กรุณาระบุเหตุผล'}}); return; }
    sub.result = 'rejected';
    sub.reasons = reasons;
    s.tp.state = 'rejected';
    addHistory(s, `${this.session.name} ตรวจหลักฐานการย้าย: ไม่ผ่าน — ${reasons.join(', ')}`, 'transfer_reject');
  }
  sub.reviewer = this.session.name;
  sub.reviewed_at = nowIso();
  sub.checks = ck;
  const m = ok ? this.tpMail(s, 'หลักฐานการย้ายสถานศึกษาผ่านแล้ว', `${fullName(s)} (${s.code})`)
    : this.tpMail(s, 'หลักฐานการย้ายสถานศึกษาไม่ผ่าน — กรุณาอัปโหลดใหม่', `${fullName(s)} (${s.code}) เหตุผล: ${sub.reasons.join(', ')} · ส่งใหม่ได้ถึง ${thDate(this.db.cycle.transfer_close)}`);
  this.save();
  const next = this.db.students.find(x => x.code !== s.code && this.tpState(x) === 'pending');
  this.toast(`${ok ? 'ผ่าน' : 'ไม่ผ่าน'} · แจ้งทางอีเมล ${m} ฉบับ${next ? ' · เปิดคนถัดไป' : ''}`);
  this.go(next ? 'staff-tp' : 'staff-transfer', next ? {code: next.code} : {});
});
App.on('tp-reopen', function (el) {
  const s = this.studentByCode[el.dataset.code];
  const reason = (document.getElementById('tp_reopen') || {}).value.trim();
  if (!reason) { this.go('staff-tp', {code: s.code, errors: {reopen: 'กรุณาระบุเหตุผล'}}); return; }
  s.tp = s.tp || {subs: []};
  (s.tp.reopens = s.tp.reopens || []).push({at: nowIso(), by: this.session.name, reason});
  s.tp.state = 'reopened';
  s.school_next = 'transfer';
  if (s.status !== 'decided' && s.status !== 'waiting_transfer_proof') { s.status = 'waiting_transfer_proof'; }
  addHistory(s, `${this.session.name} เปิดสิทธิ์แจ้งย้ายสถานศึกษา: ${reason} — รอหลักฐานการย้าย`, 'transfer_reopen');
  this.tpMail(s, 'มูลนิธิฯ เปิดสิทธิ์แจ้งย้ายสถานศึกษา — กรุณาส่งหลักฐาน', `ส่งได้ถึง ${thDate(this.db.cycle.transfer_close)}`);
  this.save();
  this.toast('เปิดสิทธิ์แจ้งย้ายแล้ว');
  this.go('staff-tp', {code: s.code});
});
App.on('tp-note', function (el) {
  const s = this.studentByCode[el.dataset.code];
  s.tp = s.tp || {subs: []};
  s.tp.note = document.getElementById('tp_note').value.trim();
  this.save();
  this.toast('บันทึกหมายเหตุแล้ว');
});
App.on('tp-school-match', function (el) {
  const s = this.studentByCode[el.dataset.code];
  const id = (document.querySelector('[name=tp_match]:checked') || {}).value;
  if (!id) { this.toast('กรุณาเลือกสถานศึกษา'); return; }
  const sub = this.tpLast(s);
  addHistory(s, `${this.session.name} จับคู่สถานศึกษาที่พิมพ์เอง “${sub.school_text}” กับ ${this.schoolName(id)}`, 'school_match');
  sub.school = id;
  this.save();
  this.toast('ยืนยันสถานศึกษาแล้ว — ตรวจหลักฐานต่อได้');
  this.go('staff-tp', {code: s.code});
});
App.on('tp-school-add', function (el) {
  const s = this.studentByCode[el.dataset.code];
  const sub = this.tpLast(s);
  const name = document.getElementById('tp_new_name').value.trim();
  if (!name) { this.go('staff-tp', {code: s.code, errors: {newName: 'กรุณาระบุชื่อสถานศึกษา'}}); return; }
  const type = document.getElementById('tp_new_type').value;
  const n = this.db.schools.filter(x => /^SCH-N/.test(x.id)).length + 1;
  const id = 'SCH-N' + String(n).padStart(3, '0');
  this.db.schools.push({id, name, type, region: sub.region, province: sub.province, district: sub.district, subdistrict: '', address: '', postcode: '',
    levels: [], special_rate: false, modes: type === 'college' ? ['regular', 'dual'] : type === 'university' ? ['regular', 'special'] : ['regular'], added_by: this.session.name, added_at: nowIso()});
  sub.school = id;
  addHistory(s, `${this.session.name} เพิ่มสถานศึกษาใหม่เข้าระบบ: ${name}`, 'school_add');
  this.save();
  this.toast(`เพิ่ม “${name}” เข้าระบบแล้ว`);
  this.go('staff-tp', {code: s.code});
});
App.on('tp-amount', function (el) {
  const s = this.studentByCode[el.dataset.code];
  const pick = (document.querySelector('[name=tp_amt]:checked') || {}).value;
  const reason = document.getElementById('tp_amt_reason').value.trim();
  const e = {};
  if (!pick) e.amt = 'กรุณาเลือกยอดเงิน';
  if (!reason) e.amtReason = 'กรุณาระบุเหตุผล';
  if (Object.keys(e).length) { this.go('staff-tp', {code: s.code, errors: e}); return; }
  const ac = s.amount_check;
  Object.assign(ac, {state: 'done', choice: pick, reason, by: this.session.name, done_at: nowIso()});
  if (pick === 'old') s.amount_lock = ac.before; else delete s.amount_lock;
  addHistory(s, `${this.session.name} ยืนยันยอดเงินทุนหลังย้าย: ใช้ยอด${pick === 'old' ? 'เดิม ' + baht(ac.before) : 'ใหม่ ' + baht(ac.after)} — ${reason}`, 'amount_confirm');
  this.save();
  this.toast('ยืนยันยอดเงินแล้ว');
  this.go('staff-tp', {code: s.code});
});
/* อีเมลเตือน: คนที่ยังไม่ส่ง / ไม่ผ่าน */
App.on('tp-remind', function () {
  const list = this.db.students.filter(s => s.school_next === 'transfer' && ['todo', 'rejected'].includes(this.tpState(s))
    && ['waiting_transfer_proof', 'waiting_staff', 'need_more_info', 'waiting_manager'].includes(s.status));
  const left = this.tpDaysLeft();
  const m = list.reduce((n, s) => n + this.tpMail(s, `เตือน: เหลือ ${left} วัน หมดเขตส่งหลักฐานการย้ายสถานศึกษา`, `ส่งได้ถึง ${thDate(this.db.cycle.transfer_close)}`), 0);
  this.save();
  this.toast(`ส่งเตือนแล้ว ${list.length} คน · อีเมล ${m} ฉบับ`);
});
App.on('tp-remind-one', function (el) {
  const s = this.studentByCode[el.dataset.code];
  const m = this.tpMail(s, `เตือน: เหลือ ${this.tpDaysLeft()} วัน หมดเขตส่งหลักฐานการย้ายสถานศึกษา`, `ส่งได้ถึง ${thDate(this.db.cycle.transfer_close)}`);
  this.save();
  this.toast(m ? `ส่งอีเมลเตือนแล้ว ${m} ฉบับ` : 'ไม่มีอีเมลผู้รับ (ไม่มีข้อมูลครูผู้ดูแล)');
  this.go('staff-tp', {code: s.code});
});
