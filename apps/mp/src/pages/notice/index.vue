<template>
  <view class="bbq-page">
    <view class="bbq-container">
      <AppCard title="就餐须知" bordered>
        <view class="sec" v-for="s in sections" :key="s.title">
          <view class="sec-title">{{ s.title }}</view>
          <view class="sec-list">
            <view class="li" v-for="t in s.items" :key="t">
              <view class="dot"></view>
              <view class="txt">{{ t }}</view>
            </view>
          </view>
        </view>
      </AppCard>

      <view class="bbq-safe-bottom-pad"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppCard from '../../components/AppCard.vue';

const sections = [
  {
    title: '点单规则',
    items: ['堂食下单后请耐心等待出餐', '加购商品会与原订单一起出餐', '商品以门店实际供应为准']
  },
  {
    title: '加菜说明',
    items: ['可在点单页继续加购并提交新订单', '如需合并出餐请联系商家']
  },
  {
    title: '辣度说明',
    items: ['下单时必须选择辣度：不辣/微辣/中辣/特辣', '对辣椒过敏请提前告知商家']
  },
  {
    title: '退换规则',
    items: ['食品类商品非质量问题不支持退换', '如有问题请第一时间联系商家处理']
  }
];
</script>

<style scoped>
.sec {
  padding: 18rpx 0;
  border-bottom: 1px solid var(--bbq-border);
}
.sec:last-child {
  border-bottom: none;
}
.sec-title {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--bbq-text);
}
.sec-list {
  margin-top: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.li {
  display: flex;
  gap: 10rpx;
  align-items: flex-start;
}
.dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #111111;
  margin-top: 12rpx;
  flex: 0 0 auto;
}
.txt {
  font-size: 26rpx;
  color: var(--bbq-text);
  line-height: 1.6;
}
</style>
