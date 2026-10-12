#!/usr/bin/env python3
"""ประกอบหน้าทดลองใช้งาน (site/) จากไฟล์ต้นแบบ โดยไม่แก้ไฟล์ต้นฉบับ

    python3 site/build_site.py

สร้าง:
    site/student-teacher.html  จาก TISCO_Scholarship_Student_Teacher_HTML_Demo_v28.html
    site/admin.html            จาก TISCO_Foundation_Admin_HTML_Demo_v14.html
    site/geo/province.json, site/geo/district.json  จาก db/geography/thailand_geography.json

สิ่งที่เติมเข้าไปในแต่ละหน้า:
    - alert() แสดงเป็นกล่องข้อความในหน้า (เปิดผ่านลิงก์ที่บล็อก alert ก็ยังเห็น)
    - ถ้าเปิดหน้าต่างพิมพ์ไม่ได้ จะแจ้งว่าการพิมพ์ใช้ได้เมื่อเปิดไฟล์บนเครื่อง
    - ปุ่ม "หน้าหลัก" กลับไป index.html
    - หน้านักเรียน/ครู: เปิดตาม #student หรือ #teacher และโหลดอำเภอจากข้อมูลของระบบเอง
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'

SHIM = r'''
<style>
#tfd-modal{position:fixed;inset:0;background:rgba(15,25,40,.45);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}
#tfd-modal.show{display:flex}
#tfd-modal .box{background:#fff;color:#1f2937;max-width:440px;width:100%;border-radius:14px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.25);font-family:Tahoma,"Noto Sans Thai",sans-serif}
#tfd-modal p{margin:0 0 16px;white-space:pre-line;line-height:1.6}
#tfd-modal button{background:#0055b8;color:#fff;border:0;border-radius:10px;padding:10px 18px;font:inherit;cursor:pointer;float:right}
#tfd-home{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9998;background:#0055b8;color:#fff;text-decoration:none;border-radius:999px;padding:9px 16px;font:600 14px Tahoma,"Noto Sans Thai",sans-serif;box-shadow:0 4px 14px rgba(0,40,100,.25)}
</style>
<script>
(function(){
  var queue=[];
  function show(){
    var m=document.getElementById('tfd-modal');
    if(!m||!queue.length) return;
    m.querySelector('p').textContent=queue[0];
    m.classList.add('show');
    m.querySelector('button').focus();
  }
  window.alert=function(msg){queue.push(String(msg));if(queue.length===1)show();};
  window.tfdCloseModal=function(){
    queue.shift();
    document.getElementById('tfd-modal').classList.remove('show');
    show();
  };
  var printMsg='การพิมพ์ / บันทึก PDF ใช้ได้เมื่อเปิดไฟล์ HTML บนเครื่องโดยตรง';
  var realOpen=window.open;
  window.open=function(){
    var w=null;
    try{w=realOpen.apply(window,arguments);}catch(e){}
    if(w) return w;
    alert(printMsg);
    var noop=function(){};
    return {document:{open:noop,write:noop,writeln:noop,close:noop},focus:noop,print:noop,close:noop};
  };
  var realPrint=window.print;
  window.print=function(){
    var shown=false;
    window.addEventListener('beforeprint',function(){shown=true;},{once:true});
    try{realPrint.call(window);}catch(e){}
    setTimeout(function(){if(!shown) alert(printMsg);},300);
  };
  document.addEventListener('DOMContentLoaded',function(){
    var m=document.createElement('div');
    m.id='tfd-modal';
    m.setAttribute('role','dialog');
    m.innerHTML='<div class="box"><p></p><button type="button" onclick="tfdCloseModal()">ตกลง</button></div>';
    document.body.appendChild(m);
    var a=document.createElement('a');
    a.id='tfd-home';a.href='index.html';a.textContent='← หน้าหลัก';
    document.body.appendChild(a);
    show();
  });
})();
</script>
'''

ROLE_FROM_HASH = r'''
<script>
document.addEventListener('DOMContentLoaded',function(){
  var h=(location.hash||'').slice(1);
  if(h==='student') enterStudent();
  else if(h==='teacher') showTeacherLogin();
});
</script>
'''

GH = 'https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/'


def inject(html, extra_head='', extra_body=''):
    i = html.index('<head>') + len('<head>')
    html = html[:i] + SHIM + extra_head + html[i:]
    j = html.rindex('</body>')
    return html[:j] + extra_body + html[j:]


def main():
    geo = json.loads((ROOT / 'db/geography/thailand_geography.json').read_text('utf-8'))
    (SITE / 'geo').mkdir(parents=True, exist_ok=True)
    # รูปแบบที่ฟอร์ม v28 อ่าน (name_th, province_id); อำเภอใส่คำนำหน้าให้ตรงกับรายชื่อสถานศึกษา
    (SITE / 'geo/province.json').write_text(json.dumps(
        [{'id': p['id'], 'name_th': p['th']} for p in geo['provinces']],
        ensure_ascii=False, separators=(',', ':')), 'utf-8')
    (SITE / 'geo/district.json').write_text(json.dumps(
        [{'id': d['id'], 'province_id': d['p'], 'name_th': d['pre'] + d['th']} for d in geo['districts']],
        ensure_ascii=False, separators=(',', ':')), 'utf-8')

    st = (ROOT / 'TISCO_Scholarship_Student_Teacher_HTML_Demo_v28.html').read_text('utf-8')
    for f in ('province.json', 'district.json'):
        assert st.count(GH + f) == 1, f
        st = st.replace(GH + f, 'geo/' + f)
    (SITE / 'student-teacher.html').write_text(inject(st, extra_body=ROLE_FROM_HASH), 'utf-8')

    ad = (ROOT / 'TISCO_Foundation_Admin_HTML_Demo_v14.html').read_text('utf-8')
    (SITE / 'admin.html').write_text(inject(ad), 'utf-8')
    print('built site/: index.html, student-teacher.html, admin.html, geo/*.json')


if __name__ == '__main__':
    main()
