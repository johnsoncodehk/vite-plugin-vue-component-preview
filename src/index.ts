import type { PluginOption } from 'vite';
import Markdown from 'vite-plugin-vue-markdown';
import * as fs from 'fs';

export default function Preview(): PluginOption {

	const markdown = Markdown();
	const previewBlockReg = /\<(preview)[\s\S]*?\>([\s\S]*?)\<\/\1\>/g;
	const virtualModuleId = 'virtual:vue-component-preview';
	const resolvedVirtualModuleId = '\0' + virtualModuleId;

	return {
		name: 'vite-plugin-vue-component-preview',
		resolveId(id) {
			if (id === virtualModuleId) {
				return resolvedVirtualModuleId;
			}
		},
		load(id) {
			if (id === resolvedVirtualModuleId) {
				return `
import { defineAsyncComponent, defineComponent, h, Suspense } from 'vue';

export default function(app) {
	if (location.pathname === '/__preview') {

		const url = new URL(location.href);
		let fileName = url.hash.slice(1);

		// fix windows path for vite
		fileName = fileName.replace(/\\\\\\\\/g, '/');
		if (fileName.indexOf(':') >= 0) {
			fileName = fileName.split(':')[1];
		}

		const Component = defineAsyncComponent(async () => import(fileName));
		const Layout = defineAsyncComponent(async () => import(fileName + '__preview.vue'));
		const Previewer = defineComponent({
			setup: function () {
				return () => h(Suspense, undefined, [h(Layout, undefined, {
					default: (props) => h(Component, props)
				})]);
			},
		});
		// @ts-expect-error
		app._component.setup = Previewer.setup;
	}
}`;
			}
			if (id.endsWith('__preview.vue')) {
				const fileName = id.substring(0, id.length - '__preview.vue'.length);
				let code = fs.readFileSync(fileName, 'utf-8');
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
					code = '';
				}
				return code;
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
			if (ctx.file.endsWith('.vue') && !ctx.file.endsWith('__preview.vue')) {
				const previewModules = ctx.server.moduleGraph.getModulesByFile(ctx.file + '__preview.vue');
				if (previewModules) {
					// TODO: check previe modules dirty
					return [...previewModules];
				}
			}
		},
	};
}

function removeHtmlComments(htmlCode: string) {
	const htmlCommentRege = /<!--[\s\S]*?-->/g;
	return htmlCode.replace(htmlCommentRege, '');
}
