/* ส่วนกลาง: ข้อมูล, การเก็บสถานะ, ตัวช่วยแสดงผล, การเปลี่ยนหน้า, หน้าเลือกบทบาท
   เงื่อนไขทั้งหมดยึดตามต้นแบบ prototypes/…v28.html (นักเรียน/ครู) และ …Admin_HTML_Demo_v14.html (เจ้าหน้าที่) */
'use strict';

const STORE_KEY = 'tfd-scholarship-demo-v26';

/* สถานะการดำเนินงาน (ชุดเดียวกับ db/schema.sql) */
const STATUS = {
  draft:               {label: 'นักเรียนกำลังกรอกข้อมูล', tone: 'idle'},
  waiting_teacher:     {label: 'รอครูดำเนินการ',         tone: 'warn'},
  returned_to_student: {label: 'เปิดสิทธิ์ให้แก้ไข',        tone: 'bad'},
  waiting_transfer_proof: {label: 'รอหลักฐานการย้ายสถานศึกษา', tone: 'warn'},
  waiting_staff:       {label: 'รอเจ้าหน้าที่ดำเนินการ',    tone: 'info'},
  need_more_info:      {label: 'รอข้อมูลเพิ่มเติม',        tone: 'warn'},
  waiting_manager:     {label: 'รอผู้จัดการพิจารณา',      tone: 'violet'},
  decided:             {label: 'ดำเนินการเรียบร้อย',      tone: 'ok'},
};
const DECISION = {
  approved:   {label: 'อนุมัติทุน',   tone: 'ok'},
  rejected:   {label: 'ไม่ผ่าน',     tone: 'bad'},
  reserve:    {label: 'สำรอง',      tone: 'warn'},
  ineligible: {label: 'ไม่เข้าเกณฑ์', tone: 'bad'},
};
const TYPE = {NEW: 'ทุนใหม่', CONT: 'ทุนต่อเนื่อง'};

/* ช่วงชั้น → ระดับชั้นปัจจุบัน → ระดับชั้นปีถัดไป (v28: classGroups, normalMap, branchMap) */
const EDU_GROUPS = [['primary', 'ประถมศึกษา'], ['lowersec', 'มัธยมศึกษาตอนต้น'], ['uppersec', 'มัธยมศึกษาตอนปลาย'],
  ['voc', 'ประกาศนียบัตรวิชาชีพ (ปวช.)'], ['highvoc', 'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)'], ['bachelor', 'ปริญญาตรี']];
const GROUP_SHORT = {primary: 'ป.5–ป.6', lowersec: 'ม.ต้น', uppersec: 'ม.ปลาย', voc: 'ปวช.', highvoc: 'ปวส.', bachelor: 'ป.ตรี'};
const CLASS_GROUPS = {
  primary: ['ป.5', 'ป.6'], lowersec: ['ม.1', 'ม.2', 'ม.3'], uppersec: ['ม.4', 'ม.5', 'ม.6'],
  voc: ['ปวช.1', 'ปวช.2', 'ปวช.3'], highvoc: ['ปวส.1', 'ปวส.2'],
  bachelor: ['ปริญญาตรี ปี 1', 'ปริญญาตรี ปี 2', 'ปริญญาตรี ปี 3', 'ปริญญาตรี ปี 4', 'ปริญญาตรี ปี 5'],
};
const NEXT_NORMAL = {'ป.5': 'ป.6', 'ป.6': 'ม.1', 'ม.1': 'ม.2', 'ม.2': 'ม.3', 'ม.4': 'ม.5', 'ม.5': 'ม.6', 'ปวช.1': 'ปวช.2',
  'ปวช.2': 'ปวช.3', 'ปวส.1': 'ปวส.2', 'ปริญญาตรี ปี 1': 'ปริญญาตรี ปี 2', 'ปริญญาตรี ปี 2': 'ปริญญาตรี ปี 3',
  'ปริญญาตรี ปี 3': 'ปริญญาตรี ปี 4', 'ปริญญาตรี ปี 4': 'ปริญญาตรี ปี 5'};
const NEXT_BRANCH = {'ม.3': ['ม.4', 'ปวช.1'], 'ม.6': ['ปวส.1', 'ปริญญาตรี ปี 1'], 'ปวช.3': ['ปวส.1', 'ปริญญาตรี ปี 1'],
  'ปวส.2': ['ปริญญาตรี ปี 1', 'ปริญญาตรี ปี 3']};
/* ชื่อชั้นแบบสั้นสำหรับตาราง: ปริญญาตรี ปี 1 → ป.ตรี 1 */
const shortCls = c => String(c || '').replace(/^ปริญญาตรี ปี\s*/, 'ป.ตรี ');
const nextOptions = c => NEXT_BRANCH[c] || (NEXT_NORMAL[c] ? [NEXT_NORMAL[c]] : []);
const groupOfClass = c => (Object.entries(CLASS_GROUPS).find(([, l]) => l.includes(c)) || [''])[0];
/* ปวส.: ประเภทวิชา ทั่วไป / อุตสาหกรรม (อุตสาหกรรมใช้อัตราทุนต่างจาก ปวส. ทั่วไป) */
const PVS_TYPES = [['other', 'ทั่วไป'], ['industry', 'อุตสาหกรรม']];
const STUDY_MODES = [['regular', 'ภาคปกติ'], ['special', 'ภาคพิเศษ (เรียนวันเสาร์–อาทิตย์ / ภาคค่ำ)'],
  ['dual', 'ทวิภาคี (เรียนและฝึกงานตามหลักสูตร)'], ['other', 'อื่น ๆ']];
/* อัตราทุนอ้างอิงระดับชั้นปีที่ได้รับทุน (ปีถัดไป) — v14 */
function rateOf(next, pvsType) {
  if (!next) return null;
  if (next === 'ป.6') return 'P6';
  if (/^ม\.[123]$/.test(next)) return 'M_LOWER';
  if (/^ม\./.test(next)) return 'M_UPPER';
  if (/^ปวช/.test(next)) return 'PVC';
  if (/^ปวส/.test(next)) return pvsType === 'industry' ? 'PVS_IND' : 'PVS';
  if (/^ปริญญาตรี/.test(next)) return 'BACHELOR';
  return null;
}
/* teacherNeedsScholarCert (v28) */
/* แบบฟอร์มรับรองสถานะการกู้ยืม กยศ./กรอ.: สำหรับ ม.ปลาย อาชีวศึกษา และปริญญาตรี (ตามแบบฟอร์มกระดาษ) */
const needsLoanCert = s => ['uppersec', 'voc', 'highvoc', 'bachelor'].includes(s.group || groupOfClass(s.class));
/* เอกสารประกอบตามแบบฟอร์มกระดาษ — [รหัส, ชื่อ, แนบได้หลายไฟล์, ไม่บังคับ] */
function docsFor(s) {
  const bachelor = (s.group || groupOfClass(s.class)) === 'bachelor';
  const d = [['01_IDCARD', 'สำเนาบัตรประจำตัวประชาชนของนักเรียน / นักศึกษา'], ['03_STUDENTCERT', 'หนังสือรับรองสถานภาพการเป็นนักเรียน / นักศึกษา'],
    ['04_TRANSCRIPT', 'สำเนาผลการศึกษาเทอมล่าสุด']];
  const loan = ['07_OTHERSCHOLAR', 'แบบฟอร์มรับรองสถานะการกู้ยืม กยศ./กรอ. และการได้รับทุนการศึกษาอื่น'];
  if (s.type === 'CONT') {
    if (needsLoanCert(s)) d.push(loan);
    d.push(['08_BANKFRONT', 'สำเนาสมุดบัญชีเงินฝาก หน้าที่แสดงชื่อเจ้าของบัญชี'],
      ['09_BANKTXN', 'สำเนาสมุดบัญชีเงินฝาก หน้าที่แสดงรายการเดินบัญชีจำนวนเงินทุนในปีล่าสุดที่เข้าบัญชีจนถึงรายการปัจจุบัน', true],
      ['10_EXPENSEREPORT', 'แบบฟอร์มรายการใช้จ่ายเงินทุนการศึกษา'],
      ['12_TUITION', 'ใบเสร็จรับเงินค่าธรรมเนียมการศึกษา / ค่าบำรุงการศึกษา (กรณีใช้เงินทุนชำระ)', true, true],
      ['13_INTERNET', 'หลักฐานการใช้จ่ายค่าอินเทอร์เน็ต (กรณีมีการใช้จ่าย)', true, true],
      ['11_RECEIPT', 'ใบเสร็จรับเงินค่าใช้จ่ายที่เบิกถอน (เบิกจากบัญชีตั้งแต่ 500 บาทขึ้นไป)', true]);
  } else {
    d.push(['05_HOUSEPHOTO', 'รูปถ่ายสภาพบ้านที่อยู่อาศัยของนักเรียน / นักศึกษา', true]);
    if (needsLoanCert(s)) d.push(loan);
    if (bachelor) d.push(['06_ADVISORCERT', 'จดหมายรับรองความเห็นจากอาจารย์ที่ปรึกษา']);
  }
  return d.map(x => [x[0], x[1], !!x[2], !!x[3]]);
}

