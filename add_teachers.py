#!/usr/bin/env python3
"""
Create teacher User records from ClassRoom names already in Supabase,
then link each teacher to their class via ClassTeacher.
Default password for all teachers: teacher123
"""

import re
import sys
import uuid
import bcrypt
import psycopg2
from pathlib import Path

# ── load env ──────────────────────────────────────────────────────────────────

env_path = Path(__file__).parent / 'hadda-school' / '.env.local'
env = {}
for line in env_path.read_text(encoding='utf-8').splitlines():
    m = re.match(r'^([A-Z_]+)="?([^"]*)"?$', line.strip())
    if m:
        env[m.group(1)] = m.group(2)

conn = psycopg2.connect(env['DATABASE_URL'], connect_timeout=20)
conn.autocommit = False
cur = conn.cursor()

# ── fetch classrooms ──────────────────────────────────────────────────────────

cur.execute('SELECT id, name FROM "ClassRoom" ORDER BY "order";')
classrooms = cur.fetchall()
print(f'Found {len(classrooms)} classrooms\n')

# ── name helpers ──────────────────────────────────────────────────────────────

def smart_cap(s):
    """Capitalise first letter only, lowercasing the rest — preserves apostrophes."""
    return s[0].upper() + s[1:].lower() if s else s

def to_display_name(raw: str) -> str:
    """
    MAL.ABDULGAFFAR  -> "Mal. Abdulgaffar"
    MAL.NASA'I       -> "Mal. Nasa'i"
    MALAMA HAFSAH    -> "Malama Hafsah"
    MALAMA NAJA'ATU  -> "Malama Naja'atu"
    """
    raw = raw.strip()
    if raw.startswith('MAL.'):
        rest = smart_cap(raw[4:])
        return f"Mal. {rest}"
    parts = raw.split()
    return ' '.join(smart_cap(p) for p in parts)

def to_email(raw: str) -> str:
    """
    MAL.ABDULGAFFAR  -> mal.abdulgaffar@hadda.school
    MAL.NASA'I       -> mal.nasai@hadda.school
    MALAMA HAFSAH    -> malama.hafsah@hadda.school
    """
    s = raw.strip().lower()
    s = s.replace("'", '').replace(' ', '.')
    return f'{s}@hadda.school'

def gen_id() -> str:
    return 'c' + uuid.uuid4().hex[:24]

# ── hash default password once ────────────────────────────────────────────────

password_hash = bcrypt.hashpw(b'teacher123', bcrypt.gensalt(rounds=10)).decode()

# ── insert teachers + links ───────────────────────────────────────────────────

print(f'{"Class":<20}  {"Display name":<22}  {"Email":<35}  Status')
print('-' * 95)

teachers_created = 0
links_created = 0

for class_id, class_name in classrooms:
    display = to_display_name(class_name)
    email   = to_email(class_name)
    uid     = gen_id()

    cur.execute("""
        INSERT INTO "User" (id, name, email, "passwordHash", role, "isActive", "createdAt", "updatedAt")
        VALUES (%s, %s, %s, %s, 'teacher'::"Role", TRUE, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
        RETURNING id;
    """, (uid, display, email, password_hash))

    row = cur.fetchone()
    if row:
        actual_uid = row[0]
        teachers_created += 1
        status = 'created'
    else:
        cur.execute('SELECT id FROM "User" WHERE email = %s', (email,))
        actual_uid = cur.fetchone()[0]
        status = 'already exists'

    cur.execute("""
        INSERT INTO "ClassTeacher" ("classId", "userId", "isPrimary")
        VALUES (%s, %s, TRUE)
        ON CONFLICT ("classId", "userId") DO NOTHING;
    """, (class_id, actual_uid))
    links_created += 1

    print(f'{class_name:<20}  {display:<22}  {email:<35}  {status}')

conn.commit()
cur.close()
conn.close()

print()
print(f'Teachers created : {teachers_created}')
print(f'Class links made : {links_created}')
print(f'Default password : teacher123')
