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

# ---------------- ตัวเลือกตามแบบฟอร์มกระดาษ
HIRE = [('รับจ้างทั่วไป (งานรายวัน / งานจร)', ['ทาสีบ้าน รับตัดหญ้า', 'แบกหามสินค้าในตลาด', 'รับจ้างทั่วไปในหมู่บ้าน']),
        ('พนักงานโรงงาน', ['ประกอบชิ้นส่วนอิเล็กทรอนิกส์', 'แพ็กสินค้า', 'คัดแยกผลไม้ส่งออก']),
        ('ก่อสร้าง / ช่าง', ['ช่างปูน', 'กรรมกรก่อสร้าง', 'ช่างไฟฟ้า']),
        ('รับจ้างภาคเกษตร (ตัดอ้อย กรีดยาง เก็บผลไม้ ฯลฯ)', ['กรีดยาง', 'ตัดอ้อย', 'เก็บลำไย']),
        ('แม่บ้าน / ทำความสะอาด', ['แม่บ้านโรงแรม', 'ทำความสะอาดสำนักงาน'])]
POSITIONS = {'พนักงานโรงงาน': ['พนักงานฝ่ายผลิต', 'พนักงานคลังสินค้า', 'หัวหน้าไลน์']}
CROPS = {'rice': ['ข้าวเหนียว', 'ข้าวหอมมะลิ'], 'field': ['มันสำปะหลัง', 'อ้อย', 'ข้าวโพด'], 'orchard': ['สวนยาง', 'ลำไย', 'ทุเรียน', 'ปาล์มน้ำมัน']}
GOODS = ['ข้าวแกง', 'ผักสด', 'ขนมไทย', 'ลูกชิ้นทอด', 'เสื้อผ้ามือสอง']
OTHER_JOBS = ['ขับวินมอเตอร์ไซค์', 'ช่างตัดผม', 'ทำขนมขาย', 'รับซ่อมรถจักรยานยนต์']
GOV = [('ครู', 'โรงเรียนในพื้นที่'), ('ลูกจ้างประจำ', 'องค์การบริหารส่วนตำบล'), ('พนักงานขับรถ', 'โรงพยาบาลชุมชน')]
RELATION_KEYS = ['together', 'away_work', 'divorced', 'father_new', 'mother_new', 'father_lost', 'mother_lost',
                 'father_prison', 'mother_prison', 'father_monk', 'mother_monk', 'father_dead', 'mother_dead']
TRAVEL = ['เดิน', 'ปั่นจักรยาน', 'ซ้อนรถจักรยานยนต์ผู้ปกครอง', 'รถสองแถว', 'รถรับส่งนักเรียน']
WEEKS = 4.33


def monthly(o):
    if o['pay'] == 'daily':
        return round(o['wage'] * o['days'] * (WEEKS if o['per'] == 'week' else 1))
    if o['pay'] == 'yearly':
        return round(o['amount'] / 12)
    return o['amount']


def make_occ():
    cat = rng.choices(['hire', 'farm', 'trade', 'gov', 'other'], [50, 25, 12, 4, 9])[0]
    o = {'cat': cat, 'hire_kind': '', 'detail': '', 'position': '', 'agency': '', 'goods': '', 'sell_where': '',
         'farm_kinds': [], 'crops': '', 'farm_land': '', 'pay': '', 'wage': '', 'days': '', 'per': '', 'amount': ''}
    if cat == 'hire':
        kind, details = rng.choice(HIRE)
        o.update(hire_kind=kind, detail=rng.choice(details), position=rng.choice(POSITIONS.get(kind, ['-'])))
        if kind == 'พนักงานโรงงาน':
            o.update(pay='monthly', amount=rng.randint(90, 130) * 100)
        else:
            o.update(pay='daily', wage=rng.choice([250, 300, 350, 400]), days=rng.choice([2, 3, 4, 5, 15, 20]))
            o['per'] = 'week' if o['days'] <= 5 else 'month'
    elif cat == 'farm':
        k = rng.choice(list(CROPS))
        o.update(farm_kinds=[k], crops=rng.choice(CROPS[k]), farm_land=rng.choice(['ที่ดินของตนเอง', 'เช่าที่ดินผู้อื่น', 'รับจ้างทำในที่ดินผู้อื่น']),
                 pay='yearly', amount=rng.randint(15, 70) * 1000)
    elif cat == 'trade':
        o.update(goods=rng.choice(GOODS), sell_where=rng.choice(['ตลาด / แผงลอย', 'หน้าบ้าน / ร้านของตนเอง', 'เร่ขาย / รถเข็น']),
                 pay='irregular', amount=rng.randint(30, 90) * 100)
    elif cat == 'gov':
        pos, ag = rng.choice(GOV)
        o.update(position=pos, agency=ag, pay='monthly', amount=rng.randint(110, 250) * 100)
    else:
        o.update(detail=rng.choice(OTHER_JOBS), pay='irregular', amount=rng.randint(30, 80) * 100)
    return o


