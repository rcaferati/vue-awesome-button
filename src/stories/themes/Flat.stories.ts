import type { Meta, StoryObj } from "@storybook/vue3-vite";
import ThemeAwesomeButtonShowcase from "./ThemeAwesomeButtonShowcase.vue";

const meta = {
  title: "Themes/Flat",
  component: ThemeAwesomeButtonShowcase,
  args: {
    theme: "flat",
    themeLabel: "Flat",
  },
} satisfies Meta<typeof ThemeAwesomeButtonShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
