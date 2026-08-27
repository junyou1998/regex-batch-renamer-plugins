# 繁簡互轉 (OpenCC 離線版) 插件

基於 OpenCC 開源繁簡轉換演算法庫，完全無需網路連線即可高速進行繁簡中文與常用詞彙互轉。

---

## ✨ 核心特性

- **100% 離線純本機運算**：毫秒級極速反應（< 2ms），零網路依賴，完全保護隱私與離線可用性。
- **全方位 10 種轉換模式**：
  - 簡體 $\leftrightarrow$ 台灣正體（含常用詞彙在地化轉換，如「內存」$\rightarrow$「記憶體」）
  - 簡體 $\leftrightarrow$ 台灣正體（純字形字面轉換）
  - 簡體 $\leftrightarrow$ 香港繁體
  - 簡體 $\leftrightarrow$ 通用繁體
  - 繁體 $\leftrightarrow$ 日文新字體
- **自包含獨立封裝**：字典檔與演算法全數內嵌打包於外掛中，不增加主程式額外依賴。
- **副檔名安全防護**：自動略過副檔名字尾（如 `.mp4`, `.png`）。

---

## ⚙️ 可設定選項

| 選項名稱 | 類型 | 預設值 | 說明 |
| :--- | :--- | :--- | :--- |
| **轉換模式** (`converter`) | 選單 | `s2twp` | 支援 `s2twp`、`s2tw`、`s2hk`、`s2t`、`tw2sp`、`tw2s`、`hk2s`、`t2s`、`t2jp`、`jp2t` 10 種模式 |
| **保留副檔名** (`ignoreExtension`) | 開關 | `true` | 自動保護副檔名不被轉換 |

---

## 🤝 開源致謝與授權 (Credits & License)

- **底層開源專案**：
  - 核心演算法：[OpenCC (Open Chinese Convert)](https://github.com/BYVoid/OpenCC) by Carbo Kuo (BYVoid) 等社群貢獻者。
  - JavaScript 實作：[opencc-js](https://github.com/nk2028/opencc-js) by nk2028。
- **開源授權**：OpenCC 與 opencc-js 均遵循 [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) 授權釋出。
- **外掛封裝授權**：本外掛採用 MIT 授權。
