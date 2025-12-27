<template>
  <view class="bbq-page">
    <view class="bbq-container page-panel">
      <view class="page-inner">
        <!-- <view class="nav">
          <view class="nav-left"></view>
          <view class="nav-title">{{ store?.name || '猛男烧烤' }}</view>
          <view class="nav-right" @click="toast('开发中')">⋯</view>
        </view> -->

        <view class="hero">
          <image class="hero-img" src="/static/logo.jpg" mode="widthFix" />
        </view>

        <!-- <view class="logo-wrap">
          <image class="logo" src="@/static/logo.jpg" mode="aspectFit" />
        </view> -->

        <AppCard class="scan-card" padded>
          <view class="scan-title">扫码点单</view>
          <view class="scan-sub bbq-hint">请扫描桌贴二维码开始点单</view>
          <button class="scan-btn bbq-pill" @click="goMenu">扫码点单</button>
        </AppCard>

        <AppCard class="store-card">
          <view class="store-title">{{ store?.name || '猛男烧烤' }}</view>
          <view class="store-meta">
            <view class="store-line">
              <text class="label">营业时间</text>
              <text class="value">{{ store?.businessHours || '-' }}</text>
            </view>
            <view class="store-line">
              <text class="label">地址</text>
              <text class="value">{{ store?.address || '-' }}</text>
            </view>
            <view class="store-line">
              <text class="label">电话</text>
              <text class="value">{{ store?.phone || '-' }}</text>
            </view>
          </view>
          <view class="store-actions">
            <button class="btn-ghost bbq-pill" @click="callStore">联系商家</button>
          </view>
        </AppCard>

        <view class="bbq-safe-bottom-pad"></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import AppCard from '../../components/AppCard.vue';
import { api, type Store } from '../../api';
import { scanToOrder } from '../../common/scan';

const store = ref<Store | null>(null);

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

function getDefaultStoreId() {
  const env = (import.meta as any)?.env ?? {};
  return String(env.VITE_DEFAULT_STORE_ID ?? 'store_demo');
}

function getStorePhone() {
  const fromApi = String((store.value as any)?.phone ?? '');
  if (fromApi) return fromApi;
  const env = (import.meta as any)?.env ?? {};
  return String(env.VITE_STORE_PHONE ?? '');
}

function goMenu() {
  scanToOrder();
}

function callStore() {
  const phone = getStorePhone().trim();
  if (!phone) {
    toast('未配置门店电话');
    return;
  }
  uni.makePhoneCall({
    phoneNumber: phone,
    fail: () => toast('呼叫失败')
  });
}

async function reload() {
  const storeId = getDefaultStoreId();
  if (!storeId) return;
  const res = await api.getStoreInfo(storeId);
  store.value = res.store as any;
}

onLoad(() => {
  reload().catch(() => null);
});
</script>

<style scoped>
.nav {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--bbq-space-3);
}
.nav-left {
  width: 80rpx;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--bbq-text);
}
.nav-right {
  width: 80rpx;
  text-align: right;
  font-size: 44rpx;
  line-height: 44rpx;
  color: var(--bbq-text);
}
.page-panel {
  background: #ffffff;
  padding: 0;
  min-height: 100vh;
  border-radius: 0;
}
.page-inner {
  padding: var(--bbq-space-3);
  padding-bottom: calc(var(--bbq-tabbar-height) + var(--bbq-safe-bottom));
  box-sizing: border-box;
}
.hero {
  background: var(--bbq-card);
  border-radius: var(--bbq-radius-card);
  box-shadow: var(--bbq-shadow);
  padding: 10rpx 10rpx 0;
  overflow: hidden;
}
.hero-img {
  width: 100%;
}
.logo-wrap {
  display: flex;
  justify-content: center;
  margin-top: 18rpx;
  margin-bottom: 18rpx;
}
.logo {
  width: 100%;
  height: 200rpx;
}
.entry-row {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: var(--bbq-space-2);
  margin-top: var(--bbq-space-3);
  margin-bottom: var(--bbq-space-3);
}
.scan-card {
  margin-top: var(--bbq-space-3);
  margin-bottom: var(--bbq-space-3);
}
.scan-title {
  font-size: 40rpx;
  font-weight: 900;
  color: var(--bbq-text);
}
.scan-sub {
  margin-top: 10rpx;
  font-size: 26rpx;
}
.scan-btn {
  margin-top: 18rpx;
  height: 92rpx;
  line-height: 92rpx;
  background: #111111;
  color: #ffffff;
  font-size: 32rpx;
  width: 100%;
}
.scan-btn::after {
  border: none;
}
.entry {
  background: var(--bbq-card);
  border-radius: var(--bbq-radius-card);
  box-shadow: var(--bbq-shadow);
  padding: var(--bbq-space-3);
  min-height: 200rpx;
  position: relative;
  overflow: hidden;
}
.entry-title {
  font-size: 34rpx;
  font-weight: 800;
  letter-spacing: 0.4rpx;
}
.entry-sub {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--bbq-muted);
}
.entry-ico {
  width: 120rpx;
  height: 120rpx;
  position: absolute;
  right: 18rpx;
  bottom: 14rpx;
  opacity: 0.9;
}
.quick {
  margin-bottom: var(--bbq-space-3);
}
.quick-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--bbq-space-2);
}
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 0;
}
.quick-ico {
  width: 120rpx;
  height: 120rpx;
  border-radius: 999rpx;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.quick-ico-img {
  width: 56rpx;
  height: 56rpx;
  opacity: 0.9;
}
.quick-txt {
  font-size: 26rpx;
  color: var(--bbq-text);
}
.store-card {
  margin-bottom: var(--bbq-space-3);
}
.store-title {
  font-size: 36rpx;
  font-weight: 800;
  margin-bottom: 10rpx;
}
.store-meta {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.store-line {
  display: flex;
  gap: 12rpx;
}
.label {
  width: 140rpx;
  color: var(--bbq-muted);
  font-size: 26rpx;
}
.value {
  flex: 1;
  color: var(--bbq-text);
  font-size: 26rpx;
}
.store-actions {
  display: flex;
  gap: var(--bbq-space-2);
  margin-top: var(--bbq-space-3);
}
.btn-ghost {
  flex: 1;
  height: 86rpx;
  line-height: 86rpx;
  background: #ffffff;
  color: #111111;
  border: 1px solid var(--bbq-border);
  font-size: 28rpx;
}
</style>
