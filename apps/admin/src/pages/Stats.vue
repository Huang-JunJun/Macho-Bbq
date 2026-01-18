<template>
  <div>
    <el-card>
      <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center">
        <el-date-picker v-model="startAt" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" />
        <el-date-picker v-model="endAt" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" />
        <el-button-group>
          <el-button @click="setQuickRange('today')">今天</el-button>
          <el-button @click="setQuickRange('7')">近7天</el-button>
          <el-button @click="setQuickRange('30')">近30天</el-button>
          <el-button @click="setQuickRange('month')">本月</el-button>
        </el-button-group>
        <el-button type="primary" :loading="loading" @click="loadStats">查询</el-button>
        <el-button @click="resetRange">重置</el-button>
      </div>
    </el-card>

    <el-row :gutter="12" style="margin-top: 12px">
      <el-col :span="8">
        <el-card>
          <div style="color: #909399; font-size: 12px">营业额（折后）</div>
          <div style="font-size: 22px; font-weight: 700">￥{{ yuan(stats?.summary.revenue ?? 0) }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div style="color: #909399; font-size: 12px">原价营业额</div>
          <div style="font-size: 22px; font-weight: 700">￥{{ yuan(stats?.summary.originalRevenue ?? 0) }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div style="color: #909399; font-size: 12px">折扣总额</div>
          <div style="font-size: 22px; font-weight: 700">-￥{{ yuan(stats?.summary.discountTotal ?? 0) }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" style="margin-top: 12px">
      <el-col :span="8">
        <el-card>
          <div style="color: #909399; font-size: 12px">订单数</div>
          <div style="font-size: 22px; font-weight: 700">{{ stats?.summary.orderCount ?? 0 }} 单</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div style="color: #909399; font-size: 12px">客单价</div>
          <div style="font-size: 22px; font-weight: 700">￥{{ yuan(stats?.summary.avgOrderAmount ?? 0) }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div style="color: #909399; font-size: 12px">桌台数</div>
          <div style="font-size: 22px; font-weight: 700">{{ stats?.summary.tableCount ?? 0 }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: 12px">
      <el-col :span="12">
        <el-card>
          <div style="font-weight: 700; margin-bottom: 8px">营业额趋势</div>
          <div ref="revenueChartRef" style="height: 280px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <div style="font-weight: 700; margin-bottom: 8px">订单数趋势</div>
          <div ref="orderChartRef" style="height: 280px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: 12px">
      <el-col :span="12">
        <el-card>
          <div style="font-weight: 700; margin-bottom: 8px">客单价趋势</div>
          <div ref="avgChartRef" style="height: 280px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <div style="font-weight: 700; margin-bottom: 8px">高峰时段热力图</div>
          <div ref="heatmapChartRef" style="height: 280px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: 12px">
      <el-col :span="12">
        <el-card>
          <div style="font-weight: 700; margin-bottom: 8px">翻台次数 Top 桌台</div>
          <div ref="tableChartRef" style="height: 320px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <div style="font-weight: 700; margin-bottom: 8px">销量 Top 商品</div>
          <div ref="productChartRef" style="height: 320px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: 12px">
      <el-col :span="24">
        <el-card>
          <div style="font-weight: 700; margin-bottom: 8px">品类占比</div>
          <div ref="categoryChartRef" style="height: 320px"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import { ElMessage } from 'element-plus';
import { adminApi, type StatsOverview } from '../api/admin';

const startAt = ref<string>('');
const endAt = ref<string>('');
const loading = ref(false);
const stats = ref<StatsOverview | null>(null);

const revenueChartRef = ref<HTMLDivElement | null>(null);
const orderChartRef = ref<HTMLDivElement | null>(null);
const avgChartRef = ref<HTMLDivElement | null>(null);
const heatmapChartRef = ref<HTMLDivElement | null>(null);
const tableChartRef = ref<HTMLDivElement | null>(null);
const productChartRef = ref<HTMLDivElement | null>(null);
const categoryChartRef = ref<HTMLDivElement | null>(null);

const charts = new Map<string, echarts.ECharts>();

function yuan(cents: number) {
  return (cents / 100).toFixed(2);
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function setQuickRange(type: 'today' | '7' | '30' | 'month') {
  const now = new Date();
  if (type === 'today') {
    const today = formatDate(now);
    startAt.value = today;
    endAt.value = today;
    return;
  }
  if (type === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    startAt.value = formatDate(first);
    endAt.value = formatDate(now);
    return;
  }
  const days = type === '7' ? 7 : 30;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  startAt.value = formatDate(start);
  endAt.value = formatDate(now);
}

function resetRange() {
  startAt.value = '';
  endAt.value = '';
  loadStats();
}

async function loadStats() {
  if (startAt.value && endAt.value && toDate(startAt.value) > toDate(endAt.value)) {
    ElMessage.warning('开始时间不能晚于结束时间');
    return;
  }
  loading.value = true;
  try {
    stats.value = await adminApi.getStats({
      startAt: startAt.value || undefined,
      endAt: endAt.value || undefined
    });
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载统计数据失败');
  } finally {
    loading.value = false;
  }
}

function buildEmptyOption() {
  return {
    title: {
      text: '暂无数据',
      left: 'center',
      top: 'center',
      textStyle: { color: '#c0c4cc', fontSize: 14 }
    },
    xAxis: { show: false },
    yAxis: { show: false },
    series: []
  };
}

function renderRevenueChart() {
  const chart = charts.get('revenue');
  if (!chart) return;
  const trend = stats.value?.trend;
  if (!trend || trend.dates.length === 0) {
    chart.setOption(buildEmptyOption(), true);
    return;
  }
  chart.setOption(
    {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          const idx = params?.[0]?.dataIndex ?? 0;
          const date = trend.dates[idx];
          const revenue = yuan(trend.revenue[idx]);
          const original = yuan(trend.original[idx]);
          const discount = yuan(trend.discount[idx]);
          const count = trend.orderCount[idx];
          return `${date}<br/>折后营业额：￥${revenue}<br/>原价营业额：￥${original}<br/>折扣金额：￥${discount}<br/>订单数：${count}`;
        }
      },
      xAxis: { type: 'category', data: trend.dates },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => v.toFixed(2) } },
      series: [
        {
          name: '折后营业额',
          type: 'line',
          data: trend.revenue.map((v) => v / 100),
          smooth: true
        }
      ]
    },
    true
  );
}

function renderOrderChart() {
  const chart = charts.get('order');
  if (!chart) return;
  const trend = stats.value?.trend;
  if (!trend || trend.dates.length === 0) {
    chart.setOption(buildEmptyOption(), true);
    return;
  }
  chart.setOption(
    {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          const idx = params?.[0]?.dataIndex ?? 0;
          const date = trend.dates[idx];
          const count = trend.orderCount[idx];
          const revenue = yuan(trend.revenue[idx]);
          return `${date}<br/>订单数：${count}<br/>折后营业额：￥${revenue}`;
        }
      },
      xAxis: { type: 'category', data: trend.dates },
      yAxis: { type: 'value' },
      series: [{ name: '订单数', type: 'line', data: trend.orderCount, smooth: true }]
    },
    true
  );
}

