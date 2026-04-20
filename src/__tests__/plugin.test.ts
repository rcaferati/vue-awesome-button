import { createApp } from 'vue';
import { AwesomeButtonPlugin } from '../plugin';

describe('AwesomeButtonPlugin', () => {
  it('registers all public components globally', () => {
    const app = createApp({});

    app.use(AwesomeButtonPlugin);

    expect(app.component('AwesomeButton')).toBeTruthy();
    expect(app.component('AwesomeButtonProgress')).toBeTruthy();
    expect(app.component('AwesomeButtonSocial')).toBeTruthy();
  });
});
