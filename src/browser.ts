import { chromium, type Browser, type Page } from 'playwright-chromium'

const OPENMOCKUP_URL = process.env.OPENMOCKUP_URL ?? 'https://openmockup.dev'

let browser: Browser | null = null
let page: Page | null = null

export async function getPage(): Promise<Page> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }

  if (!page || page.isClosed()) {
    page = await browser.newPage()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${OPENMOCKUP_URL}?headless`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => (window as any).__rendererReady === true, {
      timeout: 30_000,
    })
  }

  return page
}

export async function closeBrowser(): Promise<void> {
  await browser?.close()
  browser = null
  page = null
}

process.on('exit', () => void closeBrowser())
process.on('SIGINT', async () => { await closeBrowser(); process.exit(0) })
process.on('SIGTERM', async () => { await closeBrowser(); process.exit(0) })
