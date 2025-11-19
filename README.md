# 智慧行事曆助理 (Smart Calendar Assistant)

這是一個整合 Google Calendar 與 Gemini AI 的智慧行事曆工具。使用者可以透過自然的對話方式來查詢、新增、修改或刪除行程，系統會自動偵測衝突並給予建議。

## 功能特色

- **行事曆檢視**：使用 FullCalendar 呈現週視圖，清楚掌握每週行程。
- **AI 智慧對話**：透過 Google Gemini 理解您的自然語言指令。
- **衝突偵測**：新增行程時若有衝突，AI 會自動提醒並建議。
- **安全機制**：修改或刪除行程前，會跳出確認視窗，避免誤操作。
- **繁體中文介面**：全站採用繁體中文設計，親切易用。

## 安裝與設定

### 1. 準備 API 金鑰

您需要在專案根目錄建立一個 `.env` 檔案，並填入以下資訊：

```bash
GOOGLE_CLIENT_ID=您的_google_client_id
GOOGLE_CLIENT_SECRET=您的_google_client_secret
GEMINI_API_KEY=您的_gemini_api_key
REDIRECT_URI=http://localhost:3000/auth/google/callback
PORT=3000
```

### 2. 安裝依賴套件

請在終端機執行以下指令：

```bash
npm install
```

### 3. 啟動應用程式

```bash
npm start
```

啟動後，請打開瀏覽器前往 [http://localhost:3000](http://localhost:3000)。

## 使用說明

1.  點擊右上角的 **「連結 Google 日曆」** 按鈕進行登入。
2.  登入成功後，您將看到目前的行事曆行程。
3.  在右下角的對話框輸入您的需求，例如：
    - 「明天下午兩點幫我安排跟客戶開會」
    - 「刪除星期五早上的讀書會」
    - 「下週我有什麼行程？」

## 專案結構

- `server.js`: 後端伺服器入口，處理 API 路由與 OAuth 驗證。
- `services/`:
    - `calendarService.js`: 處理 Google Calendar API 的 CRUD 操作。
    - `geminiService.js`: 整合 Gemini AI，解析使用者意圖。
- `public/`:
    - `index.html`: 前端主頁面。
    - `app.js`: 前端邏輯控制。
    - `style.css`: 樣式表。

## 技術堆疊

- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, Vanilla JS, FullCalendar
- **AI**: Google Gemini Pro
- **API**: Google Calendar API

## 授權

MIT License
