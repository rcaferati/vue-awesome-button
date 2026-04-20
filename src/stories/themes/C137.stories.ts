import type { Meta, StoryObj } from "@storybook/vue3-vite";
import ThemeAwesomeButtonShowcase from "./ThemeAwesomeButtonShowcase.vue";

const meta = {
  title: "Themes/C137",
  component: ThemeAwesomeButtonShowcase,
  args: {
    theme: "c137",
    themeLabel: "C137",
  },
} satisfies Meta<typeof ThemeAwesomeButtonShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
