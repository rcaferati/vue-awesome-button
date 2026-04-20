import type { Meta, StoryObj } from "@storybook/vue3-vite";
import ThemeAwesomeButtonShowcase from "./ThemeAwesomeButtonShowcase.vue";

const meta = {
  title: "Themes/Bojack",
  component: ThemeAwesomeButtonShowcase,
  args: {
    theme: "bojack",
    themeLabel: "Bojack",
  },
} satisfies Meta<typeof ThemeAwesomeButtonShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
