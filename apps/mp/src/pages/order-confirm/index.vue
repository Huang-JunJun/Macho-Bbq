<template>
  <view class="page">
    <view class="card">
      <view class="title">确认下单</view>
      <view class="meta">
        桌号：{{ tableStore.tableName || tableStore.tableId || '-' }} <text style="margin: 0 10rpx">·</text>
        {{ tableStore.dinersCount ? `${tableStore.dinersCount}人` : '-' }}
      </view>
    </view>

    <view class="card" style="margin-top: 16rpx">
      <view class="section-title">清单</view>
      <view v-for="it in cart.list" :key="it.productId" class="line" :class="{ invalid: it.isInvalid }">
        <view class="lname">
          <text class="lname-text">{{ it.name }}</text>
          <text v-if="it.statusTag" class="tag">{{ it.statusTag }}</text>
        </view>
        <view class="lqty">x{{ it.qty }}{{ it.unit ? ` ${it.unit}` : '' }}</view>
        <view class="lprice">￥{{ (it.price * it.qty).toFixed(2) }}</view>
      </view>
      <view class="total">
        <text>合计</text>
        <text class="amount">￥{{ cart.totalAmount.toFixed(2) }}</text>
      </view>
      <view v-if="cart.hasInvalid" class="warn">{{ cart.invalidMessage }}</view>
    </view>

    <view class="card" style="margin-top: 16rpx">
      <view class="section-title">必选辣度</view>
      <view class="spices">
        <view
          v-for="s in spiceOptions"
          :key="s.key"
          class="spice"
          :class="{ active: spiceKey === s.key }"
          @click="spiceKey = s.key"
        >
          {{ s.label }}
        </view>
      </view>
      <view v-if="!spiceKey" class="warn">选择辣度后才能提交哦</view>
      <view class="section-title" style="margin-top: 12rpx">备注</view>
      <input v-model="remark" class="input" placeholder="可选" />
    </view>

    <view class="footer">
      <button class="btn" :disabled="submitting || cart.totalQty === 0 || !spiceKey || cart.hasInvalid" @click="submit">提交订单</button>
      <button v-if="cart.hasInvalid" class="btn ghost" @click="goMenu">返回点单移除</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { api, type OrderChannel, type SpiceOption } from '../../api';
import { useTableStore } from '../../stores/table';
import { useCartStore } from '../../stores/cartStore';
import { useOrderStore } from '../../stores/order';

const tableStore = useTableStore();
const cart = useCartStore();
const orderStore = useOrderStore();

const spiceOptions = ref<SpiceOption[]>([]);
const spiceKey = ref('');
const remark = ref('');
const submitting = ref(false);
const channel = ref<OrderChannel>('DINE_IN');

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

async function ensureSessionValid() {
  const storeId = tableStore.storeId;
  const tableId = tableStore.tableId;
  const sessionId = tableStore.sessionId;
  const dinersCount = tableStore.dinersCount;
  if (!storeId || !tableId || !sessionId || !dinersCount) {
    uni.switchTab({ url: '/pages/menu/index' });
    return false;
  }
  try {
    const res = await api.checkTableSession({ storeId, tableId, sessionId });
    if (!res.valid) {
      uni.switchTab({ url: '/pages/menu/index' });
      return false;
    }
    return true;
  } catch {
    uni.switchTab({ url: '/pages/menu/index' });
    return false;
  }
}

async function loadCart() {
  try {
    await cart.fetchRemote();
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (msg.includes('结账') || msg.includes('重新扫码')) {
      uni.switchTab({ url: '/pages/menu/index' });
      return;
    }
    toast(msg || '加载失败');
  }
}

