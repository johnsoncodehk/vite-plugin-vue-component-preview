import { App, defineAsyncComponent, DefineComponent, h } from 'vue';

export default function (app: App) {

	const location = globalThis.location;

	if (location && location.pathname.startsWith('/__preview/')) {

		(app._component as DefineComponent).setup = () => {

			const importPath = location.pathname.substring('/__preview'.length);
			const Component = defineAsyncComponent(() => import(/* @vite-ignore */importPath));
			const Layout = defineAsyncComponent(() => import(/* @vite-ignore */importPath + '__preview.vue'));

			if (import.meta.hot) {
				fireHash();
				window.addEventListener('hashchange', fireHash);
			}

			return () => h(Layout, undefined, {
				default: (props: any) => h(Component, props)
			});

			function fireHash() {
				try {
					import.meta.hot?.send('vue-component-preview:hash', {
						file: importPath,
						text: location.hash ? atob(location.hash.substring(1)) : '',
					});
				} catch { }
			}
		};
	}
}
