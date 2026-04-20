import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import AwesomeButton from '../components/AwesomeButton.vue';

const meta = {
  title: 'Components/AwesomeButton',
  component: AwesomeButton,
  args: {
    theme: 'blue',
    type: 'primary',
    size: 'medium',
  },
} satisfies Meta<typeof AwesomeButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  render: (args) => ({
    components: { AwesomeButton },
    setup: () => ({ args }),
    template: `
      <AwesomeButton v-bind="args">
        Button
      </AwesomeButton>
    `,
  }),
};

export const WithBeforeAfter: Story = {
  render: (args) => ({
    components: { AwesomeButton },
    setup: () => ({ args }),
    template: `
      <AwesomeButton v-bind="args">
        <template #before>
          <span aria-hidden="true">◀</span>
        </template>
        Continue
        <template #after>
          <span aria-hidden="true">▶</span>
        </template>
      </AwesomeButton>
    `,
  }),
};

export const LinkMode: Story = {
  args: {
    href: 'https://github.com/rcaferati',
    type: 'link',
  },
  render: (args) => ({
    components: { AwesomeButton },
    setup: () => ({ args }),
    template: `
      <AwesomeButton v-bind="args" target="_blank" rel="noreferrer noopener">
        Open website
      </AwesomeButton>
    `,
  }),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => ({
    components: { AwesomeButton },
    setup: () => ({ args }),
    template: `
      <AwesomeButton v-bind="args">
        Disabled
      </AwesomeButton>
    `,
  }),
};

export const ActiveControlled: Story = {
  args: {
    active: true,
  },
  render: (args) => ({
    components: { AwesomeButton },
    setup: () => ({ args }),
    template: `
      <AwesomeButton v-bind="args">
        Controlled active
      </AwesomeButton>
    `,
  }),
};

export const AutoWidth: Story = {
  args: {
    size: null,
  },
  render: (args) => ({
    components: { AwesomeButton },
    setup: () => ({ args }),
    template: `
      <AwesomeButton v-bind="args">
        Open dashboard
      </AwesomeButton>
    `,
  }),
};

export const TextTransition: Story = {
  args: {
    textTransition: true,
    size: null,
  },
  render: (args) => ({
    components: { AwesomeButton },
    setup: () => {
      const label = ref('Open dashboard');

      const toggle = () => {
        label.value =
          label.value === 'Open dashboard' ? 'Sync complete' : 'Open dashboard';
      };

      return { args, label, toggle };
    },
    template: `
      <div style="display:flex; flex-direction:column; align-items:center; gap:16px;">
        <AwesomeButton v-bind="args">
          {{ label }}
        </AwesomeButton>
        <button type="button" @click="toggle">
          Toggle label
        </button>
      </div>
    `,
  }),
};
