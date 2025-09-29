<template>
  <div>
    <!-- Header -->
    <header class="navbar-custom d-flex align-items-center justify-content-between">
      <div class="d-flex align-items-center me-auto">
        <img :src="logo" alt="Logo" class="logo ms-0" />
      </div>
      <h1 class="mb-0 fw-bold ms-3" style="color: white">ระบบตรวจสอบครุภัณฑ์</h1>
      <div class="button-group">
        <button class="btn qrcode-button" @click="startScanner">QRCode</button>
        <button class="btn login-button" @click="openLoginModal">Login</button>
      </div>
    </header>

    <!-- Modal Login -->
    <div v-if="showLogin" class="qr-scanner-modal-overlay">
      <div class="qr-scanner-modal">
        <div id="googleButton"></div>
        <p v-if="errorMessage" style="color:red">{{ errorMessage }}</p>
        <button class="btn close-scanner" @click="showLogin = false">ปิด</button>
      </div>
    </div>

    <!-- Modal QR Scanner -->
    <div v-if="showScanner" class="qr-scanner-modal-overlay">
      <div class="qr-scanner-modal">
        <div id="qr-reader" style="width: 300px; height: 300px;"></div>
        <button class="btn close-scanner" @click="stopScanner">ปิดกล้อง</button>
      </div>
    </div>

    <div class="container">
      <!-- Filters -->
      <div class="filters">
        <label>
          สถานที่:
          <select v-model="filters.location" class="custom-select">
            <option value="">ทั้งหมด</option>
            <option v-for="loc in uniqueLocations" :key="loc" :value="loc">{{ loc }}</option>
          </select>
        </label>

        <label>
          สถานะ:
          <select v-model="filters.status" class="custom-select">
            <option value="">ทั้งหมด</option>
            <option v-for="stat in uniqueStatuses" :key="stat" :value="stat">{{ stat }}</option>
          </select>
        </label>

        <label>
          ผู้ตรวจสอบ:
          <select v-model="filters.auditor" class="custom-select">
            <option value="">ทั้งหมด</option>
            <option v-for="aud in uniqueAuditors" :key="aud" :value="aud">{{ aud }}</option>
          </select>
        </label>

        <button class="reset-button" @click="resetFilters">รีเซ็ต</button>
      </div>

      <!-- Asset Table -->
      <table>
        <thead>
          <tr>
            <th>รูปภาพ</th>
            <th>หมายเลขครุภัณฑ์</th>
            <th>รายละเอียด</th>
            <th>สถานที่</th>
            <th>ห้อง</th>
            <th>วันที่รับ</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in paginatedItems" :key="item.asset_id + index">
            <td>
  <template v-if="item.photo_url">
    <img :src="`http://localhost:3000${item.photo_url}`" alt="Asset" width="80" />
  </template>
  <template v-else>
    <span>ไม่มีรูป</span>
  </template>
</td>
            <td><a href="#" @click.prevent="showDetails(item)" style="color: black; text-decoration: none;">
                {{ item.asset_number }}
              </a></td>
            <td>{{ item.asset_description }}</td>
            <td>{{ item.location }}</td>
            <td>{{ item.room }}</td>
            <td>{{ item.receipt_date }}</td>
            <td :class="statusClass(item.status)">{{ item.status }}</td>
          </tr>
        </tbody>
      </table>
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
        <span class="value">{{ selectedItem.asset_number }}</span>
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

    </div>
  </div>
</div>

      <!-- Pagination -->
      <div class="pagination">
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { Html5Qrcode } from 'html5-qrcode'
import logo from '../assets/img/logo.png'

// Router
const router = useRouter()

// Variables
const showLogin = ref(false)
const errorMessage = ref('')
const showScanner = ref(false)
const items = ref([])
const selectedItem = ref(null)
let html5QrCode = null
const filters = ref({ location: '', status: '', auditor: '' })
const currentPage = ref(1)
const itemsPerPage = 5

// ========== Modal ========== //
const showDetails = (item) => { selectedItem.value = item }
const closeModal = () => { selectedItem.value = null }

