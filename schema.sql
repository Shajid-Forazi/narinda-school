-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Storage Bucket for Photos
insert into storage.buckets (id, name, public) 
values ('student-photos', 'student-photos', true)
on conflict (id) do nothing;

-- 1. Settings Table
create table if not exists settings (
  id text primary key,
  school_logo_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Students Table
create table if not exists students (
  id uuid default uuid_generate_v4() primary key,
  sl_no text,
  name_bengali text,
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
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Payments Table
create table if not exists payments (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id) on delete cascade,
  year text not null,
  month text not null,
  admission_fee numeric default 0,
  backdue numeric default 0,
  salary numeric default 0,
  exam_fee numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(student_id, year, month)
);

-- 4. Result Cards Table
create table if not exists result_cards (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id) on delete cascade,
  session text not null,
  exam_type text not null,
  subject text not null,
  tutorial_marks numeric default 0,
  sub_marks numeric default 0,
  obj_marks numeric default 0,
  total_marks numeric default 0,
  grade text,
  grade_point numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(student_id, session, exam_type, subject)
);

-- Enable Row Level Security (RLS)
alter table settings enable row level security;
alter table students enable row level security;
alter table payments enable row level security;
alter table result_cards enable row level security;

-- Create Policies (Public Access for Demo)
create policy "Enable read access for all users" on settings for select using (true);
create policy "Enable insert access for all users" on settings for insert with check (true);
create policy "Enable update access for all users" on settings for update using (true);

create policy "Enable read access for all users" on students for select using (true);
create policy "Enable insert access for all users" on students for insert with check (true);
create policy "Enable update access for all users" on students for update using (true);

create policy "Enable read access for all users" on payments for select using (true);
create policy "Enable insert access for all users" on payments for insert with check (true);
create policy "Enable update access for all users" on payments for update using (true);

create policy "Enable read access for all users" on result_cards for select using (true);
create policy "Enable insert access for all users" on result_cards for insert with check (true);
create policy "Enable update access for all users" on result_cards for update using (true);

-- Storage Policies
create policy "Public Access" on storage.objects for select using ( bucket_id = 'student-photos' );
create policy "Public Upload" on storage.objects for insert with check ( bucket_id = 'student-photos' );
