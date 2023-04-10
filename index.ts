import * as fs from 'fs';
import MagicString from 'magic-string';
import * as path from 'path';
import type { Plugin, ViteDevServer } from 'vite';
import Markdown from 'vite-plugin-vue-markdown';

export default function vuePreviewPlugin(): Plugin {

	const markdown = Markdown();
	const previewBlockReg = /\<(preview)[\s\S]*?\>([\s\S]*?)\<\/\1\>/g;
	const fileHash: Record<string, string> = {};

	let server: ViteDevServer;
	let currentProxyHotUpdateFile: string | undefined;

	return {
		name: 'vite-plugin-vue-component-preview',
		configureServer(_server) {
			server = _server;
			server.middlewares.use((req, res, next) => {
				if (req.url?.startsWith(server.config.base + '__preview/')) {
					req.url = server.config.base; // avoid 404
				}
				next();
			});
			server.ws.on('vue-component-preview:hash', (data: { file: string, text: string; }) => {
				data.file = path.join(server.config.root, data.file);
				if ((fileHash[data.file] ?? '') !== data.text) {
					fileHash[data.file] = data.text;
					server.watcher.emit('change', data.file);
				}
			});
		},
		resolveId(id) {
			if (id.startsWith('/__skip_vite/')) {
				// handle for nuxt
				id = path.join(server.config.root, id.substring('/__skip_vite/'.length));
			}
			const cleanId = id.replace(/\?.*$/, '');
			if (
				cleanId.endsWith('__preview.vue') &&
				!cleanId.startsWith(server.config.root)
			) {
				id = path.join(server.config.root, id);
			}
			return id;
		},
		load(id) {
			if (id.endsWith('__preview.vue')) {
				const fileName = id.substring(0, id.length - '__preview.vue'.length);
				if (fileHash[fileName]) {
					return parsePreviewCode(fileHash[fileName]);
				}
				if (fs.existsSync(fileName)) {
					return parsePreviewCode(fs.readFileSync(fileName, 'utf-8'));
				}
				else {
					console.warn(`[vite-plugin-vue-component-preview] ${fileName} not found`);
				}
			}
		},
		transform(code, id) {
			let str = new MagicString(code);
			if (id.endsWith('.vue')) {
				// remove preview block
				if (fileHash[id] && fileHash[id] !== str.toString()) {
					str = str.overwrite(0, str.length(), fileHash[id].replace(previewBlockReg, ''));
				}
				else {
					str = str.replaceAll(previewBlockReg, '');
				}
			}
			return {
				code: str.toString(),
				map: str.generateMap(),
			};
		},
		handleHotUpdate(ctx) {
			if (currentProxyHotUpdateFile === undefined && ctx.file.endsWith('.vue')) {
				setTimeout(() => {
					currentProxyHotUpdateFile = ctx.file;
					ctx.server.watcher.emit('change', ctx.file);
				}, 100);
			}
			else if (currentProxyHotUpdateFile === ctx.file) {
				currentProxyHotUpdateFile = undefined;
				const originalFile = ctx.file;
				ctx.file = ctx.file + '__preview.vue';
				ctx.modules = [...ctx.server.moduleGraph.getModulesByFile(ctx.file) ?? []];
				const read = ctx.read;
				ctx.read = async () => parsePreviewCode(fileHash[originalFile] || await read());
			}
		},
	};

	async function parsePreviewCode(code: string) {
		// extract preview block content
		code = code.replace(/<!--[\s\S]*?-->/g, '');
		const previewBlock = code.match(previewBlockReg);
		if (previewBlock) {
			const startTagEnd = previewBlock[0].indexOf('>') + 1;
			const endTagStart = previewBlock[0].lastIndexOf('</');
			code = previewBlock[0].substring(startTagEnd, endTagStart);

			const parsed = await (markdown.transform as Function)?.call({} as any, code, '/foo.md');
			if (typeof parsed === 'object' && parsed?.code) {
				code = parsed.code;
			}
			else if (typeof parsed === 'string') {
				code = parsed;
			}
			else {
				code = '<template><slot /></template>';
			}
		}
		else {
			code = '<template><slot /></template>';
		}
		return code;
	}
};
