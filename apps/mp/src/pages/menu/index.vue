<template>
  <view class="bbq-page page">
    <view class="bbq-container header">
      <view class="header-top">
        <view class="h-left">
          <view class="store">{{ storeName || '门店' }}</view>
          <view class="meta">
            <text class="meta-item">桌号 {{ tableStore.tableName || tableStore.tableId || '-' }}</text>
            <text class="meta-dot">·</text>
            <text class="meta-item bbq-muted">堂食扫码下单</text>
          </view>
        </view>
        <view class="h-right" @click="toast('开发中')">⋯</view>
      </view>

      <view class="modes">
        <view class="mode" :class="{ on: mode === 'pickup' }" @click="mode = 'pickup'">自提</view>
        <view class="mode" :class="{ on: mode === 'delivery' }" @click="mode = 'delivery'">外卖</view>
      </view>
    </view>

    <view class="content">
      <scroll-view class="cats" scroll-y>
        <view class="cats-inner">
          <view
            v-for="c in categories"
            :key="c.id"
            class="cat"
            :class="{ active: c.id === activeCategoryId }"
            @click="activeCategoryId = c.id"
          >
            {{ c.name }}
          </view>
        </view>
      </scroll-view>

      <scroll-view class="prods" scroll-y>
        <view class="prods-inner">
          <view v-if="activeProducts.length === 0" class="empty">
            <text class="bbq-hint">暂无商品</text>
          </view>

          <view v-for="p in activeProducts" :key="p.id" class="prod" :class="{ soldout: p.isSoldOut }">
            <view class="thumb">
              <image v-if="p.imageUrl" class="thumb-img" :src="p.imageUrl" mode="aspectFill" />
              <view v-else class="thumb-ph"></view>
            </view>
            <view class="info">
              <view class="name">{{ p.name }}</view>
              <view class="sub">
                <text class="price">￥{{ (p.price / 100).toFixed(2) }}</text>
                <text v-if="p.isSoldOut" class="tag">售罄</text>
                <text v-else-if="p.isOnSale === false" class="tag">下架</text>
              </view>
            </view>
            <view class="ops">
              <view class="op" :class="{ disabled: qtyOf(p.id) === 0 }" @click="dec(p.id)">−</view>
              <view class="qty">{{ qtyOf(p.id) }}</view>
              <view class="op" :class="{ disabled: p.isSoldOut }" @click="p.isSoldOut ? null : inc(p)">＋</view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="cartbar">
      <view class="cartbar-inner">
        <view class="sum">
          <view class="sum-amount">￥{{ (cart.totalAmount / 100).toFixed(2) }}</view>
          <view class="sum-sub bbq-hint">{{ cart.totalQty }} 件</view>
        </view>
        <button class="submit bbq-pill" :disabled="cart.totalQty === 0" @click="goConfirm">去下单</button>
      </view>
      <view class="safe" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api, type Category, type Product } from '../../api';
import { useTableStore } from '../../stores/table';
import { useCartStore } from '../../stores/cart';

const tableStore = useTableStore();
const cart = useCartStore();

const storeName = ref('');
const categories = ref<Category[]>([]);
const activeCategoryId = ref('');
const mode = ref<'pickup' | 'delivery'>('pickup');

const activeProducts = computed(() => {
  const c = categories.value.find((x) => x.id === activeCategoryId.value);
  return c?.products ?? [];
});

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

function getDefaultStoreId() {
  const env = (import.meta as any)?.env ?? {};
  return String(env.VITE_DEFAULT_STORE_ID ?? '');
}

function getDefaultTableId() {
  const env = (import.meta as any)?.env ?? {};
  return String(env.VITE_DEFAULT_TABLE_ID ?? '');
}

function qtyOf(productId: string) {
  return cart.items[productId]?.qty ?? 0;
}

function inc(p: Product) {
  cart.inc({ productId: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl });
}

function dec(productId: string) {
  cart.dec(productId);
}

async function reload() {
  const storeId = tableStore.storeId || getDefaultStoreId();
  if (!storeId) {
    storeName.value = '';
    categories.value = [];
    activeCategoryId.value = '';
    return;
  }
  const [s, m] = await Promise.all([api.getStoreInfo(storeId), api.getMenu(storeId)]);
  storeName.value = s.store.name;
  categories.value = m.categories;
  activeCategoryId.value = categories.value[0]?.id ?? '';
}

