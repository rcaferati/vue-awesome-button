import type { Meta, StoryObj } from "@storybook/vue3-vite";
import ThemeAwesomeButtonShowcase from "./ThemeAwesomeButtonShowcase.vue";

const meta = {
  title: "Themes/Eric",
  component: ThemeAwesomeButtonShowcase,
  args: {
    theme: "eric",
    themeLabel: "Eric",
  },
} satisfies Meta<typeof ThemeAwesomeButtonShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
