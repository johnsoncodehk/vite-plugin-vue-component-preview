import type { PluginOption, ViteDevServer } from 'vite';
import Markdown from 'vite-plugin-vue-markdown';
import * as fs from 'fs';
import * as path from 'path';

export default function Preview(): PluginOption {
	const markdown = Markdown();
	const previewBlockReg = /\<(preview)[\s\S]*?\>([\s\S]*?)\<\/\1\>/g;
	const virtualModuleId = 'virtual:vue-component-preview';
	const resolvedVirtualModuleId = '\0' + virtualModuleId;

	let server: ViteDevServer;
	let proxyingHotUpdateFile: string | undefined;

	return {
		name: 'vite-plugin-vue-component-preview',
		configureServer(_server) {
			server = _server;
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
import { defineAsyncComponent, defineComponent, h, Suspense, ref, computed } from 'vue';

export default function(app) {
	if (location.pathname === '/__preview') {
		const Previewer = defineComponent({
			setup() {
				window.addEventListener('hashchange', () => {
					url.value = new URL(location.href);
				});
				const url = ref(new URL(location.href));
				const fileName = computed(() => {
					let fileName = url.value.hash.slice(1);
					// fix windows path for vite
					fileName = fileName.replace(/\\\\\\\\/g, '/');
					if (fileName.indexOf(':') >= 0) {
						fileName = fileName.split(':')[1];
					}
					return fileName;
				});
				const Component = computed(() => {
					const _fileName = fileName.value;
					return defineAsyncComponent(() => import(/* @vite-ignore */_fileName));
				});
				const Layout = computed(() => {
					const _fileName = fileName.value;
					return defineAsyncComponent(() => import(/* @vite-ignore */_fileName + '__preview.vue'));
				});
				return () => h(Suspense, undefined, [
					h(Layout.value, undefined, {
						default: (props) => h(Component.value, props)
					})
				]);
			},
		});
		app._component.setup = Previewer.setup;
	}
}`;
			}
			if (id.endsWith('__preview.vue')) {
				const fileName = id.substring(0, id.length - '__preview.vue'.length);
				const code = fs.readFileSync(fileName, 'utf-8');
				return parsePreviewCode(code);
			}
		},
		transform(code, id) {
			if (id.endsWith('.vue')) {
				// remove preview block
				code = code.replace(previewBlockReg, '');
			}
			return code;
		},
		handleHotUpdate(ctx) {
			if (proxyingHotUpdateFile === undefined && ctx.file.endsWith('.vue')) {
				proxyingHotUpdateFile = ctx.file;
				ctx.server.watcher.emit('change', ctx.file);
				proxyingHotUpdateFile = undefined;
			}
			else if (proxyingHotUpdateFile === ctx.file) {
				ctx.file = ctx.file + '__preview.vue';
				ctx.modules = [...ctx.server.moduleGraph.getModulesByFile(ctx.file) ?? []];
				const read = ctx.read;
				ctx.read = async () => parsePreviewCode(await read());
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
			code = markdown.transform(code, 'foo.md');
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
