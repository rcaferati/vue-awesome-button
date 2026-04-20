import type { Meta, StoryObj } from "@storybook/vue3-vite";
import ThemeAwesomeButtonShowcase from "./ThemeAwesomeButtonShowcase.vue";

const meta = {
  title: "Themes/Rickiest",
  component: ThemeAwesomeButtonShowcase,
  args: {
    theme: "rickiest",
    themeLabel: "Rickiest",
  },
} satisfies Meta<typeof ThemeAwesomeButtonShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
