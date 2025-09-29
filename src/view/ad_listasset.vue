<template>
    <div class="container">
      <!-- Filters Section -->
      <div class="filters">
        <label>
          สถานที่:
          <select v-model="filters.location" class="custom-select">
            <option value="">ทั้งหมด</option>
            <option v-for="item in uniqueLocations" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label>
          สถานะ:
          <select v-model="filters.status" class="custom-select">
            <option value="">ทั้งหมด</option>
            <option v-for="item in uniqueStatuses" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label>
          ผู้ตรวจสอบ:
          <select v-model="filters.auditor" class="custom-select">
            <option value="">ทั้งหมด</option>
            <option v-for="item in uniqueAuditors" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
      </div>
      

      <!-- Button Group Section (ข้างล่างดรอปดาวน์) -->
      <div class="button-group-bottom">
        <button @click="resetFilters" class="btn reset">รีเซ็ต</button>
        <button @click="exportFile" class="btn danger">นำไฟล์ออก</button>
        <button @click="generatePDF" class="btn primary">สร้าง QRcode</button>
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
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import jsPDF from 'jspdf'
import axios from 'axios'
import Swal from 'sweetalert2'

// ==================== Refs & State ====================
const items = ref([])
const filters = ref({ location: '', status: '', auditor: '' })
const currentPage = ref(1)
const itemsPerPage = 20
const selectedItem = ref(null)
const qrImages = ref([])
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
      auditor: a.auditor || '',   // ✅ ใช้ค่าจาก backend
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
    return (!filters.value.location || item.location === filters.value.location) &&
           (!filters.value.status || item.status === filters.value.status) &&
           (!filters.value.auditor || item.auditor === filters.value.auditor)
  })
})

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredItems.value.slice(start, start + itemsPerPage)
})

const totalPages = computed(() => Math.ceil(filteredItems.value.length / itemsPerPage))
const uniqueLocations = computed(() => [...new Set(items.value.map(i => i.location))])
const uniqueStatuses = computed(() => [...new Set(items.value.map(i => i.status))].filter(Boolean))
const uniqueAuditors = computed(() => [...new Set(items.value.map(i => i.auditor))])
const isAllSelected = computed(() => items.value.every(item => item.selected))

// ==================== Methods ====================
const toggleSelectAll = (event) => { items.value.forEach(item => item.selected = event.target.checked) }
const resetFilters = () => { filters.value = { location: '', status: '', auditor: '' }; currentPage.value = 1 }
const changePage = (page) => { if(page>=1 && page<=totalPages.value) currentPage.value=page }
const statusClass = (status) => { return status==='Normal'?'normal':status==='Damaged'?'damaged':status==='Lost'?'Lost':'' }
const closeModal = () => selectedItem.value = null
const showDetails = (item) => selectedItem.value = item
const goToEdit = async () => {
  if (!selectedItem.value) return;

  // ถ้าสถานะเป็น Normal หรือ Damaged
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

// ==================== Export Excel ====================
const exportFile = () => {
  const selectedItems = items.value.filter(item => item.selected)
  if(selectedItems.length===0){ alert("กรุณาเลือกรายการที่ต้องการนำออก"); return }

  const worksheet = XLSX.utils.json_to_sheet(selectedItems.map(item => ({
    "หมายเลขครุภัณฑ์": item.number,
    "รายละเอียด": item.asset_description,
    "สถานที่": item.location,
    "ห้อง": item.room,
    "วันที่รับ": item.receipt_date,
    "วันที่ตรวจสอบ": item.inspection_date,
    "ผู้ตรวจสอบ": item.auditor,
    "สถานะ": item.status
  })))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, worksheet, "รายการครุภัณฑ์")
  XLSX.writeFile(wb, 'Asset_Report.xlsx')
}
// ==================== Pagination Logic ====================
const pageWindow = 5; // จำนวนหน้าที่แสดงรอบ currentPage

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

  // ถ้า start > 1 ให้แสดงหน้าแรก + …
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('...');
  }

  // แสดงหน้ากลาง
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // ถ้า end < total ให้แสดง … + หน้า total
  if (end < total) {
    if (end < total - 1) pages.push('...');
    pages.push(total);
  }

  return pages;
});
// ==================== Generate QR ====================
const generatePDF = async () => {
  const selected = items.value.filter(item => item.selected)
  if(selected.length===0){ alert("กรุณาเลือกรายการก่อนสร้าง QR"); return }

  const pdf = new jsPDF()
  const margin = 10, qrSize = 70
  let x = margin, y = margin, count = 0
  const perRow = 2

  for(const item of selected){
    try{
      const qrDataUrl = await QRCode.toDataURL(item.number)
      pdf.addImage(qrDataUrl, 'PNG', x, y, qrSize, qrSize)
      pdf.setFontSize(10)
      pdf.text(item.number, x + qrSize/2, y + qrSize + 7, { align: 'center' })

      x += qrSize + margin
      count++
      if(count%perRow===0){ x=margin; y+=qrSize+20 }
      if(y + qrSize + margin > pdf.internal.pageSize.height){ pdf.addPage(); x=margin; y=margin }
    }catch(err){ console.error('Error generating QR', err) }
  }

  pdf.save('qrcodes.pdf')
}

