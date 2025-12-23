<template>
  <view class="bbq-page page" :style="{ '--bbq-tabbar-offset': tabbarOffset, '--bbq-safe-bottom': safeBottom }">
    <view class="bbq-container header">
      <view class="header-top">
        <view class="h-left">
          <view class="store">{{ storeName || '门店' }}</view>
          <view class="meta">
            <text class="meta-item">桌号 {{ tableStore.tableName || tableStore.tableId || '-' }}</text>
            <text class="meta-dot">·</text>
            <text class="meta-item bbq-muted">{{ tableStore.dinersCount ? `${tableStore.dinersCount}人` : '未选择人数' }}</text>
          </view>
        </view>
        <view class="nav-right"></view>
      </view>
    </view>

    <view v-if="canOrder" class="content">
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
              </view>
            </view>
            <view class="ops">
              <template v-if="p.isSoldOut">
                <view class="soldout-pill">售罄</view>
              </template>
              <template v-else>
                <view v-if="qtyOf(p.id) === 0" class="op plus" @click="inc(p)">＋</view>
                <view v-else class="op-group">
                  <view class="op" @click="dec(p.id)">−</view>
                  <view class="qty">{{ qtyOf(p.id) }}</view>
                  <view class="op" @click="inc(p)">＋</view>
                </view>
              </template>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-if="canOrder" class="cartbar">
      <view class="cartbar-inner">
        <view class="sum" @click="openCart">
          <view class="cart-ico">
            <image class="cart-img" src="/static/icons/cart.svg" mode="aspectFit" />
            <view class="cart-dot" v-if="cart.totalQty > 0">{{ cart.totalQty > 99 ? '99+' : cart.totalQty }}</view>
          </view>
          <view class="sum-text">
            <view class="sum-amount">￥{{ cart.totalAmount.toFixed(2) }}</view>
            <view class="sum-sub bbq-hint">{{ cart.totalQty }} 件</view>
          </view>
        </view>
        <view class="submit-wrap">
          <button class="submit bbq-pill" :disabled="cart.totalQty === 0" @click="goConfirm">去下单</button>
        </view>
      </view>
      <view class="safe" />
    </view>

    <CartPopup v-if="canOrder" v-model="cartPopupVisible" />

    <view v-if="!canOrder" class="gate">
      <view class="gate-card">
        <view class="gate-title">{{ sessionInvalidReason === 'SETTLED' ? '本桌已结账，请重新扫码开桌' : '请先扫码桌贴开始点单' }}</view>
        <view class="gate-sub bbq-hint">{{ sessionInvalidReason === 'SETTLED' ? '请重新扫码选择人数后继续点单' : '扫码选择人数后才可点单' }}</view>
        <button class="gate-btn bbq-pill" @click="goScan">扫码点单</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onHide, onLoad, onShow } from '@dcloudio/uni-app';
import { api, type Category, type Product } from '../../api';
import { useTableStore } from '../../stores/table';
import { useCartStore } from '../../stores/cartStore';
import CartPopup from '../../components/CartPopup.vue';
import { scanToOrder } from '../../common/scan';

const tableStore = useTableStore();
const cart = useCartStore();

const storeName = ref('');
const categories = ref<Category[]>([]);
const activeCategoryId = ref('');
const cartPopupVisible = ref(false);
const tabbarOffset = ref('0px');
const safeBottom = ref('env(safe-area-inset-bottom)');
const sessionValid = ref(true);
const sessionInvalidReason = ref<'NONE' | 'SETTLED'>('NONE');
let poller: ReturnType<typeof setInterval> | null = null;

const activeProducts = computed(() => {
  const c = categories.value.find((x) => x.id === activeCategoryId.value);
  return (c?.products ?? []).filter((p) => p.isOnSale !== false);
});

const canOrder = computed(() => tableStore.isReady && sessionValid.value);

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

function qtyOf(productId: string) {
  return cart.items[productId]?.qty ?? 0;
}

async function inc(p: Product) {
  if (!canOrder.value) return;
  const ok = await verifySession();
  if (!ok) return;
  try {
    await cart.add({ productId: p.id, name: p.name, price: p.price / 100, imageUrl: p.imageUrl });
  } catch (e: any) {
    toast(e?.message ?? '操作失败');
  }
}

async function dec(productId: string) {
  if (!canOrder.value) return;
  const ok = await verifySession();
  if (!ok) return;
  try {
    await cart.minus(productId);
  } catch (e: any) {
    toast(e?.message ?? '操作失败');
  }
}

async function reload() {
  const storeId = tableStore.storeId;
  if (!storeId) return;
  const [s, m] = await Promise.all([api.getStoreInfo(storeId), api.getMenu(storeId)]);
  storeName.value = s.store.name;
  categories.value = m.categories;
  activeCategoryId.value = categories.value[0]?.id ?? '';

  const metas = m.categories
    .flatMap((c) => c.products ?? [])
    .map((p) => ({
      productId: p.id,
      name: p.name,
      price: p.price / 100,
      imageUrl: p.imageUrl,
      isOnSale: p.isOnSale,
      isSoldOut: p.isSoldOut
    }));
  cart.updateProductMap(metas);
}

async function openCart() {
  if (!canOrder.value) return;
  const ok = await verifySession();
  if (!ok) return;
  cartPopupVisible.value = true;
}

async function goConfirm() {
  if (!canOrder.value) return;
  const ok = await verifySession();
  if (!ok) return;
  if (cart.totalQty === 0) return;
  if (cart.hasInvalid) {
    toast(cart.invalidMessage);
    cartPopupVisible.value = true;
    return;
  }
  uni.navigateTo({ url: `/pages/order-confirm/index?channel=DINE_IN` });
}

