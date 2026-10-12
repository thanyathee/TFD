#!/usr/bin/env python3
"""สร้างข้อมูลภาค/จังหวัด/อำเภอ/ตำบลของระบบเอง จากข้อมูลต้นทาง kongvut/thai-province-data (MIT)

วิธีใช้:
    git clone --depth 1 https://github.com/kongvut/thai-province-data.git /tmp/tpd
    python3 db/tools/build_geography.py /tmp/tpd/api/latest

ผลลัพธ์:
    db/seed_geography.sql             ข้อมูลตั้งต้นสำหรับ PostgreSQL
    db/geography/thailand_geography.json  ไฟล์เดียวสำหรับหน้า HTML (ไม่ต้องโหลดจากภายนอก)
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# การจัดกลุ่มภาคของมูลนิธิฯ — ตรงกับ provincesByRegion ในฟอร์ม v28
REGIONS = [
    (1, 'bkkmetro', 'กรุงเทพฯและปริมณฑล',
     ['กรุงเทพมหานคร', 'ปทุมธานี', 'นนทบุรี', 'นครปฐม', 'สมุทรสาคร']),
    (2, 'north', 'ภาคเหนือ',
     ['เชียงใหม่', 'เชียงราย', 'ลำปาง', 'ลำพูน', 'แม่ฮ่องสอน', 'น่าน', 'พะเยา', 'แพร่', 'อุตรดิตถ์']),
    (3, 'central', 'ภาคกลาง',
     ['กำแพงเพชร', 'ชัยนาท', 'นครนายก', 'นครสวรรค์', 'พระนครศรีอยุธยา', 'พิจิตร', 'พิษณุโลก',
      'เพชรบูรณ์', 'ลพบุรี', 'สมุทรปราการ', 'สมุทรสงคราม', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย',
      'สุพรรณบุรี', 'อ่างทอง', 'อุทัยธานี']),
    (4, 'northeast', 'ภาคตะวันออกเฉียงเหนือ',
     ['กาฬสินธุ์', 'ขอนแก่น', 'ชัยภูมิ', 'นครพนม', 'นครราชสีมา', 'บึงกาฬ', 'บุรีรัมย์', 'มหาสารคาม',
      'มุกดาหาร', 'ยโสธร', 'ร้อยเอ็ด', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สุรินทร์', 'หนองคาย',
      'หนองบัวลำภู', 'อำนาจเจริญ', 'อุดรธานี', 'อุบลราชธานี']),
    (5, 'east', 'ภาคตะวันออก',
     ['จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ตราด', 'ปราจีนบุรี', 'ระยอง', 'สระแก้ว']),
    (6, 'west', 'ภาคตะวันตก',
     ['กาญจนบุรี', 'ตาก', 'ประจวบคีรีขันธ์', 'เพชรบุรี', 'ราชบุรี']),
    (7, 'south', 'ภาคใต้',
     ['กระบี่', 'ชุมพร', 'ตรัง', 'นครศรีธรรมราช', 'นราธิวาส', 'ปัตตานี', 'พังงา', 'พัทลุง',
      'ภูเก็ต', 'ยะลา', 'ระนอง', 'สงขลา', 'สตูล', 'สุราษฎร์ธานี']),
]


def q(v):
    return "'" + str(v).replace("'", "''") + "'"


def main(src):
    src = Path(src)
    provinces = json.loads((src / 'province.json').read_text('utf-8'))
    districts = json.loads((src / 'district.json').read_text('utf-8'))
    subs = json.loads((src / 'sub_district.json').read_text('utf-8'))

    region_of = {name: rid for rid, _, _, names in REGIONS for name in names}
    provinces = [p for p in provinces if not p['deleted_at']]
    missing = {p['name']['th'] for p in provinces} ^ set(region_of)
    if missing:
        sys.exit(f'จังหวัดไม่ตรงกับการจัดภาค: {sorted(missing)}')

    subs = [s for s in subs if not s['deleted_at']]
    has_sub = {s['district_id'] for s in subs}
    # ตัดรายการที่ไม่ใช่อำเภอจริง (เช่น "ท้องถิ่นเทศบาลตำบล...") ซึ่งไม่มีตำบลอยู่ภายใต้
    districts = [d for d in districts if not d['deleted_at'] and d['id'] in has_sub]

    provinces.sort(key=lambda p: p['id'])
    districts.sort(key=lambda d: d['id'])
    subs.sort(key=lambda s: s['id'])

    out = [
        '-- ข้อมูลภาค / จังหวัด / อำเภอ-เขต / ตำบล-แขวง ของระบบ',
        '-- สร้างโดย db/tools/build_geography.py — ห้ามแก้ไฟล์นี้ด้วยมือ',
        '-- ต้นทาง: github.com/kongvut/thai-province-data (MIT License)',
        f'-- {len(provinces)} จังหวัด / {len(districts)} อำเภอ-เขต / {len(subs)} ตำบล-แขวง',
        '',
        'BEGIN;',
        '',
        'INSERT INTO regions (id, code, name) VALUES',
        ',\n'.join(f'  ({rid}, {q(code)}, {q(name)})' for rid, code, name, _ in REGIONS) + ';',
        '',
        'INSERT INTO provinces (id, region_id, name_th, name_en) VALUES',
        ',\n'.join(f"  ({p['id']}, {region_of[p['name']['th']]}, {q(p['name']['th'])}, {q(p['name']['en'])})"
                   for p in provinces) + ';',
        '',
        'INSERT INTO districts (id, province_id, prefix_th, name_th, name_en) VALUES',
        ',\n'.join(f"  ({d['id']}, {d['province_id']}, {q(d['prefix']['th'])}, {q(d['name']['th'])}, {q(d['name']['en'])})"
                   for d in districts) + ';',
        '',
        'INSERT INTO subdistricts (id, district_id, prefix_th, name_th, name_en, postcode) VALUES',
        ',\n'.join(f"  ({s['id']}, {s['district_id']}, {q(s['prefix']['th'])}, {q(s['name']['th'])}, {q(s['name']['en'])}, {q(str(s['zip_code']).zfill(5))})"
                   for s in subs) + ';',
        '',
        'COMMIT;',
        '',
    ]
    (ROOT / 'seed_geography.sql').write_text('\n'.join(out), 'utf-8')

    # JSON แบบย่อสำหรับหน้า HTML: ใช้ key สั้นเพื่อลดขนาดไฟล์
    geo = {
        'source': 'kongvut/thai-province-data (MIT License)',
        'regions': [{'id': rid, 'code': code, 'name': name} for rid, code, name, _ in REGIONS],
        'provinces': [{'id': p['id'], 'r': region_of[p['name']['th']], 'th': p['name']['th'], 'en': p['name']['en']}
                      for p in provinces],
        'districts': [{'id': d['id'], 'p': d['province_id'], 'pre': d['prefix']['th'], 'th': d['name']['th'], 'en': d['name']['en']}
                      for d in districts],
        'subdistricts': [{'id': s['id'], 'd': s['district_id'], 'pre': s['prefix']['th'], 'th': s['name']['th'],
                          'en': s['name']['en'], 'zip': str(s['zip_code']).zfill(5)} for s in subs],
    }
    (ROOT / 'geography').mkdir(exist_ok=True)
    (ROOT / 'geography' / 'thailand_geography.json').write_text(
        json.dumps(geo, ensure_ascii=False, separators=(',', ':')), 'utf-8')

    print(f'{len(provinces)} จังหวัด / {len(districts)} อำเภอ-เขต / {len(subs)} ตำบล-แขวง')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
