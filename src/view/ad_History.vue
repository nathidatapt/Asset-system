<template>
    <div class="container">
      <!-- Filters Section -->
      <div class="filters">
        <label>
          ผู้ตรวจสอบ:
          <select v-model="filters.auditor" class="custom-select">
            <option value="">ทั้งหมด</option>
            <option v-for="item in uniqueAuditors" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
      </div>
      <!-- Table Section -->
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" @change="toggleSelectAll" :checked="isAllSelected" /></th> 
            <th>รูปภาพ</th>
            <th>หมายเลขครุภัณฑ์</th>
            <th>รายละเอียด</th>
            <th>สถานที่</th>
            <th>ห้อง</th>
            <th>วันที่รับ</th>
            <th>วันที่ตรวจสอบ</th>
            <th>ผู้ตรวจสอบ</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in paginatedItems" :key="item.asset_id + index">
            <td><input type="checkbox" v-model="item.selected" /></td>
            <td>
  <template v-if="item.photo_url">
    <img :src="`http://localhost:3000${item.photo_url}`" alt="Asset" width="80" />
  </template>
  <template v-else>
    <span>ไม่มีรูป</span>
  </template>
</td>

            <td><a href="#" @click.prevent="showDetails(item)"style="color: black; text-decoration: none;">{{ item.number }}</a></td>
            <td>{{ item.asset_description }}</td>
            <td>{{ item.location }}</td>
            <td>{{ item.room }}</td>
            <td>{{ item.receipt_date }}</td>
            <td>{{ item.inspection_date }}</td>
            <td>{{ item.auditor }}</td>
            <td :class="statusClass(item.status)">{{ item.status }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="pagination">
  <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1">ก่อนหน้า</button>

  <button
  v-for="page in paginatedPages"
  :key="page + Math.random()"
  @click="typeof page === 'number' && changePage(page)"
  :class="{ active: page === currentPage, disabled: page === '...' }"
  :disabled="page === '...'"
>
    {{ page }}
  </button>

  <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages">ถัดไป</button>
</div>

      <!-- Modal -->
<div v-if="selectedItem" class="modal-overlay" @click.self="closeModal">
  <div class="modal-content">
    <h3 class="modal-title">รายละเอียดครุภัณฑ์</h3>

    <div class="modal-body">
      <img v-if="selectedItem.photo_url" :src="`http://localhost:3000${selectedItem.photo_url}`" alt="Asset" class="asset-img" />
<template v-else>
  <span>ไม่มีรูป</span>
</template>
      <div class="modal-item">
        <span class="label">หมายเลข:</span>
        <span class="value">{{ selectedItem.number }}</span>
      </div>
      <div class="modal-item">
        <span class="label">รายละเอียด:</span>
        <span class="value">{{ selectedItem.asset_description }}</span>
      </div>
      <div class="modal-item">
        <span class="label">สถานที่:</span>
        <span class="value">{{ selectedItem.location }}</span>
      </div>
      <div class="modal-item">
        <span class="label">ห้อง:</span>
        <span class="value">{{ selectedItem.room }}</span>
      </div>
      <div class="modal-item">
        <span class="label">วันที่รับ:</span>
        <span class="value">{{ selectedItem.receipt_date }}</span>
      </div>
      <div class="modal-item">
        <span class="label">วันที่ตรวจสอบ:</span>
        <span class="value">{{ selectedItem.inspection_date }}</span>
      </div>
      <div class="modal-item">
        <span class="label">ผู้ตรวจสอบ:</span>
        <span class="value">{{ selectedItem.auditor }}</span>
      </div>
      <div class="modal-item">
        <span class="label">สถานะ:</span>
        <span class="value" :class="statusClass(selectedItem.status)">{{ selectedItem.status }}</span>
      </div>
      <div class="modal-item">
        <span class="label">หมายเหตุ</span>
        <span class="value">{{ selectedItem.notes }}</span>
      </div>
    </div>

    <div class="button-row">
      <button @click="closeModal" class="close-button">ปิด</button>
      <button @click="goToEdit" class="edit-button">แก้ไข</button>
    </div>
  </div>
</div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import Swal from 'sweetalert2'

// ==================== Refs & State ====================
const items = ref([])
const filters = ref({ auditor: '' })
const currentPage = ref(1)
const itemsPerPage = 20
const selectedItem = ref(null)
const router = useRouter()

// ==================== Fetch API ====================
const fetchAssets = async () => {
  try {
    const res = await axios.get('http://localhost:3000/asset')
    items.value = res.data.map(a => ({
      asset_id: a.asset_id,
      photo_url: a.photo_url || null,
      number: a.asset_number,
      inventory_number: a.inventory_number,
      asset_description: a.asset_description,
      model: a.model,
      Serial_number: a.Serial_number,
      location: a.location,
      room: a.room,
      receipt_date: a.receipt_date,
      inspection_date: a.inspection_date || '',
      auditor: a.auditor || '',
      status: a.status,
      notes: a.notes || '',
      selected: false
    }))
  } catch (err) {
    console.error('❌ Error fetching assets:', err)
  }
}

onMounted(() => { fetchAssets() })

// ==================== Computed ====================
const filteredItems = computed(() => {
  return items.value.filter(item => {
    return (!filters.value.auditor || item.auditor === filters.value.auditor)
  })
})

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredItems.value.slice(start, start + itemsPerPage)
})

