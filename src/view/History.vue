<template>
  <div class="history-container">
    <h2 class="history-title">ประวัติการแก้ไข</h2>

    <div v-if="logs.length === 0" class="no-logs">
      ยังไม่มีประวัติการแก้ไข
    </div>

    <div v-for="log in paginatedLogs" :key="log.log_id" class="log-item">
      <div class="log-header">
        <span class="log-date">วันที่: {{ formatDate(log.changed_date) }}</span>
        <span class="log-user">ผู้แก้ไข: {{ log.changed_by_name }}</span>
        <span class="log-asset">Asset: {{ log.asset_number }}</span>
      </div>
      <ul class="log-changes">
        <li v-for="(change, field) in log.changes" :key="field">
  <span class="field-name">{{ field }}</span>: 
  "<span 
     class="old-value" 
     :style="{ color: field === 'status' ? statusColor(change.old) : '#7f8c8d' }"
   >
     {{ field === 'status' ? formatStatus(change.old) : change.old }}
   </span>" → 
  "<span 
  class="new-value" 
  :style="{ color: field === 'status' ? statusColor(change.new) : '' }"
>
  {{ field === 'status' ? formatStatus(change.new) : change.new }}
</span>"
</li>


      </ul>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="totalPages > 1">
      <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1">ก่อนหน้า</button>
      <button
        v-for="page in totalPages"
        :key="page"
        @click="changePage(page)"
        :class="{ active: page === currentPage }"
      >
        {{ page }}
      </button>
      <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages">ถัดไป</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const logs = ref([])
const currentPage = ref(1)
const logsPerPage = 5

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * logsPerPage
  const end = start + logsPerPage
  return logs.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(logs.value.length / logsPerPage))

function changePage(page) {
  if (page < 1) page = 1
  if (page > totalPages.value) page = totalPages.value
  currentPage.value = page
}

function formatStatus(status) {
  switch (status) {
    case 0: return 'Lost'
    case 1: return 'Normal'
    case 2: return 'Damaged'
    default: return '-'
  }
}
function statusColor(status) {
  switch (status) {
    case 0: return 'red'       // Lost → แดง
    case 1: return 'green'     // Normal → เขียว
    case 2: return 'orange'    // Damaged → ส้ม
    default: return 'black'
  }
}


function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString()
}

onMounted(async () => {
  try {
    const res = await axios.get('http://localhost:3000/asset/logs')
    logs.value = res.data.map(log => ({
      ...log,
      changes: log.changes ? log.changes : {},
      changed_by_name: log.changed_by_name || 'Admin',
      changed_by_email: log.changed_by_email || ''
    }))
  } catch (err) {
    console.error('Failed to fetch logs:', err)
  }
})
</script>

<style scoped>
.history-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Helvetica', sans-serif;
}

.history-title {
  font-size: 2rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.no-logs {
  color: #888;
  font-style: italic;
  padding: 10px;
}

.log-item {
  margin-bottom: 12px;
  border-left: 4px solid #1d72b8;
  padding-left: 10px;
  background-color: #f0f8ff;
  border-radius: 4px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #34495e;
  margin-bottom: 6px;
}

.log-header span {
  margin-right: 10px;
}

.log-changes {
  list-style: disc inside;
  font-size: 0.9rem;
  color: #2c3e50;
  margin: 0;
  padding-left: 10px;
}

.field-name {
  font-weight: 600;
}

.old-value {
  text-decoration: line-through;
  color: #596061;
}

.new-value {
  color: #1b3785;
  font-weight: 600;
}

.pagination {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

.pagination button {
  padding: 8px 12px;
  border: 1px solid #ccc;
  background-color: #fff;
  cursor: pointer;
  border-radius: 4px;
}

.pagination button.active {
  background-color: #224688;
  color: white;
  font-weight: bold;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