async function loadSpiceLabels() {
  const storeId = tableStore.storeId;
  if (!storeId) return;
  try {
    const res = await api.getStoreInfo(storeId);
    const raw = (res.store as any).spiceOptions ?? [];
    const list = Array.isArray(raw)
      ? raw
          .map((o: any, idx: number) => ({
            key: String(o?.key ?? '').trim(),
            label: String(o?.label ?? '').trim(),
            sort: Number(o?.sort ?? idx + 1),
            enabled: o?.enabled !== false
          }))
          .filter((o: any) => o.key && o.label && o.enabled)
          .sort((a: any, b: any) => a.sort - b.sort)
      : [];
    spiceOptions.value =
      list.length > 0
        ? list
        : [
            { key: 'NONE', label: '不辣', sort: 1, enabled: true },
            { key: 'MILD', label: '微辣', sort: 2, enabled: true },
            { key: 'MEDIUM', label: '中辣', sort: 3, enabled: true },
            { key: 'HOT', label: '特辣', sort: 4, enabled: true }
          ];
  } catch {}
}

async function submit() {
  const ok = await ensureSessionValid();
  if (!ok) return;
  await loadCart();

  const storeId = tableStore.storeId;
  const tableId = tableStore.tableId;
  const sessionId = tableStore.sessionId;
  const dinersCount = tableStore.dinersCount;
  if (!spiceKey.value) {
    toast('请选择辣度');
    return;
  }
  if (cart.totalQty === 0) {
    toast('购物车为空');
    return;
  }
  if (cart.hasInvalid) {
    toast(cart.invalidMessage);
    return;
  }

  submitting.value = true;
  try {
    const res = await api.createOrder({
      storeId,
      tableId,
      sessionId,
      dinersCount,
      channel: channel.value,
      spiceKey: spiceKey.value,
      remark: remark.value.trim() || undefined,
      items: cart.validList.map((i) => ({ productId: i.productId, qty: i.qty }))
    });
    orderStore.setLastOrderId(res.orderId);
    cart.clearLocal();
    uni.redirectTo({ url: `/pages/order-detail/index?id=${encodeURIComponent(res.orderId)}` });
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (msg.includes('结账') || msg.includes('重新扫码') || msg.includes('扫码桌贴')) {
      uni.switchTab({ url: '/pages/menu/index' });
      return;
    }
    toast(msg || '提交失败');
  } finally {
    submitting.value = false;
  }
}

onLoad((options) => {
  const c = String(options?.channel ?? '');
  if (c === 'DELIVERY' || c === 'PICKUP' || c === 'DINE_IN') channel.value = c;
  ensureSessionValid().then((ok) => {
    if (!ok) return;
    loadSpiceLabels();
    loadCart();
  });
});

onShow(() => {
  if (!tableStore.isReady) return;
  if (cart.totalQty === 0) toast('购物车为空');
  if (cart.hasInvalid) toast(cart.invalidMessage);
});

function goMenu() {
  uni.switchTab({ url: '/pages/menu/index' });
}
</script>

<style scoped>
.page {
  padding: 24rpx;
}
.card {
  border: 1px solid #e5e5e5;
  background: #fff;
  padding: 18rpx;
}
.title {
  font-size: 34rpx;
  font-weight: 700;
}
.meta {
  margin-top: 8rpx;
  color: #666;
}
.section-title {
  font-weight: 700;
  margin-bottom: 10rpx;
}
.line {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  border-bottom: 1px solid #f0f0f0;
}
.line.invalid {
  opacity: 0.55;
}
.lname {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.lname-text {
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
  border: 1px solid #e5e5e5;
  color: #666;
}
.lqty {
  width: 120rpx;
  text-align: right;
  color: #666;
}
.lprice {
  width: 180rpx;
  text-align: right;
}
.total {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
  font-weight: 700;
}
.amount {
  font-weight: 800;
}
.spices {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}
.spice {
  padding: 10rpx 14rpx;
  border: 1px solid #111;
  color: #111;
}
.spice.active {
  background: #111;
  color: #fff;
}
.warn {
  margin-top: 10rpx;
  color: #b00020;
}
.input {
  border: 1px solid #e5e5e5;
  padding: 12rpx;
}
.footer {
  margin-top: 18rpx;
}
.btn {
  background: #111;
  color: #fff;
}
.btn.ghost {
  margin-top: 10rpx;
  background: #fff;
  color: #111;
  border: 1px solid #e5e5e5;
}
.btn[disabled] {
  opacity: 0.5;
}
</style>