function renderAvgChart() {
  const chart = charts.get('avg');
  if (!chart) return;
  const trend = stats.value?.trend;
  if (!trend || trend.dates.length === 0) {
    chart.setOption(buildEmptyOption(), true);
    return;
  }
  chart.setOption(
    {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          const idx = params?.[0]?.dataIndex ?? 0;
          const date = trend.dates[idx];
          const avg = yuan(trend.avgOrder[idx]);
          return `${date}<br/>客单价：￥${avg}`;
        }
      },
      xAxis: { type: 'category', data: trend.dates },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => v.toFixed(2) } },
      series: [{ name: '客单价', type: 'line', data: trend.avgOrder.map((v) => v / 100), smooth: true }]
    },
    true
  );
}

function renderHeatmap() {
  const chart = charts.get('heatmap');
  if (!chart) return;
  const data = stats.value?.heatmap ?? [];
  if (data.length === 0) {
    chart.setOption(buildEmptyOption(), true);
    return;
  }
  chart.setOption(
    {
      tooltip: {
        position: 'top',
        formatter: (p: any) => {
          const [weekday, hour, count] = p.data;
          const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
          return `${labels[weekday]} ${hour}:00<br/>订单数：${count}`;
        }
      },
      grid: { left: 60, right: 20, top: 10, bottom: 30 },
      xAxis: {
        type: 'category',
        data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        splitArea: { show: true }
      },
      yAxis: {
        type: 'category',
        data: Array.from({ length: 24 }).map((_, i) => `${i}`),
        splitArea: { show: true }
      },
      visualMap: {
        min: 0,
        max: Math.max(...data.map((d) => d[2] as number), 1),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0
      },
      series: [
        {
          name: '订单数',
          type: 'heatmap',
          data,
          label: { show: false }
        }
      ]
    },
    true
  );
}

