import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import tls from 'node:tls'
import net from 'node:net'
import jsYaml from 'js-yaml'

export const name = 'link-pulse'
export const inject = ['webServer']

const KNOWN_PROVIDER_DEFAULTS = {
  deepseek: {
    name: 'DeepSeek \u0028\u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439\u0029',
    baseURL: 'https://api.deepseek.com',
  },
  'deepseek-official': {
    name: 'DeepSeek \u0028\u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439\u0029',
    baseURL: 'https://api.deepseek.com',
  },
  'opencode-go': {
    name: 'OpenCode GO',
    baseURL: 'https://opencode.ai',
  },
  openai: {
    name: 'OpenAI \u0028\u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439\u0029',
    baseURL: 'https://api.openai.com',
  },
  anthropic: {
    name: 'Anthropic \u0028\u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439\u0029',
    baseURL: 'https://api.anthropic.com',
  },
  google: {
    name: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com',
  },
  openrouter: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai',
  },
}

const jsType = new jsYaml.Type('tag:yaml.org,2002:js', {
  kind: 'scalar',
  construct: (data) => data,
})
const yamlSchema = jsYaml.DEFAULT_SCHEMA.extend([jsType])

function getCandidateConfigPaths() {
  const dshHome = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  return [
    path.join(dshHome, 'profiles/desktop/cordis.patch.yml'),
    path.join(dshHome, 'profiles/web/cordis.patch.yml'),
    path.join(dshHome, 'settings.yaml'),
    path.join(dshHome, 'cordis.patch.yml'),
  ]
}

export function loadDynamicProviders() {
  let settings = {}

  for (const p of getCandidateConfigPaths()) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8')
        const parsed = jsYaml.load(raw, { schema: yamlSchema })
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.id && item.config) {
              settings[item.id] = { ...(settings[item.id] || {}), ...item.config }
            }
          }
        } else if (parsed && typeof parsed === 'object') {
          settings = { ...settings, ...parsed }
        }
      } catch {}
    }
  }

  const providersConfig = settings['llm-pi-ai']?.providers || {}
  const defaultModelConfig = settings['agent-default-model'] || {
    provider: 'cpa',
    model: 'gemini-3.8-flash-high',
  }

  const providers = []
  const providerMap = {}

  for (const [providerId, pConfig] of Object.entries(providersConfig)) {
    const rawModels = pConfig.models || []
    const modelList = rawModels.map((m) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean)
    
    const known = KNOWN_PROVIDER_DEFAULTS[providerId] || {}
    const targetBaseUrl = pConfig.baseURL || known.baseURL || ''
    const displayName = pConfig.name || known.name || providerId.toUpperCase()

    const item = {
      id: providerId,
      name: displayName,
      baseURL: targetBaseUrl,
      api: pConfig.api || 'openai-responses',
      models: modelList,
      isDefault: defaultModelConfig.provider === providerId,
    }

    providers.push(item)
    providerMap[providerId] = item
  }

  // е¦‚жћњжњЄй…ЌзЅ®е®ж–№ deepseekпј€DSH е†…зЅ®е®ж–№и·Їз”±зљ„ provider id дёє deepseek-officialпј‰пјЊиЎҐе……дЅњдёєз‹¬з«‹е®ж–№жЋўжµ‹иЉ‚з‚№
  if (!providerMap['deepseek-official']) {
    const dsItem = {
      id: 'deepseek-official',
      name: 'DeepSeek \u0028\u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439\u0029',
      baseURL: 'https://api.deepseek.com',
      api: 'deepseek-native',
      models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
      isDefault: defaultModelConfig.provider === 'deepseek-official',
    }
    providers.push(dsItem)
    providerMap['deepseek-official'] = dsItem
  }

  return {
    providers,
    providerMap,
    defaultModelConfig,
  }
}

/**
 * жµ‹й‡Џ Keep-Alive зЉ¶жЂЃдё‹зљ„зњџе®ћеЌ•ж¬Ў RTT еѕЂиї”е»¶иїџ
 * (ењЁе·Іе»єз«‹зљ„еЉ еЇ† socket дёЉеЏ‘йЂЃ HEAD е№¶жµ‹й‡Џй¦–е­—иЉ‚иї”е›ћиЂ—ж—¶)
 */
