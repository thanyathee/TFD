#!/usr/bin/env python3
"""สร้างข้อมูลจำลองสำหรับทดสอบระบบ: นักเรียน 100 คน, สถานศึกษา 100 แห่ง + บัญชีครู 100 บัญชี (1 โรงเรียน = 1 Username)

    python3 db/tools/build_mock_data.py

ผลลัพธ์ (สุ่มด้วย seed คงที่ รันซ้ำได้ผลเหมือนเดิม):
    db/seed_mock.sql          รันต่อจาก schema.sql และ seed_geography.sql
    db/mock/mock_data.json    ข้อมูลชุดเดียวกันสำหรับหน้า HTML ต้นแบบ

ข้อมูลทั้งหมดเป็นของปลอม: ชื่อสุ่มจากรายชื่อทั่วไป เลขบัตรสุ่ม (ผ่านสูตรตรวจหลักท้าย)
เบอร์โทรขึ้นต้น 080-000 และอีเมลใช้โดเมน example.com
"""
import json
import random
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
rng = random.Random(2570)
NS = uuid.UUID('6f0d1c2e-2570-4a00-9000-000000000000')


def uid(kind, n):
    return str(uuid.uuid5(NS, f'{kind}-{n}'))


def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, dict):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    if isinstance(v, list):
        return 'ARRAY[' + ','.join(q(x) for x in v) + ']::text[]' if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"


def insert(table, rows):
    cols = list(rows[0])
    body = ',\n'.join('  (' + ', '.join(q(r[c]) for c in cols) + ')' for r in rows)
    return f'INSERT INTO {table} ({", ".join(cols)}) VALUES\n{body};\n'


# ---------------------------------------------------------------- รายชื่อ
BOY = ['ธนกร', 'ภาณุพงศ์', 'ณัฐวุฒิ', 'กิตติพัฒน์', 'ศุภชัย', 'วรเมธ', 'อนุชา', 'ปิยะพงษ์', 'จิรายุ', 'ธีรภัทร',
       'สิทธิชัย', 'พงศกร', 'ชยพล', 'ณัฐพล', 'อภิสิทธิ์', 'กฤษดา', 'ภูมิพัฒน์', 'วีรภัทร', 'ธนพล', 'รัฐภูมิ']
GIRL = ['สุภาวดี', 'กานต์พิชชา', 'ปวีณา', 'ณัฐธิดา', 'ชนิดาภา', 'พิมพ์ชนก', 'อรอุมา', 'วรรณิดา', 'ศิริพร', 'จิราพร',
        'ธัญญารัตน์', 'ปภาวรินทร์', 'กมลชนก', 'สุนิสา', 'พัชราภา', 'เบญจมาศ', 'นันทิชา', 'อัญชลี', 'ชุติมา', 'มณีรัตน์']
SURNAME = ['ใจดี', 'สมพงษ์', 'แสงดี', 'ศรีสุข', 'บุญมา', 'ทองคำ', 'แก้วมณี', 'สุขเจริญ', 'พรหมมา', 'จันทร์หอม',
           'อินทร์แก้ว', 'วงศ์ใหญ่', 'มีสุข', 'บัวทอง', 'คำแสน', 'ปัญญาดี', 'รักษาศรี', 'สายสุวรรณ', 'ชัยมงคล', 'เพชรรัตน์',
           'นาคสวัสดิ์', 'ศรีวงศ์', 'ทองดี', 'บุญเรือง', 'แสนคำ', 'พันธุ์ดี', 'กองแก้ว', 'สุวรรณศรี', 'ดวงจันทร์', 'มั่นคง']
ADULT_M = ['สมชาย', 'สมศักดิ์', 'ประเสริฐ', 'วิชัย', 'สุรชัย', 'บุญเลิศ', 'สมบัติ', 'ชาญชัย', 'วีระ', 'ธีระ']
ADULT_F = ['สมฤดี', 'บุษบา', 'วันเพ็ญ', 'สุดารัตน์', 'มาลี', 'นงลักษณ์', 'ประภา', 'อำไพ', 'จันทร์เพ็ญ', 'รัตนา']

