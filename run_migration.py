#!/usr/bin/env python3
"""
Run the Hadda School legacy data migration directly against Supabase.
Reads DATABASE_URL from hadda-school/.env.local, converts it to a
direct (non-pooler) connection, then:
  1. Adds the `gender` column to "Student" if it doesn't exist.
  2. Runs migration.sql to import all 1241 students.
"""

import re
import sys
import time
import psycopg2
from pathlib import Path

# ── load env ──────────────────────────────────────────────────────────────────

script_dir = Path(__file__).parent
env_path = script_dir / 'hadda-school' / '.env.local'

env = {}
for line in env_path.read_text(encoding='utf-8').splitlines():
    m = re.match(r'^([A-Z_]+)="?([^"]*)"?$', line.strip())
    if m:
        env[m.group(1)] = m.group(2)

pooler_url = env.get('DATABASE_URL', '')
if not pooler_url:
    sys.exit('DATABASE_URL not found in .env.local')

# ── build direct connection URL ───────────────────────────────────────────────
# Pooler:  postgresql://postgres.<ref>:<pwd>@aws-1-eu-north-1.pooler.supabase.com:6543/postgres
# Direct:  postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres

m = re.match(r'postgresql://postgres\.([^:]+):([^@]+)@([^/]+)/postgres', pooler_url)
if not m:
    sys.exit('Unexpected DATABASE_URL format — expected Supabase pooler URL')

project_ref = m.group(1)
host_part   = m.group(3)
print(f'Connecting to: {host_part} (pooler) ...')

# ── connect ───────────────────────────────────────────────────────────────────

try:
    conn = psycopg2.connect(pooler_url, connect_timeout=20)
    conn.autocommit = False
    cur = conn.cursor()
    print('Connected.')
except Exception as e:
    sys.exit(f'Connection failed: {e}')

# ── step 1: add gender column ─────────────────────────────────────────────────

print('\nStep 1: Adding gender column to Student...')
try:
    cur.execute('ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS gender TEXT;')
    conn.commit()
    print('  gender column ready.')
except Exception as e:
    conn.rollback()
    sys.exit(f'  Failed to add gender column: {e}')

# ── step 2: run migration.sql ─────────────────────────────────────────────────

sql_path = script_dir / 'migration.sql'
sql = sql_path.read_text(encoding='utf-8')

print(f'\nStep 2: Running migration.sql ({len(sql):,} chars)...')

try:
    cur.execute(sql)
    conn.commit()
    print('  Migration committed.')
except Exception as e:
    conn.rollback()
    sys.exit(f'  Migration failed: {e}')

# ── verify ────────────────────────────────────────────────────────────────────

print('\nVerifying...')
cur.execute('SELECT status, COUNT(*) FROM "Student" GROUP BY status ORDER BY status;')
for row in cur.fetchall():
    print(f'  Students {row[0]}: {row[1]}')

cur.execute('SELECT COUNT(*) FROM "ClassRoom";')
print(f'  ClassRooms: {cur.fetchone()[0]}')

cur.execute('SELECT COUNT(*) FROM "Guardian";')
print(f'  Guardians: {cur.fetchone()[0]}')

cur.execute('SELECT COUNT(*) FROM "AcademicYear";')
print(f'  AcademicYears: {cur.fetchone()[0]}')

cur.close()
conn.close()
print('\nDone.')
