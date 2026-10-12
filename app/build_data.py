#!/usr/bin/env python3
"""คัดลอกข้อมูลที่หน้าเว็บใช้ไปไว้ใน app/data/

    python3 app/build_data.py

    app/data/geo.json   ภาค / จังหวัด / อำเภอ-เขต (จาก db/geography/thailand_geography.json)
    app/data/mock.json  ข้อมูลจำลอง (จาก db/mock/mock_data.json)
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'app' / 'data'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    geo = json.loads((ROOT / 'db/geography/thailand_geography.json').read_text('utf-8'))
    slim = {
        'regions': geo['regions'],
        'provinces': [{'id': p['id'], 'r': p['r'], 'th': p['th']} for p in geo['provinces']],
        'districts': [{'id': d['id'], 'p': d['p'], 'th': d['pre'] + d['th']} for d in geo['districts']],
    }
    (OUT / 'geo.json').write_text(json.dumps(slim, ensure_ascii=False, separators=(',', ':')), 'utf-8')
    mock = json.loads((ROOT / 'db/mock/mock_data.json').read_text('utf-8'))
    (OUT / 'mock.json').write_text(json.dumps(mock, ensure_ascii=False, separators=(',', ':')), 'utf-8')
    print('app/data/geo.json, app/data/mock.json')


if __name__ == '__main__':
    main()
