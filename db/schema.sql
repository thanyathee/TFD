-- =====================================================================
-- TISCO Foundation Scholarship — ฐานข้อมูลกลาง (PostgreSQL 14+ / Supabase)
-- ใช้ร่วมกัน 3 ส่วน: นักเรียน (v28), ครู/สถานศึกษา (v28), เจ้าหน้าที่ (Admin v13)
-- ดูคำอธิบายใน docs/database-design.md
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 0) ENUM กลาง — ใช้ชื่อสถานะชุดเดียวกันทุกส่วน
-- ---------------------------------------------------------------------
CREATE TYPE app_status AS ENUM (
  'draft',               -- นักเรียนกำลังกรอกข้อมูล
  'waiting_teacher',     -- ส่งแล้ว รอครูดำเนินการ (ข้อมูลถูกล็อก)
  'returned_to_student', -- ครู/จนท. เปิดสิทธิ์ให้นักเรียนแก้ไข
  'waiting_staff',       -- ส่งมูลนิธิฯ แล้ว รอเจ้าหน้าที่ดำเนินการ
  'need_more_info',      -- รอข้อมูลเพิ่มเติม
  'waiting_manager',     -- ส่งต่อให้ผู้จัดการพิจารณา
  'decided',             -- ผู้จัดการดำเนินการเรียบร้อย (ดูผลใน decisions)
  'withdrawn'            -- ยกเลิก / ถอนใบสมัคร
);

CREATE TYPE applicant_type  AS ENUM ('NEW', 'CONT');                 -- ทุนใหม่ / ทุนต่อเนื่อง
CREATE TYPE staff_role      AS ENUM ('teacher', 'reviewer', 'manager', 'admin');
CREATE TYPE account_status  AS ENUM ('active', 'disabled');
CREATE TYPE cycle_status    AS ENUM ('preparing', 'open', 'closed'); -- เตรียมระบบ / เปิดรับ / ปิดรับ
CREATE TYPE decision_result AS ENUM ('approved', 'rejected', 'reserve', 'ineligible');
CREATE TYPE review_result   AS ENUM ('pass', 'fail', 'reserve', 'ineligible', 'need_more_info');
CREATE TYPE grade_type      AS ENUM ('gpa', 'percent');
CREATE TYPE parent_status   AS ENUM ('alive', 'deceased', 'unknown');
CREATE TYPE transfer_evidence AS ENUM ('not_received', 'received');
CREATE TYPE transfer_result   AS ENUM ('pending', 'passed', 'failed');

-- ---------------------------------------------------------------------
-- 1) ข้อมูลพื้นที่ (Master)
-- ---------------------------------------------------------------------
-- ข้อมูลจริงอยู่ใน db/seed_geography.sql (77 จังหวัด / 928 อำเภอ-เขต / 7,436 ตำบล-แขวง)
CREATE TABLE regions (
  id    smallint PRIMARY KEY,
  code  text NOT NULL UNIQUE,          -- bkkmetro, north, central, ... (ตรงกับค่าในฟอร์ม v28)
  name  text NOT NULL UNIQUE           -- กรุงเทพฯและปริมณฑล, ภาคเหนือ, ...
);

CREATE TABLE provinces (
  id        integer PRIMARY KEY,       -- รหัสจังหวัดตามกรมการปกครอง
  region_id smallint NOT NULL REFERENCES regions(id),
  name_th   text NOT NULL UNIQUE,
  name_en   text NOT NULL
);

CREATE TABLE districts (
  id          integer PRIMARY KEY,
  province_id integer NOT NULL REFERENCES provinces(id),
  prefix_th   text NOT NULL,           -- อำเภอ / เขต
  name_th     text NOT NULL,
  name_en     text NOT NULL,
  UNIQUE (province_id, name_th)
);

CREATE TABLE subdistricts (
  id          integer PRIMARY KEY,
  district_id integer NOT NULL REFERENCES districts(id),
  prefix_th   text NOT NULL,           -- ตำบล / แขวง
  name_th     text NOT NULL,
  name_en     text NOT NULL,
  postcode    char(5) NOT NULL
);
CREATE INDEX ON districts (province_id);
CREATE INDEX ON subdistricts (district_id);
CREATE INDEX ON subdistricts (postcode);

