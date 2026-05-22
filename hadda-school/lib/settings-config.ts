export type SettingDef = {
  key: string
  label: string
  group: 'general' | 'school' | 'finance' | 'sms'
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea'
  options?: string[]
  placeholder?: string
}

export const SETTINGS_CONFIG: SettingDef[] = [
  // School
  { key: 'school_name', label: 'School Name', group: 'school', type: 'text', placeholder: 'Abdullahi Bin Masuud Academy' },
  { key: 'school_tagline', label: 'Tagline / Motto', group: 'school', type: 'text', placeholder: 'Excellence in Hifz' },
  { key: 'school_address', label: 'Address', group: 'school', type: 'textarea', placeholder: '123 School Road, City' },
  { key: 'school_phone', label: 'Phone', group: 'school', type: 'text', placeholder: '+234...' },
  { key: 'school_email', label: 'Email', group: 'school', type: 'text', placeholder: 'info@hadda.school' },
  { key: 'school_logo_url', label: 'School Logo URL', group: 'school', type: 'text', placeholder: 'https://...' },
  { key: 'director_signature_url', label: 'Director Signature Image URL', group: 'school', type: 'text', placeholder: 'https://...' },
  // Finance
  { key: 'currency_symbol', label: 'Currency Symbol', group: 'finance', type: 'text', placeholder: '₦' },
  { key: 'currency_code', label: 'Currency Code', group: 'finance', type: 'text', placeholder: 'NGN' },
  { key: 'paystack_public_key', label: 'Paystack Public Key', group: 'finance', type: 'text', placeholder: 'pk_live_...' },
  { key: 'paystack_secret_key', label: 'Paystack Secret Key', group: 'finance', type: 'text', placeholder: 'sk_live_...' },
  { key: 'flutterwave_public_key', label: 'Flutterwave Public Key', group: 'finance', type: 'text', placeholder: 'FLWPUBK_TEST-...' },
  { key: 'flutterwave_secret_key', label: 'Flutterwave Secret Key', group: 'finance', type: 'text', placeholder: 'FLWSECK_TEST-...' },
  // SMS
  {
    key: 'sms_provider',
    label: 'SMS Provider',
    group: 'sms',
    type: 'select',
    options: ['none', 'termii', 'twilio'],
  },
  { key: 'sms_api_key', label: 'SMS API Key', group: 'sms', type: 'text', placeholder: 'Your API key' },
  { key: 'sms_sender_id', label: 'SMS Sender ID', group: 'sms', type: 'text', placeholder: 'AbdullahiAcademy' },
  // General
  { key: 'date_format', label: 'Date Format', group: 'general', type: 'select', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
  { key: 'timezone', label: 'Timezone', group: 'general', type: 'text', placeholder: 'Africa/Lagos' },
  { key: 'teacher_late_threshold', label: 'Teacher Late Threshold (HH:MM)', group: 'general', type: 'text', placeholder: '08:00' },
]

export const SETTING_GROUP_LABELS: Record<string, string> = {
  school: 'School Information',
  finance: 'Finance & Payments',
  sms: 'SMS Notifications',
  general: 'General',
}
