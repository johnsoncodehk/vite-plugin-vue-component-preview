import type { PluginOption } from 'vite';
import Markdown from 'vite-plugin-vue-markdown';

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
import { defineAsyncComponent, defineComponent, h } from 'vue';

export default function installPreview(app) {
	if (location.pathname === '/__preview') {

		const url = new URL(location.href);
		let fileName = url.hash.slice(1);

		// fix windows path for vite
		fileName = fileName.replace(/\\\\\\\\/g, '/');
		if (fileName.indexOf(':') >= 0) {
			fileName = fileName.split(':')[1];
		}

		const Component = defineAsyncComponent(async () => import(fileName));
		const Layout = defineAsyncComponent(async () => import(fileName + '?preview'));
		const Previewer = defineComponent({
			setup: function () {
				return () => h(Layout, undefined, {
					default: (props) => h(Component, props)
				});
			},
		});
		// @ts-expect-error
		app._component.setup = Previewer.setup;
	}
}`;
			}
		},
		transform(code, id) {
			if (id.endsWith('.vue')) {
				// remove preview block
				const previewBlock = code.match(previewBlockReg);
				if (previewBlock) {
					const index = previewBlock.index ?? code.indexOf(previewBlock[0]);
					code = code.substring(0, index) + code.substring(index + previewBlock[0].length);
				}
			}
			else if (id.endsWith('.vue?preview')) {
				// extract preview block content
				const previewBlock = code.match(previewBlockReg);
				if (previewBlock) {
					const startTagEnd = previewBlock[0].indexOf('>') + 1;
					const endTagStart = previewBlock[0].lastIndexOf('</');
					code = previewBlock[0].substring(startTagEnd, endTagStart);
					// @ts-expect-error
					code = markdown.transform(code, 'foo.md');
				}
			}
			return code;
		},
	};
}
