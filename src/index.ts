import type { PluginOption, ViteDevServer } from 'vite';
import Markdown from 'vite-plugin-vue-markdown';
import * as fs from 'fs';
import * as path from 'path';

export default function Preview(): PluginOption {

	const markdown = Markdown();
	const previewBlockReg = /\<(preview)[\s\S]*?\>([\s\S]*?)\<\/\1\>/g;
	const virtualModuleId = 'virtual:vue-component-preview';
	const resolvedVirtualModuleId = '\0' + virtualModuleId;
	const fileHashs: Record<string, string> = {};

	let server: ViteDevServer;
	let proxyingHotUpdateFile: string | undefined;

	return {
		name: 'vite-plugin-vue-component-preview',
		configureServer(_server) {
			server = _server;
			server.middlewares.use((req, res, next) => {
				if (req.url?.startsWith('/__preview/')) {
					req.url = '/'; // avoid 404
				}
				next();
			});
			server.ws.on('vue-component-preview:hash', (data: { file: string, text: string; }) => {
				data.file = path.join(server.config.root, data.file);
				if ((fileHashs[data.file] ?? '') !== data.text) {
					fileHashs[data.file] = data.text;
					server.watcher.emit('change', data.file);
				}
			});
		},
		resolveId(id) {
			if (id === virtualModuleId) {
				return resolvedVirtualModuleId;
			}
			const cleanId = id.replace(/\?.*$/, '');
			if (
				cleanId.endsWith('__preview.vue') &&
				!cleanId.startsWith(server.config.root)
			) {
				return path.join(server.config.root, id);
			}
		},
		load(id) {
			if (id === resolvedVirtualModuleId) {
				return `
import { defineAsyncComponent, h, Suspense, ref, computed } from 'vue';

export default function (app) {
	if (location.pathname.startsWith('/__preview/')) {
		app._component.setup = () => {
			const pathname = ref(location.pathname);
			const importPath = computed(() => pathname.value.substring('/__preview'.length));
			const Component = computed(() => {
				const _fileName = importPath.value;
				return defineAsyncComponent(() => import(/* @vite-ignore */_fileName));
			});
			const Layout = computed(() => {
				const _fileName = importPath.value;
				return defineAsyncComponent(() => import(/* @vite-ignore */_fileName + '__preview.vue'));
			});
			if (import.meta.hot) {
				import.meta.hot.send('vue-component-preview:hash', {
					file: importPath.value,
					text: location.hash ? atob(location.hash.substring(1)) : '',
				});
				window.addEventListener('hashchange', () => {
					import.meta.hot.send('vue-component-preview:hash', {
						file: importPath.value,
						text: location.hash ? atob(location.hash.substring(1)) : '',
					});
				});
			}
			return () => h(Suspense, undefined, [
				h(Layout.value, undefined, {
					default: (props) => h(Component.value, props)
				})
			]);
		};
	}
}`;
			}
			if (id.endsWith('__preview.vue')) {
				const fileName = id.substring(0, id.length - '__preview.vue'.length);
				const code = fileHashs[fileName] || fs.readFileSync(fileName, 'utf-8');
				return parsePreviewCode(code);
			}
		},
		transform(code, id) {
			if (fileHashs[id]) {
				code = fileHashs[id];
			}
			if (id.endsWith('.vue')) {
				// remove preview block
				code = code.replace(previewBlockReg, '');
			}
			return code;
		},
		handleHotUpdate(ctx) {
			if (proxyingHotUpdateFile === undefined && ctx.file.endsWith('.vue')) {
				setTimeout(() => {
					proxyingHotUpdateFile = ctx.file;
					ctx.server.watcher.emit('change', ctx.file);
					proxyingHotUpdateFile = undefined;
				}, 100);
			}
			else if (proxyingHotUpdateFile === ctx.file) {
				const originalFile = ctx.file;
				ctx.file = ctx.file + '__preview.vue';
				ctx.modules = [...ctx.server.moduleGraph.getModulesByFile(ctx.file) ?? []];
				const read = ctx.read;
				ctx.read = async () => parsePreviewCode(fileHashs[originalFile] || await read());
			}
		},
	};

	function parsePreviewCode(code: string) {
		// extract preview block content
		code = removeHtmlComments(code);
		const previewBlock = code.match(previewBlockReg);
		if (previewBlock) {
			const startTagEnd = previewBlock[0].indexOf('>') + 1;
			const endTagStart = previewBlock[0].lastIndexOf('</');
			code = previewBlock[0].substring(startTagEnd, endTagStart);
			// @ts-expect-error
			code = markdown.transform(code, '/foo.md');
		}
		else {
			code = '<template><slot /></template>';
		}
		return code;
	}
}

function removeHtmlComments(htmlCode: string) {
	const htmlCommentRege = /<!--[\s\S]*?-->/g;
	return htmlCode.replace(htmlCommentRege, '');
}
