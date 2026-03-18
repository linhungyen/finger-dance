<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Finger Dance Hero

這是一個基於 React + Vite + TailwindCSS 構建的神經連結體感專案。

## 執行與開發 (Run Locally)

**環境要求:** Node.js

1. 安裝套件：
   ```bash
   npm install
   ```
2. 啟動開發伺服器：
   ```bash
   npm run dev
   ```

## 專案設定說明

1. **package.json & 套件安裝**：
   已配置 `vite`, `react`, `tailwindcss`, `@tailwindcss/vite` 等依賴，確保 `npm install` 後可順利啟動。
2. **GitHub Action 部署**：
   包含於 `.github/workflows/deploy.yml`，可以在 push 到 `main` 分支時，自動利用 GitHub Pages 進行部署。
3. **.gitignore**：
   已建立標準的 `.gitignore` 檔案，確保如 `node_modules`、環境變數 (`.env`) 以及 Mac 的 `.DS_Store` 皆不會被推給遠端數據庫。
4. **README**：
   更新記錄相關操作流程！
