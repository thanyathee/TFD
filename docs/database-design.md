# ฐานข้อมูลกลาง — ระบบทุนการศึกษามูลนิธิทิสโก้

ใช้ร่วมกัน 3 ส่วน: **นักเรียน** และ **ครู** (`TISCO_Scholarship_Student_Teacher_HTML_Demo_v28.html`) กับ **เจ้าหน้าที่** (`TISCO_Foundation_Admin_HTML_Demo_v13.html`)
โค้ด SQL อยู่ที่ [`db/schema.sql`](../db/schema.sql) (PostgreSQL 14+ / Supabase) ทดสอบรันบน PostgreSQL 16 แล้ว

## 1. สถานะใบสมัคร (ใช้ชุดเดียวกันทุกส่วน)

```
draft ──นักเรียนกดส่ง──▶ waiting_teacher ──ครูส่ง──▶ waiting_staff ──จนท.──▶ waiting_manager ──ผู้จัดการ──▶ decided
  ▲   (ป.ตรี ข้ามครู ส่งตรง ──────────────────────▶)        │
  └──────── returned_to_student ◀── ครู/จนท. เปิดสิทธิ์แก้ไข ─┘── need_more_info
```

| สถานะ | ข้อความบนหน้าจอ | ใครเห็น/ทำงานต่อ |
|---|---|---|
| `draft` | นักเรียนกำลังกรอกข้อมูล | นักเรียน |
| `waiting_teacher` | รอครูดำเนินการ | ครู |
| `returned_to_student` | เปิดสิทธิ์ให้แก้ไข | นักเรียน |
| `waiting_staff` | ส่งมูลนิธิฯ แล้ว / รอเจ้าหน้าที่ดำเนินการ | เจ้าหน้าที่ |
| `need_more_info` | รอข้อมูลเพิ่มเติม | ครู / นักเรียน |
| `waiting_manager` | รอผู้จัดการพิจารณา | ผู้จัดการ |
| `decided` | ผู้จัดการดำเนินการเรียบร้อย | ทุกฝ่าย (ผลอยู่ในตาราง `decisions`) |
| `withdrawn` | ยกเลิกใบสมัคร | — |

ผลพิจารณา (`decisions.result`): `approved` อนุมัติทุน · `rejected` ไม่ผ่าน · `reserve` สำรอง · `ineligible` ไม่เข้าเกณฑ์

## 2. กลุ่มตาราง

| กลุ่ม | ตาราง | ใช้ในส่วน |
|---|---|---|
| พื้นที่ | `regions` `provinces` `districts` `subdistricts` | ทุกส่วน — ข้อมูลของระบบเองใน `db/seed_geography.sql` และ `db/geography/thailand_geography.json` (7 ภาค / 77 จังหวัด / 928 อำเภอ-เขต / 7,436 ตำบล-แขวง พร้อมรหัสไปรษณีย์) สร้างด้วย `db/tools/build_geography.py` |
| สถานศึกษา/ผู้ใช้ | `schools` `staff_users` | จนท. จัดการ, ครูล็อกอิน |
| ตั้งค่ารอบ | `scholarship_cycles` `scholarship_rates` `document_types` | จนท. ตั้งค่า |
| นักเรียน | `students` | นักเรียน |
| ใบสมัคร | `applications` `application_family` `application_siblings` `application_other_funding` `application_documents` | นักเรียนกรอก, ครู/จนท. อ่าน |
| งานครู | `teacher_reviews` `school_submission_batches` | ครู |
| งาน จนท. | `staff_reviews` `decisions` `school_transfers` | จนท. / ผู้จัดการ |
| ตรวจสอบย้อนหลัง | `application_status_history` `audit_log` | ระบบ (บันทึกอัตโนมัติ ห้ามแก้/ลบ) |

ความสัมพันธ์หลัก:

```
schools 1─* staff_users(teacher)
schools 1─* applications *─1 students
scholarship_cycles 1─* applications        (นักเรียน 1 คน ส่งได้ปีละ 1 ใบ)
applications 1─1 application_family / teacher_reviews / decisions
applications 1─* siblings / other_funding / documents / staff_reviews / status_history / school_transfers
```

## 3. หลักการออกแบบที่สำคัญ

