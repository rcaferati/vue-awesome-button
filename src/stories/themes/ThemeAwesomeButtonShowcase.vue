<script setup lang="ts">
import AwesomeButton from '../../components/AwesomeButton.vue';
import type { ThemeName } from '../../types';

defineProps<{
  theme: ThemeName;
  themeLabel: string;
}>();
</script>

<template>
  <div
    style="
      display: grid;
      gap: 18px;
      justify-items: center;
      padding: 8px;
      width: min(900px, 94vw);
    "
  >
    <section
      style="
        display: grid;
        gap: 12px;
        width: min(900px, 94vw);
      "
    >
      <h3
        style="
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          opacity: 0.85;
          letter-spacing: 0.2px;
        "
      >
        {{ themeLabel }} theme
      </h3>

      <div
        style="
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px;
          background: #ffffff;
          display: grid;
          gap: 10px;
        "
      >
        <div
          style="
            font-size: 12px;
            line-height: 1.2;
            font-weight: 600;
            opacity: 0.8;
          "
        >
          AwesomeButton overview
        </div>

        <div
          style="
            min-height: 56px;
            display: grid;
            gap: 10px;
            justify-items: start;
            align-items: center;
          "
        >
          <AwesomeButton :theme="theme" type="primary" size="medium">
            Primary
          </AwesomeButton>

          <AwesomeButton :theme="theme" type="secondary" size="medium">
            Secondary
          </AwesomeButton>

          <AwesomeButton :theme="theme" type="danger" size="medium">
            Danger
          </AwesomeButton>

          <AwesomeButton
            :theme="theme"
            type="link"
            size="medium"
            href="https://github.com/rcaferati"
            target="_blank"
            rel="noreferrer noopener"
          >
            Open link
          </AwesomeButton>

          <AwesomeButton :theme="theme" type="primary" size="medium" disabled>
            Disabled
          </AwesomeButton>

          <AwesomeButton :theme="theme" type="primary" :size="null">
            Auto width grows with content
          </AwesomeButton>

          <AwesomeButton :theme="theme" type="primary" size="medium">
            <template #before>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 3l1.9 4.8L19 9.2l-4 3.4 1.3 5.2L12 15l-4.3 2.8L9 12.6 5 9.2l5.1-1.4L12 3z" />
              </svg>
            </template>

            Continue

            <template #after>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m13 5 7 7-7 7" />
              </svg>
            </template>
          </AwesomeButton>

          <AwesomeButton :theme="theme" type="primary" size="medium" active>
            Active
          </AwesomeButton>
        </div>
      </div>
    </section>
  </div>
</template>