function goConfirm() {
  const storeId = tableStore.storeId || getDefaultStoreId();
  const tableId = tableStore.tableId || getDefaultTableId();
  if (!storeId || !tableId) {
    toast('请先配置默认桌号后下单');
    return;
  }
  if (!tableStore.ready) {
    tableStore.setTable({ storeId, tableId, tableName: tableStore.tableName || tableId });
  }
  uni.navigateTo({ url: '/pages/order-confirm/index' });
}

onShow(() => {
  reload().catch((e: any) => toast(e?.message ?? '加载失败'));
});
</script>

<style scoped>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.header {
  padding-bottom: 0;
}
.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
}
.h-left {
  min-width: 0;
}
.h-right {
  width: 80rpx;
  text-align: right;
  font-size: 44rpx;
  line-height: 44rpx;
  color: var(--bbq-text);
}
.store {
  font-size: 40rpx;
  font-weight: 800;
  letter-spacing: 0.2rpx;
  color: var(--bbq-text);
}
.meta {
  margin-top: 6rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}
.meta-item {
  font-size: 24rpx;
  color: var(--bbq-text);
}
.meta-dot {
  color: #d1d5db;
}
.modes {
  background: var(--bbq-card);
  border: 1px solid var(--bbq-border);
  border-radius: 999rpx;
  padding: 6rpx;
  display: inline-flex;
  gap: 6rpx;
  margin-bottom: var(--bbq-space-2);
}
.mode {
  padding: 12rpx 24rpx;
  font-size: 26rpx;
  border-radius: 999rpx;
  color: var(--bbq-muted);
}
.mode.on {
  background: #111111;
  color: #ffffff;
}
.content {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: var(--bbq-space-2);
  padding: 0 var(--bbq-space-3);
  padding-bottom: calc(220rpx + var(--bbq-tabbar-height) + var(--bbq-safe-bottom));
  box-sizing: border-box;
}
.cats {
  width: 210rpx;
  min-height: 0;
}
.cats-inner {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding-bottom: 10rpx;
}
.cat {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--bbq-border);
  border-radius: 16rpx;
  padding: 16rpx 14rpx;
  color: var(--bbq-text);
  font-size: 26rpx;
}
.cat.active {
  background: #111111;
  border-color: #111111;
  color: #ffffff;
}
.prods {
  flex: 1;
  min-height: 0;
}
.prods-inner {
  display: flex;
  flex-direction: column;
  gap: var(--bbq-space-2);
  padding-bottom: 10rpx;
}
.empty {
  height: 240rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.prod {
  background: var(--bbq-card);
  border-radius: var(--bbq-radius-card);
  box-shadow: var(--bbq-shadow);
  padding: 14rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.prod.soldout {
  opacity: 0.6;
}
.thumb {
  width: 108rpx;
  height: 108rpx;
  border-radius: 18rpx;
  overflow: hidden;
  background: #f3f4f6;
  flex: 0 0 auto;
}
.thumb-img {
  width: 108rpx;
  height: 108rpx;
}
.thumb-ph {
  width: 108rpx;
  height: 108rpx;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
}
.info {
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--bbq-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.price {
  font-size: 30rpx;
  font-weight: 800;
}
.tag {
  font-size: 22rpx;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
  border: 1px solid var(--bbq-border);
  color: var(--bbq-muted);
}
.ops {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex: 0 0 auto;
}
.op {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  color: #111111;
}
.op.disabled {
  opacity: 0.35;
}
.qty {
  width: 44rpx;
  text-align: center;
  font-size: 28rpx;
  color: var(--bbq-text);
}
.cartbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--bbq-tabbar-height) + var(--bbq-safe-bottom) + 12rpx);
  padding: 0 var(--bbq-space-3);
  box-sizing: border-box;
}
.cartbar-inner {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14rpx);
  border: 1px solid var(--bbq-border);
  border-radius: 22rpx;
  box-shadow: var(--bbq-shadow);
  height: 112rpx;
  padding: 0 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sum-amount {
  font-size: 36rpx;
  font-weight: 900;
  color: var(--bbq-text);
}
.sum-sub {
  margin-top: 2rpx;
}
.submit {
  height: 84rpx;
  line-height: 84rpx;
  padding: 0 28rpx;
  background: #111111;
  color: #ffffff;
  font-size: 30rpx;
}
.submit[disabled] {
  opacity: 0.45;
}
.safe {
  height: 0;
}
</style>