const ICONS = {
  student: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  teacher: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  staff: '<path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/>',
  chev: '<path d="m9 6 6 6-6 6"/>', back: '<path d="m15 6-6 6 6 6"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 20h16"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  status: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13 7 4 4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
};
/* ไอคอนของแท็บเมนู 2 ปุ่ม */
const TAB_ICON = {'student-status': 'status', 'student-form': 'edit', 'teacher-home': 'list', 'teacher-report': 'print'};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

const App = {
  data: null, db: null, session: {role: null}, view: {name: 'home', params: {}}, views: {}, handlers: {},

  async start() {
    try {
      const [geo, mock] = await Promise.all(['data/geo.json', 'data/mock.json'].map(u => fetch(u).then(r => {
        if (!r.ok) throw new Error(u);
        return r.json();
      })));
      this.data = {geo, seed: mock};
      this.subByDistrict = {};
      geo.subdistricts.forEach(x => (this.subByDistrict[x.d] = this.subByDistrict[x.d] || []).push(x));
      this.db = this.load() || this.seedTransfers(this.fresh());
      this.index();
    } catch (e) {
      document.getElementById('main').innerHTML = '<div class="card"><h2>โหลดข้อมูลไม่สำเร็จ</h2><p class="muted">กรุณารีเฟรชหน้าอีกครั้ง</p></div>';
      return;
    }
    document.addEventListener('click', e => this.onClick(e));
    document.addEventListener('input', e => { if (e.target.dataset.oninput) this.dispatch(e.target.dataset.oninput, e.target, e); });
    document.addEventListener('change', e => { if (e.target.dataset.onchange) this.dispatch(e.target.dataset.onchange, e.target, e); });
    document.addEventListener('submit', e => { e.preventDefault(); this.dispatch(e.target.dataset.submit, e.target, e); });
    const fromHash = () => {
      const h = (location.hash || '').slice(1);
      this.go(['student', 'teacher', 'staff', 'postal'].includes(h) ? h + '-entry' : 'home');
    };
    window.addEventListener('hashchange', fromHash);
    fromHash();
  },
  fresh() {
    const s = this.data.seed;
    const copy = o => JSON.parse(JSON.stringify(o));
    const sent = ['waiting_transfer_proof', 'waiting_staff', 'need_more_info', 'waiting_manager', 'decided'];
    return {
      students: s.students.map(x => x.school_next === 'transfer' && x.status === 'waiting_staff' && !x.demo_transfer ? {...x, status: 'waiting_transfer_proof'} : x)
        .map(x => {
          /* ข้อมูลตัวอย่างที่ จนท. บันทึกการย้ายแล้ว: ย้ายโรงเรียน / ชั้นตามที่บันทึก และเขียนประวัติแบบเดียวกับระบบจริง */
          const t = x.demo_transfer || (x.school_next === 'transfer' && ['need_more_info', 'waiting_manager', 'decided'].includes(x.status)
            ? {to: x.school, cls: x.next_class, date: '2027-05-10'} : null);
          if (!t) return x;
          const name = id => (s.schools.find(c => c.id === id) || {}).name || id;
          const where = t.to === x.school ? `เรียนที่เดิม ${name(x.school)}` : `${name(x.school)} → ${name(t.to)}`;
          return {...x, school: t.to, home_school: t.to !== x.school ? x.school : undefined, next_class: t.cls, rate: rateOf(t.cls, /^ปวส/.test(t.cls) ? (x.next_pvs_type || x.pvs_type) : '') || x.rate,
            history: (x.history || []).concat({at: t.date + 'T10:00', text: `จนท. 01 บันทึกการย้าย: ${where} ชั้น ${t.cls}${t.cls !== x.next_class ? ` (เดิมแจ้งไว้: ${x.next_class})` : ''}`, kind: 'transfer'},
              {at: t.date + 'T10:00', text: 'ได้รับหลักฐานการย้ายสถานศึกษาแล้ว — รอเจ้าหน้าที่ดำเนินการ', kind: 'transfer_proof'})};
        }).map(x => {
        /* เอกสารตัวอย่าง: ส่งแล้ว = ครบ, รอครู = ตาม demo_docs (none / partial / full) */
        const docs = docsFor(x).filter(d => !d[3]);
        const n = sent.includes(x.status) || x.demo_docs === 'full' ? docs.length : x.demo_docs === 'partial' ? Math.ceil(docs.length / 2) : 0;
        return {...copy(x), docFiles: Object.fromEntries(docs.slice(0, n).map(d => [d[0], [`${x.code}_${d[0]}.pdf`]]))};
      }),
      /* โรงเรียนตัวอย่างที่ได้อัตราพิเศษ ม.ต้น (ใช้ทดลอง) */
      schools: copy(s.schools).map(x => ({...x, special_rate: ['SCH-003', 'SCH-004', 'SCH-018', 'SCH-020'].includes(x.id),
        /* รูปแบบหลักสูตรตัวอย่าง: วิทยาลัย = ปกติ + ทวิภาคี, มหาวิทยาลัย = ปกติ + ภาคพิเศษ, โรงเรียน = ปกติ */
        modes: x.type === 'college' ? ['regular', 'dual'] : x.type === 'university' ? ['regular', 'special'] : ['regular']})),
      teachers: copy(s.teachers),
      /* บัญชีเจ้าหน้าที่มูลนิธิฯ — แอดมินจัดการได้ที่เมนู "ผู้ใช้งาน" */
      staffUsers: [
        {username: 'reviewer01', name: 'จนท. 01', role: 'reviewer', position: 'เจ้าหน้าที่ทุน', email: 'reviewer01@example.com', active: true},
        {username: 'reviewer02', name: 'จนท. 02', role: 'reviewer', position: 'เจ้าหน้าที่ทุน', email: 'reviewer02@example.com', active: true},
        {username: 'manager01', name: 'ผู้จัดการทุน', role: 'manager', position: 'ผู้จัดการ', email: 'manager01@example.com', active: true},
        {username: 'admin01', name: 'ผู้ดูแลระบบ', role: 'admin', position: 'ผู้ดูแลระบบ', email: 'admin01@example.com', active: true}],
      audit: [],
      /* ข้อมูลตัวอย่าง: นักเรียนที่ติ๊กย้าย ถ้าผ่าน จนท. ไปแล้ว ถือว่าบันทึกการย้ายแล้ว (เรียนที่เดิม) */
      transfers: s.students.filter(x => x.demo_transfer || (x.school_next === 'transfer' && ['need_more_info', 'waiting_manager', 'decided'].includes(x.status)))
        .map(x => { const t = x.demo_transfer || {to: x.school, cls: x.next_class, date: '2027-05-10'};
          return {code: x.code, from: x.school, to: t.to, cls: t.cls, date: t.date, note: 'ข้อมูลตัวอย่าง', by: 'จนท. 01', at: t.date + 'T10:00'}; }),
      cycle: {year: 2570, history_year: 2569, status: 'open', open: '2026-11-01', close: '2027-01-31',
        transfer_open: '2027-03-01', first_cutoff: '2027-05-15', transfer_close: '2027-07-31'},
      pdpa: {version: '2026-08', effective: '2026-08-01', url: 'https://tiscofoundation.org/wp-content/uploads/pdpa_privacy_notice_tiscof.pdf'},
      rates: copy(s.rates),
    };
  },
  /* ข้อมูลตัวอย่างการส่งหลักฐานย้าย: รอตรวจ / ไม่ผ่าน / พิมพ์ชื่อโรงเรียนเอง / ยอดเงินเปลี่ยนรอแอดมิน */
  /* เพิ่มนักเรียนตัวอย่างให้ SCH-001 ครบทุกสถานะ (หน้าครู + แจ้งย้าย) */
  seedMore(db) {
    const copy = o => JSON.parse(JSON.stringify(o));
    /* สถานศึกษาตัวอย่างในกรุงเทพมหานคร */
    const bkk = [
      ['โรงเรียนวัดปทุมวนาราม (จำลอง)', 'school', 'เขตปทุมวัน', 'แขวงรองเมือง', '10330', ['primary', 'lowersec']],
      ['โรงเรียนปทุมวันวิทยา (จำลอง)', 'school', 'เขตปทุมวัน', 'แขวงวังใหม่', '10330', ['lowersec', 'uppersec']],
      ['โรงเรียนบางเขนวิทยาคม (จำลอง)', 'school', 'เขตบางเขน', 'แขวงอนุสาวรีย์', '10220', ['lowersec', 'uppersec']],
      ['โรงเรียนวัดบางเขน (จำลอง)', 'school', 'เขตบางเขน', 'แขวงท่าแร้ง', '10220', ['primary']],
      ['โรงเรียนจตุจักรศึกษา (จำลอง)', 'school', 'เขตจตุจักร', 'แขวงลาดยาว', '10900', ['lowersec', 'uppersec']],
      ['โรงเรียนเสนานิคมพัฒนา (จำลอง)', 'school', 'เขตจตุจักร', 'แขวงเสนานิคม', '10900', ['primary', 'lowersec']],
      ['โรงเรียนห้วยขวางวิทยา (จำลอง)', 'school', 'เขตห้วยขวาง', 'แขวงห้วยขวาง', '10310', ['lowersec', 'uppersec']],
      ['โรงเรียนบางกะปิพิทยาคม (จำลอง)', 'school', 'เขตบางกะปิ', 'แขวงคลองจั่น', '10240', ['lowersec', 'uppersec']],
      ['โรงเรียนวัดหัวหมาก (จำลอง)', 'school', 'เขตบางกะปิ', 'แขวงหัวหมาก', '10240', ['primary']],
      ['โรงเรียนดินแดงวิทยา (จำลอง)', 'school', 'เขตดินแดง', 'แขวงดินแดง', '10400', ['primary', 'lowersec', 'uppersec']],
      ['โรงเรียนลาดกระบังศึกษา (จำลอง)', 'school', 'เขตลาดกระบัง', 'แขวงลาดกระบัง', '10520', ['lowersec', 'uppersec']],
      ['โรงเรียนหนองจอกพิทยา (จำลอง)', 'school', 'เขตหนองจอก', 'แขวงหนองจอก', '10530', ['primary', 'lowersec', 'uppersec']],
      ['โรงเรียนมีนบุรีวิทยาลัย (จำลอง)', 'school', 'เขตมีนบุรี', 'แขวงมีนบุรี', '10510', ['lowersec', 'uppersec']],
      ['โรงเรียนบางแคราษฎร์ (จำลอง)', 'school', 'เขตบางแค', 'แขวงบางแค', '10160', ['primary', 'lowersec']],
      ['โรงเรียนคลองเตยศึกษา (จำลอง)', 'school', 'เขตคลองเตย', 'แขวงคลองเตย', '10110', ['primary', 'lowersec']],
      ['วิทยาลัยเทคนิคกรุงเทพตัวอย่าง (จำลอง)', 'college', 'เขตดุสิต', 'แขวงดุสิต', '10300', ['voc', 'highvoc']],
      ['วิทยาลัยอาชีวศึกษาพญาไท (จำลอง)', 'college', 'เขตพญาไท', 'แขวงพญาไท', '10400', ['voc', 'highvoc']],
      ['วิทยาลัยพาณิชยการบางนา (จำลอง)', 'college', 'เขตบางนา', 'แขวงบางนาเหนือ', '10260', ['voc', 'highvoc']],
      ['มหาวิทยาลัยตัวอย่างกรุงเทพ (จำลอง)', 'university', 'เขตราชเทวี', 'แขวงทุ่งพญาไท', '10400', ['bachelor']],
      ['มหาวิทยาลัยราชภัฏตัวอย่างบางซื่อ (จำลอง)', 'university', 'เขตบางซื่อ', 'แขวงบางซื่อ', '10800', ['bachelor']],
    ];
    bkk.forEach(([name, type, district, sub, zip, levels], i) => {
      const id = 'SCH-B' + String(i + 1).padStart(2, '0');
      if (db.schools.some(x => x.id === id)) return;
      db.schools.push({id, name, type, region: 'bkkmetro', province: 'กรุงเทพมหานคร', district, subdistrict: sub, address: `${10 + i * 7} ถนนตัวอย่าง`, postcode: zip, levels,
        special_rate: false, modes: type === 'college' ? ['regular', 'dual'] : type === 'university' ? ['regular', 'special'] : ['regular']});
    });
    const pool = db.students.filter(x => x.school === 'SCH-001');
    const tpl = (st, res) => pool.find(x => x.status === st && (!res || (x.decision && x.decision.result === res)))
      || db.students.find(x => x.status === st && (!res || (x.decision && x.decision.result === res)));
    const cid = n => { const d = ('11017' + String(n).padStart(7, '0')).split('').map(Number);
      return d.join('') + (11 - d.reduce((a, x, i) => a + x * (13 - i), 0) % 11) % 10; };
    const nextOf = c => ({'ป.5': 'ป.6', 'ป.6': 'ม.1', 'ม.1': 'ม.2', 'ม.2': 'ม.3', 'ม.3': 'ม.4', 'ม.4': 'ม.5', 'ม.5': 'ม.6', 'ม.6': 'ปวส.1'})[c];
    const people = [
      ['เด็กหญิง', 'ณัฐธิดา', 'ใจดี', 'หญิง', 'ป.5', 'draft'],
      ['เด็กชาย', 'ภูมิพัฒน์', 'แก้วกาศ', 'ชาย', 'ม.1', 'returned_to_student'],
      ['นางสาว', 'อรอุมา', 'ทองมา', 'หญิง', 'ม.4', 'waiting_teacher'],
      ['เด็กชาย', 'กฤษดา', 'บุญมา', 'ชาย', 'ป.6', 'waiting_teacher', 'transfer'],
      ['เด็กหญิง', 'พิมพ์ลดา', 'สุขสม', 'หญิง', 'ม.2', 'waiting_staff'],
      ['นาย', 'ธีรวัฒน์', 'คำปัน', 'ชาย', 'ม.5', 'need_more_info'],
      ['นางสาว', 'สุภาวดี', 'อินทร์แก้ว', 'หญิง', 'ม.6', 'waiting_manager'],
      ['เด็กหญิง', 'ศิริพร', 'วงศ์ใหญ่', 'หญิง', 'ม.1', 'decided', '', 'approved'],
      ['นาย', 'อนุชา', 'ปัญญาดี', 'ชาย', 'ม.4', 'decided', '', 'reserve'],
      ['เด็กชาย', 'ชยพล', 'ศรีบุญ', 'ชาย', 'ม.3', 'waiting_transfer_proof', 'transfer', '', 'todo'],
      ['เด็กหญิง', 'กัญญาณัฐ', 'มาลัย', 'หญิง', 'ป.6', 'waiting_transfer_proof', 'transfer', '', 'todo'],
      ['เด็กหญิง', 'วรรณภา', 'ใจงาม', 'หญิง', 'ม.3', 'waiting_transfer_proof', 'transfer', '', 'rejected2'],
      ['เด็กชาย', 'ณัฐวุฒิ', 'คำมูล', 'ชาย', 'ป.6', 'waiting_transfer_proof', 'transfer', '', 'rejected'],
      ['เด็กหญิง', 'ปาริชาติ', 'ทาแก้ว', 'หญิง', 'ป.6', 'waiting_transfer_proof', 'transfer', '', 'pending'],
      ['เด็กชาย', 'วีรภัทร', 'สิทธิชัย', 'ชาย', 'ม.3', 'waiting_staff', 'transfer', '', 'approved'],
    ];
    let n = db.students.reduce((m, x) => Math.max(m, Number(x.code.slice(-6))), 0);
    const sch = id => db.schools.find(x => x.id === id) || {};
    const other = db.schools.filter(x => x.province === 'แพร่' && x.id !== 'SCH-001' && x.type === 'school');
    people.forEach(([title, first, last, gender, cls, st, next, res, tp], i) => {
      const t = tpl(st === 'waiting_transfer_proof' ? 'waiting_staff' : st, res);
      if (!t) return;
      const code = `TF${db.cycle.year}-${String(++n).padStart(6, '0')}`;
      const x = copy(t);
      const nc = nextOf(cls);
      Object.assign(x, {code, citizen_id: cid(9000 + i), title, first_name: first, last_name: last, gender, school: 'SCH-001', class: cls, next_class: nc,
        group: groupOfClass(cls), rate: rateOf(nc) || x.rate, status: st, school_next: next || 'same', next_school_text: next ? (other[i % other.length] || {}).name || 'โรงเรียนประจำอำเภอ' : '',
        email: `student${n}@example.com`, demo_note: '', demo_tp: ''});
      /* เอกสารตามระดับชั้น: ส่งแล้ว = ครบ · รอครู = ครึ่งหนึ่ง · กำลังกรอก = ยังไม่มี */
      const docs = docsFor(x).filter(d => !d[3]);
      const k = ['draft', 'returned_to_student'].includes(st) ? 0 : st === 'waiting_teacher' ? Math.ceil(docs.length / 2) : docs.length;
      x.docFiles = Object.fromEntries(docs.slice(0, k).map(d => [d[0], [`${code}_${d[0]}.pdf`]]));
      if (st !== 'decided') delete x.decision;
      if (['draft', 'returned_to_student', 'waiting_teacher'].includes(st)) { delete x.teacher_review; delete x.staff_review; }
      if (['waiting_staff', 'waiting_transfer_proof'].includes(st)) delete x.staff_review;
      if (st === 'returned_to_student') x.return_reason = x.return_reason || 'แนบรูปบ้านไม่ชัด กรุณาถ่ายใหม่';
      delete x.tp; delete x.amount_check; delete x.amount_lock; delete x.home_school;
      x.seed_tp = tp || '';
      db.students.push(x);
    });
    /* สถานะหลักฐานการย้ายของนักเรียนที่เพิ่ม */
    const day = (d, h) => `2027-05-${String(d).padStart(2, '0')}T${h}`;
    db.students.filter(x => x.seed_tp).forEach((x, i) => {
      const to = other[(i + 1) % other.length] || sch('SCH-002');
      const base = {by: 'student', by_name: '', school: to.id, school_text: '', region: to.region, province: to.province, district: to.district, cls: x.next_class, email: x.email, file_note: ''};
      const rej = (k, d) => ({...base, n: k, at: day(d, '09:00'), files: [`${x.code}_14_TRANSFER_${k}.jpg`], result: 'rejected', reviewer: 'จนท. 01', reviewed_at: day(d + 1, '10:00'),
        reasons: k === 1 ? ['ไม่เห็นปีการศึกษาชัดเจน หรือไม่ตรงกับข้อมูล'] : ['ภาพไม่ชัด / อ่านไม่ออก'], checks: ['name', 'school', 'cls']});
      const hist = (at, text, kind) => (x.history = x.history || []).push({at, text, kind});
      if (x.seed_tp === 'rejected') { x.tp = {state: 'rejected', subs: [rej(1, 3)]}; hist(day(4, '10:00'), 'จนท. 01 ตรวจหลักฐานการย้าย: ยืนยันไม่สำเร็จ', 'transfer_reject'); }
      if (x.seed_tp === 'rejected2') { x.tp = {state: 'rejected', subs: [rej(1, 2), {...rej(2, 6), by: 'teacher'}]}; hist(day(7, '10:00'), 'จนท. 01 ตรวจหลักฐานการย้าย: ยืนยันไม่สำเร็จ (ครั้งที่ 2)', 'transfer_reject'); }
      if (x.seed_tp === 'pending') x.tp = {state: 'pending', subs: [{...base, n: 1, by: 'teacher', at: day(9, '13:30'), files: [`${x.code}_14_TRANSFER_1-1.jpg`, `${x.code}_14_TRANSFER_1-2.pdf`]}]};
      if (x.seed_tp === 'approved') {
        x.tp = {state: 'approved', subs: [{...base, n: 1, at: day(5, '08:40'), files: [`${x.code}_14_TRANSFER_1.pdf`], result: 'approved', reviewer: 'จนท. 01', reviewed_at: day(6, '11:00'), checks: ['name', 'school', 'cls', 'year']}]};
        db.transfers.push({code: x.code, from: x.school, to: to.id, cls: x.next_class, date: '2027-05-05', note: 'ตรวจหลักฐานผ่าน', by: 'จนท. 01', at: day(6, '11:00'), via: 'proof'});
        x.home_school = x.school; x.school = to.id;
        hist(day(6, '11:00'), 'จนท. 01 ตรวจหลักฐานการย้าย: ยืนยันสำเร็จ', 'transfer');
      }
      delete x.seed_tp;
    });
    return db;
  },
  seedTransfers(db) {
    this.seedMore(db);
    const by = c => db.students.find(x => x.code === c);
    const sub = (o) => ({n: 1, by: 'student', by_name: '', region: '', province: '', district: '', school_text: '', email: '', file_note: '', ...o});
    const sch = id => db.schools.find(x => x.id === id) || {};
    const add = (s, subs, state) => { if (!s) return; s.tp = {state, subs};
      subs.forEach(x => (s.history = s.history || []).push({at: x.at, text: `${x.by === 'teacher' ? 'ครูโรงเรียนเดิม' : 'นักเรียน'}ส่งหลักฐานการย้ายสถานศึกษา (ครั้งที่ ${x.n}) — รอเจ้าหน้าที่ตรวจ`, kind: 'transfer_submit'})); };
    const a = by('TF2570-000010');
    if (a) { const sc = sch('SCH-002');
      add(a, [sub({at: '2027-05-08T09:30', school: 'SCH-002', region: sc.region, province: sc.province, district: sc.district, cls: 'ม.4', files: [a.code + '_14_TRANSFER_1.pdf'], email: a.email || ''})], 'pending'); }
    /* ตัวอย่างใช้ ป.6 / ม.3 (ชั้นที่ย้ายสถานศึกษาบ่อย) */
    const toTransfer = (x, text) => Object.assign(x, {school_next: 'transfer', status: 'waiting_transfer_proof', next_school_text: text});
    const near = x => db.schools.find(c => c.id !== x.school && c.province === (sch(x.school).province) && c.type === 'school') || sch('SCH-002');
    const b = by('TF2570-000095');
    if (b && b.status === 'waiting_staff') { const sc = near(b);
      toTransfer(b, sc.name);
      add(b, [sub({at: '2027-05-02T14:10', school: sc.id, region: sc.region, province: sc.province, district: sc.district, cls: 'ม.1', files: [b.code + '_14_TRANSFER_1.jpg'],
        email: b.email || '', result: 'rejected', reasons: ['ไม่เห็นปีการศึกษาชัดเจน หรือไม่ตรงกับข้อมูล', 'ภาพไม่ชัด / อ่านไม่ออก'], reviewer: 'จนท. 01', reviewed_at: '2027-05-04T10:20', checks: ['name', 'school', 'cls']})], 'rejected');
      b.history.push({at: '2027-05-04T10:20', text: 'จนท. 01 ตรวจหลักฐานการย้าย: ไม่ผ่าน — ไม่เห็นปีการศึกษาชัดเจน, ภาพไม่ชัด', kind: 'transfer_reject'}); }
    /* ครูส่งแทน โดยพิมพ์ชื่อโรงเรียนใหม่เอง (ไม่มีในระบบ) */
    const c = by('TF2570-000058');
    if (c && c.status === 'waiting_staff') { const old = sch(c.school);
      toTransfer(c, 'โรงเรียนเวียงเชียงรุ้งวิทยาคม');
      add(c, [sub({at: '2027-05-11T11:00', by: 'teacher', by_name: (db.teachers.find(t => t.school === c.school) || {}).name || '', school: '', school_text: 'โรงเรียนเวียงเชียงรุ้งวิทยาคม',
        region: old.region, province: old.province, district: old.district, cls: c.next_class, files: [c.code + '_14_TRANSFER_1-1.jpg', c.code + '_14_TRANSFER_1-2.jpg'], file_note: 'แปลง HEIC เป็น JPG แล้ว'})], 'pending'); }
    /* แจ้งย้าย ส่งใบสมัครแล้ว ยังไม่ส่งหลักฐาน */
    const e = by('TF2570-000085');
    if (e && e.status === 'waiting_staff') { toTransfer(e, 'โรงเรียนประจำอำเภอ'); e.demo_tp = 'todo'; }
    if (a) a.demo_tp = 'pending';
    /* ย้ายผ่านแล้ว แต่ไปโรงเรียนที่ได้อัตราพิเศษ ม.ต้น → ยอดเงินเปลี่ยน รอแอดมินยืนยัน */
    const d = by('TF2570-000012');
    if (d) { const amt = k => (db.rates.find(r => r.code === k) || {}).amount || 0;
      const tr = db.transfers.find(t => t.code === d.code);
      if (tr) tr.to = 'SCH-003';
      d.school = 'SCH-003';
      d.home_school = 'SCH-001';
      d.amount_check = {state: 'pending', before: amt(d.rate), after: amt('SPECIAL'), at: '2027-05-10T10:00',
        before_label: 'อัตรา ม.ต้น (ตามที่แจ้งตอนสมัคร)', after_label: 'อัตราพิเศษ ม.ต้น ของโรงเรียนใหม่'};
      d.history.push({at: '2027-05-10T10:00', text: `ยอดเงินทุนเปลี่ยนจากการย้าย ${amt(d.rate).toLocaleString()} → ${amt('SPECIAL').toLocaleString()} บาท — รอแอดมินยืนยัน`, kind: 'amount_check'}); }
    db.mails = [];
    db.cycle.remind_days = [30, 14, 7, 3];
    db.cycle.teacher_reg_close = '2027-01-29T17:00';
    /* คำขอลงทะเบียนครูตัวอย่าง */
    const lv = ['primary', 'lowersec', 'uppersec'];
    const reg = (id, at, kind, o) => ({id, at, state: 'pending', kind, school: '', school_text: '', pos: 'ครู', addr: '', count: 450, levels: lv, levels_other: '', modes: ['regular'], modes_other: '',
      reason: '', file_name: 'หนังสือแต่งตั้ง.pdf', ...o, file: `${id}_${o.school || 'NEW'}_IDPROOF.pdf`});
    db.teacherRegs = [
      reg('REG-0001', '2026-12-01T09:12', 'new', {school: 'SCH-B02', region: 'bkkmetro', province: 'กรุงเทพมหานคร', district: 'เขตปทุมวัน', name: 'นางสาว ศิริรัตน์ ทองดี', phone: '0812345601', email: 'siriratt@example.com', addr: '17 ถนนตัวอย่าง แขวงวังใหม่ เขตปทุมวัน กรุงเทพมหานคร 10330', count: 820, levels: ['lowersec', 'uppersec']}),
      reg('REG-0002', '2026-12-02T13:40', 'newschool', {school_text: 'โรงเรียนบ้านห้วยทรายวิทยา', region: 'north', province: 'แพร่', district: 'อำเภอเมืองแพร่', name: 'นาย ประเสริฐ ใจมั่น', phone: '0812345602', email: 'prasert.j@example.com', addr: '99 หมู่ 4 ตำบลห้วยม้า อำเภอเมืองแพร่ จังหวัดแพร่ 54000', count: 230, levels: ['primary', 'lowersec']}),
      reg('REG-0003', '2026-12-03T10:05', 'replace', {school: 'SCH-010', region: 'north', province: 'เชียงราย', district: 'อำเภอแม่สาย', name: 'นาง อรพิน สายทอง', phone: '0812345603', email: 'orapin.s@example.com', addr: '6 หมู่ 3 ตำบลห้วยไคร้ อำเภอแม่สาย จังหวัดเชียงราย 57220', count: 1200, levels: ['voc', 'highvoc'], modes: ['regular', 'dual'], reason: 'ครูคนเดิมย้าย / ลาออก / เกษียณ — ครูคนเดิมเกษียณ ก.ย. 2569'}),
      {...reg('REG-0004', '2026-11-20T08:30', 'new', {school: 'SCH-B05', region: 'bkkmetro', province: 'กรุงเทพมหานคร', district: 'เขตจตุจักร', name: 'นาย วิชัย ศรีสุข', phone: '0812345604', email: 'wichai.s@example.com', addr: '38 ถนนตัวอย่าง แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร 10900'}),
        state: 'approved', username: 'schb05', by: 'ผู้ดูแลระบบ', done_at: '2026-11-21T10:00'},
      {...reg('REG-0005', '2026-11-22T15:10', 'new', {school: 'SCH-B07', region: 'bkkmetro', province: 'กรุงเทพมหานคร', district: 'เขตห้วยขวาง', name: 'นางสาว ปวีณา มีสุข', phone: '0812345605', email: 'paweena.m@example.com', addr: '52 ถนนตัวอย่าง แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310', file_name: 'บัตรประชาชน.jpg'}),
        state: 'rejected', reject_reason: 'ไม่ผ่าน: ไม่ใช่บัตรประชาชน / รูปเซลฟี่', by: 'ผู้ดูแลระบบ', done_at: '2026-11-23T09:00'}];
    if (!db.teachers.some(t => t.username === 'schb05')) db.teachers.push({username: 'schb05', name: 'นาย วิชัย ศรีสุข', position: 'ครู', department: '', school: 'SCH-B05', phone: '0812345604', email: 'wichai.s@example.com', active: true, reg: 'REG-0004'});
    return db;
  },
  load() { try { const v = localStorage.getItem(STORE_KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.db)); } catch (e) { /* ทดลองต่อได้แม้บันทึกในเครื่องไม่ได้ */ }
    this.index();
  },
  reset() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ไม่มีอะไรต้องลบ */ }
    this.db = this.seedTransfers(this.fresh());
    this.index();
    this.toast('ล้างข้อมูลทดลองแล้ว');
    this.go('home');
  },
  index() {
    this.schoolById = Object.fromEntries(this.db.schools.map(s => [s.id, s]));
    this.studentByCode = Object.fromEntries(this.db.students.map(s => [s.code, s]));
  },

  /* ---------- การเปลี่ยนหน้า ---------- */
  go(name, params = {}) {
    this.view = {name, params};
    this.render();
    window.scrollTo({top: 0});
  },
  render() {
    let out;
    try { out = this.views[this.view.name].call(this, this.view.params); } catch (err) {
      console.error(err);
      out = {html: `<section class="card"><h2>เปิดหน้านี้ไม่สำเร็จ</h2><p class="muted">ข้อมูลทดลองในเบราว์เซอร์อาจเป็นรุ่นเก่า กด “ล้างข้อมูลทดลอง” แล้วลองใหม่</p>
        <p class="small muted">${esc(err.message)}</p><div class="row"><button class="btn primary" data-action="reset">ล้างข้อมูลทดลอง</button><button class="btn" data-action="home">กลับหน้าแรก</button></div></section>`};
    }
    document.getElementById('topbar').innerHTML = this.topbar(out.nav);
    /* แผ่นรีวิวบนมือถือ: เปิดค้างไว้ถ้ายังอยู่ใบสมัครเดิม (เช่น กดบันทึกแล้วมีช่องผิด) */
    const rvKey = this.view.name + ':' + ((this.view.params || {}).code || '');
    if (rvKey !== this._rvKey) document.body.classList.remove('rv-open');
    this._rvKey = rvKey;
    document.documentElement.style.setProperty('--tb-h', document.getElementById('topbar').offsetHeight + 'px');
    const duo = document.querySelector('.tabs.duo');
    if (duo) {
      /* แถบสีเริ่มที่ปุ่มเดิม แล้วเลื่อนไปปุ่มใหม่ */
      const i = [...duo.querySelectorAll('button')].findIndex(b => b.hasAttribute('aria-current'));
      const from = this._duoIdx != null ? this._duoIdx : i;
      duo.style.setProperty('--i', from);
      duo.dataset.at = from;
      requestAnimationFrame(() => requestAnimationFrame(() => { duo.style.setProperty('--i', i); duo.dataset.at = i; }));
      this._duoIdx = i;
    } else this._duoIdx = null;
    document.getElementById('main').innerHTML = out.html;
    if (out.after) out.after.call(this);
  },
  topbar(nav) {
    const r = this.session.role;
    const roleName = {student: 'นักเรียน', teacher: 'ครู / สถานศึกษา', staff: 'เจ้าหน้าที่มูลนิธิฯ', postal: 'สมัครทางไปรษณีย์'}[r];
    const right = r ? `<div class="whoami">${esc(roleName)}<b>${esc(this.session.who || '')}</b></div>
      <button class="btn sm" data-action="home">ออกจากระบบ</button>` : '';
    const duo = nav && nav.length === 2;   // เมนู 2 ปุ่ม (ครู): ปุ่มกว้างเท่ากัน มีแถบสีเลื่อนไปมา
    const tabs = nav ? `<nav class="tabs ${duo ? 'duo' : ''}" aria-label="เมนู">${duo ? '<span class="ind" aria-hidden="true"></span>' : ''}${nav.map(n =>
      `<button data-go="${n[0]}" ${n[0] === this.view.name || (n[2] || []).includes(this.view.name) ? 'aria-current="page"' : ''}>${duo && TAB_ICON[n[0]] ? icon(TAB_ICON[n[0]]) : ''}${esc(n[1])}</button>`).join('')}</nav>` : '';
    return `<div class="topbar-in">
      <button class="brand" data-action="home" aria-label="กลับหน้าแรก"><span class="logo">TF</span>
        <span class="brand-text"><b>ทุนการศึกษามูลนิธิทิสโก้</b><span>ปีการศึกษา ${this.db.cycle.year} · ต้นแบบทดลองใช้งาน</span></span></button>
      <div class="topbar-right">${right}</div></div>${tabs}`;
  },

  /* ---------- เหตุการณ์ ---------- */
  on(name, fn) { this.handlers[name] = fn; },
  dispatch(name, el, e) { if (name && this.handlers[name]) this.handlers[name].call(this, el, e); },
  onClick(e) {
    const go = e.target.closest('[data-go]');
    if (go) { const {go: name, ...rest} = go.dataset; this.go(name, rest); return; }
    const a = e.target.closest('[data-action]');
    if (a) this.dispatch(a.dataset.action, a, e);
  },
  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(this._t);
    this._t = setTimeout(() => { t.hidden = true; }, 3400);
  },
  print() {
    let shown = false;
    const mark = () => { shown = true; };
    window.addEventListener('beforeprint', mark, {once: true});
    try { window.print(); } catch (e) { /* ไม่รองรับการพิมพ์ */ }
    setTimeout(() => { window.removeEventListener('beforeprint', mark); if (!shown) this.toast('การพิมพ์ / บันทึก PDF ใช้ได้เมื่อเปิดไฟล์บนเครื่องโดยตรง'); }, 400);
  },

  /* ---------- พื้นที่ / สถานศึกษา ---------- */
  provincesOf(region) {
    const r = this.data.geo.regions.find(x => x.code === region);
    return r ? this.data.geo.provinces.filter(p => p.r === r.id).map(p => p.th).sort((a, b) => a.localeCompare(b, 'th')) : [];
  },
  districtObjs(province) {
    const p = this.data.geo.provinces.find(x => x.th === province);
    return p ? this.data.geo.districts.filter(d => d.p === p.id).sort((a, b) => a.th.localeCompare(b.th, 'th')) : [];
  },
  districtsOf(province) { return this.districtObjs(province).map(d => d.th); },
  subdistrictsOf(province, district) {
    const d = this.districtObjs(province).find(x => x.th === district);
    return d ? (this.subByDistrict[d.id] || []).slice().sort((a, b) => a.th.localeCompare(b.th, 'th')) : [];
  },
  regionName(code) { return (this.data.geo.regions.find(r => r.code === code) || {}).name || ''; },
  schoolName(id) { return (this.schoolById[id] || {}).name || '—'; },
  teacherOf(schoolId) { return this.db.teachers.find(t => t.school === schoolId && t.active !== false) || this.db.teachers.find(t => t.school === schoolId); },
  rateAmount(code) { return (this.db.rates.find(r => r.code === code) || {}).amount || 0; },
  /* อัตรามาตรฐานของนักเรียน: ม.ต้น ที่โรงเรียนปีหน้าได้อัตราพิเศษ → ใช้อัตราพิเศษ (โรงเรียนปีหน้า = หลังบันทึกย้ายแล้ว) */
  stdRate(s) {
    /* แอดมินยืนยันใช้ยอดเดิมหลังย้าย */
    if (s.amount_lock != null) return {amount: s.amount_lock, special: false, base: s.amount_lock, locked: true};
    const base = this.rateAmount(s.rate);
    const special = s.rate === 'M_LOWER' && !!(this.schoolById[s.school] || {}).special_rate;
    return {amount: special ? this.rateAmount('SPECIAL') : base, special, base};
  },
  rateName(code) { return (this.db.rates.find(r => r.code === code) || {}).name || '—'; },

  /* ภาค → จังหวัด → อำเภอ/เขต (→ ตำบล) (→ สถานศึกษา) ใช้ร่วมกันทุกบทบาท */
  areaPicker(prefix, v = {}, o = {}) {
    const regions = this.data.geo.regions.map(r => [r.code, r.name]);
    const provs = v.region ? this.provincesOf(v.region) : [];
    const dists = v.province ? this.districtsOf(v.province) : [];
    const subs = o.sub && v.district ? this.subdistrictsOf(v.province, v.district).map(x => x.th) : [];
    const schools = o.school && v.district ? this.db.schools.filter(s => s.province === v.province && s.district === v.district)
      .sort((a, b) => a.name.localeCompare(b.name, 'th')) : [];
    const ph = o.any ? ['ทุกภาค', 'ทุกจังหวัด', 'ทุกอำเภอ / เขต', 'ทุกตำบล / แขวง', 'ทุกสถานศึกษา']
      : ['กรุณาเลือกภาค', v.region ? 'กรุณาเลือกจังหวัด' : 'กรุณาเลือกภาคก่อน', 'กรุณาเลือกอำเภอ / เขต', 'กรุณาเลือกตำบล / แขวง', 'กรุณาเลือกสถานศึกษา'];
    const req = o.required ? ' <span class="req">*</span>' : '';
    const err = o.err || {};
    const sel = (key, label, items, placeholder, disabled) => `<div class="field ${err[key] ? 'invalid' : ''}">
      <label class="label" for="${prefix}-${key}">${label}${req}</label>
      <select class="input" id="${prefix}-${key}" data-onchange="area" data-prefix="${prefix}" data-key="${key}" ${disabled ? 'disabled' : ''}>
      <option value="">${placeholder}</option>${items.map(i => { const [val, txt] = Array.isArray(i) ? i : [i, i];
        return `<option value="${esc(val)}" ${val === v[key] ? 'selected' : ''}>${esc(txt)}</option>`; }).join('')}</select>
      ${err[key] ? `<div class="err">${esc(err[key])}</div>` : ''}</div>`;
    let html = sel('region', 'ภาค', regions, ph[0], false) + sel('province', 'จังหวัด', provs, ph[1], !v.region)
      + sel('district', 'อำเภอ / เขต', dists, ph[2], !v.province);
    if (o.sub) html += sel('sub', 'ตำบล / แขวง', subs, ph[3], !v.district);
    if (o.school) {
      const none = v.district && !schools.length;
      /* otherLabel: เพิ่มตัวเลือก “ไม่พบในรายชื่อ (ระบุเอง)” ท้ายรายการ (ใช้เฉพาะฟอร์มแจ้งย้าย) */
      html += sel('school', o.schoolLabel || 'ชื่อสถานศึกษา', schools.map(s => [s.id, s.name]).concat(o.otherLabel && v.district ? [['__other', o.otherLabel]] : []),
        none && !o.otherLabel ? '— ยังไม่มีสถานศึกษาในระบบสำหรับพื้นที่นี้ —' : ph[4], o.otherLabel ? !v.district : !schools.length);
    }
    return html;
  },
  readArea(prefix) {
    const g = k => (document.getElementById(`${prefix}-${k}`) || {}).value || '';
    return {region: g('region'), province: g('province'), district: g('district'), sub: g('sub'), school: g('school')};
  },
};

