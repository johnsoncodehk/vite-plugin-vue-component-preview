# vite-plugin-vue-component-preview

This Vite plugin support `<preview lang="md">` custom block in SFC for preview single Vue component.

To use this with VSCode + Volar, see https://github.com/johnsoncodehk/volar/discussions/1511

## Setup

`vite.config.ts`

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import preview from 'vite-plugin-vue-component-preview';

export default defineConfig({
	plugins: [
		preview(),
		vue(),
	],
})
```

`main.ts`

```ts
import { createApp } from 'vue';
import App from './App.vue';
import Preview from 'vite-plugin-vue-component-preview/client';

const app = createApp(App);
app.use(Preview);
```

`tsconfig.json` (For IDE and vue-tsc support)

```json
{
  "vueCompilerOptions": {
    "plugins": ["vite-plugin-vue-component-preview/tooling"]
  }
}
```

## Example

```html
<!-- Component part -->
<template>
	<h1>{{ msg }}</h1>
	<button @click="count++">count is: {{ count }}</button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ msg: string }>()

const count = ref(0)
</script>

<!-- Preview part -->

<preview lang="md">

	# This is preview page of HelloWorld.vue

	## Props

	| Props       | Description    |
	| ----------- | -------------- |
	| msg         | Title message  |

	## Examples

	<script setup>
	const msgs = [
	'Hello Peter',
	'Hello John',
	];
	</script>

	<template v-for="msg in msgs">
		<slot :msg="msg"></slot>
	</template>

	<style>
	body {
		background-color: green;
	}
	</style>

</preview>
```

Example repo: https://github.com/johnsoncodehk/volar-starter (Open http://localhost:3000/__preview/src/components/HelloWorld.vue to see the result.)

### Self-import

When you want to preview the component including `<slot>`, importing the component itself provides the solution as follows:

```html
<template>
	<div>
		<slot></slot>
	</div>
</template>

<preview lang="md">

	<script setup>
	import TestPreview from './TestPreview.vue'	// TestPreview.vue is the name of this file itself.
	const msgs = ['1', '2']
	</script>

	<template v-for="msg in msgs">
		<TestPreview>
			test {{ msg }}
		</TestPreview>
	</template>

</preview>
```

This method relates to [#17](https://github.com/johnsoncodehk/vite-plugin-vue-component-preview/issues/17).

## Sponsors

<p align="center">
	<a href="https://cdn.jsdelivr.net/gh/johnsoncodehk/sponsors/sponsors.svg">
		<img src="https://cdn.jsdelivr.net/gh/johnsoncodehk/sponsors/sponsors.svg"/>
	</a>
</p>

## Credits

- Markdown parser power by https://github.com/antfu/vite-plugin-vue-markdown
