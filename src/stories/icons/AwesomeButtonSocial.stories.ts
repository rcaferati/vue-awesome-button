import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AwesomeButtonSocial from '../../components/AwesomeButtonSocial.vue';

const meta = {
  title: 'Icons/AwesomeButtonSocial',
  component: AwesomeButtonSocial,
  args: {
    theme: 'blue',
    visible: true,
    ripple: false,
  },
} satisfies Meta<typeof AwesomeButtonSocial>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Showcase: Story = {
  render: (args) => ({
    components: { AwesomeButtonSocial },
    setup: () => ({
      args,
      sharer: {
        url: 'https://example.com/articles/introducing-awesome-ui',
        message: 'Check out this article about building clean and reusable UI components.',
      },
    }),
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
            AwesomeButtonSocial icons
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
              instagram / whatsapp visual styles
            </div>

            <div style="display:grid; gap:10px; justify-items:start; align-items:center;">
              <AwesomeButtonSocial
                v-bind="args"
                type="instagram"
                :size="null"
                :sharer="{ ...sharer, url: 'https://instagram.com' }"
              >
                <template #before>
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </template>
                Instagram
              </AwesomeButtonSocial>

              <AwesomeButtonSocial
                v-bind="args"
                type="instagram"
                size="medium"
                :sharer="{ ...sharer, url: 'https://instagram.com' }"
              >
                <template #before>
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </template>
                Instagram
              </AwesomeButtonSocial>

              <AwesomeButtonSocial
                v-bind="args"
                type="whatsapp"
                size="large"
                :sharer="sharer"
              >
                <template #before>
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.3-4.4A8.4 8.4 0 1 1 20.5 11.8Z" />
                    <path d="M8.9 8.4c.2-.4.4-.4.7-.4h.6c.2 0 .5.1.6.5l.6 1.5c.1.3.1.5-.1.7l-.5.6c.7 1.2 1.6 2.1 2.9 2.8l.6-.7c.2-.2.4-.3.7-.2l1.5.7c.4.2.5.4.5.7v.5c0 .3-.1.6-.4.8-.4.3-1 .5-1.8.4-3.4-.4-6-2.8-6.9-6.1-.2-.8 0-1.5.3-1.9Z" />
                  </svg>
                </template>
                WhatsApp
              </AwesomeButtonSocial>

              <AwesomeButtonSocial
                v-bind="args"
                type="whatsapp"
                :size="null"
                :sharer="sharer"
              >
                <template #before>
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.3-4.4A8.4 8.4 0 1 1 20.5 11.8Z" />
                    <path d="M8.9 8.4c.2-.4.4-.4.7-.4h.6c.2 0 .5.1.6.5l.6 1.5c.1.3.1.5-.1.7l-.5.6c.7 1.2 1.6 2.1 2.9 2.8l.6-.7c.2-.2.4-.3.7-.2l1.5.7c.4.2.5.4.5.7v.5c0 .3-.1.6-.4.8-.4.3-1 .5-1.8.4-3.4-.4-6-2.8-6.9-6.1-.2-.8 0-1.5.3-1.9Z" />
                  </svg>
                </template>
                WhatsApp Auto
              </AwesomeButtonSocial>
            </div>
          </div>
        </section>
      </div>
    `,
  }),
};
