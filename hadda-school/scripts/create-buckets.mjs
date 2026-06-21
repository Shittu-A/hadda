// One-off: create the Supabase Storage buckets the app uploads to.
// Run with:  node --env-file=.env.local scripts/create-buckets.mjs
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.')
  process.exit(1)
}

const supabase = createClient(url, key)

const buckets = [
  { name: 'uploads', allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  { name: 'attendance-photos', allowedMimeTypes: ['image/jpeg'] },
]

for (const b of buckets) {
  const { error } = await supabase.storage.createBucket(b.name, {
    public: true,
    allowedMimeTypes: b.allowedMimeTypes,
    fileSizeLimit: '5MB',
  })
  if (error && !/already exists/i.test(error.message)) {
    console.error(`✗ ${b.name}: ${error.message}`)
    process.exit(1)
  }
  console.log(error ? `• ${b.name}: already exists (ok)` : `✓ ${b.name}: created`)
}

console.log('Done.')
