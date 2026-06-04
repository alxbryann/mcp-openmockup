import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.OPENMOCKUP_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.OPENMOCKUP_SUPABASE_ANON_KEY ?? ''

let supabase: SupabaseClient | null = null
let userId: string | null = null

async function getClient(): Promise<SupabaseClient> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'OPENMOCKUP_SUPABASE_URL and OPENMOCKUP_SUPABASE_ANON_KEY are required for project operations',
    )
  }

  if (supabase) return supabase

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const email = process.env.OPENMOCKUP_EMAIL
  const password = process.env.OPENMOCKUP_PASSWORD
  if (!email || !password) {
    throw new Error('OPENMOCKUP_EMAIL and OPENMOCKUP_PASSWORD are required for project operations')
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Auth failed: ${error.message}`)
  userId = data.user.id

  return supabase
}

export async function listProjects() {
  const sb = await getClient()
  const { data, error } = await sb
    .from('projects')
    .select('id, name, created_at, updated_at, is_public, thumbnail')
    .eq('user_id', userId!)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  }
}

export async function getProject({ id }: { id: string }) {
  const sb = await getClient()
  const { data, error } = await sb
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error(`Project not found: ${id}`)

  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  }
}

export async function createProject({ name }: { name?: string } = {}) {
  const sb = await getClient()
  const { data, error } = await sb
    .from('projects')
    .insert({
      user_id: userId!,
      name: name?.trim() || 'Untitled mockup',
      is_public: false,
      snapshot: {
        devices: [
          {
            id: crypto.randomUUID(),
            screenshot: null,
            screenMediaKind: null,
            screenLoadError: null,
            videoStartTime: 0,
            videoEndTime: null,
            deviceKind: 'phone',
            deviceColor: '#DFCEEA',
            deviceRotation: [0, 0, 0],
            positionX: 0,
            positionY: 0,
          },
        ],
        bgColor: '#ffffff',
        uiTheme: 'dark',
        cameraRoll: 0,
        orbitDistance: 28,
        autoRotate: false,
        cameraPosition: [0, 0, 28],
        cameraTarget: [0, 0, 0],
        viewportAspect: 1,
        viewportInsetRight: 0,
      },
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  }
}
