<template>
  <view v-if="modelValue" class="mask" @click="close">
    <view class="sheet" @click.stop>
      <view class="head">
        <view class="title">购物车</view>
        <view class="actions">
          <view class="clear" @click="clear">清空</view>
          <view class="x" @click="close">×</view>
        </view>
      </view>

      <view v-if="cart.list.length === 0" class="empty">
        <view class="empty-text bbq-hint">购物车为空</view>
      </view>

      <scroll-view v-else class="list" scroll-y>
        <view v-for="it in cart.list" :key="it.productId" class="item" :class="{ invalid: it.isInvalid }">
          <view class="main">
            <view class="name-row">
              <view class="name">{{ it.name }}</view>
              <view v-if="it.statusTag" class="tag">{{ it.statusTag }}</view>
            </view>
            <view class="sub-row">
              <view class="price">￥{{ it.price.toFixed(2) }}</view>
              <view class="subtotal bbq-hint">小计 ￥{{ (it.price * it.qty).toFixed(2) }}</view>
            </view>
          </view>

          <view class="right">
            <view class="ops">
              <view class="op" :class="{ disabled: it.isInvalid || it.qty <= 0 }" @click="it.isInvalid ? null : minus(it.productId)">
                −
              </view>
              <view class="qty">{{ it.qty }}</view>
              <view class="op" :class="{ disabled: it.isInvalid }" @click="it.isInvalid ? null : add(it)">＋</view>
            </view>
            <view class="remove" @click="remove(it.productId)">移除</view>
          </view>
        </view>
      </scroll-view>

      <view class="foot">
        <view class="sum">合计 ￥{{ cart.totalAmount.toFixed(2) }}</view>
        <view class="hint" :class="{ on: cart.hasInvalid }">
          {{ cart.hasInvalid ? cart.invalidMessage : ' ' }}
        </view>
      </view>
      <view class="safe" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { useCartStore, type CartViewItem } from '../stores/cartStore';

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();

const cart = useCartStore();

function close() {
  emit('update:modelValue', false);
}

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

async function clear() {
  try {
    await cart.clearRemote();
  } catch (e: any) {
    toast(e?.message ?? '操作失败');
  }
}

async function remove(productId: string) {
  try {
    await cart.remove(productId);
  } catch (e: any) {
    toast(e?.message ?? '操作失败');
  }
}

async function add(it: CartViewItem) {
  try {
    await cart.add({ productId: it.productId, name: it.name, price: it.price, imageUrl: it.imageUrl ?? null });
  } catch (e: any) {
    toast(e?.message ?? '操作失败');
  }
}

async function minus(productId: string) {
  try {
    await cart.minus(productId);
  } catch (e: any) {
    toast(e?.message ?? '操作失败');
  }
}
</script>

<style scoped>
.mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(17, 17, 17, 0.35);
  z-index: 99999;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: var(--bbq-card);
  border-top-left-radius: 24rpx;
  border-top-right-radius: 24rpx;
  box-shadow: var(--bbq-shadow);
  overflow: hidden;
  max-height: 84vh;
  display: flex;
  flex-direction: column;
}
.head {
  padding: 18rpx var(--bbq-space-3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--bbq-border);
}
.title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--bbq-text);
}
.actions {
  display: flex;
  align-items: center;
  gap: 18rpx;
}
.clear {
  color: var(--bbq-muted);
  font-size: 26rpx;
}
.x {
  width: 52rpx;
  height: 52rpx;
  border-radius: 999rpx;
  border: 1px solid var(--bbq-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bbq-text);
  font-size: 34rpx;
}
.list {
  flex: 1;
  min-height: 0;
}
.empty {
  padding: 50rpx var(--bbq-space-3);
  display: flex;
  justify-content: center;
}
.item {
  padding: 18rpx var(--bbq-space-3);
  display: flex;
  gap: 16rpx;
  border-bottom: 1px solid var(--bbq-border);
}
.item.invalid {
  opacity: 0.55;
}
.main {
  flex: 1;
  min-width: 0;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--bbq-text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tag {
  font-size: 22rpx;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
  border: 1px solid var(--bbq-border);
  color: var(--bbq-text);
  background: rgba(255, 255, 255, 0.7);
}
.sub-row {
  margin-top: 6rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.price {
  font-size: 26rpx;
  color: var(--bbq-text);
}
.subtotal {
  font-size: 24rpx;
}
.right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10rpx;
}
.ops {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.op {
  width: 56rpx;
  height: 56rpx;
  border-radius: 999rpx;
  background: rgba(17, 17, 17, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bbq-text);
  font-size: 32rpx;
}
.op.disabled {
  opacity: 0.35;
}
.qty {
  width: 54rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--bbq-text);
}
.remove {
  font-size: 24rpx;
  color: var(--bbq-muted);
}
.foot {
  padding: 14rpx var(--bbq-space-3);
  border-top: 1px solid var(--bbq-border);
}
.sum {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--bbq-text);
}
.hint {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--bbq-muted);
  min-height: 28rpx;
}
.hint.on {
  color: #b00020;
}
.safe {
  height: calc(var(--bbq-safe-bottom) + 16rpx);
}
</style>
