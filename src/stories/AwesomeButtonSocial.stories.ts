import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AwesomeButtonSocial from '../components/AwesomeButtonSocial.vue';

const DEFAULT_SHARE_URL = 'https://example.com/articles/introducing-awesome-ui';
const DEFAULT_SHARE_MESSAGE =
  'Check out this article about building clean and reusable UI components.';
const DEFAULT_SHARE_USER = 'exampleuser';
const DEFAULT_SHARE_PHONE = '+1 555 123 4567';

const meta = {
  title: 'Components/AwesomeButtonSocial',
  component: AwesomeButtonSocial,
  args: {
    theme: 'blue',
    type: 'facebook',
    size: null,
    visible: true,
    between: false,
    disabled: false,
    placeholder: false,
    moveEvents: true,
    ripple: false,
    sharer: {
      url: DEFAULT_SHARE_URL,
      message: DEFAULT_SHARE_MESSAGE,
      user: DEFAULT_SHARE_USER,
      phone: DEFAULT_SHARE_PHONE,
    },
    dimensions: {
      width: 640,
      height: 480,
    },
  },
} satisfies Meta<typeof AwesomeButtonSocial>;

export default meta;

type Story = StoryObj<typeof meta>;

function buildStory(label: string) {
  return (args: Record<string, unknown>) => ({
    components: { AwesomeButtonSocial },
    setup: () => ({ args, label }),
    template: `
      <AwesomeButtonSocial v-bind="args">
        {{ label }}
      </AwesomeButtonSocial>
    `,
  });
}

export const Facebook: Story = {
  args: {
    type: 'facebook',
  },
  render: buildStory('Share on Facebook'),
};

export const Twitter: Story = {
  args: {
    type: 'twitter',
  },
  render: buildStory('Share on X/Twitter'),
};

export const LinkedIn: Story = {
  args: {
    type: 'linkedin',
  },
  render: buildStory('Share on LinkedIn'),
};

export const Reddit: Story = {
  args: {
    type: 'reddit',
    dimensions: {
      width: 850,
      height: 560,
    },
  },
  render: buildStory('Share on Reddit'),
};

export const WhatsApp: Story = {
  args: {
    type: 'whatsapp',
    sharer: {
      url: DEFAULT_SHARE_URL,
      message: DEFAULT_SHARE_MESSAGE,
      phone: DEFAULT_SHARE_PHONE,
    },
  },
  render: buildStory('Share on WhatsApp'),
};

export const Messenger: Story = {
  args: {
    type: 'messenger',
    sharer: {
      url: DEFAULT_SHARE_URL,
      message: DEFAULT_SHARE_MESSAGE,
      user: DEFAULT_SHARE_USER,
    },
  },
  render: buildStory('Open Messenger'),
};

export const Mail: Story = {
  args: {
    type: 'mail',
    sharer: {
      url: DEFAULT_SHARE_URL,
      message: DEFAULT_SHARE_MESSAGE,
    },
  },
  render: buildStory('Share by Email'),
};

export const InstagramBestEffort: Story = {
  args: {
    type: 'instagram',
    sharer: {
      url: 'https://instagram.com',
      message: 'Open this profile',
    },
  },
  render: buildStory('Open Instagram URL'),
};

export const HrefMode: Story = {
  args: {
    type: 'github',
    href: 'https://github.com/rcaferati',
  },
  render: (args) => ({
    components: { AwesomeButtonSocial },
    setup: () => ({ args }),
    template: `
      <AwesomeButtonSocial
        v-bind="args"
        target="_blank"
        rel="noreferrer noopener"
      >
        Open GitHub
      </AwesomeButtonSocial>
    `,
  }),
};

export const CustomPressOverride: Story = {
  args: {
    type: 'twitter',
  },
  render: (args) => ({
    components: { AwesomeButtonSocial },
    setup: () => ({
      args,
      handlePress: (event: Event) => {
        event.preventDefault?.();
        if (typeof window !== 'undefined') {
          window.alert('Custom @press override called (built-in share skipped).');
        }
      },
    }),
    template: `
      <AwesomeButtonSocial v-bind="args" @press="handlePress">
        Custom Share Handler
      </AwesomeButtonSocial>
    `,
  }),
};
