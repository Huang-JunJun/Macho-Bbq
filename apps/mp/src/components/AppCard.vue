<template>
  <view class="card" :class="[{ padded }, borderClass]">
    <view v-if="title" class="head">
      <view class="title">{{ title }}</view>
      <view v-if="$slots.right" class="right">
        <slot name="right" />
      </view>
    </view>
    <view v-if="$slots.default" class="body">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    title?: string;
    padded?: boolean;
    bordered?: boolean;
  }>(),
  { padded: true, bordered: false },
);

const borderClass = computed(() => (props.bordered ? 'bordered' : ''));
</script>

<style scoped>
.card {
  background: var(--bbq-card);
  border-radius: var(--bbq-radius-card);
  box-shadow: var(--bbq-shadow);
  overflow: hidden;
}
.card.padded {
  padding: var(--bbq-space-3);
}
.card.bordered {
  border: 1px solid var(--bbq-border);
  box-shadow: none;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--bbq-space-2);
}
.title {
  font-size: var(--bbq-text-md);
  font-weight: 700;
  color: var(--bbq-text);
}
.right {
  color: var(--bbq-muted);
}
.body {
  min-height: 1px;
}
</style>
