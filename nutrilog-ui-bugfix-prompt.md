# NutriLog UI Bug-Fix Prompt

Paste this into a fresh Claude session along with the full NutriLog project files to fix all UI bugs identified below.

---

## Context

You are working on **NutriLog**, a WeChat Mini Program nutrition tracker. The project repo is at https://github.com/oviiy/NutriLog. The full source code is also embedded in `prompt.md` at the repo root. The app has three pages: `index` (home), `confirm` (review/edit parsed items), and `history` (30-day log). The frontend is native WeChat Mini Program (WXML/WXSS/JS).

Your task is to fix **every UI bug** listed below. For each fix, show the exact file path, the original code, and the corrected code. Do not refactor unrelated logic. Preserve the existing visual style (green accent `#2f9e6e`, off-white background `#f7f7f5`, card-based layout).

---

## Bug 1 — WXML missing root `<view>` containers on all three pages

**Files:** `miniprogram/pages/index/index.wxml`, `miniprogram/pages/confirm/confirm.wxml`, `miniprogram/pages/history/history.wxml`

**Problem:** The WXML templates in the repo's `prompt.md` are rendered as inline markdown on GitHub, so the actual `<view>`, `<text>`, `<image>`, and other WXML tags are **stripped out** in the rendered version. However, examining the raw structure reveals that the WXML relies on class names like `.summary`, `.actions`, `.action-btn`, `.card`, `.entry`, etc. — but the corresponding WXML tags may not be properly structured.

