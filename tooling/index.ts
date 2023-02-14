import { VueLanguagePlugin, VueFile, getDefaultVueLanguagePlugins } from '@volar/vue-language-core';

const plugin: VueLanguagePlugin = (ctx) => {

	const ts = ctx.modules.typescript;
	const plugins = getDefaultVueLanguagePlugins(ts, ctx.compilerOptions, { ...ctx.vueCompilerOptions, plugins: [] });
	const previewBlockFiles = new Map<string, VueFile>();

	return {
		version: 1,
		getEmbeddedFileNames(fileName, sfc) {
			const previewBlock = sfc.customBlocks.find(b => b.type === 'preview' && (b.lang || 'md') === 'md');
			if (previewBlock) {
				const snapshot = ts.ScriptSnapshot.fromString(previewBlock.content);
				let vueFile = previewBlockFiles.get(fileName);
				if (!vueFile) {
					vueFile = new VueFile(fileName + '__VLS_preview.md', snapshot, ts, plugins);
					previewBlockFiles.set(fileName, vueFile);
				}
				else {
					vueFile.update(snapshot);
				}
				return vueFile.embeddedFiles.map(file => file.fileName);
			}
			return [];
		},
		resolveEmbeddedFile(fileName, sfc, embeddedFile) {
			const vueFile = previewBlockFiles.get(fileName);
			if (vueFile) {
				const targetFile = vueFile._allEmbeddedFiles.value.find(file => file.file.fileName === embeddedFile.fileName);
				const previewBlock = sfc.customBlocks.find(b => b.type === 'preview' && (b.lang || 'md') === 'md');
				if (targetFile && previewBlock) {
					{ // watch
						previewBlock?.content;
					}
					Object.assign(embeddedFile, targetFile.file);
					const newContent: typeof embeddedFile.content = [];
					for (const segment of targetFile.file.content) {
						if (typeof segment === 'string') {
							newContent.push(segment);
						}
						else {
							let base = 0;
							if (segment[1] === 'template') {
								base = vueFile.sfc.template!.startTagEnd;
							}
							else if (segment[1] === 'script') {
								base = vueFile.sfc.script!.startTagEnd;
							}
							else if (segment[1] === 'scriptSetup') {
								base = vueFile.sfc.scriptSetup!.startTagEnd;
							}
							else if (segment[1]?.startsWith('style_')) {
								const index = Number(segment[1].substring('style_'.length));
								base = vueFile.sfc.styles[index]!.startTagEnd;
							}
							else if (segment[1]?.startsWith('customBlock_')) {
								const index = Number(segment[1].substring('customBlock_'.length));
								base = vueFile.sfc.customBlocks[index]!.startTagEnd;
							}
							newContent.push([
								segment[0],
								previewBlock.name,
								typeof segment[2] === 'number'
									? segment[2] + base
									: [
										segment[2][0] + base,
										segment[2][1] + base,
									],
								segment[3],
							]);
						}
					}
					embeddedFile.content = newContent;
					embeddedFile.parentFileName = fileName + '.customBlock_preview_0.md';
				}
			}
		},
	};
};

export = plugin;