-- ---------------------------------------------------------------------
-- 2) สถานศึกษา และบัญชีผู้ใช้ฝั่งครู/เจ้าหน้าที่
-- ---------------------------------------------------------------------
CREATE TABLE schools (
  id             serial PRIMARY KEY,
  institution_code text UNIQUE,                 -- InstitutionID
  name           text NOT NULL,
  school_type    text NOT NULL CHECK (school_type IN ('school','college','university','other')),
  subdistrict_id integer REFERENCES subdistricts(id),
  district_id    integer NOT NULL REFERENCES districts(id),
  address        text,
  levels_offered text[] NOT NULL DEFAULT '{}',  -- ช่วงชั้นที่เปิดสอน เช่น {ม.1,...,ม.6}
  status         account_status NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ผู้ใช้ทุกบทบาท ยกเว้นนักเรียน (ครู 1 คน = 1 บัญชี ไม่ใช้บัญชีรวมของโรงเรียน)
CREATE TABLE staff_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,                  -- bcrypt/argon2 (หรือใช้ Supabase Auth แทน)
  full_name     text NOT NULL,
  position      text,                           -- ตำแหน่งครู / ฝ่ายที่รับผิดชอบ
  phone         text,
  email         text,
  role          staff_role NOT NULL,
  school_id     integer REFERENCES schools(id), -- บังคับมีเมื่อ role = teacher
  status        account_status NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_has_school CHECK (role <> 'teacher' OR school_id IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- 3) รอบรับสมัคร อัตราทุน และประเภทเอกสาร
-- ---------------------------------------------------------------------
CREATE TABLE scholarship_cycles (
  id                   serial PRIMARY KEY,
  scholarship_year     smallint NOT NULL UNIQUE,  -- ปีทุน เช่น 2570
  history_question_year smallint NOT NULL,        -- ปีที่ถามว่าเคยได้ทุน เช่น 2569
  open_at              timestamptz NOT NULL,
  close_at             timestamptz NOT NULL,
  first_round_cutoff   date,                      -- วันตัดรอบแรก ป.6 / ม.3
  transfer_evidence_open  date,
  transfer_evidence_close date,
  privacy_notice_version text NOT NULL,
  privacy_notice_url     text NOT NULL,
  status               cycle_status NOT NULL DEFAULT 'preparing',
  CHECK (close_at > open_at)
);

CREATE TABLE scholarship_rates (
  cycle_id   integer NOT NULL REFERENCES scholarship_cycles(id),
  level_code text NOT NULL,      -- P6, M_LOWER, M_UPPER, PVC, PVS, PVS_IND, BACHELOR, SPECIAL
  level_name text NOT NULL,
  amount     integer NOT NULL CHECK (amount >= 0),
  PRIMARY KEY (cycle_id, level_code)
);

CREATE TABLE document_types (
  code         text PRIMARY KEY, -- 01_IDCARD, 03_STUDENTCERT, ..., 11_RECEIPT
  name_th      text NOT NULL,
  allow_multiple boolean NOT NULL DEFAULT false,
  max_size_mb  smallint NOT NULL DEFAULT 10,
  allowed_mime text[] NOT NULL DEFAULT '{application/pdf,image/jpeg,image/png}'
);

-- ---------------------------------------------------------------------
-- 4) นักเรียน (1 คน มีได้หลายใบสมัคร ปีละ 1 ใบ)
-- ---------------------------------------------------------------------
CREATE TABLE students (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id       char(13) NOT NULL UNIQUE  -- เลขประจำตัวประชาชน 13 หลักตามจริง (ตัวเลขล้วน ไม่มีขีด)
                   CHECK (citizen_id ~ '^[0-9]{13}$'),
  title            text,
  first_name       text NOT NULL,
  last_name        text NOT NULL,
  gender           text,
  birth_date       date NOT NULL,
  phone            text NOT NULL,         -- ใช้ยืนยันตัวตนร่วมกับเลขบัตร + วันเกิด
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5) ใบสมัคร (ตารางหลัก)
-- ---------------------------------------------------------------------
CREATE TABLE applications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code         text NOT NULL UNIQUE,              -- TF2570-001284
  cycle_id         integer NOT NULL REFERENCES scholarship_cycles(id),
  student_id       uuid NOT NULL REFERENCES students(id),
  school_id        integer NOT NULL REFERENCES schools(id),
  applicant_type   applicant_type NOT NULL,
  received_prev_year boolean NOT NULL,                -- คำตอบ "ปี 2569 ได้รับทุนหรือไม่"
  prev_year_verified boolean,                         -- จนท. ตรวจกับประวัติจริงแล้ว (null = ยังไม่ตรวจ)
  status           app_status NOT NULL DEFAULT 'draft',
  is_bachelor      boolean NOT NULL DEFAULT false,    -- ป.ตรี ส่งตรงมูลนิธิฯ ไม่ผ่านครู

  -- ข้อมูลการศึกษา
  education_group  text,               -- ประถม/มัธยม/ปวช./ปวส./ป.ตรี
  current_class    text NOT NULL,      -- ระดับชั้นปัจจุบัน (ปี 2569)
  next_class       text,               -- ระดับชั้นปีถัดไป (ปี 2570) → ใช้คิดอัตราทุน
  rate_level_code  text,               -- อ้างอิง scholarship_rates
  study_mode       text,
  pvs_type         text,               -- ประเภทวิชา ปวช./ปวส.
  faculty          text,               -- คณะ/สาขา (ป.ตรี)
  program_years    smallint,
  stays_same_school boolean,           -- สถานศึกษาในปีถัดไป
  next_school_id   integer REFERENCES schools(id),

  -- ที่อยู่
  home_address     text,
  current_address  text,

  -- เรื่องราวชีวิต (6 คำถาม)
  story_family     text,
  story_siblings   text,
  story_travel     text,
  story_housing    text,
  story_expenses   text,
  story_other      text,

  -- ยืนยัน / PDPA
  confirmed_true   boolean NOT NULL DEFAULT false,
  pdpa_version     text,
  pdpa_ack_at      timestamptz,

  submitted_at     timestamptz,
  locked           boolean NOT NULL DEFAULT false,    -- true หลังส่ง แก้ไม่ได้จนกว่าจะเปิดสิทธิ์
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (cycle_id, rate_level_code) REFERENCES scholarship_rates(cycle_id, level_code),
  UNIQUE (cycle_id, student_id)                        -- ปีละ 1 ใบต่อคน
);
CREATE INDEX ON applications (school_id, status);
CREATE INDEX ON applications (cycle_id, status);

