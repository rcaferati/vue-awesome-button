import type { App, Plugin } from 'vue';
import AwesomeButton from './components/AwesomeButton.vue';
import AwesomeButtonProgress from './components/AwesomeButtonProgress.vue';
import AwesomeButtonSocial from './components/AwesomeButtonSocial.vue';

export const AwesomeButtonPlugin: Plugin = {
  install(app: App) {
    app.component('AwesomeButton', AwesomeButton);
    app.component('AwesomeButtonProgress', AwesomeButtonProgress);
    app.component('AwesomeButtonSocial', AwesomeButtonSocial);
  },
};

export default AwesomeButtonPlugin;

