# vite-plugin-vue-component-preview

This Vite plugin support `<preview lang="md">` custom block in SFC for preview single Vue component.

## Setup

1. Install [vite-plugin-vue-component-preview](https://github.com/johnsoncodehk/vite-plugin-vue-component-preview)
  ```sh
    $ npm install -D vite-plugin-vue-component-preview
  ```
  ```sh
    $ yarn add -D vite-plugin-vue-component-preview
  ```
  ```sh
    $ pnpm install -D vite-plugin-vue-component-preview
  ```
2. Add the plugin to your **vite.config.ts**
  ```ts{3,7}
    import { defineConfig } from 'vite';
    import Vue from '@vitejs/plugin-vue';
    import Preview from 'vite-plugin-vue-component-preview';

    export default defineConfig({
      plugins: [
        Preview(),
        Vue(),
      ],
    })
  ```
3. Add new types to your **tsconfig.json**
  ```json
    {
      "compilerOptions": {
        "types": ["vite-plugin-vue-component-preview/client"]
      }
    }
  ```
4. Include the plugin in your vue app
  ```ts{3,6}
  import { createApp } from 'vue';
  import App from './App.vue';
  import Previewer from 'virtual:vue-component-preview';

  const app = createApp(App);
  app.use(Previewer);
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

Open http://localhost:3000/__preview/src/HelloWorld.vue to see the result.

## Sponsors

<p align="center">
	<a href="https://cdn.jsdelivr.net/gh/johnsoncodehk/sponsors/company/sponsors.svg">
		<img src="https://cdn.jsdelivr.net/gh/johnsoncodehk/sponsors/company/sponsors.svg"/>
	</a>
</p>

---

<p align="center">
	<a href="https://cdn.jsdelivr.net/gh/johnsoncodehk/sponsors/sponsors.svg">
		<img src="https://cdn.jsdelivr.net/gh/johnsoncodehk/sponsors/sponsors.svg"/>
	</a>
</p>

## Credits

- Markdown parser power by https://github.com/antfu/vite-plugin-vue-markdown
