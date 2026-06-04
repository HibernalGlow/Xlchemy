import { mount } from 'svelte';
import App from './app.svelte';
import { initI18n } from './i18n';
import '@fontsource-variable/inter';
import './input.css';

initI18n();

mount(App, {
  target: document.getElementById('root')!,
});
