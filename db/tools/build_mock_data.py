#!/usr/bin/env python3
"""สร้างข้อมูลจำลองสำหรับทดสอบระบบ: นักเรียน 100 คน ครู 100 คน (50 สถานศึกษา แห่งละ 2 คน)

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

# สถานศึกษาจำลอง: (ชื่อ, ประเภท, จังหวัด, อำเภอ)
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
COLLEGE_IDX = {4, 12, 26, 36, 43}  # 5 แห่งเป็นวิทยาลัยเทคนิค (ปวช./ปวส.)

# ระดับชั้นปี 2569 → ปี 2570 และอัตราทุน
SCHOOL_CLASSES = [('ป.5', 'ป.6', 'P6', 'ประถม'), ('ป.6', 'ม.1', 'M_LOWER', 'มัธยมต้น'), ('ม.1', 'ม.2', 'M_LOWER', 'มัธยมต้น'),
                  ('ม.2', 'ม.3', 'M_LOWER', 'มัธยมต้น'), ('ม.3', 'ม.4', 'M_UPPER', 'มัธยมปลาย'), ('ม.4', 'ม.5', 'M_UPPER', 'มัธยมปลาย'),
                  ('ม.5', 'ม.6', 'M_UPPER', 'มัธยมปลาย')]
COLLEGE_CLASSES = [('ปวช.1', 'ปวช.2', 'PVC', 'ปวช.'), ('ปวช.2', 'ปวช.3', 'PVC', 'ปวช.'), ('ปวส.1', 'ปวส.2', 'PVS', 'ปวส.'),
                   ('ปวส.1', 'ปวส.2', 'PVS_IND', 'ปวส.')]
RATES = [('P6', 'ประถมศึกษาปีที่ 6', 1000), ('M_LOWER', 'มัธยมศึกษาตอนต้น', 3000), ('M_UPPER', 'มัธยมศึกษาตอนปลาย', 3500),
         ('PVC', 'ประกาศนียบัตรวิชาชีพ (ปวช.)', 7000), ('PVS', 'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)', 9000),
         ('PVS_IND', 'ปวส. สาขาอุตสาหกรรม', 14000), ('BACHELOR', 'ปริญญาตรี', 15000), ('SPECIAL', 'อื่น ๆ / อัตราพิเศษ', 1000)]
RATE_AMT = {c: a for c, _, a in RATES}

# การกระจายสถานะใบสมัคร 100 ใบ
STATUS_PLAN = (['draft'] * 20 + ['waiting_teacher'] * 25 + ['returned_to_student'] * 5 + ['waiting_staff'] * 20 +
               ['need_more_info'] * 5 + ['waiting_manager'] * 10 + ['decided'] * 15)
DECISION_PLAN = ['approved'] * 10 + ['rejected'] * 2 + ['reserve'] * 2 + ['ineligible']

OCCUPATIONS = [('รับจ้างทั่วไป', 'รายวัน', (4000, 9000)), ('เกษตรกร', 'ไม่แน่นอน', (3000, 8000)),
               ('ค้าขาย', 'ไม่แน่นอน', (5000, 12000)), ('พนักงานโรงงาน', 'เงินเดือน', (9000, 14000)),
               ('ขับรถรับจ้าง', 'รายวัน', (6000, 11000)), ('ไม่ได้ประกอบอาชีพ', 'ไม่มีรายได้', (0, 0))]
ASSETS = ['รถจักรยานยนต์', 'โทรศัพท์มือถือ', 'ตู้เย็น', 'โทรทัศน์', 'เครื่องซักผ้า', 'รถยนต์']
TRAVEL = ['เดิน', 'ปั่นจักรยาน', 'ซ้อนรถจักรยานยนต์ผู้ปกครอง', 'รถสองแถว', 'รถรับส่งนักเรียน']


def citizen_id():
    d = [rng.randint(1, 8)] + [rng.randint(0, 9) for _ in range(11)]
    check = (11 - sum(x * (13 - i) for i, x in enumerate(d)) % 11) % 10
    return ''.join(map(str, d)) + str(check)


def phone(n):
    return f'080000{n:04d}'


def main():
    geo = json.loads((ROOT / 'geography/thailand_geography.json').read_text('utf-8'))
    prov = {p['th']: p for p in geo['provinces']}
    region_code = {r['id']: r['code'] for r in geo['regions']}
    dist_by = {(d['p'], d['th']): d for d in geo['districts']}
    subs_by = {}
    for s in geo['subdistricts']:
        subs_by.setdefault(s['d'], []).append(s)

    # ---------------- สถานศึกษา 50 แห่ง
    schools = []
    for i, (pv, am) in enumerate(SCHOOL_AREAS, start=1):
        p = prov[pv]
        d = dist_by[(p['id'], am)]
        sub = subs_by[d['id']][0]
        college = (i - 1) in COLLEGE_IDX
        name = f'วิทยาลัยเทคนิค{am} (จำลอง)' if college else f'โรงเรียน{am}วิทยา (จำลอง)'
        schools.append({
            'id': i, 'institution_code': f'MOCK-{i:03d}', 'name': name,
            'school_type': 'college' if college else 'school',
            'subdistrict_id': sub['id'], 'district_id': d['id'],
            'address': f'{rng.randint(1, 299)} หมู่ {rng.randint(1, 15)} {sub["pre"]}{sub["th"]} {d["pre"]}{d["th"]} จังหวัด{pv} {sub["zip"]}',
            'levels_offered': ['ปวช.1', 'ปวช.2', 'ปวช.3', 'ปวส.1', 'ปวส.2'] if college
            else ['ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'],
            '_province': pv, '_district': d['pre'] + d['th'], '_region': region_code[p['r']],
        })

    # ---------------- บัญชีเจ้าหน้าที่ 4 คน + ครู 100 คน
    staff = [
        {'id': uid('staff', 1), 'username': 'reviewer01', 'full_name': 'จนท. 01 (จำลอง)', 'position': 'เจ้าหน้าที่ทุน', 'role': 'reviewer', 'school_id': None},
        {'id': uid('staff', 2), 'username': 'reviewer02', 'full_name': 'จนท. 02 (จำลอง)', 'position': 'เจ้าหน้าที่ทุน', 'role': 'reviewer', 'school_id': None},
        {'id': uid('staff', 3), 'username': 'manager01', 'full_name': 'ผู้จัดการ (จำลอง)', 'position': 'ผู้จัดการ', 'role': 'manager', 'school_id': None},
        {'id': uid('staff', 4), 'username': 'admin01', 'full_name': 'ผู้ดูแลระบบ (จำลอง)', 'position': 'ผู้ดูแลระบบ', 'role': 'admin', 'school_id': None},
    ]
    teachers = []
    for n in range(1, 101):
        sc = schools[(n - 1) // 2]
        female = rng.random() < 0.65
        title = rng.choice(['นาง', 'นางสาว']) if female else 'นาย'
        first = rng.choice(ADULT_F if female else ADULT_M)
        teachers.append({
            'id': uid('teacher', n), 'username': f't{n:03d}', 'full_name': f'{title} {first} {rng.choice(SURNAME)}',
            'position': rng.choice(['ครู', 'ครูชำนาญการ', 'ครูชำนาญการพิเศษ']), 'role': 'teacher', 'school_id': sc['id'],
            'phone': phone(n), 'email': f't{n:03d}@example.com',
        })
    for s in staff:
        s.update(phone=None, email=f'{s["username"]}@example.com')
    users = staff + teachers

    # ---------------- นักเรียน 100 คน + ใบสมัคร
    statuses = STATUS_PLAN[:]
    rng.shuffle(statuses)
    decisions_left = DECISION_PLAN[:]
    students, apps, fams, sibs, treviews, sreviews, decisions = [], [], [], [], [], [], []
    used_ids = set()
    base = datetime(2026, 11, 1, 8, 0)
    for n in range(1, 101):
        sc = schools[(n - 1) % 50]
        college = sc['school_type'] == 'college'
        cur, nxt, rate, group = rng.choice(COLLEGE_CLASSES if college else SCHOOL_CLASSES)
        age_by_class = {'ป.5': 11, 'ป.6': 12, 'ม.1': 13, 'ม.2': 14, 'ม.3': 15, 'ม.4': 16, 'ม.5': 17,
                        'ปวช.1': 16, 'ปวช.2': 17, 'ปวส.1': 19}
        age = age_by_class[cur]
        birth = date(2026 - age, 1, 1) + timedelta(days=rng.randint(0, 364))
        female = rng.random() < 0.55
        first = rng.choice(GIRL if female else BOY)
        if age < 15:
            title = 'เด็กหญิง' if female else 'เด็กชาย'
        else:
            title = 'นางสาว' if female else 'นาย'
        last = rng.choice(SURNAME)
        cid = citizen_id()
        while cid in used_ids:
            cid = citizen_id()
        used_ids.add(cid)
        sid = uid('student', n)
        students.append({'id': sid, 'citizen_id': cid, 'title': title, 'first_name': first, 'last_name': last,
                         'gender': 'หญิง' if female else 'ชาย', 'birth_date': birth.isoformat(), 'phone': phone(500 + n)})

        status = statuses[n - 1]
        cont = rng.random() < 0.3
        submitted = None if status in ('draft',) else base + timedelta(days=rng.randint(0, 40), minutes=rng.randint(0, 600))
        aid = uid('app', n)
        home_addr = f'{rng.randint(1, 299)} หมู่ {rng.randint(1, 15)} ' + sc['address'].split(' ', 3)[3]
        same_addr = rng.random() < 0.75
        fam_size = rng.randint(0, 4)
        apps.append({
            'id': aid, 'app_code': f'TF2570-{n:06d}', 'cycle_id': 1, 'student_id': sid, 'school_id': sc['id'],
            'applicant_type': 'CONT' if cont else 'NEW', 'received_prev_year': cont,
            'prev_year_verified': True if status in ('waiting_manager', 'decided') else None,
            'status': status, 'is_bachelor': False, 'education_group': group,
            'current_class': cur, 'next_class': nxt, 'rate_level_code': rate,
            'study_mode': 'ปกติ', 'pvs_type': ('อุตสาหกรรม' if rate == 'PVS_IND' else 'พาณิชยกรรม') if college else None,
            'stays_same_school': cur not in ('ป.6', 'ม.3'),
            'home_address': home_addr, 'current_address': home_addr if same_addr else
                f'{rng.randint(1, 199)}/{rng.randint(1, 30)} หมู่ {rng.randint(1, 15)} ' + home_addr.split(' ', 3)[3],
            'story_family': f'อาศัยอยู่กับ{rng.choice(["พ่อแม่", "แม่", "ยายและตา", "ป้า"])} ผู้ปกครองมีรายได้ไม่แน่นอน',
            'story_siblings': f'มีพี่น้อง {fam_size} คน' if fam_size else 'เป็นลูกคนเดียว',
            'story_travel': f'{rng.choice(TRAVEL)}มาโรงเรียน ใช้เวลาประมาณ {rng.choice([10, 15, 20, 30, 45])} นาที ได้เงินไปโรงเรียนวันละ {rng.choice([20, 30, 40, 50])} บาท',
            'story_housing': rng.choice(['บ้านไม้ชั้นเดียว หลังคารั่วบางจุด', 'บ้านปูนชั้นเดียวของญาติ', 'ห้องเช่าเล็ก ๆ ใกล้ตลาด', 'บ้านไม้สองชั้นที่ทรุดโทรม']),
            'story_expenses': f'ค่าใช้จ่ายในบ้านประมาณ {rng.randint(4, 12) * 1000:,} บาทต่อเดือน' + rng.choice(['', ' และมีหนี้นอกระบบ', ' มีหนี้ ธ.ก.ส.']),
            'story_other': rng.choice(['', 'อยากเรียนต่อพยาบาล', 'ตั้งใจเรียนเพื่อช่วยครอบครัว', 'ช่วยผู้ปกครองทำงานหลังเลิกเรียน']),
            'confirmed_true': status != 'draft', 'pdpa_version': None if status == 'draft' else '1.0',
            'pdpa_ack_at': submitted.isoformat() if submitted else None,
            'submitted_at': submitted.isoformat() if submitted else None,
            'locked': status not in ('draft', 'returned_to_student'),
        })

        f_occ, f_type, f_rng = rng.choice(OCCUPATIONS)
        m_occ, m_type, m_rng = rng.choice(OCCUPATIONS)
        f_status = rng.choices(['alive', 'deceased', 'unknown'], [8, 1, 1])[0]
        rent = rng.random() < 0.25
        fams.append({
            'application_id': aid,
            'father_name': f'นาย {rng.choice(ADULT_M)} {last}', 'father_status': f_status,
            'father_occupation': f_occ if f_status == 'alive' else None, 'father_income_type': f_type if f_status == 'alive' else None,
            'father_monthly_income': rng.randint(*f_rng) // 100 * 100 if f_status == 'alive' else 0,
            'mother_name': f'นาง {rng.choice(ADULT_F)} {last}', 'mother_status': 'alive',
            'mother_occupation': m_occ, 'mother_income_type': m_type, 'mother_monthly_income': rng.randint(*m_rng) // 100 * 100,
            'family_status': rng.choice(['อยู่ด้วยกัน', 'อยู่ด้วยกัน', 'แยกกันอยู่', 'หย่าร้าง']),
            'guardian_relation': rng.choice(['บิดามารดา', 'มารดา', 'ยาย', 'ป้า']),
            'housing_type': 'เช่า' if rent else rng.choice(['บ้านตนเอง', 'อาศัยผู้อื่น']),
            'housing_cost': rng.choice([1000, 1500, 2000, 2500]) if rent else 0,
            'owns_farmland': rng.random() < 0.3, 'rents_farmland': rng.random() < 0.15,
            'assets': rng.sample(ASSETS[:5], rng.randint(0, 3)), 'sibling_count': fam_size,
        })
        for k in range(1, fam_size + 1):
            st = rng.choice(['กำลังเรียน', 'ทำงาน', 'ยังไม่เข้าเรียน'])
            sibs.append({'application_id': aid, 'seq': k, 'name': f'{rng.choice(BOY + GIRL)} {last}',
                         'age': rng.randint(3, 25), 'status': st,
                         'detail': 'โรงเรียนใกล้บ้าน' if st == 'กำลังเรียน' else ('รับจ้างทั่วไป' if st == 'ทำงาน' else None),
                         'monthly_income': rng.randint(30, 90) * 100 if st == 'ทำงาน' else 0})

        teacher = teachers[(sc['id'] - 1) * 2 + rng.randint(0, 1)]
        if status in ('waiting_staff', 'need_more_info', 'waiting_manager', 'decided'):
            gpa = rng.random() < 0.7
            treviews.append({'application_id': aid, 'teacher_id': teacher['id'],
                             'grade_type': 'gpa' if gpa else 'percent',
                             'grade_value': round(rng.uniform(2.2, 3.9), 2) if gpa else round(rng.uniform(60, 92), 2),
                             'comment': f'นักเรียนตั้งใจเรียน มีความประพฤติดี {rng.choice(["ช่วยงานโรงเรียนสม่ำเสมอ", "ครอบครัวมีภาระหนี้สิน", "เดินทางไกลมาเรียนทุกวัน"])} สมควรได้รับการพิจารณาทุน',
                             'sent_at': (submitted + timedelta(days=rng.randint(1, 7))).isoformat()})
        if status in ('need_more_info', 'waiting_manager', 'decided'):
            sreviews.append({'application_id': aid, 'reviewer_id': staff[rng.randint(0, 1)]['id'], 'review_round': 1,
                             'result': 'need_more_info' if status == 'need_more_info' else 'pass', 'note': None})
        if status == 'decided':
            res = decisions_left.pop()
            std = RATE_AMT[rate]
            special = res == 'approved' and rng.random() < 0.2
            decisions.append({'application_id': aid, 'manager_id': staff[2]['id'], 'result': res,
                              'standard_amount': std if res == 'approved' else None,
                              'approved_amount': (1000 if special else std) if res == 'approved' else None,
                              'amount_reason': 'ได้รับทุนจากหน่วยงานอื่นบางส่วนแล้ว' if special else None,
                              'reject_reason': 'รายได้ครอบครัวเกินเกณฑ์' if res in ('rejected', 'ineligible') else None})

    # ---------------- SQL
    out = ['-- ข้อมูลจำลองสำหรับทดสอบ — สร้างโดย db/tools/build_mock_data.py ห้ามแก้ไฟล์นี้ด้วยมือ',
           '-- นักเรียน 100 คน / ครู 100 คน / สถานศึกษา 50 แห่ง / เจ้าหน้าที่ 4 คน',
           '-- รหัสผ่านทุกบัญชี: Demo@1234   ห้ามใช้ไฟล์นี้กับฐานข้อมูลจริง', '',
           'BEGIN;', '',
           "INSERT INTO scholarship_cycles (id, scholarship_year, history_question_year, open_at, close_at, first_round_cutoff, privacy_notice_version, privacy_notice_url, status) VALUES\n"
           "  (1, 2570, 2569, '2026-11-01 00:00+07', '2027-01-31 23:59+07', '2027-05-15', '1.0', 'https://tiscofoundation.org/wp-content/uploads/pdpa_privacy_notice_tiscof.pdf', 'open');\n",
           insert('scholarship_rates', [{'cycle_id': 1, 'level_code': c, 'level_name': nm, 'amount': a} for c, nm, a in RATES]),
           insert('schools', [{k: v for k, v in s.items() if not k.startswith('_')} for s in schools]),
           "SELECT setval(pg_get_serial_sequence('schools','id'), (SELECT max(id) FROM schools));\n"]
    user_rows = [{**u, 'password_hash': None} for u in users]
    cols = ['id', 'username', 'full_name', 'position', 'role', 'school_id', 'phone', 'email']
    out.append('INSERT INTO staff_users (' + ', '.join(cols) + ', password_hash) VALUES\n' + ',\n'.join(
        '  (' + ', '.join(q(u[c]) for c in cols) + ", crypt('Demo@1234', gen_salt('bf', 6)))" for u in user_rows) + ';\n')
    out += [insert('students', students), insert('applications', apps), insert('application_family', fams),
            insert('application_siblings', sibs), insert('teacher_reviews', treviews),
            insert('staff_reviews', sreviews), insert('decisions', decisions), 'COMMIT;', '']
    (ROOT / 'seed_mock.sql').write_text('\n'.join(out), 'utf-8')

    # ---------------- JSON สำหรับหน้า HTML
    by_id = {s['id']: s for s in schools}
    t_by_school = {}
    for t in teachers:
        t_by_school.setdefault(t['school_id'], []).append(t)
    mock = {
        'note': 'ข้อมูลจำลองทั้งหมด ไม่ใช่บุคคลจริง',
        'schools': [{'id': s['institution_code'], 'name': s['name'], 'type': s['school_type'], 'region': s['_region'],
                     'province': s['_province'], 'district': s['_district']} for s in schools],
        'teachers': [{'username': t['username'], 'name': t['full_name'], 'position': t['position'],
                      'school': by_id[t['school_id']]['institution_code'], 'phone': t['phone'], 'email': t['email']} for t in teachers],
        'students': [],
        'rates': [{'code': c, 'name': nm, 'amount': amt} for c, nm, amt in RATES],
    }
    tr_by = {r['application_id']: r for r in treviews}
    sr_by = {r['application_id']: r for r in sreviews}
    de_by = {r['application_id']: r for r in decisions}
    fam_by = {r['application_id']: r for r in fams}
    sib_by = {}
    for r in sibs:
        sib_by.setdefault(r['application_id'], []).append(r)
    user_by = {u['id']: u for u in users}
    for s, a in zip(students, apps):
        f = fam_by[a['id']]
        t = tr_by.get(a['id'])
        r = sr_by.get(a['id'])
        d = de_by.get(a['id'])
        mock['students'].append({
            'code': a['app_code'], 'citizen_id': s['citizen_id'], 'title': s['title'], 'first_name': s['first_name'],
            'last_name': s['last_name'], 'gender': s['gender'], 'birth_date': s['birth_date'], 'phone': s['phone'],
            'school': by_id[a['school_id']]['institution_code'], 'class': a['current_class'], 'next_class': a['next_class'],
            'rate': a['rate_level_code'], 'group': a['education_group'], 'type': a['applicant_type'], 'status': a['status'],
            'submitted_at': a['submitted_at'], 'home_address': a['home_address'], 'current_address': a['current_address'],
            'same_address': a['home_address'] == a['current_address'],
            'stories': [a['story_family'], a['story_siblings'], a['story_travel'], a['story_housing'], a['story_expenses'], a['story_other']],
            'family': {k: f[k] for k in ('father_name', 'father_status', 'father_occupation', 'father_monthly_income',
                                         'mother_name', 'mother_status', 'mother_occupation', 'mother_monthly_income',
                                         'family_status', 'guardian_relation', 'housing_type', 'housing_cost', 'assets')},
            'siblings': [{k: x[k] for k in ('name', 'age', 'status', 'detail', 'monthly_income')} for x in sib_by.get(a['id'], [])],
            'teacher_review': t and {'teacher': user_by[t['teacher_id']]['username'], 'grade_type': t['grade_type'],
                                     'grade_value': t['grade_value'], 'comment': t['comment'], 'sent_at': t['sent_at']},
            'staff_review': r and {'reviewer': user_by[r['reviewer_id']]['full_name'], 'result': r['result']},
            'decision': d and {'result': d['result'], 'standard_amount': d['standard_amount'],
                               'approved_amount': d['approved_amount'], 'reason': d['amount_reason'] or d['reject_reason']},
        })
    (ROOT / 'mock').mkdir(exist_ok=True)
    (ROOT / 'mock/mock_data.json').write_text(json.dumps(mock, ensure_ascii=False, indent=1), 'utf-8')
    print(f'{len(schools)} สถานศึกษา / {len(teachers)} ครู / {len(staff)} เจ้าหน้าที่ / {len(students)} นักเรียน / '
          f'{len(sibs)} พี่น้อง / {len(treviews)} ความเห็นครู / {len(decisions)} ผลพิจารณา')


if __name__ == '__main__':
    main()
