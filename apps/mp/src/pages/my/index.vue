<template>
  <view class="bbq-page">
    <view class="bbq-container page-panel">
      <view class="page-inner">
        <AppCard class="profile" padded>
          <view class="profile-row">
            <view class="avatar">
              <image v-if="user.avatar" class="avatar-img" :src="user.avatar" mode="aspectFill" />
            </view>
            <view class="profile-main">
              <view class="name">{{ user.displayName }}</view>
              <view class="sub bbq-hint">{{ user.loggedIn ? '已登录' : '未登录也可正常点单' }}</view>
            </view>
            <button class="login-btn bbq-pill" @click="user.loggedIn ? logout() : login()">
              {{ user.loggedIn ? '退出登录' : '立即登录' }}
            </button>
          </view>
        </AppCard>

        <AppCard class="grid" padded>
          <view class="grid-row">
            <view class="grid-item" @click="goOrders">
              <image class="grid-ico" src="/static/icons/list.svg" mode="aspectFit" />
              <view class="grid-txt">我的订单</view>
            </view>
            <view class="grid-item" @click="callStore">
              <image class="grid-ico" src="/static/icons/phone.svg" mode="aspectFit" />
              <view class="grid-txt">联系商家</view>
            </view>
            <view class="grid-item" @click="goStoreInfo">
              <image class="grid-ico" src="/static/icons/store.svg" mode="aspectFit" />
              <view class="grid-txt">门店信息</view>
            </view>
            <view class="grid-item" @click="goFeedback">
              <image class="grid-ico" src="/static/icons/feedback.svg" mode="aspectFit" />
              <view class="grid-txt">意见反馈</view>
            </view>
            <view class="grid-item" @click="goNotice">
              <image class="grid-ico" src="/static/icons/notice.svg" mode="aspectFit" />
              <view class="grid-txt">就餐须知</view>
            </view>
            <view class="grid-item" @click="goScan">
              <image class="grid-ico" src="/static/icons/scan.svg" mode="aspectFit" />
              <view class="grid-txt">扫码点单</view>
            </view>
          </view>
        </AppCard>

        <view class="bbq-safe-bottom-pad"></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import AppCard from '../../components/AppCard.vue';
import { api, type Store } from '../../api';
import { useTableStore } from '../../stores/table';
import { useUserStore } from '../../stores/userStore';
import { authApi } from '../../api/auth';
import { scanToOrder } from '../../common/scan';

const tableStore = useTableStore();
const store = ref<Store | null>(null);
const user = useUserStore();

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

function goOrders() {
  uni.switchTab({ url: '/pages/order-list/index' });
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

function goStoreInfo() {
  uni.navigateTo({ url: '/pages/store-info/index' });
}

function goFeedback() {
  uni.navigateTo({ url: '/pages/feedback/index' });
}

function goNotice() {
  uni.navigateTo({ url: '/pages/notice/index' });
}

function goScan() {
  scanToOrder();
}

async function login() {
  let p = '';
  try {
    const info: any = uni.getSystemInfoSync();
    p = String(info?.uniPlatform ?? info?.platform ?? '').toLowerCase();
  } catch {}
  if (p === 'web' || p === 'h5') {
    toast('请在微信小程序内登录');
    return;
  }

  const code = await new Promise<string>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res: any) => resolve(String((res as any)?.code ?? '')),
      fail: (e: any) => reject(e)
    } as any);
  });

  if (!code) {
    toast('登录失败');
    return;
  }

  try {
    const res = await authApi.loginWithWeixin(code);
    user.setSession({ token: res.token, user: res.user as any });
    toast('登录成功');
  } catch (e: any) {
    toast(e?.message ?? '登录失败');
  }
}

function logout() {
  user.clear();
  toast('已退出');
}

onLoad(() => {
  reload().catch(() => null);
});

onShow(() => {
  reload().catch(() => null);
});
</script>

<style scoped>
.profile {
  margin-bottom: var(--bbq-space-3);
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
.profile-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 999rpx;
  background: #e5e7eb;
  overflow: hidden;
  flex: 0 0 auto;
}
.avatar-img {
  width: 96rpx;
  height: 96rpx;
}
.profile-main {
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--bbq-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub {
  margin-top: 4rpx;
}
.login-btn {
  height: 72rpx;
  line-height: 72rpx;
  background: #ffffff;
  color: #111111;
  border: 1px solid var(--bbq-border);
  font-size: 26rpx;
  padding: 0 22rpx;
  flex: 0 0 auto;
}
.login-btn::after {
  border: none;
}
.grid-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
  padding-top: 6rpx;
}
.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 18rpx 0;
}
.grid-ico {
  width: 56rpx;
  height: 56rpx;
  opacity: 0.92;
}
.grid-txt {
  font-size: 26rpx;
  color: var(--bbq-text);
  font-weight: 700;
}
</style>
