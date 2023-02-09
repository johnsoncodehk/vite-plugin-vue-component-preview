import { App, computed, defineAsyncComponent, DefineComponent, h, ref, Suspense } from 'vue';

export default function (app: App) {

	const location = globalThis.location;

	if (location && location.pathname.startsWith('/__preview/')) {

		(app._component as DefineComponent).setup = () => {

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
				try {
					import.meta.hot.send('vue-component-preview:hash', {
						file: importPath.value,
						text: location.hash ? atob(location.hash.substring(1)) : '',
					});
				} catch { }
				window.addEventListener('hashchange', () => {
					try {
						import.meta.hot!.send('vue-component-preview:hash', {
							file: importPath.value,
							text: location.hash ? atob(location.hash.substring(1)) : '',
						});
					} catch { }
				});
			}

			return () => h(Suspense, undefined, [
				h(Layout.value, undefined, {
					default: (props: any) => h(Component.value, props)
				})
			]);
		};
	}
}
