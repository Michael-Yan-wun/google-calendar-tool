# 智慧行事曆助理 (Smart Calendar Assistant)

這是一個整合 Google Calendar 與 Gemini AI 的智慧行事曆工具。使用者可以透過自然的對話方式來查詢、新增、修改或刪除行程，系統會自動偵測衝突並給予建議。

## 功能特色

- **行事曆檢視**：使用 FullCalendar 呈現週視圖，清楚掌握每週行程。
- **AI 智慧對話**：透過 Google Gemini 理解您的自然語言指令。
- **衝突偵測**：新增行程時若有衝突，AI 會自動提醒並建議。
- **安全機制**：修改或刪除行程前，會跳出確認視窗，避免誤操作。
- **繁體中文介面**：全站採用繁體中文設計，親切易用。

## 前置準備

在開始之前，您需要：

1.  一個 Google 帳號。
2.  已安裝 Node.js (建議 v18 以上)。
3.  一個 Google Cloud Platform (GCP) 專案。

## Google Cloud 設定教學

要讓此專案能夠存取您的 Google Calendar，您需要設定 Google Cloud 專案並取得 OAuth 憑證。

### 1. 建立專案與啟用 API

1.  前往 [Google Cloud Console](https://console.cloud.google.com/)。
2.  建立一個新專案 (例如命名為 `smart-calendar-assistant`)。
3.  在左側選單選擇 **「API 和服務」** > **「已啟用的 API 和服務」**。
4.  點擊上方的 **「+ 啟用 API 和服務」**。
5.  搜尋 **"Google Calendar API"** 並啟用它。

### 2. 設定 OAuth 同意畫面 (Google Auth Platform)

1.  在左側選單選擇 **「API 和服務」** > **「OAuth 同意畫面」**。
2.  **設定品牌 (Branding)**：
    - 在左側選單點擊 **「品牌」**。
    - 填寫 **應用程式名稱** (例如：Smart Calendar Assistant)。
    - 填寫 **使用者支援電子郵件**。
    - 儲存變更。
3.  **設定資料存取權 (Data Access)**：
    - 在左側選單點擊 **「資料存取權」**。
    - 點擊 **「新增或移除範圍」**。
    - 搜尋並勾選 `.../auth/calendar` (查看、編輯、分享及永久刪除您 Google 日曆中的所有日曆)。
    - 點擊 **「更新」** 並儲存。
4.  **設定目標對象 (Audience)**：
    - 在左側選單點擊 **「目標對象」**。
    - 往下捲動找到 **「測試使用者」(Test users)** 區塊。
    - 點擊 **「+ ADD USERS」**。
    - 輸入您要用來測試的 Google 帳號 Email (非常重要，否則無法登入)。
    - 點擊 **「儲存」**。

### 3. 建立 OAuth 憑證

1.  在左側選單選擇 **「API 和服務」** > **「憑證」**。
2.  點擊上方的 **「+ 建立憑證」** > **「OAuth 用戶端 ID」**。
3.  **應用程式類型** 選擇 **「網頁應用程式」**。
4.  **名稱** 可以維持預設或自訂。
5.  **已授權的 JavaScript 來源**：
    - 新增 `http://localhost:3000`
6.  **已授權的重新導向 URI**：
    - 新增 `http://localhost:3000/auth/google/callback`
7.  點擊 **「建立」**。
8.  畫面會顯示您的 **用戶端 ID (Client ID)** 和 **用戶端密碼 (Client Secret)**，請將它們複製下來備用。

## 安裝與設定

### 1. 取得 Gemini API Key

1.  前往 [Google AI Studio](https://aistudio.google.com/)。
2.  點擊 **"Get API key"**。
3.  建立一個新的 API key。

### 2. 設定環境變數

在專案根目錄建立一個 `.env` 檔案，並填入以下資訊：

```bash
GOOGLE_CLIENT_ID=您的_google_client_id      # 從 GCP 取得
GOOGLE_CLIENT_SECRET=您的_google_client_secret  # 從 GCP 取得
GEMINI_API_KEY=您的_gemini_api_key        # 從 Google AI Studio 取得
REDIRECT_URI=http://localhost:3000/auth/google/callback
PORT=3000
```

### 3. 安裝依賴套件

請在終端機執行以下指令：

```bash
npm install
```

### 4. 啟動應用程式

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