function renderTableChart() {
  const chart = charts.get('table');
  if (!chart) return;
  const rows = stats.value?.topTables ?? [];
  if (rows.length === 0) {
    chart.setOption(buildEmptyOption(), true);
    return;
  }
  chart.setOption(
    {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          const idx = params?.[0]?.dataIndex ?? 0;
          const row = rows[idx];
          return `${row.tableName}<br/>翻台次数：${row.count}<br/>折后营业额：￥${yuan(row.revenue)}`;
        }
      },
      grid: { left: 80, right: 20, top: 10, bottom: 20 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: rows.map((r) => r.tableName) },
      series: [{ type: 'bar', data: rows.map((r) => r.count) }]
    },
    true
  );
}

function renderProductChart() {
  const chart = charts.get('product');
  if (!chart) return;
  const rows = stats.value?.topProducts ?? [];
  if (rows.length === 0) {
    chart.setOption(buildEmptyOption(), true);
    return;
  }
  chart.setOption(
    {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          const idx = params?.[0]?.dataIndex ?? 0;
          const row = rows[idx];
          return `${row.name}<br/>销量：${row.qty}<br/>折后销售额：￥${yuan(row.revenue)}`;
        }
      },
      grid: { left: 40, right: 20, top: 10, bottom: 40 },
      xAxis: { type: 'category', data: rows.map((r) => r.name), axisLabel: { rotate: 20 } },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: rows.map((r) => r.qty) }]
    },
    true
  );
}

function renderCategoryChart() {
  const chart = charts.get('category');
  if (!chart) return;
  const rows = stats.value?.categoryPie ?? [];
  if (rows.length === 0) {
    chart.setOption(buildEmptyOption(), true);
    return;
  }
  chart.setOption(
    {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `${p.name}<br/>金额：￥${yuan(p.value)}<br/>占比：${p.percent}%`
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: rows.map((r) => ({ name: r.name, value: r.revenue })),
          label: { formatter: '{b} {d}%' }
        }
      ]
    },
    true
  );
}

function renderCharts() {
  renderRevenueChart();
  renderOrderChart();
  renderAvgChart();
  renderHeatmap();
  renderTableChart();
  renderProductChart();
  renderCategoryChart();
}

function initChart(key: string, el: HTMLDivElement | null) {
  if (!el) return;
  if (charts.has(key)) return;
  charts.set(key, echarts.init(el));
}

function resizeCharts() {
  charts.forEach((chart) => chart.resize());
}

onMounted(() => {
  initChart('revenue', revenueChartRef.value);
  initChart('order', orderChartRef.value);
  initChart('avg', avgChartRef.value);
  initChart('heatmap', heatmapChartRef.value);
  initChart('table', tableChartRef.value);
  initChart('product', productChartRef.value);
  initChart('category', categoryChartRef.value);
  window.addEventListener('resize', resizeCharts);
  loadStats();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts);
  charts.forEach((chart) => chart.dispose());
  charts.clear();
});

watch(
  () => stats.value,
  () => {
    renderCharts();
  }
);
</script>
