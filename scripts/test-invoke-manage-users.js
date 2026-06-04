import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY)
const anon = createClient(SUPABASE_URL, ANON_KEY)

async function run() {
  const adminEmail = `temp.admin.${Date.now()}@example.com`
  const adminPassword = 'TempPass123!'

  console.log('Creating temporary admin user:', adminEmail)
  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    app_metadata: { role: 'admin' },
  })

  if (createError) {
    console.error('Failed to create admin user:', createError)
    process.exit(1)
  }

  const adminId = createData.user.id
  console.log('Admin created:', adminId)

  // Sign in as admin to obtain JWT
  console.log('Signing in as admin to obtain JWT')
  const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  })

  if (signInError || !signInData.session) {
    console.error('Sign-in failed:', signInError)
    // cleanup
    await admin.auth.admin.deleteUser(adminId)
    process.exit(1)
  }

  const accessToken = signInData.session.access_token
  console.log('Got access token, invoking function as admin...')

  const functionUrl = `${SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co')}/manage-users`

  const payload = {
    action: 'create_driver',
    data: {
      full_name: 'Created by test',
      email: `driver.test.${Date.now()}@example.com`,
      password: 'DriverPass123!',
      cpf: '12345678900',
      rg: 'RG-123',
      cnh_category: 'B',
      transport_identification: 'TestVan',
      contact: '+5511999999999',
      schedules: 'Manha',
      unit: 'Garcia',
    },
  }

  const res = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  console.log('Function response status:', res.status)
  console.log('Function response body:', text)

  // cleanup: delete created admin user
  console.log('Cleaning up temporary admin user')
  await admin.auth.admin.deleteUser(adminId)

  process.exit(0)
}

run().catch((err) => {
  console.error('Script error', err)
  process.exit(1)
})
