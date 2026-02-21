-- Students table
create table students (
  id uuid default gen_random_uuid() primary key,
  sl_no text,
  name_bengali text not null,
  name_english text,
  father_name text,
  father_occupation text,
  mother_name text,
  mother_occupation text,
  present_address text,
  present_phone text,
  permanent_address text,
  permanent_phone text,
  date_of_birth date,
  class text,
  section text,
  shift text,
  previous_institute text,
  previous_address text,
  previous_class text,
  session text,
  photo_url text,
  created_at timestamp default now()
);

-- Payments table  
create table payments (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references students(id) on delete cascade,
  month text,
  year text,
  admission_fee numeric default 0,
  backdue numeric default 0,
  salary numeric default 0,
  exam_fee numeric default 0,
  created_at timestamp default now(),
  unique(student_id, year, month)
);

-- Result cards table
create table result_cards (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references students(id) on delete cascade,
  session text,
  exam_type text,
  subject text,
  tutorial_marks numeric default 0,
  sub_marks numeric default 0,
  obj_marks numeric default 0,
  total_marks numeric default 0,
  grade text,
  grade_point numeric default 0,
  created_at timestamp default now(),
  unique(student_id, session, exam_type, subject)
);

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_cards ENABLE ROW LEVEL SECURITY;

-- Create "Allow All" policies for development
-- (In a production app, you would restrict this to authenticated users)
CREATE POLICY "Allow all for students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for result_cards" ON result_cards FOR ALL USING (true) WITH CHECK (true);

-- Storage Policies for 'student-photos' bucket
-- 1. Allow public to view photos
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'student-photos');

-- 2. Allow anyone to upload (Insert)
CREATE POLICY "Allow Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'student-photos');

-- 3. Allow anyone to update
CREATE POLICY "Allow Updates" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'student-photos');

-- 4. Allow anyone to delete
CREATE POLICY "Allow Deletes" ON storage.objects FOR DELETE USING (bucket_id = 'student-photos');
