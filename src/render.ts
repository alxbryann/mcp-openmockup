import { getPage } from './browser.js'

export type RenderOpts = {
  image_url?: string
  image_data?: string
  device?: 'phone' | 'mac'
  device_color?: string
  bg_color?: string
  device_rotation?: [number, number, number]
  zoom?: number
  camera_offset_x?: number
  camera_offset_y?: number
  camera_roll?: number
  transparent?: boolean
  width?: number
  height?: number
}

export type MultiDevice = {
  image_url?: string
  image_data?: string
  kind?: 'phone' | 'mac'
  device_color?: string
  device_rotation?: [number, number, number]
  position_x?: number
  position_y?: number
}

export type MultiRenderOpts = {
  devices: MultiDevice[]
  bg_color?: string
  zoom?: number
  camera_roll?: number
  transparent?: boolean
  width?: number
  height?: number
}

async function toDataUrl(imageUrl?: string, imageData?: string): Promise<string> {
  if (imageData) {
    return imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`
  }
  if (imageUrl) {
    if (imageUrl.startsWith('data:')) return imageUrl
    const res = await fetch(imageUrl)
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`)
    const buf = await res.arrayBuffer()
    const base64 = Buffer.from(buf).toString('base64')
    const ct = res.headers.get('content-type') ?? 'image/png'
    return `data:${ct};base64,${base64}`
  }
  return ''
}

function extractBase64(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/\w+;base64,/, '')
}

export async function renderMockup(opts: RenderOpts) {
  const page = await getPage()
  const imageDataUrl = await toDataUrl(opts.image_url, opts.image_data)

  const renderOpts = {
    devices: [
      {
        kind: opts.device ?? 'phone',
        imageDataUrl,
        deviceColor: opts.device_color,
        deviceRotation: opts.device_rotation,
      },
    ],
    bgColor: opts.bg_color,
    zoom: opts.zoom,
    camera_offset_x: opts.camera_offset_x,
    camera_offset_y: opts.camera_offset_y,
    camera_roll: opts.camera_roll,
    transparent: opts.transparent,
    width: opts.width ?? 1440,
    height: opts.height ?? 2880,
  }

  const dataUrl = await page.evaluate(
    async (o) => (window as any).renderMockup(o),
    renderOpts,
  )

  return {
    content: [{ type: 'image', data: extractBase64(dataUrl as string), mimeType: 'image/png' }],
  }
}

export async function renderMockupMulti(opts: MultiRenderOpts) {
  const page = await getPage()

  const devices = await Promise.all(
    opts.devices.map(async (d) => ({
      kind: d.kind ?? 'phone',
      imageDataUrl: await toDataUrl(d.image_url, d.image_data),
      deviceColor: d.device_color,
      deviceRotation: d.device_rotation,
      positionX: d.position_x,
      positionY: d.position_y,
    })),
  )

  const renderOpts = {
    devices,
    bgColor: opts.bg_color,
    zoom: opts.zoom,
    camera_roll: opts.camera_roll,
    transparent: opts.transparent,
    width: opts.width ?? 2880,
    height: opts.height ?? 2880,
  }

  const dataUrl = await page.evaluate(
    async (o) => (window as any).renderMockup(o),
    renderOpts,
  )

  return {
    content: [{ type: 'image', data: extractBase64(dataUrl as string), mimeType: 'image/png' }],
  }
}