// ==================== Progress Bar ====================
const updateProgress = (current, total) => {
  const progressContainer = document.getElementById("progress-container")
  const progressBar = document.getElementById("progress-bar")
  
  progressContainer.style.display = "block"

  const percent = Math.round((current / total) * 100)
  progressBar.style.width = percent + "%"
  progressBar.innerText = percent + "%"

  if (percent >= 100) {
    setTimeout(() => {
      progressContainer.style.display = "none"
      progressBar.style.width = "0%"
      progressBar.innerText = "0%"
    }, 500) // หน่วงสัก 0.5 วิ เพื่อให้เห็น 100% ก่อนหาย
  }
}

// ==================== Batch Insert ====================
const chunkArray = (arr, size) => {
  const result = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

const importInBatches = async (assets, batchSize = 300) => {
  const batches = chunkArray(assets, batchSize)

  for (let i = 0; i < batches.length; i++) {
    try {
      await axios.post("http://localhost:3000/asset/import", { assets: batches[i] })
      updateProgress(i + 1, batches.length) // อัพเดท progress
      console.log(`✅ Batch ${i+1}/${batches.length} สำเร็จ`)
    } catch (err) {
      console.error(`❌ Batch ${i+1} ไม่สำเร็จ`, err)
      alert(`❌ Batch ${i+1} ไม่สำเร็จ`)
      throw err
    }
  }
}

// ==================== Import Excel ====================
const importExcel = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    const data = new Uint8Array(e.target.result)
    const workbook = XLSX.read(data, { type: "array" })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    // ฟังก์ชันช่วยแปลง number
    const safeNumber = (val) => {
      const n = Number(val)
      return isNaN(n) ? 0 : n
    }

    const importedAssets = jsonData.map(row => ({
      Company_Code: safeNumber(row["Company Code"]),
      asset_number: safeNumber(row["Asset"]),
      Subnumber: safeNumber(row["Subnumber"]),
      inventory_number: row["Inventory number"] || "",
      asset_description: row["Asset description"] || "",
      model: row["ยี่ห้อ/รุ่น"] || "",
      Serial_number: safeNumber(row["Serial number"]),
      location: row["Location"] || "",
      room: row["Room"] || "",
      receipt_date: formatDate(row["วันที่รับทรัพย์สิน"]),
      inspection_date: formatDate(row["วันที่ตรวจสอบ"]),
      auditor: row["ผู้ตรวจสอบ"] || "",
      status: row["สถานะ"] || "Normal",
      original_value: safeNumber(row["Original value"]),
      Cost_Center: safeNumber(row["Cost Center"]),
      agency: row["หน่วยงาน"] || "",
      vendor_name: row["Vendor Name1"] || ""
    }))

    try {
      // import เป็น batch ละ 300
      await importInBatches(importedAssets, 300) 
      alert("✅ บันทึกทั้งหมดสำเร็จ")
      fetchAssets()
    } catch (err) {
      console.error(err)
      alert("❌ บันทึกไม่สำเร็จ")
    }
  }
  reader.readAsArrayBuffer(file)
}

const formatDate = (val) => {
  if (!val) return null
  if (typeof val === "string" && val.includes("/")) {
    const [d, m, y] = val.split("/")
    return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  return val
}

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