// Fetch assets from database
const fetchAssets = async () => {
  try {
    const res = await axios.get('http://localhost:3000/asset')
    // แสดงเฉพาะ Normal, Damaged

    console.log('📌 API Response:', res.data)
    console.log(res.data[0].notes)
console.log(res.data[1].notes)
console.log(res.data[2].notes)

    items.value = res.data
      .filter(a => a.status === 'Normal' || a.status === 'Damaged')
      .map(a => ({ ...a, selected: false, img: '/src/assets/img/Table0001.jpg' }))
  } catch (err) {
    console.error('❌ Error fetching assets:', err)
  }
}

// Computed
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
const uniqueStatuses = computed(() => [...new Set(items.value.map(i => i.status))])
const uniqueAuditors = computed(() => [...new Set(items.value.map(i => i.auditor).filter(Boolean))])

// Methods
const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

const resetFilters = () => {
  filters.value = { location: '', status: '', auditor: '' }
  currentPage.value = 1
}

const statusClass = (status) => {
  if (status === 'Normal') return 'normal'
  if (status === 'Damaged') return 'damaged'
  return ''
}

// QR Scanner
const startScanner = async () => {
  showScanner.value = true
  await nextTick()
  html5QrCode = new Html5Qrcode('qr-reader')
  const config = { fps: 10, qrbox: 250 }

  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        // หา asset ที่ตรงกับ QR code (สมมติ decodedText = asset_number)
        const asset = items.value.find(a => a.asset_number === decodedText)
        if (asset) {
          selectedItem.value = asset  // เปิด modal เลย
        } else {
          alert(`ไม่พบครุภัณฑ์หมายเลข: ${decodedText}`)
        }
        stopScanner() // ปิดกล้อง
      }
    )
  } catch (err) {
    alert(`ไม่สามารถเริ่มกล้องได้: ${err}`)
    showScanner.value = false
  }
}

const stopScanner = async () => {
  if (html5QrCode) {
    await html5QrCode.stop()
    await html5QrCode.clear()
    html5QrCode = null
  }
  showScanner.value = false
}

onUnmounted(() => {
  if (html5QrCode) {
    html5QrCode.stop()
    html5QrCode.clear()
  }
})

// โหลด Google script
onMounted(() => {
  const script = document.createElement('script')
  script.src = "https://accounts.google.com/gsi/client"
  script.async = true
  script.defer = true
  document.head.appendChild(script)

  window.handleGoogleLogin = async (response) => {
    try {
      const res = await fetch("http://localhost:3000/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        errorMessage.value = data.message || "Login ไม่สำเร็จ"
        return
      }

      localStorage.setItem("userToken", data.token)
      localStorage.setItem("userRole", data.user.role)
      localStorage.setItem("userEmail", data.user.email)

      showLogin.value = false

      if (data.user.role === "Admin") {
        router.push({ name: "Home" })
      } else {
        router.push({ name: "Home" })
      }

    } catch (err) {
      errorMessage.value = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"
      console.error(err)
    }
  }
})

// เปิด modal แล้ว render ปุ่ม Google
const openLoginModal = async () => {
  showLogin.value = true
  await nextTick() // รอให้ DOM render
  if (window.google) {
    window.google.accounts.id.initialize({
      client_id: '1015472630656-knb4gb5hflaljv0hnt48hrpl5gj65hic.apps.googleusercontent.com',
      callback: window.handleGoogleLogin,
      auto_select: false
    })
    window.google.accounts.id.renderButton(
      document.getElementById('googleButton'),
      { theme: 'outline', size: 'large', width: 240 }
    )
  }
}


