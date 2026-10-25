# 寶可夢卡牌學習站（直播組用）

純靜態網站（HTML/CSS/JS），繁體中文介面。部署目錄：`site/`（Vercel / Netlify 直接指定 `site` 為 output/publish directory，無需 build 指令；或先跑 `npm run build`）。

## 頁面
- `index.html` 卡盒系列總覽（en / ja / zh-tw / zh-cn 四個語言版本，依時期分組，可依名稱、時期、語言篩選）
- `set.html?k=<lang>:<id>` 卡盒詳細頁（四語名稱、發售日、對應版本、系列介紹、Top 10 大獎卡＋約略價格）
- `rarity.html` 稀有度教學（C/U/R/RR/RRR/AR/SR/SAR/UR/HR/MUR/ACE SPEC… 與美版對照）
- `grading.html` 鑑定機構（PSA / BGS / CGC / SGC / TAG / ACE）
- `exam.html` 考試（隨機 20 題、80 分及格、未通過需重考、錯題解說、localStorage 記錄姓名與通過狀態）

## 指令
```bash
npm run fetch-data     # 重新抓 TCGdex 卡盒與卡片資料到 data/raw/
python3 scripts/fetch-bulba.py && python3 scripts/parse-bulba-jp.py && python3 scripts/parse-bulba-zhtw.py && python3 scripts/fetch-bulba-zhcn.py  # Bulbapedia 補充資料
npm run build          # 產生 site/data/*.js
npm run update-prices  # 更新 data/prices.json 後重新 build（建議每 10 天跑一次）
npm run serve          # http://localhost:4000
```

## 資料範圍（v1）
- 所有卡盒列出（含圖片：TCGdex logo → symbol → 佔位圖）。
- 2018–2026 年的卡盒：系列介紹（自動整理＋部分手寫）＋ Top 10 大獎卡＋價格。
- 2018 年以前：基本資料，介紹與大獎卡標示「待補充」。
- 只收四種語言：美版（en）、日版（ja）、繁中（zh-tw）、簡中（zh-cn）。TCG Pocket（數位版）不列入。

## 大獎卡排序方式（每彈最多 10 張）
- `curated`：人工整理（content/curated.json）。
- `auto`：依 TCGdex 官方稀有度由高到低，同稀有度以人氣寶可夢優先。
- `snkrdunk`：TCGdex 無稀有度時，依 SNKRDUNK 最低在售價排序。
- `auto-bulbapedia`：簡中版依 Bulbapedia 卡表稀有度排序。
- `twin`：繁中版沿用對應日版卡表。
- `heuristic`：只能依卡名推估，頁面標示「待確認」，不列入考題。

## 價格（data/prices.json）
欄位：price, currency, condition, source, url, fetched, stale。
- 日版：SNKRDUNK 公開搜尋端點（最低在售價，US$）。
- 美版：先試 PriceCharting 公開頁面；若被拒（403/機器人驗證）則改用 TCGdex 提供的 TCGplayer market price，來源如實標示。
- 繁中／簡中：目前沒有設定公開價格來源，不顯示價格。
- 抓取失敗會保留舊價格並標記 stale，絕不自行估價。每次執行的摘要寫在 data/prices-last-run.json。