**What to verify and fix:**
- Every page must have a single root `<view class="container">` wrapping all content (matching the global `.container` style in `app.wxss`).
- The index page's summary section (`.summary`) must be a standalone `<view>` block **outside** the `.container` padding (it uses its own `padding: 40rpx 32rpx`), so it should either be above the container or the container padding should be zeroed for that section.
- Confirm that every `wx:for` loop has a `wx:key` attribute (the confirm page's item loop uses `wx:key="index"` — this works but ideally should use a stable key if items had IDs).

---

## Bug 2 — Summary section padding conflict with `.container`

**File:** `miniprogram/pages/index/index.wxml` and `miniprogram/pages/index/index.wxss`

**Problem:** The `.summary` block has its own `padding: 40rpx 32rpx` and uses a full-width green gradient background. But if it sits inside the global `.container` (which has `padding: 32rpx`), the summary card will be **inset by 32rpx on all sides** instead of being edge-to-edge. This breaks the intended full-bleed design.

**Fix:** Either:
- Place `.summary` **outside** the `.container` wrapper, or
- Override `.container` padding to `0` on the index page and apply padding individually to the sections below the summary.

---

## Bug 3 — Voice button touch events may fire `onVoiceEnd` twice

**File:** `miniprogram/pages/index/index.js`

**Problem:** The voice button binds both `bindtouchend` and `bindtouchcancel` to `onVoiceEnd`. If the user's finger slides off the button, WeChat fires `touchcancel`. But in some scenarios (e.g., quick taps), both `touchend` and `touchcancel` can fire, calling `speechManager.stop()` twice. The WechatSI plugin may throw or behave unexpectedly on a double-stop.

**Fix:** Add a guard in `onVoiceEnd`:
```javascript
onVoiceEnd() {
  if (this.data.recording && speechManager) {
    this.setData({ recording: false })  // set BEFORE calling stop
    speechManager.stop()
  }
}
```
Move `setData({ recording: false })` into `onVoiceEnd` **before** `speechManager.stop()` so the `onStop` callback doesn't race with a second `onVoiceEnd` call. Currently `recording: false` is only set inside `speechManager.onStop` and `speechManager.onError`, meaning the guard `this.data.recording` is still `true` when the second event fires.

---

## Bug 4 — `speechManager.onStop` and `onError` are re-assigned on every `onVoiceStart`

**File:** `miniprogram/pages/index/index.js`

**Problem:** The callbacks `speechManager.onStop = ...` and `speechManager.onError = ...` are set **inside** `onVoiceStart()`, meaning they're re-assigned every time the user presses the button. This works but is wasteful and fragile — if the plugin fires `onStop` from a previous session after re-assignment, the closure captures the wrong `this` context.

**Fix:** Move the `speechManager.onStop` and `speechManager.onError` assignments into the `onLoad` or `onReady` lifecycle method of the page, so they're set once. Alternatively, assign them in the module scope right after `speechManager` is created.

---

## Bug 5 — Text-input modal uses `editable` which is not a standard `wx.showModal` property

**File:** `miniprogram/pages/index/index.js`

**Problem:** The `onTextInput` method calls:
```javascript
wx.showModal({
  title: 'What did you eat?',
  editable: true,
  placeholderText: 'e.g. one bowl of beef noodles',
  ...
})
```
The `editable` and `placeholderText` properties for `wx.showModal` were added in **base library 2.17.1** (late 2021). Older WeChat clients will silently ignore these properties, showing a modal with no input field — the user sees OK/Cancel with no way to type. There's no version check or fallback.

**Fix:** Add a base library version check or set `"miniprogramRoot"` minimum base lib version in `project.config.json`. Alternatively, replace this with a dedicated text-input page or a custom modal component for broader compatibility.

---

## Bug 6 — Confirm page: `rawText` is empty when input is a photo

**File:** `miniprogram/pages/confirm/confirm.js`

**Problem:** In `onLoad`, the raw text display is set via:
```javascript
rawText: pending.transcript || ''
```
But when `inputType === 'photo'`, there is no `transcript` field — the pending object has `tempImagePath` instead. The "You said" section at the top of the confirm page shows an **empty string** for photo entries, which is confusing.

**Fix:** Conditionally display different content for photo vs. text/voice input:
- For photos: show a thumbnail of the image or the text "Photo input" instead of the raw transcript.
- Update `confirm.wxml` to conditionally render an `<image>` tag when `inputType === 'photo'`.

---

## Bug 7 — Confirm page: notes field is read-only (display only, no edit binding)

**File:** `miniprogram/pages/confirm/confirm.wxml`

**Problem:** The notes section renders as:
```xml
<text>{{notes}}</text>
```
This is a display-only `<text>` element. The user cannot edit the LLM-generated notes. Given that the LLM might produce assumptions like "assumed medium oil" in the notes, the user should be able to correct or clear them.

**Fix:** Replace the `<text>` with an `<input>` or `<textarea>` bound to the `notes` data field with a `bindinput` handler that updates `this.data.notes`.

---

## Bug 8 — History page: tapping a day does nothing (no drill-down)

**File:** `miniprogram/pages/history/history.wxml` and `miniprogram/pages/history/history.js`

**Problem:** Each day in the history list is a static `<view>`. There's no `bindtap` handler to navigate to a detail view or expand the day's entries. The user can see "3 entries" for a given day but can't drill down to see or edit them.

**Fix:** Add a `bindtap="onDayTap"` to each day row that navigates to the index page filtered by that date, or expands inline to show the entries. The simplest fix is to navigate with the date as a parameter:
```javascript
onDayTap(e) {
  const date = e.currentTarget.dataset.date
  // Navigate or expand — simplest is to show entries inline
}
```

---

## Bug 9 — No loading/error states on the home page entry list

**File:** `miniprogram/pages/index/index.wxml`

**Problem:** The home page shows entries via `wx:for` on `day.entries`, with an empty-state message if the list is empty. But there is no visual feedback while `wx.cloud.callFunction` is running (the `wx.showLoading` covers the LLM call, but after returning, if `refresh()` is slow or storage is large, the list may flash). More importantly, if the cloud function fails, the error modal is the only feedback — there's no inline error state on the page itself.

**Fix:** This is a minor polish issue. Consider adding a `loading` data flag and showing a skeleton or spinner in the entry list area while a parse is in progress.

---

## Bug 10 — Delete confirmation dialog lacks the entry description

**File:** `miniprogram/pages/index/index.js`

**Problem:** The delete handler shows:
```javascript
wx.showModal({ title: 'Delete this entry?' })
```
No `content` is provided, so the user sees "Delete this entry?" with no indication of *which* entry they're about to delete. If they have multiple entries for the day, this is ambiguous.

**Fix:** Pass entry details into the dialog:
```javascript
onDelete(e) {
  const id = e.currentTarget.dataset.id
  const entry = this.data.day.entries.find(en => en.id === id)
  const desc = entry ? entry.items.map(i => i.name).join(', ') : ''
  wx.showModal({
    title: 'Delete this entry?',
    content: desc || 'This action cannot be undone.',
    success: (res) => { ... }
  })
}
```

---

## Bug 11 — Confirm page total recalc uses `storage.totals()` which expects `protein_g`/`carbs_g`/`fat_g` but displays as `protein`/`carbs`/`fat`

**File:** `miniprogram/pages/confirm/confirm.js` + `miniprogram/pages/confirm/confirm.wxml`

**Problem:** The `storage.totals()` function returns `{ calories, protein, carbs, fat }` (short names). The confirm page template references `{{total.calories}}`, `{{total.protein}}`, etc. — this is consistent. However, individual item editing uses keys `protein_g`, `carbs_g`, `fat_g` (with `_g` suffix). The naming inconsistency between item-level (`protein_g`) and total-level (`protein`) keys is a source of potential confusion and future bugs when modifying the code.

**Fix:** This is a code-quality issue rather than a visible bug, but document the convention clearly in a comment at the top of `storage.js`, or unify the naming scheme.

---

## Bug 12 — CSS `.actions` flex layout breaks on narrow screens

**File:** `miniprogram/pages/index/index.wxss`

**Problem:** The two action buttons use:
```css
.actions { display: flex; gap: 20rpx; }
.action-btn { flex: 1; padding: 36rpx 24rpx; }
```
On very narrow screens (some older Android phones with WeChat have a viewport narrower than 320px effective), the two side-by-side buttons with their internal padding + gap may overflow or cause text truncation. The action subtitle text (e.g., "Photo → AI estimates portions") is `font-size: 22rpx` which may become unreadable on small screens.

**Fix:** Add `min-width: 0` to `.action-btn` to allow flex shrinking, and consider adding `overflow: hidden; text-overflow: ellipsis` to `.action-sub`. Alternatively, switch to a stacked (vertical) layout below a certain width using a media query or by checking screen width in JS.

---

## Bug 13 — Confirm page sticky footer may overlap content on short screens

**File:** `miniprogram/pages/confirm/confirm.wxss`

**Problem:** The footer uses `position: sticky; bottom: 0;`. On screens where the content is shorter than the viewport, this works fine. But if the content is long (many food items), the sticky footer overlaps the last item's macro-edit row because there's no `padding-bottom` on the scrollable area to create clearance.

**Fix:** Add `padding-bottom: 120rpx` (or the height of the footer) to the main container or the last card on the confirm page so content scrolls fully above the sticky footer.

---

## Bug 14 — No safe-area handling for iPhone X+ / notched devices

**Files:** `miniprogram/pages/index/index.wxss`, `miniprogram/pages/confirm/confirm.wxss`

**Problem:** The sticky footer on the confirm page and the overall page layout don't account for the home indicator bar on notched iPhones. The "Save to log" button may sit behind the home bar.

**Fix:** Add `padding-bottom: env(safe-area-inset-bottom)` to the `.footer` or the page container. WeChat Mini Programs support `env()` CSS functions for safe area insets.

---

## Summary of all files to modify

| File | Bugs |
|---|---|
| `miniprogram/pages/index/index.wxml` | #1, #2, #9 |
| `miniprogram/pages/index/index.wxss` | #2, #12 |
| `miniprogram/pages/index/index.js` | #3, #4, #5, #10 |
| `miniprogram/pages/confirm/confirm.wxml` | #1, #6, #7 |
| `miniprogram/pages/confirm/confirm.wxss` | #13, #14 |
| `miniprogram/pages/confirm/confirm.js` | #6 |
| `miniprogram/pages/history/history.wxml` | #1, #8 |
| `miniprogram/pages/history/history.js` | #8 |
| `miniprogram/utils/storage.js` | #11 (comment only) |

---

## Instructions

1. Clone the repo: `git clone https://github.com/oviiy/NutriLog.git`
2. For each bug above, apply the fix to the exact file listed.
3. Show each change as a before/after diff.
4. After all fixes, re-verify the checklist from the original `prompt.md` (all 21 files present, page declarations correct, cloud function name matches, no TODOs).
5. Do NOT change the cloud function, the storage layer logic, the LLM prompts, or the `app.json` page declarations.
6. Test guidance: after applying fixes, open in WeChat DevTools and verify: (a) summary section is full-bleed on index page, (b) voice hold-and-release doesn't crash on double-fire, (c) photo entries show a thumbnail on confirm page, (d) notes are editable on confirm page, (e) sticky footer doesn't obscure content, (f) notched devices show proper safe-area spacing.
