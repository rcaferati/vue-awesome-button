import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AwesomeButton from '../../components/AwesomeButton.vue';

const meta = {
  title: 'Icons/AwesomeButton',
  component: AwesomeButton,
  args: {
    theme: 'blue',
    type: 'primary',
    visible: true,
    ripple: false,
  },
} satisfies Meta<typeof AwesomeButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Showcase: Story = {
  render: (args) => ({
    components: { AwesomeButton },
    setup: () => ({ args }),
    template: `
      <div
        style="
          display:grid;
          gap:18px;
          justify-items:center;
          padding:8px;
          width:min(900px, 94vw);
        "
      >
        <section style="display:grid; gap:12px; width:min(900px, 94vw);">
          <h3 style="margin:0; font-size:14px; font-weight:700; opacity:0.85; letter-spacing:0.2px;">
            AwesomeButton icons
          </h3>

          <div
            style="
              border:1px solid #e5e7eb;
              border-radius:12px;
              padding:12px;
              background:#fff;
              display:grid;
              gap:10px;
            "
          >
            <div style="font-size:12px; line-height:1.2; font-weight:600; opacity:0.8;">
              before / after / icon-only
            </div>

            <div style="display:grid; gap:10px; justify-items:start; align-items:center;">
              <AwesomeButton v-bind="args" size="small">
                <template #before>
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3l1.9 4.8L19 9.2l-4 3.4 1.3 5.2L12 15l-4.3 2.8L9 12.6 5 9.2l5.1-1.4L12 3z" />
                  </svg>
                </template>
                Small
              </AwesomeButton>

              <AwesomeButton v-bind="args" size="medium">
                <template #before>
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3l1.9 4.8L19 9.2l-4 3.4 1.3 5.2L12 15l-4.3 2.8L9 12.6 5 9.2l5.1-1.4L12 3z" />
                  </svg>
                </template>
                Medium
                <template #after>
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14" />
                    <path d="m13 5 7 7-7 7" />
                  </svg>
                </template>
              </AwesomeButton>

              <AwesomeButton v-bind="args" size="large">
                <template #before>
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3l1.9 4.8L19 9.2l-4 3.4 1.3 5.2L12 15l-4.3 2.8L9 12.6 5 9.2l5.1-1.4L12 3z" />
                  </svg>
                </template>
                Large
              </AwesomeButton>

              <AwesomeButton v-bind="args" :size="null">
                <template #before>
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3l1.9 4.8L19 9.2l-4 3.4 1.3 5.2L12 15l-4.3 2.8L9 12.6 5 9.2l5.1-1.4L12 3z" />
                  </svg>
                </template>
                Auto width
              </AwesomeButton>

              <AwesomeButton v-bind="args" type="link">
                <template #before>
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14" />
                    <path d="m13 5 7 7-7 7" />
                  </svg>
                </template>
              </AwesomeButton>
            </div>
          </div>
        </section>
      </div>
    `,
  }),
};
