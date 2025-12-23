<template>
  <view class="bbq-page">
    <view class="bbq-container">
      <AppCard bordered>
        <view class="title">扫码点单</view>

        <view v-if="missing" class="state">
          <view class="state-title">请扫描桌贴二维码进入</view>
          <view class="state-sub bbq-hint">当前缺少扫码参数</view>
          <button class="btn-primary bbq-pill" @click="goHome">返回首页</button>
        </view>

        <view v-else>
          <view class="row">
            <text class="label">门店</text>
            <text class="value">{{ storeName || '-' }}</text>
          </view>
          <view class="row">
            <text class="label">桌号</text>
            <text class="value">{{ tableName || tableId || '-' }}</text>
          </view>

          <view v-if="error" class="error">{{ error }}</view>

          <view v-if="resolved" class="block">
            <view class="block-title">请选择用餐人数</view>
            <view class="chips">
              <view
                v-for="n in quick"
                :key="n"
                class="chip"
                :class="{ on: dinersCount === n }"
                @click="setDiners(n)"
              >
                {{ n }}人
              </view>
            </view>
            <view class="custom">
              <view class="custom-label bbq-hint">自定义（1~20）</view>
              <input class="input" type="number" :value="dinersInput" @input="onInput" placeholder="请输入人数" />
            </view>
          </view>

          <button class="btn-primary bbq-pill" :disabled="!canStart || starting" @click="start">
            {{ starting ? '处理中...' : '开始点单' }}
          </button>
        </view>
      </AppCard>

      <view class="bbq-safe-bottom-pad"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import AppCard from '../../components/AppCard.vue';
import { api } from '../../api';
import { useTableStore } from '../../stores/table';

const tableStore = useTableStore();

const storeId = ref('');
const tableId = ref('');
const sign = ref('');

const storeName = ref('');
const tableName = ref('');

const loading = ref(false);
const resolved = ref(false);
const starting = ref(false);
const error = ref('');

const dinersCount = ref<number>(0);
const dinersInput = ref('');
const quick = [1, 2, 3, 4, 5, 6, 7, 8];

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

const missing = computed(() => !storeId.value || !tableId.value || !sign.value);

const canStart = computed(() => resolved.value && dinersCount.value >= 1 && dinersCount.value <= 20);

async function resolve() {
  error.value = '';
  resolved.value = false;
  if (missing.value) return;
  loading.value = true;
  try {
    const res = await api.resolveTable({ storeId: storeId.value, tableId: tableId.value, sign: sign.value });
    tableName.value = (res as any).tableName || res.table?.name || '';
    storeName.value = (res as any).storeName || (res as any).store?.name || '';
    resolved.value = true;
  } catch (e: any) {
    error.value = e?.message ? String(e.message) : '桌贴无效/已过期，请联系店员';
  } finally {
    loading.value = false;
  }
}

function setDiners(n: number) {
  dinersCount.value = n;
  dinersInput.value = String(n);
}

function onInput(e: any) {
  const v = String(e?.detail?.value ?? '');
  dinersInput.value = v;
  const n = Math.floor(Number(v));
  dinersCount.value = Number.isFinite(n) ? n : 0;
}

async function start() {
  if (!canStart.value) return;
  starting.value = true;
  try {
    const res = await api.startTableSession({
      storeId: storeId.value,
      tableId: tableId.value,
      sign: sign.value,
      dinersCount: dinersCount.value
    });
    tableStore.setTable({
      storeId: res.storeId,
      tableId: res.tableId,
      tableName: res.tableName,
      dinersCount: res.dinersCount,
      sessionId: res.sessionId
    });
    uni.switchTab({ url: '/pages/menu/index' });
  } catch (e: any) {
    toast(e?.message ?? '开启失败');
  } finally {
    starting.value = false;
  }
}

function goHome() {
  uni.switchTab({ url: '/pages/home/index' });
}

onLoad((options) => {
  storeId.value = String(options?.storeId ?? '');
  tableId.value = String(options?.tableId ?? '');
  sign.value = String(options?.sign ?? '');
  resolve();
});
</script>

<style scoped>
.title {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--bbq-text);
  margin-bottom: 12rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1px solid var(--bbq-border);
}
.label {
  color: var(--bbq-muted);
}
.value {
  color: var(--bbq-text);
  font-weight: 700;
}
.error {
  margin-top: 14rpx;
  color: #b00020;
  font-size: 26rpx;
}
.block {
  margin-top: 16rpx;
}
.block-title {
  font-size: 28rpx;
  font-weight: 800;
  margin-bottom: 10rpx;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.chip {
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  border: 1px solid var(--bbq-border);
  background: rgba(255, 255, 255, 0.7);
  color: var(--bbq-text);
  font-size: 24rpx;
}
.chip.on {
  background: #111111;
  border-color: #111111;
  color: #ffffff;
}
.custom {
  margin-top: 14rpx;
}
.input {
  margin-top: 8rpx;
  border: 1px solid var(--bbq-border);
  border-radius: 16rpx;
  padding: 14rpx 14rpx;
  background: #ffffff;
  font-size: 26rpx;
  color: var(--bbq-text);
}
.btn-primary {
  margin-top: 18rpx;
  height: 84rpx;
  line-height: 84rpx;
  background: #111111;
  color: #ffffff;
  font-size: 28rpx;
}
.btn-primary::after {
  border: none;
}
.btn-primary[disabled] {
  opacity: 0.45;
}
.state {
  padding: 24rpx 0 6rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.state-title {
  font-size: 30rpx;
  font-weight: 800;
}
.state-sub {
  font-size: 26rpx;
}
</style>
