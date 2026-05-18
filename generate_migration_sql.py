#!/usr/bin/env python3
"""
Generate migration SQL from the old Access DB into Supabase (PostgreSQL).

Usage:
  pip install pyodbc
  python generate_migration_sql.py
  # Then paste migration.sql into the Supabase SQL editor and run it.

Output: migration.sql next to this script.
"""

import pyodbc
import uuid
import os
from datetime import datetime
from pathlib import Path

# ── helpers ──────────────────────────────────────────────────────────────────

def gen_id() -> str:
    return 'c' + uuid.uuid4().hex[:24]

def q(val) -> str:
    """Quote a Python value as a SQL literal."""
    if val is None:
        return 'NULL'
    if isinstance(val, bool):
        return 'TRUE' if val else 'FALSE'
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, datetime):
        return f"'{val.strftime('%Y-%m-%d %H:%M:%S')}'"
    s = str(val).replace("'", "''")
    return f"'{s}'"

# ── connect to Access ─────────────────────────────────────────────────────────

script_dir = Path(__file__).parent
access_db = script_dir / 'ABDULLAHBNMASUD_extracted' / 'ABDULLAHBNMASUD' / 'BNMASUUD-STUDENT-RECORD1.accdb'

conn = pyodbc.connect(
    f'Driver={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={access_db};PWD=0814;'
)
cursor = conn.cursor()
cursor.execute('SELECT * FROM RegistrationTable')
cols = [d[0] for d in cursor.description]
rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
conn.close()
print(f'Read {len(rows)} records from Access DB')

# ── IDs ───────────────────────────────────────────────────────────────────────

CURRENT_YEAR_ID = gen_id()
LEGACY_YEAR_ID  = gen_id()
NOW = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# ── class map ─────────────────────────────────────────────────────────────────

class_names = sorted({r['Class'] for r in rows if r['Class']})
class_id_map: dict[str, str] = {name: gen_id() for name in class_names}

# ── build student + guardian records ─────────────────────────────────────────

student_records = []   # list of dicts
guardian_records = []  # list of dicts

for r in rows:
    is_active = bool(r.get('PhoneNumber')) or bool(r.get('Class'))

    # status
    if not is_active and r.get('Status1') == '-10':
        status = 'withdrawn'
    elif not is_active:
        status = 'graduated'
    else:
        status = 'active'

    # gender: keep M/F, treat NOGENDER/NULL as NULL
    raw_gender = r.get('Gender')
    gender = raw_gender if raw_gender in ('M', 'F') else None

    admission_number = f"HB{int(r['RegNumber']):04d}"
    first_name = (r.get('OtherNames') or '').strip() or 'Unknown'
    last_name  = (r.get('Surname')    or '').strip() or 'Unknown'

    enrollment_date = r.get('DateAddmitted') or datetime(2020, 1, 1)
    academic_year_id = CURRENT_YEAR_ID if is_active else LEGACY_YEAR_ID
    current_class_id = class_id_map.get(r['Class']) if (r.get('Class') and is_active) else None

    sid = gen_id()
    student_records.append({
        'id': sid,
        'admissionNumber': admission_number,
        'firstName': first_name,
        'lastName': last_name,
        'gender': gender,
        'dateOfBirth': r.get('DOB'),
        'enrollmentDate': enrollment_date,
        'status': status,
        'currentClassId': current_class_id,
        'academicYearId': academic_year_id,
    })

    if r.get('PhoneNumber'):
        guardian_records.append({
            'id': gen_id(),
            'studentId': sid,
            'name': f"{last_name} (Contact)",
            'phone': r['PhoneNumber'],
            'relationship': 'Guardian',
            'isPrimary': True,
        })

# ── assemble SQL ──────────────────────────────────────────────────────────────

parts = [
    '-- ============================================================',
    '-- Hadda School legacy data migration → Supabase',
    f'-- Generated: {NOW}',
    '-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)',
    '-- ============================================================',
    '',
    'BEGIN;',
    '',
]

