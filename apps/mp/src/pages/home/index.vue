<template>
  <view class="bbq-page">
    <view class="bbq-container">
      <view class="nav">
        <view class="nav-left"></view>
        <view class="nav-title">猛男烧烤</view>
        <view class="nav-right" @click="toast('开发中')">⋯</view>
      </view>

      <view class="hero">
        <image class="hero-img" src="/static/hero.svg" mode="widthFix" />
      </view>

      <view class="entry-row">
        <view class="entry" @click="goMenu">
          <view class="entry-title">堂食</view>
          <view class="entry-sub">DINE IN</view>
          <image class="entry-ico" src="/static/icons/dinein.svg" mode="aspectFit" />
        </view>
        <view class="entry" @click="goMenu">
          <view class="entry-title">打包</view>
          <view class="entry-sub">PICK UP</view>
          <image class="entry-ico" src="/static/icons/pickup.svg" mode="aspectFit" />
        </view>
        <view class="entry" @click="goMenu">
          <view class="entry-title">外卖</view>
          <view class="entry-sub">DELIVERY</view>
          <image class="entry-ico" src="/static/icons/delivery.svg" mode="aspectFit" />
        </view>
      </view>

      <AppCard class="quick">
        <view class="quick-row">
          <view class="quick-item" @click="toast('开发中')">
            <view class="quick-ico">
              <image class="quick-ico-img" src="/static/icons/crown.svg" mode="aspectFit" />
            </view>
            <view class="quick-txt">会员中心</view>
          </view>
          <view class="quick-item" @click="toast('开发中')">
            <view class="quick-ico">
              <image class="quick-ico-img" src="/static/icons/card.svg" mode="aspectFit" />
            </view>
            <view class="quick-txt">充值中心</view>
          </view>
          <view class="quick-item" @click="toast('开发中')">
            <view class="quick-ico">
              <image class="quick-ico-img" src="/static/icons/gift.svg" mode="aspectFit" />
            </view>
            <view class="quick-txt">优惠活动</view>
          </view>
        </view>
      </AppCard>

      <AppCard class="store-card">
        <view class="store-title">猛男烧烤</view>
        <view class="store-meta">
          <view class="store-line">
            <text class="label">营业时间</text>
            <text class="value">18:00-次日 01:45</text>
          </view>
          <view class="store-line">
            <text class="label">地址</text>
            <text class="value">美兰区琼东北街附近</text>
          </view>
          <view class="store-line">
            <text class="label">电话</text>
            <text class="value">15595767778</text>
          </view>
        </view>
        <view class="store-actions">
          <button class="btn-ghost bbq-pill" @click="toast('开发中')">一键导航</button>
          <button class="btn-ghost bbq-pill" @click="toast('开发中')">联系商家</button>
        </view>
      </AppCard>

      <view class="bbq-safe-bottom-pad"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppCard from '../../components/AppCard.vue';

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

function goMenu() {
  uni.switchTab({ url: '/pages/menu/index' });
}
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
.entry-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--bbq-space-2);
  margin-top: var(--bbq-space-3);
  margin-bottom: var(--bbq-space-3);
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