# สถานศึกษาจำลอง: 50 อำเภอ อำเภอละ 2 แห่ง
SCHOOL_AREAS = [
    ('แพร่', 'เมืองแพร่'), ('แพร่', 'ลอง'), ('น่าน', 'เมืองน่าน'), ('เชียงใหม่', 'จอมทอง'), ('เชียงราย', 'แม่สาย'),
    ('ลำปาง', 'เกาะคา'), ('พะเยา', 'ดอกคำใต้'), ('อุตรดิตถ์', 'ลับแล'), ('แม่ฮ่องสอน', 'ปาย'), ('ลำพูน', 'ป่าซาง'),
    ('ขอนแก่น', 'ชุมแพ'), ('อุดรธานี', 'กุมภวาปี'), ('นครราชสีมา', 'ปักธงชัย'), ('บุรีรัมย์', 'นางรอง'), ('สุรินทร์', 'ศีขรภูมิ'),
    ('ศรีสะเกษ', 'กันทรลักษ์'), ('อุบลราชธานี', 'วารินชำราบ'), ('ร้อยเอ็ด', 'เสลภูมิ'), ('สกลนคร', 'สว่างแดนดิน'), ('ชัยภูมิ', 'ภูเขียว'),
    ('มหาสารคาม', 'บรบือ'), ('กาฬสินธุ์', 'กุฉินารายณ์'), ('เลย', 'วังสะพุง'), ('นครพนม', 'ธาตุพนม'), ('ยโสธร', 'เลิงนกทา'),
    ('นครสวรรค์', 'ตาคลี'), ('พิษณุโลก', 'วังทอง'), ('เพชรบูรณ์', 'หล่มสัก'), ('สุพรรณบุรี', 'อู่ทอง'), ('ลพบุรี', 'บ้านหมี่'),
    ('กำแพงเพชร', 'ขาณุวรลักษบุรี'), ('สุโขทัย', 'สวรรคโลก'), ('พิจิตร', 'ตะพานหิน'), ('ชัยนาท', 'สรรคบุรี'), ('อุทัยธานี', 'บ้านไร่'),
    ('กาญจนบุรี', 'ทองผาภูมิ'), ('ตาก', 'แม่สอด'), ('ราชบุรี', 'โพธาราม'), ('เพชรบุรี', 'ท่ายาง'), ('ประจวบคีรีขันธ์', 'บางสะพาน'),
    ('สระแก้ว', 'อรัญประเทศ'), ('จันทบุรี', 'โป่งน้ำร้อน'), ('ฉะเชิงเทรา', 'พนมสารคาม'),
    ('นครศรีธรรมราช', 'ทุ่งสง'), ('สุราษฎร์ธานี', 'พระแสง'), ('สงขลา', 'สะเดา'), ('ตรัง', 'ห้วยยอด'), ('ปัตตานี', 'โคกโพธิ์'),
    ('นราธิวาส', 'ระแงะ'), ('ชุมพร', 'หลังสวน'),
]
COLLEGE_AREAS = {4, 12, 26, 36, 43, 47}   # แห่งที่ 2 ของอำเภอเหล่านี้เป็นวิทยาลัยเทคนิค
UNIVERSITY_AREAS = {10, 16, 27}           # แห่งที่ 2 ของอำเภอเหล่านี้เป็นมหาวิทยาลัย

# ช่วงชั้น → ระดับชั้นปัจจุบัน → ระดับชั้นปีที่ได้รับทุน (ตามต้นแบบ v28)
CLASS_GROUPS = {
    'primary': ['ป.5', 'ป.6'], 'lowersec': ['ม.1', 'ม.2', 'ม.3'], 'uppersec': ['ม.4', 'ม.5', 'ม.6'],
    'voc': ['ปวช.1', 'ปวช.2', 'ปวช.3'], 'highvoc': ['ปวส.1', 'ปวส.2'],
    'bachelor': ['ปริญญาตรี ปี 1', 'ปริญญาตรี ปี 2', 'ปริญญาตรี ปี 3', 'ปริญญาตรี ปี 4'],
}
NEXT = {'ป.5': ['ป.6'], 'ป.6': ['ม.1'], 'ม.1': ['ม.2'], 'ม.2': ['ม.3'], 'ม.3': ['ม.4', 'ปวช.1'], 'ม.4': ['ม.5'], 'ม.5': ['ม.6'],
        'ม.6': ['ปวส.1', 'ปริญญาตรี ปี 1'], 'ปวช.1': ['ปวช.2'], 'ปวช.2': ['ปวช.3'], 'ปวช.3': ['ปวส.1', 'ปริญญาตรี ปี 1'],
        'ปวส.1': ['ปวส.2'], 'ปวส.2': ['ปริญญาตรี ปี 1', 'ปริญญาตรี ปี 3'], 'ปริญญาตรี ปี 1': ['ปริญญาตรี ปี 2'],
        'ปริญญาตรี ปี 2': ['ปริญญาตรี ปี 3'], 'ปริญญาตรี ปี 3': ['ปริญญาตรี ปี 4'], 'ปริญญาตรี ปี 4': ['ปริญญาตรี ปี 5']}
AGE = {'ป.5': 11, 'ป.6': 12, 'ม.1': 13, 'ม.2': 14, 'ม.3': 15, 'ม.4': 16, 'ม.5': 17, 'ม.6': 18, 'ปวช.1': 16, 'ปวช.2': 17,
       'ปวช.3': 18, 'ปวส.1': 19, 'ปวส.2': 20, 'ปริญญาตรี ปี 1': 19, 'ปริญญาตรี ปี 2': 20, 'ปริญญาตรี ปี 3': 21, 'ปริญญาตรี ปี 4': 22}
