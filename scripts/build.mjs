import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import esbuild from 'esbuild';

const pluginsDir = path.resolve('plugins');
const distDir = path.resolve('dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const pluginDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

console.log(`📦 正在打包 ${pluginDirs.length} 個外掛至 dist/ ...`);

const marketplacePlugins = [];

for (const dir of pluginDirs) {
  const pluginPath = path.join(pluginsDir, dir);
  const manifestPath = path.join(pluginPath, 'manifest.json');
  const srcPath = path.join(pluginPath, 'src/index.js');
  const indexPath = path.join(pluginPath, 'index.js');
  const readmePath = path.join(pluginPath, 'README.md');

  if (!fs.existsSync(manifestPath)) {
    continue;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  let bundleCode = '';
  if (fs.existsSync(srcPath)) {
    console.log(`  🔨 編譯外掛 Bundle: ${dir}`);
    const buildResult = await esbuild.build({
      entryPoints: [srcPath],
      bundle: true,
      format: 'iife',
      globalName: '__rbr_plugin__',
      minify: false,
      write: false
    });
    bundleCode = buildResult.outputFiles[0].text;
    fs.writeFileSync(indexPath, bundleCode, 'utf8');
  } else if (fs.existsSync(indexPath)) {
    bundleCode = fs.readFileSync(indexPath, 'utf8');
  } else {
    continue;
  }

  // Create Zip
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('index.js', bundleCode);
  if (fs.existsSync(readmePath)) {
    zip.file('README.md', fs.readFileSync(readmePath, 'utf8'));
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const filename = `${manifest.id}-v${manifest.version}.rbr-plugin`;
  fs.writeFileSync(path.join(distDir, filename), zipBuffer);
  console.log(`  ✓ 已生成: dist/${filename}`);

  const rawBase = 'https://raw.githubusercontent.com/junyou1998/regex-batch-renamer-plugins/main';
  marketplacePlugins.push({
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    author: manifest.author,
    description: manifest.description,
    icon: manifest.icon || 'Puzzle',
    type: manifest.type || 'transformer',
    homepage: manifest.homepage,
    permissions: manifest.permissions || [],
    options: manifest.options || [],
    downloadUrl: `${rawBase}/dist/${filename}`,
    readmeUrl: `${rawBase}/plugins/${dir}/README.md`
  });
}

const indexJson = {
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
  plugins: marketplacePlugins
};

fs.writeFileSync(path.join(distDir, 'index.json'), JSON.stringify(indexJson, null, 2), 'utf8');
console.log('✅ 已生成官方市場索引: dist/index.json');