/* ---------- ตัวช่วย ---------- */
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}
function badge(s) {
  if (s.status === 'decided' && s.decision) { const d = DECISION[s.decision.result]; return `<span class="badge t-${d.tone}">${d.label}</span>`; }
  const st = STATUS[s.status] || {label: s.status, tone: 'idle'};
  return `<span class="badge t-${st.tone}">${st.label}</span>`;
}
/* ป้ายอัตราทุน: ปกติ = ฟ้า, พิเศษ = ส้ม */
function rateBadge(r) { return `<span class="badge ${r.special ? 't-warn' : 't-info'}">${r.special ? 'อัตราพิเศษ' : 'อัตราปกติ'} · ${baht(r.amount)}</span>`; }
function fullName(s) { return [s.title, s.first_name, s.last_name].filter(Boolean).join(' ') || '(ยังไม่กรอกชื่อ)'; }
function baht(n) { return n == null || n === '' ? '—' : Number(n).toLocaleString('th-TH') + ' บาท'; }
function thDate(iso, time) {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  const o = {day: 'numeric', month: 'short', year: 'numeric'};
  if (time) { o.hour = '2-digit'; o.minute = '2-digit'; }
  return d.toLocaleString('th-TH', o) + (time ? ' น.' : '');
}
/* วันเกิดแบบ วว/ดด/ปปปป (พ.ศ.) ตาม v28 */
function beDate(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${Number(y) + 543}`; }
function parseBeDate(t) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t || '');
  if (!m) return null;
  let y = Number(m[3]);
  if (y > 2400) y -= 543;
  const iso = `${y}-${m[2]}-${m[1]}`;
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) || d.getDate() !== Number(m[1]) || d > new Date() ? null : iso;
}
function maskBeDate(v) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length <= 2 ? d : d.length <= 4 ? d.slice(0, 2) + '/' + d.slice(2) : d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
}
function ageAt(iso, at = new Date()) {
  if (!iso) return '';
  const b = new Date(iso + 'T00:00:00');
  let a = at.getFullYear() - b.getFullYear();
  if (at.getMonth() < b.getMonth() || (at.getMonth() === b.getMonth() && at.getDate() < b.getDate())) a--;
  return a >= 0 ? a : '';
}
function nowIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function validThaiId(id) {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - sum % 11) % 10 === Number(id[12]);
}
/* ใบสมัครถึงมูลนิธิฯ: ติ๊กย้ายและยังไม่บันทึกการย้าย → รอหลักฐานการย้ายสถานศึกษา */
function arrivalStatus(s, transfers) {
  return s.school_next === 'transfer' && !(transfers || []).some(t => t.code === s.code) ? 'waiting_transfer_proof' : 'waiting_staff';
}
function addHistory(s, text, kind) { (s.history = s.history || []).push({at: nowIso(), text, kind}); }

function field(id, label, control, o = {}) {
  return `<div class="field ${o.err ? 'invalid' : ''}" ${o.attrs || ''}>${label ? `<label class="label" for="${id}">${label}${o.req ? ' <span class="req">*</span>' : ''}</label>` : ''}
    ${control}${o.hint ? `<div class="hint">${o.hint}</div>` : ''}${o.err ? `<div class="err">${esc(o.err)}</div>` : ''}</div>`;
}
function input(id, value, attrs = '') { return `<input class="input" id="${id}" name="${id}" value="${esc(value)}" ${attrs}>`; }
function textarea(id, value, attrs = '') { return `<textarea class="input" id="${id}" name="${id}" ${attrs}>${esc(value)}</textarea>`; }
function select(id, items, value, placeholder, attrs = '') {
  return `<select class="input" id="${id}" name="${id}" ${attrs}>${placeholder != null ? `<option value="">${esc(placeholder)}</option>` : ''}${items.map(i => {
    const [v, t] = Array.isArray(i) ? i : [i, i]; return `<option value="${esc(v)}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select>`;
}
function radios(name, items, value, attrs = '', col) {
  return `<div class="choices ${col ? 'col' : ''}" role="radiogroup">${items.map(([v, t, sub]) =>
    `<label class="choice"><input type="radio" name="${name}" value="${esc(v)}" ${String(v) === String(value ?? '') ? 'checked' : ''} ${attrs}>
      ${sub ? `<span class="opt"><b>${esc(t)}</b><small>${esc(sub)}</small></span>` : esc(t)}</label>`).join('')}</div>`;
}
function checks(name, items, values = [], attrs = '') {
  return `<div class="choices col">${items.map(([v, t]) =>
    `<label class="choice"><input type="checkbox" name="${name}" value="${esc(v)}" ${values.includes(v) ? 'checked' : ''} ${attrs}> ${esc(t)}</label>`).join('')}</div>`;
}
function radioField(name, label, items, value, o = {}) {
  return `<div class="field ${o.err ? 'invalid' : ''} ${o.cls || ''}"><span class="label">${label}${o.req ? ' <span class="req">*</span>' : ''}</span>
    ${radios(name, items, value, o.attrs || '', o.col)}${o.hint ? `<div class="hint">${o.hint}</div>` : ''}${o.err ? `<div class="err">${esc(o.err)}</div>` : ''}</div>`;
}
function formData(form) {
  const o = {};
  new FormData(form).forEach((v, k) => {
    v = typeof v === 'string' ? v.trim() : v;
    if (k in o) o[k] = [].concat(o[k], v); else o[k] = v;
  });
  return o;
}
const arr = v => v == null || v === '' ? [] : [].concat(v);
function listRows(rows, empty) {
  if (!rows.length) return `<div class="list"><div class="empty">${empty || 'ไม่มีรายการ'}</div></div>`;
  return `<div class="list">${rows.join('')}</div>`;
}
function studentRow(s, attrs, sub, end) {
  return `<button class="li" ${attrs}><span class="av">${esc((s.first_name || '?').slice(0, 1))}</span>
    <span class="main"><span class="t">${esc(fullName(s))}</span><span class="s">${sub}</span>${end != null ? end : `<span>${badge(s)}</span>`}</span>
    <span class="end">${icon('chev', 'chev')}</span></button>`;
}
function tbl(cols, rows, foot) {
  return `<div class="table-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th class="${c.r ? 'r' : ''}">${esc(c.t)}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.map(r => `<tr>${r.map((v, i) => `<td class="${cols[i].r ? 'r' : ''}">${v}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length}" class="empty">ไม่มีข้อมูล</td></tr>`}</tbody>
    ${foot ? `<tfoot><tr>${foot.map((v, i) => `<td class="${cols[i].r ? 'r' : ''}">${v}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
}
function errNote(e) {
  const n = Object.keys(e || {}).length;
  return n ? '<div class="note bad" role="alert"><b>ยังกรอกข้อมูลไม่ครบ</b> — กรุณากรอกช่องที่เป็นสีแดงให้ครบ แล้วกดอีกครั้ง</div>' : '';
}
function focusFirstError() { const el = document.querySelector('.field.invalid .input, .field.invalid input'); if (el) el.focus(); }

/* กรอกช่องที่เป็นสีแดงแล้ว เอาสีแดงออกทันที ไม่ต้องรอกดถัดไปอีกครั้ง */
function clearInvalid(e) {
  const el = e.target;
  const box = el.closest('.field.invalid, .check.invalid');
  if (!box) return;
  const filled = el.type === 'checkbox' || el.type === 'radio' ? el.checked : String(el.value || '').trim() !== '';
  if (!filled) return;
  box.classList.remove('invalid');
  const msg = box.classList.contains('check') ? box.nextElementSibling : box.querySelector(':scope > .err');
  if (msg && msg.classList.contains('err')) msg.remove();
}
document.addEventListener('input', clearInvalid);
document.addEventListener('change', clearInvalid);

/* ---------- หน้าเลือกบทบาท ---------- */
App.views.home = function () {
  this.session = {role: null};
  return {html: `
    <section class="hero"><h1>ระบบทุนการศึกษา<br>ปีการศึกษา ${this.db.cycle.year}</h1>
      <p class="muted">เลือกบทบาทเพื่อทดลองใช้งาน ข้อมูลทั้งหมดเป็นข้อมูลจำลอง</p></section>
    <h2 class="home-sec"><span class="home-tag on">ออนไลน์</span>สมัครทางออนไลน์</h2>
    <div class="flow" aria-label="ลำดับการทำงาน"><b>นักเรียนกรอกใบสมัคร</b><span>→</span><b>ครูตรวจและส่งมูลนิธิฯ</b><span>→</span><b>เจ้าหน้าที่พิจารณา</b></div>
    <div class="roles">
      <button class="role" data-go="student-entry"><span class="ico">${icon('student')}</span><h2>นักเรียน / นักศึกษา</h2>
        <p>สมัครขอรับทุน กรอกข้อมูลต่อ ตรวจสอบใบสมัคร และดูขั้นตอนหลังส่งข้อมูล</p><span class="btn primary go">เข้าสู่ระบบนักเรียน</span></button>
      <button class="role" data-go="teacher-entry"><span class="ico">${icon('teacher')}</span><h2>ครู / สถานศึกษา</h2>
        <p>ตรวจสอบรายชื่อนักเรียน อัปโหลดเอกสาร และส่งใบสมัครมายังมูลนิธิฯ</p><span class="btn primary go">เข้าสู่ระบบครู</span></button>
      <button class="role" data-go="staff-entry"><span class="ico">${icon('staff')}</span><h2>เจ้าหน้าที่มูลนิธิฯ</h2>
        <p>พิจารณาใบสมัคร จัดการสถานศึกษา และรายงาน</p><span class="btn primary go">เข้าสู่ระบบเจ้าหน้าที่</span></button>
    </div>
    <h2 class="home-sec"><span class="home-tag post">ไปรษณีย์</span>สมัครทางไปรษณีย์</h2>
    <div class="flow" aria-label="ลำดับการทำงานทางไปรษณีย์"><b>ใบสมัครกระดาษส่งถึงมูลนิธิฯ</b><span>→</span><b>เจ้าหน้าที่บันทึกและพิมพ์ใบปะหน้า</b><span>→</span><b>ผจก. พิจารณา</b></div>
    <div class="roles roles-extra">
      <button class="role role-postal" data-go="postal-entry"><span class="ico">${icon('mail')}</span><h2>บันทึกข้อมูล / อนุมัติทุน</h2>
        <p>เจ้าหน้าที่บันทึกใบสมัครกระดาษแบบสรุปย่อ พิมพ์ใบปะหน้าโรงเรียน และ ผจก. อนุมัติทุน</p><span class="btn primary go">เข้าสู่ระบบ</span></button>
    </div>
    <div class="note info small row between"><span>ทำในบทบาทหนึ่งแล้วเห็นผลในบทบาทอื่นทันที ข้อมูลทดลองเก็บไว้ในเบราว์เซอร์นี้เท่านั้น</span>
      <button class="btn ghost sm" data-action="reset">ล้างข้อมูลทดลอง</button></div>`};
};
App.on('home', function () { this.go('home'); });
App.on('reset', function () { this.reset(); });

/* ตัวเลือกพื้นที่: เปลี่ยนแล้วล้างระดับที่ต่ำกว่า และวาดใหม่ในที่เดิม */
App.on('area', function (el) {
  const prefix = el.dataset.prefix, key = el.dataset.key;
  const v = this.readArea(prefix);
  const order = ['region', 'province', 'district', 'sub', 'school'];
  order.slice(order.indexOf(key) + 1).forEach(k => { if (!(key === 'sub' && k === 'school')) v[k] = ''; });
  const box = el.closest('[data-area]');
  box.innerHTML = this.areaPicker(prefix, v, JSON.parse(box.dataset.area || '{}'));
  const next = order.slice(order.indexOf(key) + 1).map(k => document.getElementById(`${prefix}-${k}`)).find(x => x && !x.disabled);
  if (next) next.focus();
  this.dispatch(box.dataset.after, box);
});
