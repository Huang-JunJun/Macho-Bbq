<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center; gap: 12px">
        <div style="font-weight: 700; flex: 1">意见反馈</div>
        <el-button @click="reload">刷新</el-button>
      </div>
    </template>

    <el-table :data="feedbacks" style="width: 100%" v-loading="loading">
      <el-table-column label="时间" min-width="180">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="类型" width="120">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column label="桌台" width="160">
        <template #default="{ row }">{{ row.table?.name || row.tableId || '-' }}</template>
      </el-table-column>
      <el-table-column label="内容" min-width="320">
        <template #default="{ row }">
          <span>{{ row.content.length > 40 ? row.content.slice(0, 40) + '…' : row.content }}</span>
        </template>
      </el-table-column>
      <el-table-column label="图片" width="100">
        <template #default="{ row }">{{ row.images?.length ? `有(${row.images.length})` : '无' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small" @click="openDetail(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="visible" title="反馈详情" width="760px">
    <div v-if="current">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="时间">{{ formatDateTime(current.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ typeLabel(current.type) }}</el-descriptions-item>
        <el-descriptions-item label="桌台">{{ current.table?.name || current.tableId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系方式">{{ current.contact || '-' }}</el-descriptions-item>
        <el-descriptions-item label="内容" :span="2">{{ current.content }}</el-descriptions-item>
      </el-descriptions>

      <div style="margin-top: 12px; font-weight: 700">图片</div>
      <div v-if="current.images?.length" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px">
        <el-image
          v-for="(url, idx) in current.images"
          :key="idx"
          :src="resolvePublicUrl(url)"
          style="width: 120px; height: 120px; border: 1px solid #ebeef5"
          fit="cover"
          :preview-src-list="previewImages"
          :initial-index="idx"
          preview-teleported
        >
          <template #placeholder>
            <div
              style="
                width: 120px;
                height: 120px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #909399;
                font-size: 12px;
              "
            >
              加载中
            </div>
          </template>
          <template #error>
            <div
              style="
                width: 120px;
                height: 120px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #909399;
                font-size: 12px;
              "
            >
              加载失败
            </div>
          </template>
        </el-image>
      </div>
      <div v-else style="color: #909399; margin-top: 8px">无</div>
    </div>
    <div v-else style="color: #909399">加载中</div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi, type Feedback } from '../api/admin';
import { resolvePublicUrl, resolvePublicUrls } from '../common/url';
import { formatDateTime } from '../common/time';

const loading = ref(false);
const feedbacks = ref<Feedback[]>([]);
const visible = ref(false);
const current = ref<Feedback | null>(null);
const previewImages = computed(() => resolvePublicUrls(current.value?.images));

function typeLabel(t: Feedback['type']) {
  if (t === 'DISH') return '菜品';
  if (t === 'SERVICE') return '服务';
  if (t === 'ENV') return '环境';
  return '其他';
}

async function reload() {
  loading.value = true;
  try {
    const res = await adminApi.listFeedback();
    feedbacks.value = res.feedbacks;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载失败');
  } finally {
    loading.value = false;
  }
}

function openDetail(row: Feedback) {
  current.value = row;
  visible.value = true;
}

onMounted(reload);
</script>