RATES = [('P6', 'ประถมศึกษาปีที่ 6', 1000), ('M_LOWER', 'มัธยมศึกษาตอนต้น', 3000), ('M_UPPER', 'มัธยมศึกษาตอนปลาย', 3500),
         ('PVC', 'ประกาศนียบัตรวิชาชีพ (ปวช.)', 7000), ('PVS', 'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)', 9000),
         ('PVS_IND', 'ปวส. สาขาอุตสาหกรรม', 14000), ('BACHELOR', 'ปริญญาตรี', 15000), ('SPECIAL', 'อื่น ๆ / อัตราพิเศษ', 1000)]
RATE_AMT = {c: a for c, _, a in RATES}


def rate_of(nxt, pvs):
    if nxt == 'ป.6':
        return 'P6'
    if nxt in ('ม.1', 'ม.2', 'ม.3'):
        return 'M_LOWER'
    if nxt.startswith('ม.'):
        return 'M_UPPER'
    if nxt.startswith('ปวช'):
        return 'PVC'
    if nxt.startswith('ปวส'):
        return 'PVS_IND' if pvs == 'industry' else 'PVS'
    return 'BACHELOR'


STATUS_PLAN = (['draft'] * 20 + ['waiting_teacher'] * 25 + ['returned_to_student'] * 5 + ['waiting_staff'] * 20 +
               ['need_more_info'] * 5 + ['waiting_manager'] * 10 + ['decided'] * 15)
DECISION_PLAN = ['approved'] * 9 + ['rejected'] * 2 + ['reserve'] * 2 + ['ineligible'] * 2

PARENT_STATUS_W = [('alive', 86), ('dead', 5), ('contact', 6), ('prison', 2), ('monk', 1)]
OCCUPATIONS = ['รับจ้างทั่วไป', 'เกษตรกร', 'ค้าขาย', 'พนักงานโรงงาน', 'ขับรถรับจ้าง', 'แม่บ้าน', 'ก่อสร้าง']
HOUSING = ['บ้านของครอบครัว', 'บ้านเช่า', 'ห้องเช่า / หอพัก', 'อาศัยอยู่กับญาติหรือผู้อื่น', 'บ้านพักที่นายจ้างหรือที่ทำงานจัดให้',
           'บ้านพักของทางราชการ', 'อื่น ๆ']
ASSET_KEYS = ['washer', 'computer', 'aircon', 'motorcycle', 'car', 'pickup', 'farm_vehicle']
FAMILY_FLAGS = ['together', 'apart', 'separated', 'divorced', 'father_new', 'mother_new']
TRAVEL = ['เดิน', 'ปั่นจักรยาน', 'ซ้อนรถจักรยานยนต์ผู้ปกครอง', 'รถสองแถว', 'รถรับส่งนักเรียน']


def citizen_id():
    d = [rng.randint(1, 8)] + [rng.randint(0, 9) for _ in range(11)]
    check = (11 - sum(x * (13 - i) for i, x in enumerate(d)) % 11) % 10
    return ''.join(map(str, d)) + str(check)


def phone(n):
    return f'080000{n:04d}'


def parent(prefix, sex, last):
    st = rng.choices([s for s, _ in PARENT_STATUS_W], [w for _, w in PARENT_STATUS_W])[0]
    f = {prefix + '_status': st}
    if st not in ('alive',):
        f.update({prefix + k: None for k in ('_name', '_age', '_occupation', '_income_type', '_daily_wage', '_work_days', '_monthly_income')})
        f[prefix + '_cannot_work'] = False
        return f
    itype = rng.choices(['none', 'daily', 'salary', 'other'], [10, 45, 15, 30])[0]
    f.update({
        prefix + '_name': f'{"นาย" if sex == "m" else "นาง"} {rng.choice(ADULT_M if sex == "m" else ADULT_F)} {last}',
        prefix + '_age': rng.randint(32, 58),
        prefix + '_occupation': None if itype == 'none' else rng.choice(OCCUPATIONS),
        prefix + '_cannot_work': itype == 'none' and rng.random() < 0.5,
        prefix + '_income_type': itype,
        prefix + '_daily_wage': rng.choice([250, 300, 350, 400]) if itype == 'daily' else None,
        prefix + '_work_days': (rng.choice([10, 15, 18, 20, 22, None])) if itype == 'daily' else None,
        prefix + '_monthly_income': rng.randint(60, 150) * 100 if itype in ('salary', 'other') else None,
    })
    return f


