# NutriLog — minimal voice + photo nutrition tracker

A lean WeChat Mini Program v1. Two big buttons on the home page (snap or speak), an LLM
parses the input into structured nutrition JSON, you confirm/edit, it logs locally.

## Architecture

```
[Mini Program]                     [Tencent CloudBase]                [DeepSeek]
  index page  ──photo upload──►  cloud storage
              ──cloud.callFunction("parseFood")──►  parseFood function ──HTTPS──► chat completions
                                                    ◄── JSON ──
  confirm page  ◄── parsed items ──
  saves to wx.storage (local)
```

Voice transcription runs on-device via the **WechatSI** plugin (free, official Tencent),
so we don't pay for ASR. Photo recognition uses DeepSeek's vision model (~¥0.001/photo).

## File layout

```
project.config.json                # DevTools project config (root)
miniprogram/
├── app.{js,json,wxss}             # entry, plugin + cloud init, global styles
├── pages/
│   ├── index/                     # main: today summary + 2 big buttons + entries
│   ├── confirm/                   # review/edit LLM output before saving
│   └── history/                   # last 30 days
└── utils/storage.js               # local-storage CRUD + daily totals

cloudfunctions/
└── parseFood/                     # text or photo → LLM → JSON
    ├── index.js
    └── package.json
```

## Setup (first time, ~30 minutes)

### 1. Register the Mini Program account
Go to https://mp.weixin.qq.com → register → "小程序". You'll need:
- A mainland-Chinese phone number and a Chinese-citizen ID OR a company business license.
- Save the **AppID** that gets issued.

### 2. Install WeChat Developer Tools
Download from https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

### 3. Open this project
- File → Open project
- Project root: this folder
- AppID: paste yours into `miniprogram/project.config.json` (replace `REPLACE_WITH_YOUR_APPID`)

### 4. Enable CloudBase (云开发)
- In DevTools, click the **Cloud Development (云开发)** button in the toolbar.
- Create a new environment. Note its **Env ID**.
- Open `miniprogram/app.js` and replace `'your-cloud-env-id'` with that ID.

### 5. Add the WechatSI speech plugin
- Go to https://mp.weixin.qq.com → Settings → 第三方设置 (Third-party services) → Plugins → Add
- Search for **同声传译** (provider AppID `wx069ba97219f66d99`), apply, wait a moment for approval.
- It's already declared in `app.json`.

### 6. Get API keys
- **DeepSeek** (text/voice): https://platform.deepseek.com → register → create API key. ¥10 credit covers thousands of meals.
- **Aliyun DashScope** (vision, optional for photo mode): https://dashscope.console.aliyun.com → create API key. Free tier covers v1 testing.
- Skip the DashScope step if you only want voice/text working for now — the photo button will return an error message but voice will work fine.

### 7. Deploy the cloud function
- In DevTools, right-click `cloudfunctions/parseFood` → **Upload and deploy: cloud install dependencies**.
- Open Cloud Console → Functions → `parseFood` → Config → add env vars:
  ```
  DEEPSEEK_API_KEY=sk-your-deepseek-key
  DASHSCOPE_API_KEY=sk-your-dashscope-key   # optional, only needed for photo mode
  ```
- Save and redeploy.

### 8. Run it
- Click the **Compile** button in DevTools — the simulator boots.
- Try the text fallback first ("type it instead") to verify the LLM call works end-to-end.
- Then test voice on a real device (simulator doesn't record): scan the **Preview** QR code with WeChat.

## Cost back-of-envelope

| Item                          | Cost                                     |
|-------------------------------|------------------------------------------|
| Mini Program registration     | ¥0 (individual) or ¥300/yr (company)     |
| CloudBase free tier           | covers ~50k function calls/month         |
| DeepSeek text input           | ~¥0.0001 per meal                        |
| Qwen-VL vision input          | ~¥0.008 per photo                        |
| WechatSI speech recognition   | free                                     |

A user logging 5 meals/day costs you roughly **¥0.15/month** in API fees.

## Where to extend next (post-v1)

- Multi-day charts (Recharts/F2 in Mini Program)
- Daily calorie/macro goals + progress ring
- Cloud-synced storage (CloudBase database) so users keep history across devices
- Family/group sharing (the killer differentiator we discussed)
- Restaurant menu OCR mode
- Niche-vertical paywall (pregnancy, diabetic, gout) — ¥18–68 unlock

## Things to fix before public launch

- Localize strings (currently English) into Simplified Chinese for the China market.
- Add user authentication via `wx.login` if you move to cloud-synced storage.
- Pre-launch privacy declaration: list what data leaves the device (photos, voice transcripts) — required by Tencent review.
- Domain whitelist: if you ever stop using CloudBase and move to your own backend, add the domain in mp.weixin.qq.com → Development → Server domain.
- Test on a few low-end Android phones — that's where most Chinese users are.
