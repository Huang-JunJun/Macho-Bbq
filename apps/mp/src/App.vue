<template>
  <slot />
</template>

<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';
import { useTableStore } from './stores/tableStore';

const tableStore = useTableStore();
const EXPIRE_MS = 6 * 60 * 60 * 1000;

function clearIfExpired() {
  const last = Number(tableStore.lastActiveAt ?? 0);
  if (!last) return;
  if (Date.now() - last > EXPIRE_MS) tableStore.clear();
}

onLaunch(() => {
  clearIfExpired();
});

onShow(() => {
  clearIfExpired();
});
</script>

<style>
@import './styles/tokens.css';

page {
  background: var(--bbq-bg);
  color: var(--bbq-text);
}

uni-tabbar,
.uni-tabbar,
.uni-tabbar-bottom,
.uni-tabbar-top {
  z-index: 2000 !important;
}

.uni-tabbar-bottom .uni-tabbar,
.uni-tabbar-top .uni-tabbar {
  left: 0 !important;
  right: 0 !important;
}
</style>
