import { build } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// One portable document: no asset folder, server, CDN or service worker needed.
const result = await build({
  define: { 'import.meta.env.VITE_SINGLE_FILE': JSON.stringify('true') },
  build: { write: false, sourcemap: false, modulePreload: false, assetsInlineLimit: Infinity },
});
const outputs = result.output;
const scripts = outputs.filter((file) => file.type === 'chunk');
if (scripts.length !== 1 || scripts[0].imports.length || scripts[0].dynamicImports.length) {
  throw new Error('The portable game must contain exactly one self-contained script.');
}
const page = outputs.find((file) => file.fileName === 'index.html');
const styles = outputs.filter((file) => file.fileName.endsWith('.css'));
if (!page || !styles.length) throw new Error('Missing game HTML or styles.');
const css = styles
  .map((file) => file.source)
  .join('\n')
  .replace(/<\/style/gi, '<\\/style');
const js = scripts[0].code.replace(/<\/script/gi, '<\\/script');
const html = String(page.source)
  .replace(/<script\b[^>]*src=[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<link\b[^>]*rel=["'](?:stylesheet|manifest|icon|apple-touch-icon)["'][^>]*>/gi, '')
  .replace(/^[\t ]+$/gm, '')
  .replace('</head>', `<style>${css}</style>\n</head>`)
  .replace('</body>', `<script>\n(()=>{\n${js}\n})();\n</script>\n</body>`);
const outputPath = resolve(process.argv[2] || 'artifacts/AetherStory.html');
await mkdir(resolve(outputPath, '..'), { recursive: true });
await writeFile(outputPath, html);
console.log(`Portable game: ${outputPath} (${Buffer.byteLength(html)} bytes)`);
