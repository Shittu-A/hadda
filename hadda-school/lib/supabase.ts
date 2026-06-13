import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _client
}

const _ensuredBuckets = new Set<string>()

/**
 * Ensures a public storage bucket exists, creating it on first use.
 * Uses the service-role client, so it has permission to create buckets.
 * Results are cached per-process to avoid a round-trip on every upload.
 */
export async function ensureBucket(
  bucket: string,
  opts: { allowedMimeTypes?: string[]; fileSizeLimit?: string } = {},
): Promise<void> {
  if (_ensuredBuckets.has(bucket)) return

  const supabase = getSupabase()
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: opts.allowedMimeTypes,
    fileSizeLimit: opts.fileSizeLimit,
  })

  // "already exists" is the expected outcome after first run — treat as success.
  if (error && !/already exists/i.test(error.message)) {
    throw error
  }

  _ensuredBuckets.add(bucket)
}
