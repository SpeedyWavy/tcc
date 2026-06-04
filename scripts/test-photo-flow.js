import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY)

async function run() {
  try {
    // Create a tiny dummy image (1x1 transparent PNG)
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
    const buffer = Buffer.from(pngBase64, 'base64')
    const timestamp = Date.now()
    const filePath = `tests/test-image-${timestamp}.png`

    console.log('Uploading test image to storage at', filePath)
    const { data: uploadData, error: uploadError } = await admin.storage.from('user-photos').upload(filePath, buffer, { upsert: true })
    if (uploadError) {
      console.error('Upload error', uploadError)
      process.exit(1)
    }

    console.log('Resolving public URL for', filePath)
    const { data: publicData } = admin.storage.from('user-photos').getPublicUrl(filePath)
    let publicUrl = publicData?.publicUrl

    if (!publicUrl) {
      console.log('No public URL; creating signed URL')
      const { data: signedData, error: signedError } = await admin.storage.from('user-photos').createSignedUrl(filePath, 60)
      if (signedError) {
        console.error('Signed URL error', signedError)
        process.exit(1)
      }
      publicUrl = signedData.signedUrl
    }

    console.log('Public URL obtained:', publicUrl)

    // Insert student record using admin client, simulating function behavior
    const student = {
      name: 'Test Student',
      rm: '999',
      responsible_name: 'Test Resp',
      parent_contact: '0000',
      address: 'Nowhere',
      transport_identification: 'Test Transport',
      unit: 'Garcia',
      photo_url: null,
      photo_path: filePath,
    }

    // Resolve server-side like function: derive photo_url from photo_path
    if (!student.photo_url && student.photo_path) {
      const { data: pd } = admin.storage.from('user-photos').getPublicUrl(student.photo_path)
      let pu = pd?.publicUrl
      if (!pu) {
        const { data: sd } = await admin.storage.from('user-photos').createSignedUrl(student.photo_path, 60)
        pu = sd?.signedUrl
      }
      if (pu) student.photo_url = pu
    }

    const { data: inserted, error: insertError } = await admin.from('students').insert({
      name: student.name,
      rm: student.rm,
      responsible_name: student.responsible_name,
      parent_contact: student.parent_contact,
      address: student.address,
      transport_identification: student.transport_identification,
      unit: student.unit,
      photo_url: student.photo_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('*').single()

    if (insertError) {
      console.error('Insert error', insertError)
      process.exit(1)
    }

    console.log('Inserted student:', inserted)

    // Fetch to verify
    const { data: fetched } = await admin.from('students').select('*').eq('id', inserted.id).maybeSingle()
    console.log('Fetched student:', fetched)
    console.log('Test complete — student photo_url:', fetched.photo_url)
  } catch (err) {
    console.error('Test script error', err)
    process.exit(1)
  }
}

run()