export async function probeLatency(url) {
  if (!url || !/^https?:\/\//i.test(url)) {
    return { latencyMs: -1, status: 'no_url', quality: 'offline', error: '\u041D\u0435\u0442 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0433\u043E URL' }
  }

  return new Promise((resolve) => {
    let parsed
    try {
      parsed = new URL(url)
    } catch {
      return resolve({ latencyMs: -1, quality: 'error', reachable: false, error: '\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 URL' })
    }

    const host = parsed.hostname
    const isHttps = parsed.protocol === 'https:'
    const port = parseInt(parsed.port, 10) || (isHttps ? 443 : 80)
    const timeout = 3500

    let timer = null
    let socket = null

    const cleanup = () => {
      if (timer) clearTimeout(timer)
      if (socket) {
        socket.removeAllListeners()
        socket.destroy()
      }
    }

    timer = setTimeout(() => {
      cleanup()
      resolve({ latencyMs: 3500, quality: 'timeout', reachable: false, error: '\u0442\u0430\u0439\u043C\u0430\u0443\u0442 (>3.5s)' })
    }, timeout)

    try {
      const onEstablished = (sock) => {
        const start = performance.now()
        const path = parsed.pathname || '/'
        sock.write(`HEAD ${path} HTTP/1.1\r\nHost: ${host}\r\nUser-Agent: DSH-LinkPulse/1.0\r\nConnection: close\r\n\r\n`)

        sock.once('data', () => {
          const latencyMs = Math.max(1, Math.round(performance.now() - start))
          cleanup()

          let quality = 'excellent'
          if (latencyMs > 600) quality = 'slow'
          else if (latencyMs > 200) quality = 'good'

          resolve({
            latencyMs,
            quality,
            reachable: true,
          })
        })
      }

      if (isHttps) {
        socket = tls.connect({
          host,
          port,
          servername: host,
          rejectUnauthorized: false,
          timeout,
        }, () => onEstablished(socket))
      } else {
        socket = net.connect({
          host,
          port,
          timeout,
        }, () => onEstablished(socket))
      }

      socket.on('error', (err) => {
        cleanup()
        resolve({
          latencyMs: -1,
          quality: 'error',
          reachable: false,
          error: err.message || '\u0421\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C',
        })
      })

      socket.on('timeout', () => {
        cleanup()
        resolve({
          latencyMs: 3500,
          quality: 'timeout',
          reachable: false,
          error: '\u0442\u0430\u0439\u043C\u0430\u0443\u0442 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F',
        })
      })
    } catch (err) {
      cleanup()
      resolve({
        latencyMs: -1,
        quality: 'error',
        reachable: false,
        error: err.message || '\u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F',
      })
    }
  })
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

let cachedData = null
let lastProbeAt = 0

export function apply(ctx) {
  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'exact',
      path: '/api/link-pulse/status',
      handler: async (req, res) => {
        if (req.method !== 'GET') {
          return sendJson(res, 405, { error: 'GET only' })
        }

        try {
          const isForce = req.url && req.url.includes('refresh=1')
          const now = Date.now()
          if (!isForce && cachedData && now - lastProbeAt < 25_000) {
            return sendJson(res, 200, cachedData)
          }

          const { providers, providerMap, defaultModelConfig } = loadDynamicProviders()

          const probePromises = providers.map(async (p) => {
            const probeResult = await probeLatency(p.baseURL)
            return {
              ...p,
              probe: probeResult,
            }
          })

          const probedProviders = await Promise.all(probePromises)
          const probedMap = {}
          for (const item of probedProviders) {
            probedMap[item.id] = item
          }

          cachedData = {
            defaultModelConfig,
            providers: probedProviders,
            providerMap: probedMap,
            timestamp: Date.now(),
          }
          lastProbeAt = Date.now()

          sendJson(res, 200, cachedData)
        } catch (err) {
          sendJson(res, 500, { error: String(err && err.message ? err.message : err) })
        }
      },
    }),
  )
}
