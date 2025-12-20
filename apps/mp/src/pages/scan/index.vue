<template>
  <view class="page">
    <view class="card">
      <view class="title">确认桌号</view>
      <view class="row">
        <text class="label">门店</text>
        <text class="value">{{ storeId || '-' }}</text>
      </view>
      <view class="row">
        <text class="label">桌号</text>
        <text class="value">{{ tableName || tableId || '-' }}</text>
      </view>
      <view v-if="error" class="error">{{ error }}</view>
      <button class="btn" :disabled="loading || !resolved" @click="confirm">确认</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '../../api';
import { useTableStore } from '../../stores/table';

const tableStore = useTableStore();

const storeId = ref('');
const tableId = ref('');
const sign = ref('');
const tableName = ref('');
const loading = ref(false);
const resolved = ref(false);
const error = ref('');

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

async function resolve() {
  error.value = '';
  resolved.value = false;
  if (!storeId.value || !tableId.value || !sign.value) {
    error.value = '缺少扫码参数';
    return;
  }
  loading.value = true;
  try {
    const res = await api.resolveTable({ storeId: storeId.value, tableId: tableId.value, sign: sign.value });
    tableName.value = res.table.name;
    resolved.value = true;
  } catch (e: any) {
    error.value = e?.message ?? '校验失败';
  } finally {
    loading.value = false;
  }
}

function confirm() {
  if (!resolved.value) {
    toast('请先完成校验');
    return;
  }
  tableStore.setTable({ storeId: storeId.value, tableId: tableId.value, tableName: tableName.value });
  uni.redirectTo({ url: '/pages/menu/index' });
}

onLoad((options) => {
  storeId.value = String(options?.storeId ?? '');
  tableId.value = String(options?.tableId ?? '');
  sign.value = String(options?.sign ?? '');
  resolve();
});
</script>

<style scoped>
.page {
  padding: 24rpx;
}
.card {
  border: 1px solid #e5e5e5;
  background: #fff;
  padding: 24rpx;
}
.title {
  font-size: 36rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1px solid #f0f0f0;
}
.label {
  color: #666;
}
.value {
  color: #111;
}
.error {
  color: #b00020;
  margin-top: 16rpx;
}
.btn {
  margin-top: 24rpx;
  background: #111;
  color: #fff;
}
.btn[disabled] {
  opacity: 0.5;
}
</style>
