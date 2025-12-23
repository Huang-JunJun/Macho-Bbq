<template>
  <view class="bbq-page">
    <view class="bbq-container">
      <AppCard title="门店信息" bordered>
        <view class="row">
          <text class="label">门店名</text>
          <text class="value">{{ store?.name || '猛男烧烤' }}</text>
        </view>
        <view class="row">
          <text class="label">营业时间</text>
          <text class="value">{{ store?.businessHours || '-' }}</text>
        </view>
        <view class="row">
          <text class="label">地址</text>
          <text class="value">{{ store?.address || '-' }}</text>
        </view>
        <view class="row">
          <text class="label">电话</text>
          <text class="value">{{ store?.phone || '-' }}</text>
        </view>

        <view class="actions">
          <button class="btn-ghost bbq-pill" @click="copyAddress">复制地址</button>
          <button class="btn-primary bbq-pill" @click="callStore">联系商家</button>
        </view>
      </AppCard>

      <view class="bbq-safe-bottom-pad"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import AppCard from '../../components/AppCard.vue';
import { api, type Store } from '../../api';
import { useTableStore } from '../../stores/table';

const tableStore = useTableStore();
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

async function reload() {
  const storeId = tableStore.storeId || getDefaultStoreId();
  if (!storeId) return;
  const res = await api.getStoreInfo(storeId);
  store.value = res.store as any;
}

function copyAddress() {
  const address = String(store.value?.address ?? '').trim();
  if (!address) {
    toast('未配置门店地址');
    return;
  }
  uni.setClipboardData({
    data: address,
    success: () => toast('已复制')
  });
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

onLoad(() => {
  reload().catch(() => null);
});

onShow(() => {
  reload().catch(() => null);
});
</script>

<style scoped>
.row {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  padding: 14rpx 0;
  border-bottom: 1px solid var(--bbq-border);
}
.row:last-child {
  border-bottom: none;
}
.label {
  color: var(--bbq-muted);
  font-size: 26rpx;
  flex: 0 0 auto;
}
.value {
  color: var(--bbq-text);
  font-size: 26rpx;
  text-align: right;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.actions {
  margin-top: var(--bbq-space-3);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
}
.btn-ghost {
  height: 84rpx;
  line-height: 84rpx;
  background: #ffffff;
  color: #111111;
  border: 1px solid var(--bbq-border);
  font-size: 28rpx;
}
.btn-primary {
  height: 84rpx;
  line-height: 84rpx;
  background: #111111;
  color: #ffffff;
  border: 1px solid #111111;
  font-size: 28rpx;
}
.btn-ghost::after,
.btn-primary::after {
  border: none;
}
</style>
