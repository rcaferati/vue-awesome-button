import type { Preview } from '@storybook/vue3-vite';
import '../src/styles/styles.css';
import '../src/styles/themes/theme-amber.css';
import '../src/styles/themes/theme-blue.css';
import '../src/styles/themes/theme-bojack.css';
import '../src/styles/themes/theme-bruce.css';
import '../src/styles/themes/theme-c137.css';
import '../src/styles/themes/theme-eric.css';
import '../src/styles/themes/theme-flat.css';
import '../src/styles/themes/theme-indigo.css';
import '../src/styles/themes/theme-red.css';
import '../src/styles/themes/theme-rickiest.css';
import './preview.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