const totalPages = computed(() => Math.ceil(filteredItems.value.length / itemsPerPage))
const uniqueAuditors = computed(() => [...new Set(items.value.map(i => i.auditor))])
const isAllSelected = computed(() => items.value.every(item => item.selected))

// ==================== Methods ====================
const toggleSelectAll = (event) => { items.value.forEach(item => item.selected = event.target.checked) }
const resetFilters = () => { filters.value.auditor = ''; currentPage.value = 1 }
const changePage = (page) => { if(page >= 1 && page <= totalPages.value) currentPage.value = page }
const statusClass = (status) => { return status==='Normal'?'normal':status==='Damaged'?'damaged':status==='Lost'?'Lost':'' }
const closeModal = () => selectedItem.value = null
const showDetails = (item) => selectedItem.value = item
const goToEdit = async () => {
  if (!selectedItem.value) return;
  if (selectedItem.value.status === 'Normal' || selectedItem.value.status === 'Damaged') {
    await Swal.fire({
      icon: 'warning',
      title: 'ไม่สามารถแก้ไขได้',
      text: '❌ รายการนี้ไม่สามารถแก้ไขได้เนื่องจากทำการตรวจสอบแล้ว',
      confirmButtonText: 'ตกลง'
    })
    return
  }
  router.push({
    name: 'ad_editasset',
    params: { id: selectedItem.value.asset_id }
  })
}

// ==================== Pagination Logic ====================
const pageWindow = 5;

const paginatedPages = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const current = currentPage.value;

  let start = Math.max(current - Math.floor(pageWindow / 2), 1);
  let end = start + pageWindow - 1;

  if (end > total) {
    end = total;
    start = Math.max(end - pageWindow + 1, 1);
  }

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('...');
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < total) {
    if (end < total - 1) pages.push('...');
    pages.push(total);
  }

  return pages;
})
</script>


<style scoped>
/* Container & Filters */
.container{padding:20px;font-family:Arial,sans-serif}
.filters{display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap}
.filters label{font-weight:bold;display:flex;flex-direction:column;width:180px}
.custom-select{padding:10px;font-size:16px;border-radius:4px;border:1px solid #ccc;margin-top:8px}

/* Button Groups */
.button-group-bottom {
  display: flex;
  gap: 15px; /* ระยะห่างระหว่างปุ่ม */
  margin: 20px 0 25px 0;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.25s ease;
}
.btn.reset{background-color:#e5e7eb;color:#374151}
.btn.reset:hover{background-color:#d1d5db}
.btn.danger{background-color:#ef4444;color:white}
.btn.danger:hover{background-color:#dc2626}
.btn.primary{background-color:#10b981;color:white}
.btn.primary:hover{background-color:#059669}
.btn.import{background-color:#3b82f6;color:white;margin-left:20px,}
.btn.import:hover{background-color:#2563eb}

/* Table */
table{width:100%;border-collapse:collapse;text-align:center}
thead{background-color:#f5f5f5}
th,td{padding:12px;border:1px solid #ccc}
img{border-radius:4px}
.normal{color:green;font-weight:bold}
.damaged{color:orange;font-weight:bold}
.Lost{color:red;font-weight:bold}

/* Pagination */
.pagination{display:flex;justify-content:center;gap:5px;margin-top:10px}
.pagination button{padding:6px 10px;border-radius:4px;border:none;background:#f3f4f6;cursor:pointer}
.pagination button.active{background:#3b82f6;color:white}

/* Modal */
.modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center}
.modal-content{background:white;padding:20px;border-radius:10px;width:400px;max-width:90%}
.button-row{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
.close-button{background:#ef4444;color:white;padding:8px 12px;border-radius:6px;border:none}
.edit-button{background:#10b981;color:white;padding:8px 12px;border-radius:6px;border:none}

/* QR Code */
.qr-code-container{display:flex;flex-wrap:wrap;gap:20px;margin-top:20px;text-align:center}
.qr-code-container img{width:150px;height:150px;border:1px solid #ccc;padding:5px;border-radius:6px}
.qr-item{text-align:center;width:160px}
.qr-text{margin-top:8px;font-size:14px;font-weight:bold;color:#333}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  padding: 25px 30px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.2);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { transform: translateY(-30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-title {
  text-align: center;
  font-size: 24px;
  margin-bottom: 20px;
  color: #333;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.asset-img {
  width: 150px;
  height: auto;
  display: block;
  margin: 0 auto 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.modal-item {
  display: flex;
  justify-content: space-between;
}

.label {
  font-weight: 600;
  color: #555;
}

.value {
  font-weight: 500;
}

.status-normal {
  color: #0b7e3f; /* เขียว */
  font-weight: bold;
}

.status-damaged {
  color: #fd7e14; /* ส้ม */
  font-weight: bold;
}

.status-lost {
  color: #dc3545; /* แดง */
  font-weight: bold;
}

.button-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.close-button {
  flex: 1;
  padding: 10px 0;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.close-button:hover {
  background-color: #495057;
}

.edit-button {
  flex: 1;
  padding: 10px 0;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.edit-button:hover {
  background-color: #0056b3;
}

</style>