# 1. Academic years
parts += [
    '-- 1. Academic years',
    'INSERT INTO "AcademicYear" (id, name, "startDate", "endDate", "isCurrent", "createdAt")',
    'VALUES',
    f"  ({q(CURRENT_YEAR_ID)}, '2025/2026', '2025-09-01 00:00:00', '2026-08-31 00:00:00', TRUE, '{NOW}'),",
    f"  ({q(LEGACY_YEAR_ID)},  'Legacy',    '2015-01-01 00:00:00', '2024-12-31 00:00:00', FALSE, '{NOW}')",
    'ON CONFLICT (id) DO NOTHING;',
    '',
]

# 2. ClassRooms
classroom_rows = []
for i, name in enumerate(class_names):
    cid = class_id_map[name]
    classroom_rows.append(
        f"  ({q(cid)}, {q(name)}, {i + 1}, {q(CURRENT_YEAR_ID)}, '{NOW}')"
    )

parts += [
    '-- 2. ClassRooms (one per teacher)',
    'INSERT INTO "ClassRoom" (id, name, "order", "academicYearId", "createdAt")',
    'VALUES',
    ',\n'.join(classroom_rows),
    'ON CONFLICT (id) DO NOTHING;',
    '',
]

# 3. Students
student_rows = []
for s in student_records:
    student_rows.append(
        f"  ({q(s['id'])}, {q(s['admissionNumber'])}, {q(s['firstName'])}, {q(s['lastName'])}, "
        f"{q(s['gender'])}, {q(s['dateOfBirth'])}, {q(s['enrollmentDate'])}, "
        f"'{s['status']}'::\"StudentStatus\", "
        f"{q(s['currentClassId'])}, {q(s['academicYearId'])}, "
        f"'{NOW}', '{NOW}')"
    )

parts += [
    f'-- 3. Students ({len(student_records)} total)',
    'INSERT INTO "Student" (id, "admissionNumber", "firstName", "lastName", gender,',
    '  "dateOfBirth", "enrollmentDate", status, "currentClassId", "academicYearId",',
    '  "createdAt", "updatedAt")',
    'VALUES',
    ',\n'.join(student_rows),
    'ON CONFLICT ("admissionNumber") DO NOTHING;',
    '',
]

# 4. Guardians
guardian_rows = []
for g in guardian_records:
    guardian_rows.append(
        f"  ({q(g['id'])}, {q(g['studentId'])}, {q(g['name'])}, "
        f"{q(g['phone'])}, 'Guardian'::\"Relationship\", TRUE)"
    )

parts += [
    f'-- 4. Guardians ({len(guardian_records)} phone contacts)',
    'INSERT INTO "Guardian" (id, "studentId", name, phone, relationship, "isPrimary")',
    'VALUES',
    ',\n'.join(guardian_rows),
    'ON CONFLICT (id) DO NOTHING;',
    '',
    'COMMIT;',
]

sql = '\n'.join(parts)

output_path = script_dir / 'migration.sql'
output_path.write_text(sql, encoding='utf-8')

active   = sum(1 for s in student_records if s['status'] == 'active')
grad     = sum(1 for s in student_records if s['status'] == 'graduated')
withdrawn = sum(1 for s in student_records if s['status'] == 'withdrawn')

print(f'\nmigration.sql generated ({output_path})')
print(f'  Academic years : 2  (2025/2026 + Legacy)')
print(f'  ClassRooms     : {len(class_id_map)}')
print(f'  Students       : {len(student_records)}  ({active} active, {grad} graduated, {withdrawn} withdrawn)')
print(f'  Guardians      : {len(guardian_records)}')
print()
print('Next steps:')
print('  1. cd hadda-school && npx prisma migrate dev --name add_student_gender')
print('  2. Open Supabase dashboard > SQL Editor')
print('  3. Paste and run migration.sql')