1. **เลขบัตรประชาชน** เก็บ 13 หลักตามจริง (`students.citizen_id`, ตัวเลขล้วน ไม่มีขีด) เพื่อนำไปใช้ต่อได้ทันที ควบคุมการเข้าถึงด้วยสิทธิ์ (§4) และบันทึก `audit_log` เมื่อ export
2. **นักเรียนไม่มีรหัสผ่าน** ใช้เลขบัตร + วันเกิด + เบอร์โทรยืนยันตัวตน แล้วออก session/OTP
3. **ครู 1 คน = 1 บัญชี** ผูกกับ `school_id` ครูจึงเห็นเฉพาะนักเรียนในโรงเรียนตัวเอง
4. **บทบาทผูกกับบัญชี** (`teacher` / `reviewer` / `manager` / `admin`) แทนปุ่มสลับบทบาทในต้นแบบ
5. **อัตราทุนคิดจากชั้นปีถัดไป** (`next_class` → `rate_level_code`) และเก็บทั้ง `standard_amount` และ `approved_amount` ถ้ายอดไม่ตรงอัตรามาตรฐาน ต้องใส่ `amount_reason` (บังคับด้วย CHECK)
6. **ไฟล์แนบ** เก็บใน Object Storage แบบ private ฐานข้อมูลเก็บแค่ path ชนิดไฟล์ และขนาด โดยตรวจตามที่ตั้งไว้ใน `document_types`
7. **ประวัติไม่ถูกเขียนทับ** เปลี่ยนสถานะเมื่อไหร่ trigger จะบันทึกลง `application_status_history` อัตโนมัติ ส่วน `audit_log` ห้าม UPDATE/DELETE
8. **ทุนต่อเนื่อง** เก็บทั้งคำตอบของนักเรียน (`received_prev_year`) และผลที่ จนท. ตรวจกับประวัติจริง (`prev_year_verified`)

### การย้ายสถานศึกษา

เจ้าหน้าที่ตรวจสอบหลักฐานภายนอกระบบก่อน แล้วจึงบันทึกเข้า `school_transfers` (สถานศึกษาเดิม → สถานศึกษาใหม่, วันที่แจ้งย้าย, ผู้บันทึก, หมายเหตุ)
เมื่อบันทึกแล้ว trigger จะเปลี่ยน `applications.school_id` เป็นสถานศึกษาใหม่ให้อัตโนมัติ ครูโรงเรียนใหม่จึงเห็นนักเรียนคนนี้ ส่วนประวัติการย้ายทุกครั้งยังเก็บไว้ครบ
ถ้าไม่พบสถานศึกษาใหม่ ให้เพิ่มเข้า `schools` (Master Data) ก่อน

## 4. สิทธิ์การเข้าถึง (ทำเป็น Row Level Security ในขั้นถัดไป)

| ข้อมูล | นักเรียน | ครู | Reviewer | Manager | Admin |
|---|---|---|---|---|---|
| ใบสมัครของตัวเอง | แก้ได้เมื่อ `draft`/`returned` | — | — | — | — |
| ใบสมัครในโรงเรียน | — | อ่าน + ส่งต่อ | — | — | — |
| ใบสมัครทั้งหมด | — | — | อ่าน + รีวิว | อ่าน + ตัดสิน | อ่าน |
| เลขบัตร 13 หลัก | ของตัวเอง | นักเรียนในโรงเรียน | ✓ | ✓ | ✓ |
| ตั้งค่ารอบ/โรงเรียน/บัญชี | — | — | — | — | ✓ |
| Export | — | ใบสรุปของโรงเรียน | ✓ + log | ✓ + log | ✓ + log |

## ข้อมูลจำลองสำหรับทดสอบ

`db/seed_mock.sql` (สร้างด้วย `db/tools/build_mock_data.py`): นักเรียน 100 คนพร้อมใบสมัคร, ครู 100 คน (สถานศึกษาจำลอง 50 แห่ง แห่งละ 2 คน), เจ้าหน้าที่ 4 บัญชี (`reviewer01` `reviewer02` `manager01` `admin01`) รหัสผ่านทุกบัญชี `Demo@1234`
ลำดับการรัน: `schema.sql` → `seed_geography.sql` → `seed_mock.sql` · ข้อมูลชุดเดียวกันสำหรับหน้า HTML อยู่ที่ `db/mock/mock_data.json`

## 5. ขั้นถัดไป

1. ตกลงชื่อสถานะในตาราง §1 ให้ตรงกันทั้งฝั่งนักเรียน/ครู (v28) และฝั่ง Admin (v13)
2. นำเข้ารายชื่อสถานศึกษา (ข้อมูลพื้นที่พร้อมแล้ว: รัน `schema.sql` แล้วตามด้วย `seed_geography.sql`)
3. เขียน RLS policy ตาม §4
4. เชื่อมหน้า HTML เข้ากับฐานข้อมูล (เช่น Supabase client หรือ API)
5. กำหนดระยะเวลาเก็บข้อมูลตาม PDPA เช่น ลบเอกสารของผู้ไม่ได้รับทุนเมื่อครบ X ปี
