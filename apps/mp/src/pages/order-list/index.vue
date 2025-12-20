<template>
  <view class="bbq-page">
    <view class="bbq-container">
      <view class="nav">
        <view class="nav-left" @click="goHome">
          <image class="nav-ico" src="/static/tabbar/home.png" mode="aspectFit" />
        </view>
        <view class="nav-center">
          <view class="tabs">
            <view class="tab" :class="{ on: uiTab === 'today' }" @click="uiTab = 'today'">今日订单</view>
            <view class="tab" :class="{ on: uiTab === 'history' }" @click="uiTab = 'history'">历史订单</view>
          </view>
        </view>
        <view class="nav-right" @click="toast('开发中')">⋯</view>
      </view>

      <view class="filters">
        <view class="chip on">ORDERED</view>
        <view class="chip">SETTLED</view>
        <view class="meta bbq-hint">桌号 {{ tableStore.tableName || tableStore.tableId || defaultTableId || '-' }}</view>
      </view>

      <view v-if="loading" class="state">
        <view class="state-text bbq-hint">加载中</view>
      </view>

      <view v-else-if="!ready" class="state">
        <image class="state-img" src="/static/empty.svg" mode="widthFix" />
        <view class="state-title">请先配置默认桌号</view>
        <view class="state-text bbq-hint">在 apps/mp/.env 设置 VITE_DEFAULT_STORE_ID / VITE_DEFAULT_TABLE_ID</view>
        <button class="state-btn ghost bbq-pill" @click="goMenu">去点单</button>
      </view>

      <view v-else-if="orders.length === 0" class="state">
        <image class="state-img" src="/static/empty.svg" mode="widthFix" />
        <view class="state-title">您今天还没有下单</view>
        <view class="state-text bbq-hint">快去选择喜欢的商品吧</view>
        <button class="state-btn ghost bbq-pill" @click="goMenu">去点单</button>
      </view>

      <view v-else class="list">
        <view v-for="o in orders" :key="o.id" class="card" @click="goDetail(o.id)">
          <view class="row">
            <view class="id">{{ o.id }}</view>
            <view class="status">{{ statusText(o.status) }}</view>
          </view>
          <view class="row sub">
            <view class="amt">￥{{ (o.amount / 100).toFixed(2) }}</view>
            <view class="time bbq-hint">{{ o.createdAt }}</view>
          </view>
        </view>
      </view>

      <view class="bbq-safe-bottom-pad"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api, type Order } from '../../api';
import { useTableStore } from '../../stores/table';

const tableStore = useTableStore();
const orders = ref<Order[]>([]);
const loading = ref(false);
const uiTab = ref<'today' | 'history'>('today');

function getEnv(key: string) {
  const env = (import.meta as any)?.env ?? {};
  return String(env[key] ?? '');
}

const defaultTableId = getEnv('VITE_DEFAULT_TABLE_ID');

const ready = computed(() => {
  const storeId = tableStore.storeId || getEnv('VITE_DEFAULT_STORE_ID');
  const tableId = tableStore.tableId || getEnv('VITE_DEFAULT_TABLE_ID');
  return !!storeId && !!tableId;
});

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

function statusText(s: Order['status']) {
  if (s === 'SETTLED') return '已结账';
  return '已下单';
}

async function reload() {
  loading.value = true;
  try {
    const storeId = tableStore.storeId || getEnv('VITE_DEFAULT_STORE_ID');
    const tableId = tableStore.tableId || getEnv('VITE_DEFAULT_TABLE_ID');
    if (!storeId || !tableId) {
      orders.value = [];
      return;
    }
    const res = await api.listOrders({ storeId, tableId });
    orders.value = res.orders;
  } catch (e: any) {
    toast(e?.message ?? '加载失败');
  } finally {
    loading.value = false;
  }
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/order-detail/index?id=${encodeURIComponent(id)}` });
}

function goHome() {
  uni.switchTab({ url: '/pages/home/index' });
}

function goMenu() {
  uni.switchTab({ url: '/pages/menu/index' });
}

onShow(() => {
  reload();
});
</script>

<style scoped>
.nav {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--bbq-space-2);
}
.nav-left {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
}
.nav-ico {
  width: 44rpx;
  height: 44rpx;
  opacity: 0.65;
}
.nav-center {
  flex: 1;
  display: flex;
  justify-content: center;
}
.nav-right {
  width: 80rpx;
  text-align: right;
  font-size: 44rpx;
  line-height: 44rpx;
  color: var(--bbq-text);
}
.tabs {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--bbq-border);
  border-radius: 999rpx;
  padding: 6rpx;
  gap: 6rpx;
}
.tab {
  padding: 12rpx 22rpx;
  font-size: 26rpx;
  border-radius: 999rpx;
  color: var(--bbq-muted);
}
.tab.on {
  background: #111111;
  color: #ffffff;
}
.filters {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: var(--bbq-space-3);
}
.chip {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  border: 1px solid var(--bbq-border);
  background: rgba(255, 255, 255, 0.7);
  font-size: 22rpx;
  color: var(--bbq-muted);
}
.chip.on {
  background: #111111;
  border-color: #111111;
  color: #ffffff;
}
.meta {
  margin-left: auto;
}
.state {
  padding: 60rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.state-img {
  width: 420rpx;
}
.state-title {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--bbq-text);
}
.state-text {
  font-size: 26rpx;
  color: var(--bbq-muted);
}
.state-btn {
  margin-top: 10rpx;
  height: 84rpx;
  line-height: 84rpx;
  padding: 0 32rpx;
  background: #111111;
  color: #ffffff;
  font-size: 30rpx;
}
.state-btn.ghost {
  background: #ffffff;
  color: #111111;
  border: 1px solid var(--bbq-border);
}
.list {
  display: flex;
  flex-direction: column;
  gap: var(--bbq-space-2);
}
.card {
  background: var(--bbq-card);
  border-radius: var(--bbq-radius-card);
  box-shadow: var(--bbq-shadow);
  padding: var(--bbq-space-3);
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.id {
  font-size: 26rpx;
  color: #9ca3af;
}
.status {
  font-size: 26rpx;
  font-weight: 800;
  color: var(--bbq-text);
}
.sub {
  margin-top: 10rpx;
}
.amt {
  font-size: 36rpx;
  font-weight: 900;
  color: var(--bbq-text);
}
.time {
  max-width: 320rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}
</style>