// On mounted
onMounted(() => {
  fetchAssets()
  // Load Google script
  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  document.head.appendChild(script)
})
</script>


  <style scoped>
  .container {
  padding: 20px;
  font-family: Arial, sans-serif;
  padding-top: 100px; 
  }
  
  .filters {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .filters label {
    font-weight: bold;
    display: flex;
    flex-direction: column;
    width: 180px;
  }
  .custom-select {
    padding: 10px;
    font-size: 16px;
    border-radius: 4px;
    border: 1px solid #ccc;
    margin-top: 8px;
  }
  .reset-button {
    padding: 10px 15px;
    background-color: #2764d4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 22px;
  }
  .reset-button:hover {
    background-color: #2349b2;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    text-align: center;
  }
  thead {
    background-color: #f5f5f5;
  }
  th, td {
    padding: 12px;
    border: 1px solid #ccc;
  }
  img {
    border-radius: 4px;
  }
  .normal {
    color: green;
    font-weight: bold;
  }
  .damaged {
    color: orange;
    font-weight: bold;
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
  
  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
  }
  .modal-content {
  background-color: white;
  padding: 25px;
  border-radius: 10px;
  width: 400px;
  max-width: 90%;
  text-align: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
}
  .close-button:hover {
    background-color: #b22;
  }
  td a {
  color: black;
  text-decoration: none;
}
.button-row {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 15px;
}

.close-button {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
}

.edit-button {
  background-color: #f1c40f; /* สีเหลือง */
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
}
.navbar-custom {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 78px;
  background-color: #061C90; /* สีน้ำเงิน */
  padding: 16px 24px;
  box-sizing: border-box;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.button-group {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 8px 14px;
  font-size: 14px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
}

.qrcode-button {
  background-color: #2764d4; /* เขียว */
  color: white;
}

.qrcode-button:hover {
  background-color: #2349b2;
}

.login-button {
  background-color: #D9EDFA; /* เหลือง */
  color: #03126A;
}

.login-button:hover {
  background-color: #6c7c87;
}

.navbar-custom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
}

.button-group {
  display: flex;
  gap: 12px;
}
.logo-title {
  display: flex;
  align-items: center;
  gap: 10px; /* เพิ่มช่องว่างระหว่างโลโก้และข้อความ */
}

.logo {
  display: flex; 
  justify-content: center; 
  align-items: center; 
  height: 100px; 
  width: auto; 
  background-color: white; 
  padding: 20px; 
  margin-left: 0px; 
}

.qr-scanner-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7); /* Dark overlay */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.qr-scanner-modal {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
}

.qr-scanner-modal .close-scanner {
  background-color: #f44336;
  color: white;
  padding: 6px 20px; /* ขยายปุ่มด้านซ้าย-ขวา */
  border: none;
  border-radius: 6px; /* ใส่ radius ให้กลมสวย */
  cursor: pointer;
  margin-top: 5px;
  font-size: 0.95rem; /* ทำตัวอักษรใหญ่ขึ้นเล็กน้อย */
}


.qr-scanner-modal .close-scanner:hover {
  background-color: #d32f2f;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7); /* Dark background with transparency */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  opacity: 0;
  animation: fadeIn 0.3s forwards; /* Smooth fade-in transition */
}

.modal-content {
  background-color: #fff;
  padding: 30px;
  border-radius: 10px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
  animation: slideUp 0.3s ease-out forwards; /* Smooth slide-up transition */
}

.modal-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #333;
}

.input-field {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.3s;
}

.input-field:focus {
  border-color: #007bff; /* Change border color on focus */
}

.modal-buttons {
  display: flex;
  gap: 10px; /* ระยะห่างระหว่างปุ่ม */
  margin-top: 10px;
}

.login-btn,
.cancel-btn {
  flex: 1; /* ให้ปุ่มกว้างเท่ากัน */
  padding: 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  white-space: nowrap; /* ไม่ตัดคำลงบรรทัดใหม่ */
  transition: background-color 0.3s;
}

.login-btn {
  background-color: #007bff;
  color: white;
}

.login-btn:hover {
  background-color: #0056b3; /* Darker blue on hover */
}

.cancel-btn {
  background-color: #f44336;
  color: white;
}

.cancel-btn:hover {
  background-color: #d32f2f; /* Darker red on hover */
}

.error {
  color: #f44336;
  font-size: 14px;
  margin-top: 10px;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
  }
  to {
    transform: translateY(0);
  }
}
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
  width: 95%;
  max-width: 480px;
  padding: 25px 30px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.2);
  animation: slideIn 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

@keyframes slideIn {
  from { transform: translateY(-30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-title {
  font-size: 22px;
  font-weight: 700;
  color: #333;
  margin-bottom: 20px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-bottom: 20px;
}

.asset-img {
  width: 180px;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 15px;
}

.modal-item {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 6px 0;
  border-bottom: 1px solid #eee;
}

.label {
  font-weight: 600;
  color: #555;
  text-align: left;
}

.value {
  font-weight: 500;
  text-align: right;
  word-break: break-word;
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
  justify-content: center;
  gap: 15px;
  width: 100%;
}

.close-button {
  flex: 1;
  padding: 10px 0;
  background-color: #6c757d;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.close-button:hover {
  background-color: #495057;
}
</style>