-- ครอบครัว (1:1 กับใบสมัคร)
CREATE TABLE application_family (
  application_id   uuid PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  father_name      text,
  father_status    parent_status,
  father_occupation text,
  father_income_type text,             -- เงินเดือน / รายวัน / ไม่แน่นอน
  father_monthly_income integer,
  mother_name      text,
  mother_status    parent_status,
  mother_occupation text,
  mother_income_type text,
  mother_monthly_income integer,
  family_status    text,               -- อยู่ด้วยกัน / แยกกันอยู่ / หย่าร้าง ...
  guardian_relation text,
  housing_type     text,               -- บ้านตนเอง / เช่า / อาศัยผู้อื่น
  housing_cost     integer,            -- ค่าเช่า / ค่างวดผ่อน
  owns_farmland    boolean,
  rents_farmland   boolean,
  assets           text[] NOT NULL DEFAULT '{}',  -- ทรัพย์สินที่ครอบครัวมี (ว่าง = ไม่มี)
  sibling_count    smallint
);

CREATE TABLE application_siblings (
  id             bigserial PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  seq            smallint NOT NULL,
  name           text,
  age            smallint,
  status         text,                 -- กำลังเรียน / ทำงาน / อื่น ๆ
  detail         text,                 -- ชั้น/สถานศึกษา หรืออาชีพ
  monthly_income integer,
  UNIQUE (application_id, seq)
);

-- กยศ./กรอ. และทุนจากหน่วยงานอื่น
CREATE TABLE application_other_funding (
  id             bigserial PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  kind           text NOT NULL CHECK (kind IN ('loan','scholarship')),
  provider       text NOT NULL,        -- กยศ. / กรอ. / ชื่อหน่วยงาน
  amount_per_year integer
);

-- ---------------------------------------------------------------------
-- 6) เอกสารแนบ (ไฟล์จริงเก็บใน Object Storage แบบ private)
-- ---------------------------------------------------------------------
CREATE TABLE application_documents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  doc_type       text NOT NULL REFERENCES document_types(code),
  storage_path   text NOT NULL,        -- เช่น 2570/TF2570-001284/04_TRANSCRIPT_1.pdf
  original_name  text,
  mime_type      text NOT NULL,
  size_bytes     integer NOT NULL,
  uploaded_by_student boolean NOT NULL DEFAULT true,
  uploaded_by_staff uuid REFERENCES staff_users(id),
  uploaded_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz           -- soft delete
);
CREATE INDEX ON application_documents (application_id, doc_type);

-- ---------------------------------------------------------------------
-- 7) งานของครู
-- ---------------------------------------------------------------------
CREATE TABLE teacher_reviews (
  application_id uuid PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  teacher_id     uuid NOT NULL REFERENCES staff_users(id),
  grade_type     grade_type NOT NULL,
  grade_value    numeric(5,2) NOT NULL,
  comment        text NOT NULL CHECK (char_length(comment) >= 30),
  sent_at        timestamptz,          -- กดส่งมูลนิธิฯ
  CHECK ((grade_type = 'gpa' AND grade_value BETWEEN 0 AND 4)
      OR (grade_type = 'percent' AND grade_value BETWEEN 0 AND 100))
);

-- ใบสรุปรายชื่อเสนอ ผอ. ที่ลงนามแล้ว (แทนการส่งอีเมล)
CREATE TABLE school_submission_batches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id      integer NOT NULL REFERENCES scholarship_cycles(id),
  school_id     integer NOT NULL REFERENCES schools(id),
  created_by    uuid NOT NULL REFERENCES staff_users(id),
  signed_pdf_path text,
  application_ids uuid[] NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  signed_uploaded_at timestamptz
);