function goScan() {
  scanToOrder();
}

function invalidateSession() {
  sessionValid.value = false;
  sessionInvalidReason.value = 'SETTLED';
  cart.clearLocal();
  tableStore.clear();
  storeName.value = '';
  categories.value = [];
  activeCategoryId.value = '';
  if (poller) {
    clearInterval(poller);
    poller = null;
  }
}

async function verifySession() {
  sessionValid.value = true;
  sessionInvalidReason.value = 'NONE';

  if (!tableStore.isReady) return false;
  const storeId = tableStore.storeId;
  const tableId = tableStore.tableId;
  const sessionId = tableStore.sessionId;
  if (!storeId || !tableId || !sessionId) return false;
  try {
    const res = await api.checkTableSession({ storeId, tableId, sessionId });
    if (!res.valid) {
      invalidateSession();
      return false;
    }
    sessionValid.value = true;
    return true;
  } catch {
    invalidateSession();
    return false;
  }
}

async function fetchCart() {
  if (!tableStore.isReady) return;
  try {
    await cart.fetchRemote();
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (msg.includes('结账') || msg.includes('重新扫码')) {
      invalidateSession();
      return;
    }
    toast(msg || '加载失败');
  }
}

function startPoll() {
  if (poller) return;
  poller = setInterval(() => {
    if (!tableStore.isReady || !sessionValid.value) return;
    fetchCart();
  }, 2000);
}

function stopPoll() {
  if (!poller) return;
  clearInterval(poller);
  poller = null;
}

onLoad(() => {
  try {
    const info: any = uni.getSystemInfoSync();
    const p = String(info?.uniPlatform ?? info?.platform ?? '').toLowerCase();
    const isH5 = p === 'web' || p === 'h5';
    tabbarOffset.value = isH5 ? '50px' : '0px';
    safeBottom.value = isH5 ? 'env(safe-area-inset-bottom)' : '0px';
  } catch {
    tabbarOffset.value = '0px';
    safeBottom.value = '0px';
  }
  if (tableStore.isReady) reload().catch((e: any) => toast(e?.message ?? '加载失败'));
});

onShow(async () => {
  if (!tableStore.isReady) {
    stopPoll();
    storeName.value = '';
    categories.value = [];
    activeCategoryId.value = '';
    return;
  }
  const ok = await verifySession();
  if (!ok) return;
  reload().catch((e: any) => toast(e?.message ?? '加载失败'));
  fetchCart();
  startPoll();
});

onHide(() => {
  stopPoll();
});
</script>

<style scoped>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.header {
  padding-bottom: var(--bbq-space-3);
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
.content {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: var(--bbq-space-2);
  padding: 0 var(--bbq-space-3);
  margin-top: var(--bbq-space-3);
  padding-bottom: calc(220rpx + var(--bbq-tabbar-offset, var(--bbq-tabbar-height)) + var(--bbq-safe-bottom));
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
  width: 100%;
}
.cat {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--bbq-border);
  border-radius: 16rpx;
  padding: 16rpx 14rpx;
  color: var(--bbq-text);
  font-size: 26rpx;
  width: 100%;
  box-sizing: border-box;
  min-height: 84rpx;
  display: flex;
  align-items: center;
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
.op-group {
  display: flex;
  align-items: center;
  gap: 10rpx;
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
.op.plus {
  background: rgba(17, 17, 17, 0.08);
}
.qty {
  width: 44rpx;
  text-align: center;
  font-size: 28rpx;
  color: var(--bbq-text);
}
.soldout-pill {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  border: 1px solid var(--bbq-border);
  background: rgba(255, 255, 255, 0.7);
  font-size: 22rpx;
  color: var(--bbq-muted);
}
.cartbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--bbq-tabbar-offset, var(--bbq-tabbar-height)) + var(--bbq-safe-bottom) + 12rpx);
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
  gap: 16rpx;
}
.sum {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.sum-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.cart-ico {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  border: 1px solid var(--bbq-border);
  background: #ffffff;
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cart-img {
  width: 34rpx;
  height: 34rpx;
  opacity: 0.8;
}
.cart-dot {
  position: absolute;
  right: 2rpx;
  top: 2rpx;
  transform: translate(40%, -40%);
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  background: #111111;
  color: #ffffff;
  font-size: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit-wrap {
  margin-left: auto;
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  align-items: center;
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
  line-height: 1;
  padding: 0 28rpx;
  background: #111111;
  color: #ffffff;
  font-size: 30rpx;
  min-width: 200rpx;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit::after {
  border: none;
}
.submit[disabled] {
  opacity: 0.45;
}
.safe {
  height: 0;
}

.gate {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: var(--bbq-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--bbq-space-3);
  box-sizing: border-box;
}
.gate-card {
  width: 100%;
  background: var(--bbq-card);
  border-radius: var(--bbq-radius-card);
  box-shadow: var(--bbq-shadow);
  padding: 28rpx 22rpx;
  border: 1px solid var(--bbq-border);
}
.gate-title {
  font-size: 36rpx;
  font-weight: 900;
  color: var(--bbq-text);
  text-align: center;
}
.gate-sub {
  margin-top: 10rpx;
  text-align: center;
  font-size: 26rpx;
}
.gate-btn {
  margin-top: 18rpx;
  height: 92rpx;
  line-height: 92rpx;
  background: #111111;
  color: #ffffff;
  font-size: 32rpx;
  width: 100%;
}
.gate-btn::after {
  border: none;
}
</style>
