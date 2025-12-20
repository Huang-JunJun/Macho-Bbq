<template>
  <view class="bbq-page">
    <view class="bbq-container">
      <view class="nav">
        <view class="nav-left"></view>
        <view class="nav-title">个人中心</view>
        <view class="nav-right" @click="toast('开发中')">⋯</view>
      </view>

      <AppCard class="profile">
        <view class="profile-row">
          <view class="avatar"></view>
          <view class="profile-main">
            <view class="name">小程序用户</view>
            <button class="login-btn bbq-pill" @click="toast('开发中')">立即登录</button>
          </view>
        </view>
      </AppCard>

      <AppCard class="stats">
        <view class="stats-row">
          <view class="stat">
            <view class="stat-val">***</view>
            <view class="stat-lab">余额</view>
          </view>
          <view class="stat">
            <view class="stat-val">***</view>
            <view class="stat-lab">积分</view>
          </view>
          <view class="stat">
            <view class="stat-val">***</view>
            <view class="stat-lab">优惠券</view>
          </view>
        </view>
      </AppCard>

      <view class="vip">
        <view class="vip-left">
          <view class="vip-title">会员</view>
          <view class="vip-num">0</view>
          <view class="vip-sub">成长值</view>
        </view>
        <view class="vip-right">
          <view class="vip-code"></view>
          <view class="vip-cta">领取会员卡 ></view>
        </view>
      </view>

      <AppCard class="grid" padded>
        <view class="grid-row">
          <view v-for="it in items" :key="it.key" class="grid-item" @click="toast('开发中')">
            <image class="grid-ico" :src="it.icon" mode="aspectFit" />
            <view class="grid-txt">{{ it.label }}</view>
          </view>
        </view>
      </AppCard>

      <view class="footer">
        <view class="footer-txt">餐饮系统</view>
        <view class="footer-sub">点击了解详情 ></view>
      </view>

      <view class="bbq-safe-bottom-pad"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppCard from '../../components/AppCard.vue';

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

const items = computed(() => [
  { key: 'addr', label: '我的地址', icon: '/static/icons/pin.svg' },
  { key: 'orders', label: '我的订单', icon: '/static/icons/list.svg' },
  { key: 'recharge', label: '充值中心', icon: '/static/icons/card.svg' },
  { key: 'coupon', label: '领券中心', icon: '/static/icons/ticket.svg' },
  { key: 'checkin', label: '签到中心', icon: '/static/icons/check.svg' },
  { key: 'points', label: '积分商城', icon: '/static/icons/bag.svg' },
  { key: 'vip', label: '会员中心', icon: '/static/icons/crown.svg' },
  { key: 'wifi', label: 'wifi', icon: '/static/icons/wifi.svg' },
  { key: 'service', label: '联系客服', icon: '/static/icons/headset.svg' },
]);
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
.profile {
  margin-bottom: var(--bbq-space-3);
}
.profile-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 999rpx;
  background: #e5e7eb;
}
.profile-main {
  flex: 1;
}
.name {
  font-size: 34rpx;
  font-weight: 700;
  margin-bottom: 10rpx;
}
.login-btn {
  height: 72rpx;
  line-height: 72rpx;
  background: #ffffff;
  color: #111111;
  border: 1px solid var(--bbq-border);
  font-size: 28rpx;
  padding: 0 26rpx;
}
.stats {
  margin-bottom: var(--bbq-space-3);
}
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 0;
}
.stat-val {
  font-size: 34rpx;
  font-weight: 800;
}
.stat-lab {
  font-size: 24rpx;
  color: var(--bbq-muted);
}
.vip {
  background: #111111;
  color: #ffffff;
  border-radius: 24rpx;
  padding: 22rpx 22rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--bbq-space-3);
  overflow: hidden;
}
.vip-title {
  font-size: 32rpx;
  font-weight: 800;
  opacity: 0.92;
}
.vip-num {
  margin-top: 14rpx;
  font-size: 64rpx;
  font-weight: 800;
  line-height: 1;
}
.vip-sub {
  margin-top: 10rpx;
  font-size: 24rpx;
  opacity: 0.75;
}
.vip-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
}
.vip-code {
  width: 56rpx;
  height: 56rpx;
  border: 2px solid rgba(255, 255, 255, 0.55);
  border-radius: 12rpx;
  box-sizing: border-box;
  position: relative;
}
.vip-code::after {
  content: '';
  position: absolute;
  left: 10rpx;
  top: 10rpx;
  width: 16rpx;
  height: 16rpx;
  border: 2px solid rgba(255, 255, 255, 0.55);
  border-radius: 6rpx;
}
.vip-cta {
  font-size: 26rpx;
  opacity: 0.85;
}
.grid {
  margin-bottom: var(--bbq-space-3);
}
.grid-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18rpx 10rpx;
  padding-top: 6rpx;
}
.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 0;
}
.grid-ico {
  width: 56rpx;
  height: 56rpx;
  opacity: 0.9;
}
.grid-txt {
  font-size: 26rpx;
  color: var(--bbq-text);
}
.footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 22rpx 0 10rpx;
}
.footer-txt {
  font-size: 26rpx;
  color: #9ca3af;
}
.footer-sub {
  font-size: 24rpx;
  color: #c0c4cc;
}
</style>