-- ---------------------------------------------------------------------
-- 8) งานของเจ้าหน้าที่ / ผู้จัดการ
-- ---------------------------------------------------------------------
CREATE TABLE staff_reviews (               -- ผลการรีวิวของเจ้าหน้าที่ (มีได้หลายครั้ง)
  id             bigserial PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reviewer_id    uuid NOT NULL REFERENCES staff_users(id),
  review_round   smallint NOT NULL DEFAULT 1,
  result         review_result NOT NULL,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE decisions (                   -- ผลพิจารณาสุดท้าย 1 ใบสมัคร = 1 ผล
  application_id  uuid PRIMARY KEY REFERENCES applications(id),
  manager_id      uuid NOT NULL REFERENCES staff_users(id),
  result          decision_result NOT NULL,
  standard_amount integer,                 -- ยอดตามอัตรามาตรฐาน
  approved_amount integer,                 -- ยอดที่อนุมัติจริง
  amount_reason   text,                    -- บังคับเมื่อยอดไม่เท่ามาตรฐาน
  reject_reason   text,
  decided_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (result <> 'approved' OR approved_amount IS NOT NULL),
  CHECK (approved_amount IS NULL OR approved_amount = standard_amount OR amount_reason IS NOT NULL)
);

CREATE TABLE school_transfers (            -- ย้ายสถานศึกษา
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES applications(id),
  from_school_id  integer NOT NULL REFERENCES schools(id),
  to_school_id    integer REFERENCES schools(id),
  evidence_status transfer_evidence NOT NULL DEFAULT 'not_received',
  evidence_received_date date,
  result          transfer_result NOT NULL DEFAULT 'pending',
  reviewed_by     uuid REFERENCES staff_users(id),
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (evidence_status = 'not_received' OR evidence_received_date IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- 9) ประวัติสถานะ และ Audit Log (เพิ่มอย่างเดียว ห้ามแก้/ลบ)
-- ---------------------------------------------------------------------
CREATE TABLE application_status_history (
  id             bigserial PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status    app_status,
  to_status      app_status NOT NULL,
  changed_by_staff uuid REFERENCES staff_users(id),  -- null = นักเรียนเป็นผู้ทำ
  reason         text,                               -- เช่น เหตุผลที่เปิดสิทธิ์แก้ไข
  changed_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON application_status_history (application_id, changed_at);

CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  actor_staff uuid REFERENCES staff_users(id),
  actor_student uuid REFERENCES students(id),
  action      text NOT NULL,     -- login, view_citizen_id, export, decide, download_doc ...
  entity      text NOT NULL,     -- ชื่อตาราง
  entity_id   text,
  detail      jsonb,             -- ค่าก่อน/หลัง, เงื่อนไข export ฯลฯ
  ip          inet,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON audit_log (entity, entity_id);

CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- บันทึกประวัติทุกครั้งที่สถานะใบสมัครเปลี่ยน
CREATE FUNCTION log_status_change() RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO application_status_history (application_id, from_status, to_status, changed_by_staff, reason)
    VALUES (NEW.id, OLD.status, NEW.status,
            NULLIF(current_setting('app.staff_id', true), '')::uuid,
            NULLIF(current_setting('app.reason', true), ''));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_application_status
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- ---------------------------------------------------------------------
-- 10) ข้อมูลตั้งต้น
-- ---------------------------------------------------------------------
-- ภาค / จังหวัด / อำเภอ / ตำบล → รัน db/seed_geography.sql ต่อจากไฟล์นี้

INSERT INTO document_types (code, name_th, allow_multiple) VALUES
  ('01_IDCARD','บัตรประจำตัวประชาชน',false),
  ('03_STUDENTCERT','หนังสือรับรองสถานภาพนักเรียน/นักศึกษา',false),
  ('04_TRANSCRIPT','ใบแสดงผลการเรียน',false),
  ('05_HOUSEPHOTO','รูปสภาพที่อยู่อาศัย',true),
  ('06_ADVISORCERT','หนังสือรับรองอาจารย์ที่ปรึกษา',false),
  ('07_OTHERSCHOLAR','หนังสือรับรองสถานะ กยศ./กรอ. และทุนต่อเนื่องจากหน่วยงานอื่น',false),
  ('08_BANKFRONT','สำเนาสมุดบัญชีหน้าแรกที่มีชื่อผู้ขอทุน',false),
  ('09_BANKTXN','สำเนาสมุดบัญชีหน้ารายการเดินบัญชี/เบิกถอนเงินทุน',false),
  ('10_EXPENSEREPORT','ใบรายงานค่าใช้จ่าย',false),
  ('11_RECEIPT','หลักฐานการใช้จ่าย / ใบเสร็จ',true);
