import fs from 'node:fs';
import path from 'node:path';

const pluginsDir = path.resolve('plugins');
const pluginDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

console.log(`🔍 正在校驗 ${pluginDirs.length} 個外掛...`);

let hasError = false;

for (const dir of pluginDirs) {
  const pluginPath = path.join(pluginsDir, dir);
  const manifestPath = path.join(pluginPath, 'manifest.json');
  const indexPath = path.join(pluginPath, 'index.js');

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ [${dir}] 遺失 manifest.json`);
    hasError = true;
    continue;
  }

  if (!fs.existsSync(indexPath)) {
    console.error(`❌ [${dir}] 遺失 index.js`);
    hasError = true;
    continue;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!manifest.id || !manifest.name || !manifest.version) {
      console.error(`❌ [${dir}] manifest.json 缺少必要欄位 (id, name, version)`);
      hasError = true;
    }
    if (manifest.id !== dir) {
      console.warn(`⚠️ [${dir}] 資料夾名稱與 manifest.id (${manifest.id}) 不一致`);
    }
    console.log(`✅ [${dir}] v${manifest.version} 校驗通過`);
  } catch (err) {
    console.error(`❌ [${dir}] manifest.json JSON 解析錯誤:`, err.message);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log('🎉 所有外掛校驗成功！');
}
