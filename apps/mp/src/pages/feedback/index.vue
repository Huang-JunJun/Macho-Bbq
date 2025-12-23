<template>
  <view class="bbq-page">
    <view class="bbq-container">
      <AppCard title="意见反馈" bordered>
        <view class="field">
          <view class="label">问题类型</view>
          <picker :range="typeOptions" :value="typeIndex" @change="onTypeChange">
            <view class="picker">
              <text class="picker-text">{{ typeOptions[typeIndex] }}</text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="field">
          <view class="label">反馈内容</view>
          <textarea
            class="textarea"
            v-model="content"
            placeholder="请描述你的问题或建议"
            :maxlength="300"
            auto-height
          />
          <view class="counter bbq-hint">{{ content.length }}/300</view>
        </view>

        <button class="submit bbq-pill" @click="submit">提交</button>
      </AppCard>

      <view class="bbq-safe-bottom-pad"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppCard from '../../components/AppCard.vue';
import { api } from '../../api';
import { useTableStore } from '../../stores/table';

const typeOptions = ['菜品', '服务', '环境', '其他'];
const typeIndex = ref(0);
const content = ref('');
const submitting = ref(false);
const tableStore = useTableStore();

type FeedbackRecord = {
  type: string;
  content: string;
  createdAt: string;
};

const KEY = 'bbq_mp_feedback_v1';

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

function onTypeChange(e: any) {
  typeIndex.value = Number(e?.detail?.value ?? 0);
}

function save(record: FeedbackRecord) {
  try {
    const raw = uni.getStorageSync(KEY);
    const arr = raw ? (JSON.parse(String(raw)) as FeedbackRecord[]) : [];
    arr.unshift(record);
    uni.setStorageSync(KEY, JSON.stringify(arr.slice(0, 20)));
  } catch {
    uni.setStorageSync(KEY, JSON.stringify([record]));
  }
}

function submit() {
  if (submitting.value) return;
  const text = content.value.trim();
  if (!text) {
    toast('请填写反馈内容');
    return;
  }

  const type = typeOptions[typeIndex.value] || '其他';
  const typeCode = type === '菜品' ? 'DISH' : type === '服务' ? 'SERVICE' : type === '环境' ? 'ENV' : 'OTHER';

  const env = (import.meta as any)?.env ?? {};
  const storeId = tableStore.storeId || String(env.VITE_DEFAULT_STORE_ID ?? 'store_demo');
  const tableId = tableStore.tableId || undefined;

  const record: FeedbackRecord = { type, content: text, createdAt: new Date().toISOString() };
  save(record);

  submitting.value = true;
  api
    .createFeedback({ storeId, tableId, type: typeCode as any, content: text })
    .then(() => toast('已收到反馈'))
    .catch((e: any) => toast(e?.message ?? '提交失败'))
    .finally(() => {
      submitting.value = false;
      content.value = '';
    });
}
</script>

<style scoped>
.field {
  margin-top: var(--bbq-space-3);
}
.label {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--bbq-text);
  margin-bottom: 10rpx;
}
.picker {
  border: 1px solid var(--bbq-border);
  border-radius: 16rpx;
  background: #ffffff;
  padding: 18rpx 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.picker-text {
  font-size: 26rpx;
  color: var(--bbq-text);
}
.picker-arrow {
  font-size: 34rpx;
  color: var(--bbq-muted);
}
.textarea {
  border: 1px solid var(--bbq-border);
  border-radius: 16rpx;
  background: #ffffff;
  padding: 16rpx;
  font-size: 26rpx;
  color: var(--bbq-text);
  min-height: 180rpx;
  box-sizing: border-box;
}
.counter {
  text-align: right;
  margin-top: 8rpx;
}
.submit {
  margin-top: var(--bbq-space-3);
  height: 84rpx;
  line-height: 84rpx;
  background: #111111;
  color: #ffffff;
  font-size: 28rpx;
}
.submit::after {
  border: none;
}
</style>
