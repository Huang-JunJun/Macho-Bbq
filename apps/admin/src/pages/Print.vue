<template>
  <el-card style="margin-bottom: 16px">
    <template #header>
      <div style="display: flex; align-items: center; gap: 12px">
        <div style="font-weight: 700; flex: 1">打印机管理</div>
        <el-button @click="reloadPrinters">刷新</el-button>
      </div>
    </template>

    <el-form :inline="true" :model="printerForm" style="margin-bottom: 16px">
      <el-form-item label="名称">
        <el-input v-model="printerForm.name" placeholder="打印机名称" style="width: 220px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="createPrinter">新增打印机</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="printers" style="width: 100%">
      <el-table-column prop="name" label="名称" min-width="200" />
      <el-table-column prop="provider" label="类型" width="140" />
      <el-table-column prop="agentKey" label="AgentKey" min-width="260" />
      <el-table-column label="启用" width="120">
        <template #default="{ row }">
          <el-switch v-model="row.isActive" @change="(val: boolean) => togglePrinter(row.id, val)" />
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-card>
    <template #header>
      <div style="display: flex; align-items: center; gap: 12px">
        <div style="font-weight: 700; flex: 1">打印任务</div>
        <el-button @click="reloadJobs">刷新</el-button>
      </div>
    </template>

    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px">
      <el-select v-model="filters.type" placeholder="类型" style="width: 160px">
        <el-option label="全部" value="" />
        <el-option label="后厨单" value="KITCHEN_TICKET" />
        <el-option label="预结账清单" value="BILL_TICKET" />
        <el-option label="结账凭证" value="RECEIPT_TICKET" />
      </el-select>
      <el-select v-model="filters.status" placeholder="状态" style="width: 160px">
        <el-option label="全部" value="" />
        <el-option label="待打印" value="PENDING" />
        <el-option label="已领取" value="PICKED" />
        <el-option label="已发送" value="SENT" />
        <el-option label="失败" value="FAILED" />
      </el-select>
      <el-date-picker
        v-model="filters.timeRange"
        type="datetimerange"
        range-separator="至"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        style="width: 360px"
      />
      <el-input v-model="filters.keyword" placeholder="桌号/会话/订单号" style="width: 220px" />
      <el-button @click="reloadJobs">查询</el-button>
    </div>

    <el-table :data="jobs" style="width: 100%" v-loading="jobsLoading">
      <el-table-column label="类型" width="140">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.status === 'FAILED'" type="danger">失败</el-tag>
          <el-tag v-else-if="row.status === 'SENT'" type="success">已发送</el-tag>
          <el-tag v-else type="info">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="tableName" label="桌号" width="120" />
      <el-table-column prop="sessionId" label="会话" min-width="200" />
      <el-table-column prop="printerName" label="打印机" min-width="180" />
      <el-table-column prop="operatorEmail" label="操作人" min-width="160" />
      <el-table-column prop="createdAt" label="创建时间" min-width="180" />
      <el-table-column prop="errorMessage" label="错误信息" min-width="220" />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button v-if="row.status === 'FAILED'" size="small" @click="retry(row.id)">重试</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi, type Printer, type PrintJob } from '../api/admin';

const printers = ref<Printer[]>([]);
const printerForm = reactive({ name: '' });
const jobs = ref<PrintJob[]>([]);
const jobsLoading = ref(false);
const filters = reactive<{ type: string; status: string; timeRange: [Date, Date] | null; keyword: string }>({
  type: '',
  status: '',
  timeRange: null,
  keyword: ''
});

async function reloadPrinters() {
  try {
    const res = await adminApi.listPrinters();
    printers.value = res.printers;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载失败');
  }
}

async function createPrinter() {
  if (!printerForm.name.trim()) {
    ElMessage.warning('请输入名称');
    return;
  }
  try {
    await adminApi.createPrinter({ name: printerForm.name.trim() });
    printerForm.name = '';
    await reloadPrinters();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '创建失败');
  }
}

async function togglePrinter(id: string, isActive: boolean) {
  try {
    await adminApi.updatePrinter(id, { isActive });
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '更新失败');
    await reloadPrinters();
  }
}

function typeLabel(type: string) {
  if (type === 'KITCHEN_TICKET') return '后厨单';
  if (type === 'BILL_TICKET') return '预结账清单';
  if (type === 'RECEIPT_TICKET') return '结账凭证';
  return type;
}

async function reloadJobs() {
  jobsLoading.value = true;
  try {
    const [startAt, endAt] = filters.timeRange ?? [];
    const res = await adminApi.listPrintJobs({
      type: filters.type || undefined,
      status: filters.status || undefined,
      keyword: filters.keyword.trim() || undefined,
      startAt: startAt ? startAt.toISOString() : undefined,
      endAt: endAt ? endAt.toISOString() : undefined
    });
    jobs.value = res.jobs;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载失败');
  } finally {
    jobsLoading.value = false;
  }
}

async function retry(id: string) {
  try {
    await adminApi.retryPrintJob(id);
    await reloadJobs();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '重试失败');
  }
}

onMounted(() => {
  reloadPrinters();
  reloadJobs();
});
</script>
