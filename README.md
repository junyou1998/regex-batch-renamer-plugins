# 🧩 Regex Batch Renamer — Official Plugin Marketplace

這是 [Regex Batch Renamer (正規表達式批次更名工具)](https://github.com/junyou1998/regex-batch-renamer) 的官方外掛市場儲存庫。

## 📦 收錄外掛列表

| 插件名稱 | ID | 類型 | 權限 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| **繁簡互轉 (繁化姬)** | `fanhuaji-converter` | Transformer | 🌐 網路請求 | 透過繁化姬 API 進行高品質台灣正體、香港繁體與簡體轉換 |
| **繁簡互轉 (OpenCC 離線版)** | `opencc-offline-converter` | Transformer | ⚡️ 純本機離線 | 基於 OpenCC 離線演算法庫，零網路依賴進行繁簡字詞轉換 |

---

## 🛠 本地開發與構建

```bash
# 安裝構建依賴
pnpm install

# 校驗所有外掛格式
pnpm run validate

# 打包外掛與生成市場索引 (dist/index.json)
pnpm run build
```

---

## 🤝 提交新外掛 (Contribution Guide)

歡迎開發者向本儲存庫提交自訂插件！

1. Fork 本儲存庫。
2. 在 `plugins/` 下建立以您的插件 ID 命名的資料夾，例如 `plugins/my-custom-plugin/`。
3. 放入 `manifest.json`、`index.js` 與 `README.md`。
4. 執行 `pnpm run validate` 與 `pnpm run build` 確認構建無誤。
5. 提交 Pull Request，審核通過後將自動發布至官方市場！
