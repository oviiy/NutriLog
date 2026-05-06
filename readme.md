# NutriLog — minimal voice + photo nutrition tracker

A lean WeChat Mini Program v1. Two big buttons on the home page (snap or speak), an LLM
parses the input into structured nutrition JSON, you confirm/edit, it logs locally.

## Architecture

Mini Program → CloudBase cloud function → DeepSeek (text) or Qwen-VL (vision) → JSON → confirm screen → wx.storage.

Voice transcription runs on-device via the WechatSI plugin (free, official Tencent), so we don't pay for ASR.

## Setup (first time, ~30 minutes)

1. Register a Mini Program account at https://mp.weixin.qq.com (need Chinese phone + ID, or a business license). Save the AppID.
2. Install WeChat Developer Tools from https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
3. Open this folder in DevTools. Paste your AppID into project.config.json.
4. In DevTools, click "Cloud Development" → create environment. Note the env ID. Paste it into miniprogram/app.js (replace 'your-cloud-env-id').
5. Add the WechatSI plugin: mp.weixin.qq.com → Settings → Third-party services → Plugins → search 同声传译 (provider AppID wx069ba97219f66d99) → apply.
6. Get API keys:
   - DeepSeek (text/voice): https://platform.deepseek.com — ¥10 covers thousands of meals.
   - Aliyun DashScope (vision, optional): https://dashscope.console.aliyun.com — free tier covers v1.
7. Deploy cloud function: right-click cloudfunctions/parseFood → Upload and deploy: cloud install dependencies. Then in Cloud Console add env vars DEEPSEEK_API_KEY and DASHSCOPE_API_KEY.
8. Click Compile in DevTools. Try the text fallback first to verify the LLM round-trip. Voice testing requires a real device (scan the Preview QR).

## Cost

Mini Program registration ¥0–300/yr, CloudBase free tier covers ~50k function calls/month, DeepSeek ~¥0.0001/meal, Qwen-VL ~¥0.008/photo, WechatSI free. Roughly ¥0.15/month per active user.