def main():
    geo = json.loads((ROOT / 'geography/thailand_geography.json').read_text('utf-8'))
    prov = {p['th']: p for p in geo['provinces']}
    region_code = {r['id']: r['code'] for r in geo['regions']}
    dist_by = {(d['p'], d['th']): d for d in geo['districts']}
    subs_by = {}
    for x in geo['subdistricts']:
        subs_by.setdefault(x['d'], []).append(x)

    # ---------------- สถานศึกษา 100 แห่ง
    schools = []
    for a, (pv, am) in enumerate(SCHOOL_AREAS):
        p = prov[pv]
        d = dist_by[(p['id'], am)]
        subs = subs_by[d['id']]
        for k in range(2):
            i = len(schools) + 1
            sub = subs[k % len(subs)]
            if k == 1 and a in UNIVERSITY_AREAS:
                kind, name, levels = 'university', f'มหาวิทยาลัยตัวอย่าง{pv} (จำลอง)', ['bachelor']
            elif k == 1 and a in COLLEGE_AREAS:
                kind, name, levels = 'college', f'วิทยาลัยเทคนิค{am} (จำลอง)', ['voc', 'highvoc']
            elif k == 0:
                kind, name, levels = 'school', f'โรงเรียน{am}วิทยา (จำลอง)', ['lowersec', 'uppersec']
            else:
                kind, name, levels = 'school', f'โรงเรียนบ้าน{sub["th"]} (จำลอง)', ['primary', 'lowersec']
            schools.append({
                'id': i, 'institution_code': f'SCH-{i:03d}', 'name': name, 'school_type': kind,
                'subdistrict_id': sub['id'], 'district_id': d['id'],
                'address': f'{rng.randint(1, 299)} หมู่ {rng.randint(1, 15)}', 'postcode': sub['zip'], 'levels_offered': levels,
                '_province': pv, '_district': d['pre'] + d['th'], '_subdistrict': sub['pre'] + sub['th'],
                '_region': region_code[p['r']],
            })

    # ---------------- บัญชีเจ้าหน้าที่ 4 + ครู 1 บัญชีต่อสถานศึกษา
    staff = [
        {'id': uid('staff', 1), 'username': 'reviewer01', 'full_name': 'จนท. 01', 'position': 'เจ้าหน้าที่ทุน', 'department': None, 'role': 'reviewer', 'school_id': None},
        {'id': uid('staff', 2), 'username': 'reviewer02', 'full_name': 'จนท. 02', 'position': 'เจ้าหน้าที่ทุน', 'department': None, 'role': 'reviewer', 'school_id': None},
        {'id': uid('staff', 3), 'username': 'manager01', 'full_name': 'ผู้จัดการทุน', 'position': 'ผู้จัดการ', 'department': None, 'role': 'manager', 'school_id': None},
        {'id': uid('staff', 4), 'username': 'admin01', 'full_name': 'ผู้ดูแลระบบ', 'position': 'ผู้ดูแลระบบ', 'department': None, 'role': 'admin', 'school_id': None},
    ]
    for x in staff:
        x.update(phone=None, email=f'{x["username"]}@example.com')
    teachers = []
    for sc in schools:
        n = sc['id']
        female = rng.random() < 0.65
        title = rng.choice(['นาง', 'นางสาว']) if female else 'นาย'
        uni = sc['school_type'] == 'university'
        teachers.append({
            'id': uid('teacher', n), 'username': f'sch{n:03d}',
            'full_name': f'{title} {rng.choice(ADULT_F if female else ADULT_M)} {rng.choice(SURNAME)}',
            'position': 'เจ้าหน้าที่' if uni else rng.choice(['ครู', 'ครูชำนาญการ', 'ครูชำนาญการพิเศษ']),
            'department': 'งานทุนการศึกษา' if uni else rng.choice(['งานแนะแนว', 'งานกิจการนักเรียน', 'งานทุนการศึกษา']),
            'role': 'teacher', 'school_id': n, 'phone': phone(n), 'email': f'sch{n:03d}@example.com',
        })
    users = staff + teachers

    # ---------------- นักเรียน 100 คน: กระจุกในบางโรงเรียนเพื่อให้หน้าครูมีรายชื่อพอทดลอง
    plan = [1] * 8 + [3] * 5 + [2] * 5 + [k for k in range(4, 101) for _ in range(1)]
    slots = []
    for sid in plan:
        slots.append(sid)
    slots = slots[:100]
    statuses = STATUS_PLAN[:]
    rng.shuffle(statuses)
    decisions_left = DECISION_PLAN[:]
    students, apps, fams, sibs, funding, treviews, sreviews, decisions, history = [], [], [], [], [], [], [], [], []
    used_ids = set()
    base = datetime(2026, 11, 1, 8, 0)
    for n in range(1, 101):
        sc = schools[slots[n - 1] - 1]
        group = rng.choice(sc['levels_offered'])
        cur = rng.choice(CLASS_GROUPS[group])
        nxt = rng.choice(NEXT[cur])
        bachelor = group == 'bachelor'
        pvs = rng.choice(['industry', 'business', 'other']) if nxt.startswith('ปวส') else None
        rate = rate_of(nxt, pvs)
        age = AGE[cur]
        birth = date(2026 - age, 1, 1) + timedelta(days=rng.randint(0, 364))
        female = rng.random() < 0.55
        title = ('เด็กหญิง' if female else 'เด็กชาย') if age < 15 else ('นางสาว' if female else 'นาย')
        last = rng.choice(SURNAME)
        cid = citizen_id()
        while cid in used_ids:
            cid = citizen_id()
        used_ids.add(cid)
        sid = uid('student', n)
        students.append({'id': sid, 'citizen_id': cid, 'title': title, 'first_name': rng.choice(GIRL if female else BOY),
                         'last_name': last, 'gender': 'หญิง' if female else 'ชาย', 'birth_date': birth.isoformat(), 'phone': phone(500 + n)})

        status = statuses[n - 1]
        if bachelor and status in ('waiting_teacher', 'returned_to_student'):
            status = 'waiting_staff'
        res = decisions_left.pop() if status == 'decided' else None
        cont = rng.random() < 0.3
        started = base + timedelta(days=rng.randint(0, 50), hours=rng.randint(0, 10), minutes=rng.randint(0, 59))
        submitted = None if status == 'draft' else started + timedelta(hours=rng.randint(1, 72))
        aid = uid('app', n)
        addr = f'{rng.randint(1, 299)} หมู่ {rng.randint(1, 15)} {sc["_subdistrict"]} {sc["_district"]} จังหวัด{sc["_province"]} {sc["postcode"]}'
        same_addr = rng.random() < 0.75
        loan = res == 'ineligible'
        other_sch = rng.random() < 0.15
        n_sib = rng.randint(0, 4)
        apps.append({
            'id': aid, 'app_code': f'TF2570-{n:06d}', 'cycle_id': 1, 'student_id': sid, 'school_id': sc['id'],
            'applicant_type': 'CONT' if cont else 'NEW', 'received_prev_year': cont,
            'prev_year_verified': True if status in ('waiting_manager', 'decided') else None,
            'status': status, 'is_bachelor': bachelor, 'education_group': group,
            'current_class': cur, 'next_class': nxt, 'rate_level_code': rate,
            'study_mode': rng.choice(['regular'] * 8 + ['special', 'dual']) if group in ('uppersec', 'voc', 'highvoc', 'bachelor') else None,
            'study_mode_other': None, 'pvs_type': pvs,
            'faculty': (rng.choice(['ช่างยนต์', 'ช่างไฟฟ้า', 'การบัญชี', 'คอมพิวเตอร์ธุรกิจ']) if group in ('voc', 'highvoc')
                        else rng.choice(['ครุศาสตร์ / การประถมศึกษา', 'พยาบาลศาสตร์', 'บริหารธุรกิจ / การบัญชี', 'วิศวกรรมศาสตร์']) if bachelor else None),
            'program_years': rng.choice([4, 5]) if cur == 'ปริญญาตรี ปี 4' else None,
            'stays_same_school': rng.random() < 0.8 if cur not in ('ม.3', 'ม.6', 'ปวช.3', 'ปวส.2') else rng.random() < 0.4,
            'has_student_loan': loan, 'loan_amount': rng.choice([18000, 25000, 30000]) if loan else None,
            'loan_period': 'ต่อปี' if loan else None, 'review_round': None,
            'home_address': addr, 'current_address': addr if same_addr else f'{rng.randint(1, 199)}/{rng.randint(1, 30)} ' + addr.split(' ', 1)[1],
            'story_family': f'อาศัยอยู่กับ{rng.choice(["พ่อแม่", "แม่", "ยายและตา", "ป้า"])} ผู้ปกครองมีรายได้ไม่แน่นอน ต้องดูแลสมาชิกหลายคน',
            'story_siblings': f'มีพี่น้อง {n_sib} คน แม่เป็นผู้ออกค่าใช้จ่ายหลัก' if n_sib else 'เป็นลูกคนเดียว ยายช่วยออกค่าใช้จ่ายบางส่วน',
            'story_travel': f'{rng.choice(TRAVEL)}มาโรงเรียน ใช้เวลาประมาณ {rng.choice([10, 15, 20, 30, 45])} นาที ได้เงินไปโรงเรียนวันละ {rng.choice([20, 30, 40, 50])} บาท',
            'story_housing': rng.choice(['บ้านไม้ชั้นเดียว หลังคารั่วบางจุด ต้องซ่อมแซม', 'บ้านปูนชั้นเดียวของญาติ ห้องน้ำชำรุด',
                                         'ห้องเช่าเล็ก ๆ ใกล้ตลาด อยู่กันสี่คน', 'บ้านไม้สองชั้นที่ทรุดโทรม พื้นผุบางส่วน']),
            'story_expenses': f'ค่าใช้จ่ายในบ้านประมาณ {rng.randint(4, 12) * 1000:,} บาทต่อเดือน' + rng.choice([' ยังไม่มีหนี้', ' และมีหนี้นอกระบบ', ' มีหนี้ ธ.ก.ส.']),
            'story_other': rng.choice(['', 'อยากเรียนต่อพยาบาล', 'ตั้งใจเรียนเพื่อช่วยครอบครัว', 'ช่วยผู้ปกครองทำงานหลังเลิกเรียน']),
            'confirmed_true': status != 'draft', 'pdpa_version': None if status == 'draft' else '2026-08',
            'pdpa_ack_at': submitted.isoformat() if submitted else None,
            'submitted_at': submitted.isoformat() if submitted else None,
            'locked': status not in ('draft', 'returned_to_student'),
        })
        if loan:
            funding.append({'application_id': aid, 'kind': 'loan', 'provider': 'กยศ.', 'amount': apps[-1]['loan_amount'], 'period': 'ต่อปี'})
        if other_sch:
            funding.append({'application_id': aid, 'kind': 'scholarship', 'provider': rng.choice(['องค์การบริหารส่วนจังหวัด', 'มูลนิธิตัวอย่าง', 'สถานศึกษา']),
                            'amount': rng.choice([2000, 3000, 5000]), 'period': rng.choice(['ต่อภาคเรียน', 'ต่อปี'])})

        fam = {'application_id': aid}
        fam.update(parent('father', 'm', last))
        fam.update(parent('mother', 'f', last))
        flags = rng.choice([['together'], ['together'], ['together'], ['apart'], ['separated'], ['divorced', 'father_new'], ['separated', 'mother_new']])
        housing = rng.choice(HOUSING[:4] * 3 + HOUSING[4:])
        own = rng.random() < 0.3
        rent = rng.random() < 0.15
        no_assets = rng.random() < 0.2
        assets = {} if no_assets else {k: (rng.randint(1, 2) if k in ('motorcycle', 'car', 'pickup', 'farm_vehicle') else 1)
                                       for k in rng.sample(ASSET_KEYS[:4] + ['pickup'], rng.randint(1, 3))}
        fam.update({'family_status': flags, 'housing_type': housing,
                    'housing_cost': rng.choice([800, 1500, 2000, 2500]) if housing in ('บ้านเช่า', 'ห้องเช่า / หอพัก') or rng.random() < 0.1 else None,
                    'own_land': own, 'own_land_rai': rng.randint(1, 8) if own else None, 'own_land_ngan': rng.randint(0, 3) if own else None,
                    'rent_land': rent, 'rent_land_rai': rng.randint(1, 5) if rent else None, 'rent_land_ngan': rng.randint(0, 3) if rent else None,
                    'rent_land_cost': rng.choice([2000, 3000, 5000]) if rent else None,
                    'assets': assets, 'no_assets': no_assets, 'sibling_count': n_sib})
        fams.append(fam)
        for k in range(1, n_sib + 1):
            st = rng.choice(['study', 'study', 'work', 'none'])
            sibs.append({'application_id': aid, 'seq': k, 'name': f'{rng.choice(BOY + GIRL)} {last}', 'age': rng.randint(3, 25),
                         'relation': rng.choice(['พี่/น้องร่วมบิดามารดา'] * 4 + ['พี่/น้องต่างบิดา', 'พี่/น้องต่างมารดา']),
                         'residence': rng.choice(['อยู่บ้านเดียวกัน'] * 3 + ['แยกออกไปพักอาศัยที่อื่น']), 'status': st,
                         'edu_level': rng.choice(['ประถมศึกษา', 'มัธยมศึกษา', 'ปวช.']) if st == 'study' else None,
                         'school_name': 'โรงเรียนใกล้บ้าน' if st == 'study' else None,
                         'has_loan': (rng.random() < 0.2) if st == 'study' else None,
                         'occupation': rng.choice(OCCUPATIONS[:5]) if st == 'work' else None,
                         'detail': rng.choice(['ยังไม่ถึงวัยเรียน', 'แม่บ้าน', 'บวช']) if st == 'none' else None})

        ev = [(started, 'นักเรียนเริ่มกรอกใบสมัคร', 'started')]
        if submitted:
            ev.append((submitted, 'นักศึกษาส่งใบสมัครถึงมูลนิธิฯ โดยตรง' if bachelor else 'นักเรียนส่งข้อมูลให้ครู', 'submitted'))
        t_sent = None
        if status in ('waiting_staff', 'need_more_info', 'waiting_manager', 'decided'):
            t_sent = submitted + timedelta(days=rng.randint(1, 6), hours=rng.randint(0, 8))
            if not bachelor:
                gpa = rng.random() < 0.7
                treviews.append({'application_id': aid, 'teacher_id': teachers[sc['id'] - 1]['id'],
                                 'grade_type': 'gpa' if gpa else 'percent',
                                 'grade_value': round(rng.uniform(2.2, 3.9), 2) if gpa else round(rng.uniform(60, 92), 2),
                                 'comment': 'ครอบครัวมีรายได้ไม่แน่นอน ผู้ปกครองรับจ้างรายวัน ' + rng.choice(
                                     ['นักเรียนช่วยงานบ้านและตั้งใจเรียนสม่ำเสมอ', 'มีภาระหนี้สินและต้องดูแลผู้สูงอายุในบ้าน', 'นักเรียนเดินทางไกลมาเรียนทุกวัน']),
                                 'sent_at': t_sent.isoformat()})
                ev.append((t_sent, 'ครูส่งข้อมูลให้มูลนิธิฯ', 'teacher_sent'))
        reviewed = None
        if status in ('need_more_info', 'waiting_manager', 'decided'):
            reviewed = t_sent + timedelta(days=rng.randint(1, 5), hours=rng.randint(0, 8))
            rr = 'need_more_info' if status == 'need_more_info' else 'ineligible' if res == 'ineligible' else 'forward'
            rnd = 1 if cur in ('ป.6', 'ม.3') or rng.random() < 0.6 else 2
            apps[-1]['review_round'] = rnd
            who = staff[rng.randint(0, 1)]
            sreviews.append({'application_id': aid, 'reviewer_id': who['id'], 'review_round': rnd, 'result': rr,
                             'comment': {'need_more_info': 'ขอหนังสือรับรองรายได้ผู้ปกครองเพิ่มเติม',
                                         'ineligible': 'ผู้สมัครกู้ยืม กยศ. ไม่เข้าเกณฑ์การพิจารณาทุน',
                                         'forward': 'ข้อมูลครบถ้วน ครอบครัวมีความจำเป็นจริง'}[rr]})
            ev.append((reviewed, {'need_more_info': 'เจ้าหน้าที่ขอข้อมูลเพิ่มเติม', 'ineligible': 'เจ้าหน้าที่รีวิว: ไม่เข้าเกณฑ์',
                                  'forward': 'เจ้าหน้าที่รีวิวเรียบร้อย ส่งให้ผู้จัดการพิจารณา'}[rr] + ' — ' + who['full_name'],
                       'reviewer_' + rr))
        if status == 'decided':
            std = RATE_AMT[rate]
            special = res == 'approved' and rng.random() < 0.2
            decided = reviewed + timedelta(days=rng.randint(0, 4), hours=rng.randint(1, 8))
            decisions.append({'application_id': aid, 'manager_id': (staff[0] if res == 'ineligible' else staff[2])['id'], 'result': res,
                              'standard_amount': std if res == 'approved' else None,
                              'approved_amount': (RATE_AMT['SPECIAL'] if special else std) if res == 'approved' else None,
                              'amount_reason': 'ได้รับการดูแลค่าใช้จ่ายจากหอพักของสถานศึกษาแล้วบางส่วน' if special else None,
                              'reject_reason': {'rejected': 'รายได้ครอบครัวสูงกว่ากลุ่มที่พิจารณา', 'ineligible': 'กู้ยืม กยศ.'}.get(res),
                              'manager_note': None})
            if res != 'ineligible':
                ev.append((decided, 'ผู้จัดการพิจารณาเรียบร้อย — ผลการพิจารณา: ' + {'approved': 'อนุมัติทุน', 'rejected': 'ไม่อนุมัติทุน', 'reserve': 'สำรอง'}[res], 'manager_' + res))
        history.append((aid, [{'at': t.isoformat(timespec='minutes'), 'text': txt, 'kind': kind} for t, txt, kind in ev]))

    # ---------------- SQL
    fam_cols = list(fams[0])
    out = ['-- ข้อมูลจำลองสำหรับทดสอบ — สร้างโดย db/tools/build_mock_data.py ห้ามแก้ไฟล์นี้ด้วยมือ',
           '-- นักเรียน 100 คน / สถานศึกษา 100 แห่ง / บัญชีครู 100 (1 โรงเรียน = 1 Username) / เจ้าหน้าที่ 4',
           '-- รหัสผ่านทุกบัญชี: Demo@1234   ห้ามใช้ไฟล์นี้กับฐานข้อมูลจริง', '',
           'BEGIN;', '',
           "INSERT INTO scholarship_cycles (id, scholarship_year, history_question_year, open_at, close_at, first_round_cutoff, transfer_evidence_open, transfer_evidence_close, privacy_notice_version, privacy_notice_url, privacy_notice_effective, status) VALUES\n"
           "  (1, 2570, 2569, '2026-11-01 00:00+07', '2027-01-31 23:59+07', '2027-05-15', '2027-03-01', '2027-07-31', '2026-08', 'https://tiscofoundation.org/wp-content/uploads/pdpa_privacy_notice_tiscof.pdf', '2026-08-01', 'open');\n",
           insert('scholarship_rates', [{'cycle_id': 1, 'level_code': c, 'level_name': nm, 'amount': a} for c, nm, a in RATES]),
           insert('schools', [{k: v for k, v in x.items() if not k.startswith('_')} for x in schools]),
           "SELECT setval(pg_get_serial_sequence('schools','id'), (SELECT max(id) FROM schools));\n"]
    cols = ['id', 'username', 'full_name', 'position', 'department', 'role', 'school_id', 'phone', 'email']
    out.append('INSERT INTO staff_users (' + ', '.join(cols) + ', password_hash) VALUES\n' + ',\n'.join(
        '  (' + ', '.join(q(u[c]) for c in cols) + ", crypt('Demo@1234', gen_salt('bf', 6)))" for u in users) + ';\n')
    out += [insert('students', students), insert('applications', apps), insert('application_family', fams),
            insert('application_siblings', sibs), insert('application_other_funding', funding), insert('teacher_reviews', treviews),
            insert('staff_reviews', sreviews), insert('decisions', decisions), 'COMMIT;', '']
    (ROOT / 'seed_mock.sql').write_text('\n'.join(out), 'utf-8')

    # ---------------- JSON สำหรับหน้า HTML
    by_id = {x['id']: x for x in schools}
    user_by = {u['id']: u for u in users}
    tr_by = {r['application_id']: r for r in treviews}
    sr_by = {r['application_id']: r for r in sreviews}
    de_by = {r['application_id']: r for r in decisions}
    fam_by = {r['application_id']: r for r in fams}
    hist_by = dict(history)
    sib_by, fund_by = {}, {}
    for r in sibs:
        sib_by.setdefault(r['application_id'], []).append({k: v for k, v in r.items() if k not in ('application_id', 'seq')})
    for r in funding:
        fund_by.setdefault(r['application_id'], []).append(r)
    mock = {
        'note': 'ข้อมูลจำลองทั้งหมด ไม่ใช่บุคคลจริง',
        'schools': [{'id': x['institution_code'], 'name': x['name'], 'type': x['school_type'], 'region': x['_region'],
                     'province': x['_province'], 'district': x['_district'], 'subdistrict': x['_subdistrict'],
                     'address': x['address'], 'postcode': x['postcode'], 'levels': x['levels_offered']} for x in schools],
        'teachers': [{'username': t['username'], 'name': t['full_name'], 'position': t['position'], 'department': t['department'],
                      'school': by_id[t['school_id']]['institution_code'], 'phone': t['phone'], 'email': t['email'], 'active': True} for t in teachers],
        'rates': [{'code': c, 'name': nm, 'amount': amt} for c, nm, amt in RATES],
        'students': [],
    }
    for st, a in zip(students, apps):
        f = {k: v for k, v in fam_by[a['id']].items() if k != 'application_id'}
        t, r, d = tr_by.get(a['id']), sr_by.get(a['id']), de_by.get(a['id'])
        fund = fund_by.get(a['id'], [])
        other = next((x for x in fund if x['kind'] == 'scholarship'), None)
        mock['students'].append({
            'code': a['app_code'], 'citizen_id': st['citizen_id'], 'title': st['title'], 'first_name': st['first_name'],
            'last_name': st['last_name'], 'gender': st['gender'], 'birth_date': st['birth_date'], 'phone': st['phone'],
            'school': by_id[a['school_id']]['institution_code'], 'type': a['applicant_type'], 'status': a['status'],
            'group': a['education_group'], 'class': a['current_class'], 'next_class': a['next_class'], 'rate': a['rate_level_code'],
            'pvs_type': a['pvs_type'], 'faculty': a['faculty'], 'study_mode': a['study_mode'], 'program_years': a['program_years'],
            'school_next': 'same' if a['stays_same_school'] else 'transfer',
            'loan': 'yes' if a['has_student_loan'] else 'no', 'loan_amount': a['loan_amount'], 'loan_period': a['loan_period'],
            'other': 'yes' if other else 'no', 'other_org': other and other['provider'], 'other_amount': other and other['amount'],
            'other_period': other and other['period'], 'round': a['review_round'],
            'home_address': a['home_address'], 'current_address': a['current_address'],
            'same_address': a['home_address'] == a['current_address'], 'submitted_at': a['submitted_at'],
            'stories': [a['story_family'], a['story_siblings'], a['story_travel'], a['story_housing'], a['story_expenses'], a['story_other']],
            'family': {**f, 'assets': f['assets']}, 'siblings': sib_by.get(a['id'], []),
            'teacher_review': t and {'teacher': user_by[t['teacher_id']]['username'], 'grade_type': t['grade_type'],
                                     'grade_value': t['grade_value'], 'comment': t['comment'], 'sent_at': t['sent_at']},
            'staff_review': r and {'reviewer': user_by[r['reviewer_id']]['full_name'], 'result': r['result'], 'round': r['review_round'], 'comment': r['comment']},
            'decision': d and {'result': d['result'], 'standard_amount': d['standard_amount'], 'approved_amount': d['approved_amount'],
                               'reason': d['amount_reason'] or d['reject_reason'], 'by': user_by[d['manager_id']]['full_name']},
            'history': hist_by[a['id']],
        })
    (ROOT / 'mock').mkdir(exist_ok=True)
    (ROOT / 'mock/mock_data.json').write_text(json.dumps(mock, ensure_ascii=False, indent=1), 'utf-8')
    print(f'{len(schools)} สถานศึกษา / {len(teachers)} บัญชีครู / {len(staff)} เจ้าหน้าที่ / {len(students)} นักเรียน / '
          f'{len(sibs)} พี่น้อง / {len(treviews)} ความเห็นครู / {len(sreviews)} รีวิว / {len(decisions)} ผลพิจารณา')


if __name__ == '__main__':
    main()
