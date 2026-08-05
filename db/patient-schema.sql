create extension if not exists "uuid-ossp";

create table users (
  id uuid primary key default uuid_generate_v4(),
  role varchar(30) not null check (role in ('patient', 'doctor', 'admin')),
  phone varchar(30) unique not null,
  email varchar(255),
  password_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table patients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references users(id) on delete cascade,
  cmu_number varchar(80) unique,
  first_name varchar(120) not null,
  last_name varchar(120) not null,
  birth_date date,
  sex varchar(20),
  blood_type varchar(5),
  phone varchar(30),
  email varchar(255),
  address text,
  city varchar(120),
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table patient_emergency_contacts (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  name varchar(180) not null,
  relationship varchar(80),
  phone varchar(30) not null,
  is_primary boolean not null default false
);

create table patient_vitals (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  type varchar(60) not null,
  value_text varchar(80),
  value_number numeric(10,3),
  unit varchar(30),
  measured_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index patient_vitals_patient_type_measured_idx
  on patient_vitals(patient_id, type, measured_at desc);

create table treatments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid references users(id),
  diagnosis varchar(255) not null,
  status varchar(40) not null default 'active',
  stage varchar(120),
  progress smallint check (progress between 0 and 100),
  started_at date,
  next_checkup_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table medications (
  id uuid primary key default uuid_generate_v4(),
  treatment_id uuid not null references treatments(id) on delete cascade,
  name varchar(180) not null,
  dosage varchar(80),
  frequency varchar(80),
  duration_days integer,
  created_at timestamptz not null default now()
);

create table medication_schedules (
  id uuid primary key default uuid_generate_v4(),
  medication_id uuid not null references medications(id) on delete cascade,
  take_time time not null,
  period varchar(40),
  created_at timestamptz not null default now()
);

create table medication_intakes (
  id uuid primary key default uuid_generate_v4(),
  schedule_id uuid not null references medication_schedules(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  status varchar(30) not null check (status in ('taken', 'missed', 'skipped')),
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create index medication_intakes_patient_taken_idx
  on medication_intakes(patient_id, taken_at desc);

create table appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid references users(id),
  starts_at timestamptz not null,
  specialty varchar(120),
  location varchar(255),
  mode varchar(30) not null check (mode in ('onsite', 'video')),
  status varchar(40) not null default 'confirmed',
  created_at timestamptz not null default now()
);

create table vaccinations (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  name varchar(180) not null,
  injected_at date,
  status varchar(40),
  next_due_at date,
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  uploaded_by uuid references users(id),
  title varchar(255) not null,
  category varchar(80) not null,
  file_url text not null,
  mime_type varchar(120),
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create table conversations (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references users(id),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table patient_notes (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  title varchar(180) not null,
  content text not null default '',
  color varchar(30) not null default 'amber',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table patient_settings (
  patient_id uuid primary key references patients(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_user_id uuid references users(id),
  patient_id uuid references patients(id),
  action varchar(120) not null,
  resource_type varchar(120),
  resource_id uuid,
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_patient_created_idx
  on audit_logs(patient_id, created_at desc);