def make_person(role, last, sex, status='alive'):
    p = {'role': role, 'name': f'{"นาย" if sex == "m" else "นาง"} {rng.choice(ADULT_M if sex == "m" else ADULT_F)} {last}',
         'age': rng.randint(32, 60), 'status': status if role != 'guardian' else None, 'relation': None,
         'no_occ': False, 'workplace': '', 'work_province': '', 'occs': []}
    if status == 'dead':
        return p
    if rng.random() < 0.1:
        p['no_occ'] = True
        return p
    p['occs'] = [make_occ() for _ in range(rng.choices([1, 2], [75, 25])[0])]
    p['workplace'] = rng.choice(['ในหมู่บ้าน', 'บ้านตนเอง', 'ตลาดสดอำเภอ', 'นิคมอุตสาหกรรม', 'ไร่ของตนเอง'])
    return p


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
                kind, name, levels, top = 'university', f'มหาวิทยาลัยตัวอย่าง{pv} (จำลอง)', ['bachelor'], 'bachelor'
            elif k == 1 and a in COLLEGE_AREAS:
                kind, name, levels, top = 'college', f'วิทยาลัยเทคนิค{am} (จำลอง)', ['voc', 'highvoc'], 'highvoc'
            elif k == 0:
                kind, name, levels, top = 'school', f'โรงเรียน{am}วิทยา (จำลอง)', ['lowersec', 'uppersec'], 'm6'
            else:
                kind, name, levels, top = 'school', f'โรงเรียนบ้าน{sub["th"]} (จำลอง)', ['primary', 'lowersec'], 'm3'
            schools.append({
                'id': i, 'institution_code': f'SCH-{i:03d}', 'name': name, 'school_type': kind,
                'subdistrict_id': sub['id'], 'district_id': d['id'],
                'address': f'{rng.randint(1, 299)} หมู่ {rng.randint(1, 15)}', 'postcode': sub['zip'], 'levels_offered': levels,
                '_province': pv, '_district': d['pre'] + d['th'], '_subdistrict': sub['pre'] + sub['th'],
                '_region': region_code[p['r']], '_top': top,
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
    slots = ([1] * 8 + [3] * 5 + [2] * 5 + list(range(4, 101)))[:100]
    statuses = STATUS_PLAN[:]
    rng.shuffle(statuses)
    decisions_left = DECISION_PLAN[:]
    students, apps, fams, persons, occs, sibs, funding, treviews, sreviews, decisions, history = [], [], [], [], [], [], [], [], [], [], []
    app_people = {}
    used_ids = set()
    base = datetime(2026, 11, 1, 8, 0)
    for n in range(1, 101):
        sc = schools[slots[n - 1] - 1]
        group = rng.choice(sc['levels_offered'])
        cur = rng.choice(CLASS_GROUPS[group])
        nxt = rng.choice(NEXT[cur])
        bachelor = group == 'bachelor'
        higher = group in ('voc', 'highvoc', 'bachelor')
        pvs = rng.choice(['industry', 'business', 'other']) if group == 'highvoc' else None
        next_pvs = rng.choice(['industry', 'business', 'other']) if nxt.startswith('ปวส') and group != 'highvoc' else None
        rate = rate_of(nxt, pvs or next_pvs)
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
        loan = res == 'ineligible' or rng.random() < 0.08
        other_sch = rng.random() < 0.15
        part = rng.random() < 0.3
        n_sib = rng.randint(0, 4)
        transfer = rng.random() < (0.6 if cur in ('ม.3', 'ม.6', 'ปวช.3', 'ปวส.2') else 0.15)
        apps.append({
            'id': aid, 'app_code': f'TF2570-{n:06d}', 'cycle_id': 1, 'student_id': sid, 'school_id': sc['id'],
            'applicant_type': 'CONT' if cont else 'NEW', 'received_prev_year': cont,
            'prev_year_verified': True if status in ('waiting_manager', 'decided') else None,
            'status': status, 'is_bachelor': bachelor, 'education_group': group,
            'current_class': cur, 'next_class': nxt, 'rate_level_code': rate,
            'study_mode': rng.choice(['regular'] * 8 + ['special', 'dual']) if higher else None, 'study_mode_other': None, 'pvs_type': pvs,
            'faculty': (rng.choice(['ช่างยนต์', 'ช่างไฟฟ้ากำลัง', 'การบัญชี', 'คอมพิวเตอร์ธุรกิจ']) if group in ('voc', 'highvoc')
                        else rng.choice(['ครุศาสตร์ / การประถมศึกษา', 'พยาบาลศาสตร์', 'บริหารธุรกิจ / การบัญชี', 'วิศวกรรมศาสตร์']) if bachelor else None),
            'program_years': ({'voc': 3, 'highvoc': 2}.get(group) or rng.choice([4, 5])) if higher else None,
            'stays_same_school': not transfer, 'email': f'student{n:03d}@example.com' if rng.random() < 0.5 else None,
            'school_top_level': sc['_top'], 'next_faculty': None, 'next_pvs_type': next_pvs,
            'next_school_text': rng.choice(['', 'โรงเรียนประจำจังหวัด', 'วิทยาลัยเทคนิคในจังหวัด']) if transfer else None,
            'cont_since_class': None, 'cont_years': None,
            'daily_allowance': rng.choice([20, 30, 40, 50, 60, 80]),
            'has_student_loan': loan, 'loan_people_count': 1 if loan else None,
            'loan_people_names': (f"{students[-1]['first_name']} {last}" if res == 'ineligible' else f'{rng.choice(GIRL)} {last}') if loan else None,
            'loan_amount': rng.choice([18000, 25000, 30000]) if res == 'ineligible' else None, 'loan_period': 'ต่อปี' if res == 'ineligible' else None,
            'part_time': part, 'part_job': rng.choice(['ช่วยขายของที่ตลาด', 'ล้างจานร้านอาหาร', 'รับจ้างเก็บผลไม้']) if part else None,
            'part_income': rng.choice([100, 150, 200, 300]) if part else None, 'part_income_per': 'day' if part else None,
            'review_round': None,
            'home_address': addr, 'current_address': addr if same_addr else f'{rng.randint(1, 199)}/{rng.randint(1, 30)} ' + addr.split(' ', 1)[1],
            'story_family': f'อาศัยอยู่กับ{rng.choice(["พ่อแม่", "แม่", "ยายและตา", "ป้า"])} ผู้ปกครองมีรายได้ไม่แน่นอน ต้องดูแลสมาชิกหลายคน',
            'story_siblings': f'มีพี่น้อง {n_sib} คน แม่เป็นผู้ออกค่าใช้จ่ายหลัก' if n_sib else 'เป็นลูกคนเดียว ยายช่วยออกค่าใช้จ่ายบางส่วน',
            'story_travel': f'{rng.choice(TRAVEL)}มาโรงเรียน ใช้เวลาประมาณ {rng.choice([10, 15, 20, 30, 45])} นาที ได้เงินไปโรงเรียนวันละ {rng.choice([20, 30, 40, 50])} บาท',
            'story_housing': rng.choice(['บ้านไม้ชั้นเดียว หลังคารั่วบางจุด ต้องซ่อมแซม', 'บ้านปูนชั้นเดียวของญาติ ห้องน้ำชำรุด',
                                         'ห้องเช่าเล็ก ๆ ใกล้ตลาด อยู่กันสี่คน', 'บ้านไม้สองชั้นที่ทรุดโทรม พื้นผุบางส่วน']),
            'story_expenses': f'ค่าใช้จ่ายในบ้านประมาณ {rng.randint(4, 12) * 1000:,} บาทต่อเดือน' + rng.choice([' ยังไม่มีหนี้', ' และมีหนี้นอกระบบ', ' มีหนี้ ธ.ก.ส.']),
            'story_other': rng.choice(['', 'อยากเรียนต่อพยาบาล', 'ตั้งใจเรียนเพื่อช่วยครอบครัว', 'ช่วยผู้ปกครองทำงานหลังเลิกเรียน']),
            'story_reason': 'ต้องการแบ่งเบาภาระค่าใช้จ่ายของครอบครัว และใช้เป็นค่าอุปกรณ์การเรียนและค่าเดินทาง',
            'story_goal': rng.choice(['ตั้งใจศึกษาต่อคณะพยาบาลศาสตร์', 'อยากเรียนต่อวิศวกรรมไฟฟ้า', 'ศึกษาต่อครุศาสตร์เพื่อเป็นครู']) if (cur == 'ม.6' or group in ('voc', 'highvoc')) else None,
            'confirmed_true': status != 'draft', 'pdpa_version': None if status == 'draft' else '2026-08',
            'pdpa_ack_at': submitted.isoformat() if submitted else None,
            'submitted_at': submitted.isoformat() if submitted else None,
            'locked': status not in ('draft', 'returned_to_student'),
        })
        if cont:
            order = [c for l in CLASS_GROUPS.values() for c in l]
            back = rng.randint(1, min(3, order.index(cur)))  if order.index(cur) else 0
            apps[-1]['cont_since_class'] = order[order.index(cur) - back]
            apps[-1]['cont_years'] = back + 1
        if loan:
            funding.append({'application_id': aid, 'kind': 'loan', 'provider': 'กยศ.', 'borrower_name': apps[-1]['loan_people_names'],
                            'borrower': 'self' if res == 'ineligible' else 'sibling', 'amount': apps[-1]['loan_amount'], 'period': 'ต่อปี'})
        if other_sch:
            funding.append({'application_id': aid, 'kind': 'scholarship', 'borrower_name': None, 'borrower': None, 'provider': rng.choice(['องค์การบริหารส่วนจังหวัด', 'มูลนิธิตัวอย่าง', 'สถานศึกษา']),
                            'amount': rng.choice([2000, 3000, 5000]), 'period': rng.choice(['ต่อเทอม', 'ต่อปี'])})

        # ครอบครัว (ข้อ 2–8)
        f_dead = rng.random() < 0.06
        m_dead = rng.random() < 0.04
        father = make_person('father', last, 'm', 'dead' if f_dead else 'alive')
        mother = make_person('mother', last, 'f', 'dead' if m_dead else 'alive')
        rel = rng.choice([['together'], ['together'], ['together'], ['away_work'], ['divorced', 'father_new'], ['father_lost'], ['divorced', 'mother_new']])
        if f_dead:
            rel = ['father_dead']
        if m_dead:
            rel = rel + ['mother_dead']
        if 'father_lost' in rel:
            father['no_occ'] = True
            father['occs'] = []
        live = 'mother' if f_dead or 'father_lost' in rel else 'father' if m_dead else rng.choice(['both', 'both', 'both', 'mother', 'guardian'])
        people = [father, mother]
        if live == 'guardian':
            g = make_person('guardian', rng.choice(SURNAME), 'f')
            g['relation'] = rng.choice(['ยาย', 'ป้า', 'น้า'])
            people.append(g)
        housing = rng.choice(['own', 'own', 'own', 'own_other_land', 'installment', 'rent', 'other'])
        own_land = rng.random() < 0.3
        rent_land = rng.random() < 0.15
        no_eq = rng.random() < 0.25
        fams.append({'application_id': aid, 'live_with': live, 'housing': housing,
                     'housing_land_owner': 'ที่ดินของวัด' if housing == 'own_other_land' else None,
                     'housing_cost': rng.choice([1500, 2000, 2500]) if housing in ('installment', 'rent') else None,
                     'housing_other': 'อาศัยบ้านญาติ' if housing == 'other' else None,
                     'equipment': [] if no_eq else rng.sample(['washer', 'computer', 'pickup', 'aircon', 'etan'], rng.randint(1, 3)),
                     'equipment_other': None, 'no_equipment': no_eq, 'equipment_note': None if no_eq or rng.random() < .7 else 'รถกระบะเก่ามือสอง ซ่อมบ่อย',
                     'own_land': own_land, 'own_land_amt': rng.randint(1, 10) if own_land else None, 'own_land_unit': 'rai',
                     'rent_land': rent_land, 'rent_land_amt': rng.randint(1, 5) if rent_land else None, 'rent_land_unit': 'rai',
                     'rent_land_cost': rng.choice([2000, 3000, 5000]) if rent_land else None, 'rent_land_per': 'year',
                     'relations': rel, 'sibling_count': n_sib, 'siblings_out': 0, 'siblings_moved': 0})
        app_people[aid] = people
        for prs in people:
            pid = len(persons) + 1
            persons.append({'id': pid, 'application_id': aid, 'role': prs['role'], 'name': prs['name'], 'age': prs['age'], 'status': prs['status'],
                            'relation': prs['relation'], 'no_occupation': prs['no_occ'], 'workplace': prs['workplace'] or None,
                            'work_province': sc['_province'] if prs['occs'] else None})
            prs['work_province'] = sc['_province'] if prs['occs'] else ''
            for k, o in enumerate(prs['occs'], start=1):
                occs.append({'person_id': pid, 'seq': k, 'category': o['cat'], 'hire_kind': o['hire_kind'] or None, 'detail': o['detail'] or None,
                             'position': o['position'] or None, 'agency': o['agency'] or None, 'goods': o['goods'] or None,
                             'sell_where': o['sell_where'] or None, 'farm_kinds': o['farm_kinds'], 'crops': o['crops'] or None,
                             'farm_land': o['farm_land'] or None, 'pay': o['pay'], 'daily_wage': o['wage'] or None,
                             'work_days': o['days'] or None, 'days_per': o['per'] or None, 'amount': o['amount'] or None,
                             'monthly_estimate': monthly(o)})
        for k in range(1, n_sib + 1):
            st = rng.choice(['study', 'study', 'study', 'work', 'work', 'preschool', 'none', 'disabled'])
            sres = 'home' if st != 'work' else rng.choice(['home', 'out', 'family'])
            age = {'preschool': rng.randint(0, 4), 'study': rng.randint(6, 22)}.get(st, rng.randint(15, 30))
            sibs.append({'application_id': aid, 'seq': k, 'gender': rng.choice(['ชาย', 'หญิง']), 'name': f'{rng.choice(BOY + GIRL)} {last}',
                         'age': rng.randint(2, 11) if st == 'preschool' and age == 0 else age, 'age_unit': 'm' if st == 'preschool' and age == 0 else 'y',
                         'note': {'disabled': 'พิการทางร่างกาย ต้องมีคนดูแล', 'preschool': 'ยังไม่ถึงวัยเรียน', 'none': 'ไม่ได้เรียนและไม่ได้ทำงาน ช่วยงานบ้าน'}.get(st),
                         'education': {'study': rng.choice(['ป.4', 'ม.2', 'ม.5', 'ปวช.2']), 'preschool': None}.get(st, rng.choice(['จบ ม.3', 'จบ ป.6'])),
                         'occupation': 'นักเรียน' if st == 'study' else rng.choice(['พนักงานโรงงาน', 'รับจ้างทั่วไป']) if st == 'work' else None,
                         'place': 'โรงเรียนใกล้บ้าน' if st == 'study' else rng.choice(['นิคมอุตสาหกรรม', 'กรุงเทพฯ']) if st == 'work' else None,
                         'residence': sres})
        fams[-1]['siblings_moved'] = sum(1 for x in sibs if x['application_id'] == aid and x['residence'] == 'family')
        fams[-1]['siblings_out'] = sum(1 for x in sibs if x['application_id'] == aid and x['residence'] == 'out')

        ev = [(started, 'นักเรียนเริ่มกรอกใบสมัคร', 'started')]
        if submitted:
            ev.append((submitted, 'นักศึกษาส่งใบสมัครถึงมูลนิธิฯ โดยตรง' if bachelor else 'นักเรียนส่งข้อมูลให้ครู', 'submitted'))
        t_sent = None
        if status in ('waiting_staff', 'need_more_info', 'waiting_manager', 'decided'):
            t_sent = submitted + timedelta(days=rng.randint(1, 6), hours=rng.randint(0, 8))
            if not bachelor:
                gpa = rng.random() < 0.7
                gv = round(rng.uniform(2.2, 3.9), 2) if gpa else round(rng.uniform(60, 92), 2)
                treviews.append({'application_id': aid, 'teacher_id': teachers[sc['id'] - 1]['id'],
                                 'grade_type': 'gpa' if gpa else 'percent', 'grade_value': gv,
                                 'grade_before': (round(max(0, gv - rng.uniform(-0.2, 0.4)), 2) if gpa else round(max(0, gv - rng.uniform(-3, 8)), 2)) if cont else None,
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
                                         'ineligible': 'ผู้ขอทุนกู้ยืม กยศ. อยู่แล้ว ไม่เข้าเกณฑ์การพิจารณาทุน',
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
            insert('application_persons', persons), "SELECT setval(pg_get_serial_sequence('application_persons','id'), (SELECT max(id) FROM application_persons));\n",
            insert('person_occupations', occs), insert('application_siblings', sibs), insert('application_other_funding', funding),
            insert('teacher_reviews', treviews), insert('staff_reviews', sreviews), insert('decisions', decisions), 'COMMIT;', '']
    (ROOT / 'seed_mock.sql').write_text('\n'.join(out), 'utf-8')

    # ---------------- JSON สำหรับหน้า HTML (รูปแบบเดียวกับที่แอปบันทึก)
    by_id = {x['id']: x for x in schools}
    user_by = {u['id']: u for u in users}
    tr_by = {r['application_id']: r for r in treviews}
    sr_by = {r['application_id']: r for r in sreviews}
    de_by = {r['application_id']: r for r in decisions}
    fam_by = {r['application_id']: r for r in fams}
    hist_by = dict(history)
    sib_by, fund_by = {}, {}
    for r in sibs:
        sib_by.setdefault(r['application_id'], []).append({'gender': r['gender'], 'name': r['name'], 'age': r['age'], 'age_unit': r['age_unit'],
                                                          'edu': r['education'] or '', 'occupation': r['occupation'] or '',
                                                          'place': r['place'] or '', 'note': r['note'] or '', 'residence': r['residence']})
    for r in funding:
        fund_by.setdefault(r['application_id'], []).append(r)
    jperson = lambda p: p and {'name': p['name'], 'age': p['age'], 'status': p['status'] or '', 'relation': p['relation'] or '',
                               'no_occ': p['no_occ'], 'workplace': p['workplace'], 'work_province': p['work_province'], 'occs': p['occs']}
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
        f = fam_by[a['id']]
        ppl = {p['role']: p for p in app_people[a['id']]}
        t, r, d = tr_by.get(a['id']), sr_by.get(a['id']), de_by.get(a['id'])
        other = next((x for x in fund_by.get(a['id'], []) if x['kind'] == 'scholarship'), None)
        mock['students'].append({
            'code': a['app_code'], 'citizen_id': st['citizen_id'], 'title': st['title'], 'first_name': st['first_name'],
            'last_name': st['last_name'], 'gender': st['gender'], 'birth_date': st['birth_date'], 'phone': st['phone'], 'email': a['email'] or '',
            'school': by_id[a['school_id']]['institution_code'], 'school_top': a['school_top_level'], 'type': a['applicant_type'], 'status': a['status'],
            'group': a['education_group'], 'class': a['current_class'], 'next_class': a['next_class'], 'rate': a['rate_level_code'],
            'pvs_type': a['pvs_type'] or '', 'next_pvs_type': a['next_pvs_type'] or '', 'faculty': a['faculty'] or '', 'study_mode': a['study_mode'] or '',
            'program_years': str(a['program_years'] or ''), 'next_faculty': '',
            'school_next': 'same' if a['stays_same_school'] else 'transfer', 'next_school_text': a['next_school_text'] or '',
            'cont_since': a['cont_since_class'] or '', 'cont_years': str(a['cont_years'] or ''),
            'allowance': str(a['daily_allowance']), 'loan': 'yes' if a['has_student_loan'] else 'no', 'loan_count': str(a['loan_people_count'] or ''),
            'loan_names': a['loan_people_names'] or '', 'loan_amount': str(a['loan_amount'] or ''),
            'loans': [{'name': x['borrower_name'], 'who': x['borrower'], 'fund': x['provider'], 'amount': str(x['amount'] or '')}
                      for x in fund_by.get(a['id'], []) if x['kind'] == 'loan'],
            'other': 'yes' if other else 'no', 'other_org': other and other['provider'] or '', 'other_amount': other and str(other['amount']) or '',
            'other_period': other and other['period'] or '', 'part_time': 'yes' if a['part_time'] else 'no', 'part_job': a['part_job'] or '',
            'part_income': str(a['part_income'] or ''), 'part_per': a['part_income_per'] or '', 'round': a['review_round'],
            'home_address': a['home_address'], 'current_address': a['current_address'],
            'same_address': a['home_address'] == a['current_address'], 'submitted_at': a['submitted_at'],
            'stories': [a['story_family'], a['story_siblings'], a['story_travel'], a['story_housing'], a['story_expenses'], a['story_other']],
            'reason': a['story_reason'], 'goal': a['story_goal'] or '',
            'family': {'father': jperson(ppl['father']), 'mother': jperson(ppl['mother']), 'guardian': jperson(ppl.get('guardian')),
                       'live_with': f['live_with'], 'housing': f['housing'], 'housing_land_owner': f['housing_land_owner'] or '',
                       'housing_cost': str(f['housing_cost'] or ''), 'housing_other': f['housing_other'] or '',
                       'equipment': f['equipment'], 'equipment_other': '', 'no_equipment': f['no_equipment'], 'equipment_note': f['equipment_note'] or '',
                       'own_land': f['own_land'], 'own_land_amt': str(f['own_land_amt'] or ''), 'own_land_unit': f['own_land_unit'],
                       'rent_land': f['rent_land'], 'rent_land_amt': str(f['rent_land_amt'] or ''), 'rent_land_unit': f['rent_land_unit'],
                       'rent_land_cost': str(f['rent_land_cost'] or ''), 'rent_land_per': f['rent_land_per'],
                       'relations': f['relations'], 'sib_moved': str(f['siblings_moved'] or ''), 'sib_out': str(f['siblings_out'] or '')},
            'siblings': sib_by.get(a['id'], []),
            'teacher_review': t and {'teacher': user_by[t['teacher_id']]['username'], 'grade_type': t['grade_type'], 'grade_value': t['grade_value'],
                                     'grade_before': t['grade_before'], 'comment': t['comment'], 'sent_at': t['sent_at']},
            'staff_review': r and {'reviewer': user_by[r['reviewer_id']]['full_name'], 'result': r['result'], 'round': r['review_round'], 'comment': r['comment']},
            'decision': d and {'result': d['result'], 'standard_amount': d['standard_amount'], 'approved_amount': d['approved_amount'],
                               'reason': d['amount_reason'] or d['reject_reason'], 'by': user_by[d['manager_id']]['full_name']},
            'history': hist_by[a['id']],
        })
    (ROOT / 'mock').mkdir(exist_ok=True)
    (ROOT / 'mock/mock_data.json').write_text(json.dumps(mock, ensure_ascii=False, indent=1), 'utf-8')
    print(f'{len(schools)} สถานศึกษา / {len(teachers)} บัญชีครู / {len(staff)} เจ้าหน้าที่ / {len(students)} นักเรียน / '
          f'{len(persons)} บิดา-มารดา-ผู้อุปการะ / {len(occs)} อาชีพ / {len(sibs)} พี่น้อง / {len(treviews)} ความเห็นครู / {len(decisions)} ผลพิจารณา')


if __name__ == '__main__':
    main()
