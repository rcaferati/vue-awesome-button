import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AwesomeButtonProgress from '../components/AwesomeButtonProgress.vue';

const meta = {
  title: 'Components/AwesomeButtonProgress',
  component: AwesomeButtonProgress,
  args: {
    theme: 'blue',
    type: 'primary',
    size: 'medium',
    loadingLabel: 'Wait..',
    resultLabel: 'Success!',
  },
} satisfies Meta<typeof AwesomeButtonProgress>;

export default meta;

type Story = StoryObj<typeof meta>;

function buildInteractiveStory(
  resolveRun: (next: (endState?: boolean, errorLabel?: string | null) => void) => void
) {
  return (args: Record<string, unknown>) => ({
    components: { AwesomeButtonProgress },
    setup: () => ({
      args,
      handlePress: (_event: unknown, next: (endState?: boolean, errorLabel?: string | null) => void) => {
        resolveRun(next);
      },
    }),
    template: `
      <AwesomeButtonProgress
        v-bind="args"
        @press="handlePress"
      >
        Progress
      </AwesomeButtonProgress>
    `,
  });
}

export const Primary: Story = {
  render: buildInteractiveStory((next) => {
    window.setTimeout(() => {
      next(true);
    }, 800);
  }),
};

export const NoProgressBar: Story = {
  args: {
    showProgressBar: false,
  },
  render: buildInteractiveStory((next) => {
    window.setTimeout(() => {
      next(true);
    }, 800);
  }),
};

export const CustomProgressLoadingTime: Story = {
  args: {
    progressLoadingTime: 1800,
  },
  render: buildInteractiveStory((next) => {
    window.setTimeout(() => {
      next(true);
    }, 800);
  }),
};

export const ErrorState: Story = {
  render: buildInteractiveStory((next) => {
    window.setTimeout(() => {
      next(false, 'Failed');
    }, 800);
  }),
};
