<template>
  <slot />
</template>

<script setup lang="ts"></script>

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
