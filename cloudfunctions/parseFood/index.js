// cloudfunctions/parseFood/index.js
const cloud = require('wx-server-sdk')
const https = require('https')
const { URL } = require('url')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEEPSEEK_CONFIG = {
  endpoint: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat',
  key: (process.env.DEEPSEEK_API_KEY || '').trim()
}

const ALIYUN_CONFIG = {
  // Using the US-specific endpoint for DashScope (us-east-1 region)
  endpoint: 'https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions',
  model: 'qwen3.6-flash', // The cheapest and fastest latest-gen vision model
  key: (process.env.DASHSCOPE_API_KEY || '').trim()
}

const SYSTEM_PROMPT = `Expert Nutritionist. ALWAYS return JSON. Identify everything edible. If blurry, make a best guess.
Shape: {"items":[{"name":"","portion":"1 unit","calories":100,"protein_g":5,"carbs_g":10,"fat_g":5}],"notes":""}`

exports.main = async (event) => {
  try {
    if (event.mode === 'photo') {
      let b64 = ''
      let mimeType = 'image/jpeg'

      // Prioritize fileID for large phone photos
      if (event.fileID) {
        console.log('Downloading from cloud storage:', event.fileID)
        const dl = await cloud.downloadFile({ fileID: event.fileID })
        const buffer = dl.fileContent
        b64 = buffer.toString('base64')
        if (buffer[0] === 0x89 && buffer[1] === 0x50) mimeType = 'image/png'
      } else if (event.directBase64) {
        // Fallback for smaller simulator images
        b64 = event.directBase64
        if (b64.startsWith('iVBORw0KGgo')) mimeType = 'image/png'
        else if (b64.startsWith('/9j/')) mimeType = 'image/jpeg'
      } else {
        return { error: 'No image data received' }
      }

      if (!ALIYUN_CONFIG.key) return { error: 'AI key missing' }
      
      const messages = [
        { role: 'user', content: [
          { type: 'text', text: SYSTEM_PROMPT + " Identify food in this photo." },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${b64}`, detail: 'low' } }
        ]}
      ]
      
      return await callLLM(ALIYUN_CONFIG, messages, '[ALI]')
    }

    if (event.mode === 'text' && event.transcript) {
      if (!DEEPSEEK_CONFIG.key) return { error: 'DEEPSEEK_API_KEY not set.' }
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Identify all food described: "${event.transcript}". Return JSON only.` }
      ]
      console.log('Calling DeepSeek Text...')
      return await callLLM(DEEPSEEK_CONFIG, messages, '[DS-TEXT]')
    }

    return { error: 'Invalid input' }
  } catch (err) {
    return { error: err.message || String(err) }
  }
}

function callLLM(provider, messages, label) {
  const body = JSON.stringify({
    model: provider.model,
    messages,
    temperature: 0.1,
    // json_object is supported by both deepseek and qwen-vl-max compatible endpoints
    response_format: { type: 'json_object' }
  })

  const u = new URL(provider.endpoint)
  const opts = {
    hostname: u.hostname,
    port: 443,
    path: u.pathname + u.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.key}`,
      'Content-Length': Buffer.byteLength(body)
    },
    timeout: 60000 
  }

  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf8')
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`${label} ${res.statusCode}: ${txt.slice(0, 300)}`))
        }
        try {
          const data = JSON.parse(txt)
          resolve(JSON.parse(data.choices[0].message.content))
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}
