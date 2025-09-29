<template>
  <div v-if="asset" class="container">
    <h2 class="title">แก้ไขครุภัณฑ์</h2>

    <!-- กล้อง -->
    <div v-if="showCamera" class="camera-wrapper">
      <video ref="video" autoplay playsinline width="300" height="200" class="video"></video>
      <div class="button-row">
        <button class="btn capture" @click="capturePhoto">📸 ถ่ายรูป</button>
        <button class="btn cancel" @click="closeCamera">❌ ยกเลิก</button>
      </div>
    </div>

    <!-- preview รูป -->
    <div v-else>
      <div class="asset-image-wrapper" @click="openCamera">
        <img
  v-if="previewImg || asset.photo_url"
  :src="previewImg ? previewImg : `http://localhost:3000${asset.photo_url}`"
  class="asset-image"
   width="400" height="300"
/>
        <div v-else class="placeholder-image">📷 คลิกเพื่อถ่ายรูป</div>
      </div>

      <div class="asset-item">
        <span class="label">หมายเลขครุภัณฑ์:</span>
        <span class="value">{{ asset.asset_number }}</span>
      </div>

      <div class="asset-item">
        <span class="label">รายละเอียด:</span>
        <span class="value">{{ asset.asset_description }}</span>
      </div>

      <div class="asset-item">
        <span class="label">สถานที่:</span>
        <input v-model="asset.location" class="value-input" />
      </div>

      <div class="asset-item">
        <span class="label">ห้อง:</span>
        <input v-model="asset.room" class="value-input" />
      </div>

      <div class="asset-item">
        <span class="label">วันที่รับ:</span>
        <span class="value">{{ asset.receipt_date }}</span>
      </div>

      <div class="asset-item">
        <span class="label">วันที่ตรวจสอบ:</span>
        <span class="value">{{ asset.inspection_date }}</span>
      </div>

      <div class="asset-item">
        <span class="label">ผู้ตรวจสอบ:</span>
        <span class="value">{{ asset.user_by }}</span>
      </div>

      <div class="asset-item">
  <span class="label">หมายเหตุ:</span>
  <textarea v-model="asset.notes" class="value-input" rows="3"></textarea>
</div>


      <div class="asset-item">
        <span class="label">สถานะ:</span>
        <select v-model="asset.status" class="value-input">
          <option value="Normal">Normal</option>
          <option value="Damaged">Damaged</option>
          <option value="Lost">Lost</option>
        </select>
      </div>

      <div class="button-row">
        <button class="btn save" @click="saveAsset">💾 บันทึก</button>
        <button class="btn cancel" @click="goBack">❌ ยกเลิก</button>
      </div>
    </div>
  </div>

  <div v-else class="no-data">
    <p>ไม่พบข้อมูลครุภัณฑ์</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Swal from 'sweetalert2'

const asset = ref(null)
const previewImg = ref(null)
const fileToUpload = ref(null)
const showCamera = ref(false)
const video = ref(null)

const email = ref(localStorage.getItem('userEmail') || 'Guest')
const route = useRoute()
const router = useRouter()

const fullPhotoUrl = computed(() => {
  if (!asset.value || !asset.value.photo_url) return null
  return asset.value.photo_url.startsWith('http')
    ? asset.value.photo_url
    : `http://localhost:3000${asset.value.photo_url}`
})

onMounted(async () => {
  const id = route.params.id
  if (id) {
    try {
      const res = await axios.get(`http://localhost:3000/asset/${id}`)
      asset.value = res.data

      // หมายเหตุ ถ้า null ให้เป็น string ว่าง
      asset.value.notes = asset.value.notes || ''

      // แปลง inspection_date เป็น DD/MM/YYYY
      const today = new Date()
      const dd = String(today.getDate()).padStart(2, '0')
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const yyyy = today.getFullYear()
      asset.value.inspection_date = `${dd}/${mm}/${yyyy}`

      // ผู้ตรวจสอบ
      asset.value.user_by = email.value
    } catch (err) {
      console.error(err)
    }
  }
})


const goBack = () => router.back()

// กล้อง
const openCamera = async () => {
  showCamera.value = true
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    video.value.srcObject = stream
  } catch {
    alert('ไม่สามารถเข้ากล้องได้')
  }
}

const closeCamera = () => {
  showCamera.value = false
  const stream = video.value.srcObject
  if (stream) stream.getTracks().forEach(t => t.stop())
}

const capturePhoto = () => {
  const canvas = document.createElement('canvas')
  canvas.width = video.value.videoWidth
  canvas.height = video.value.videoHeight
  canvas.getContext('2d').drawImage(video.value, 0, 0)
  canvas.toBlob(blob => {
    previewImg.value = URL.createObjectURL(blob)
    fileToUpload.value = new File([blob], `${Date.now()}.png`, { type: 'image/png' })
    closeCamera()
  }, 'image/png')
}

// Save
const saveAsset = async () => {
  // ตรวจสอบเงื่อนไขก่อนบันทึก
  if (!fileToUpload.value) {
    Swal.fire('ต้องอัพรูปก่อน ❌', 'กรุณาถ่ายหรือเลือกภาพครุภัณฑ์', 'warning');
    return;
  }

  if (!asset.value.status || asset.value.status === 'Lost') {
    Swal.fire('สถานะไม่ถูกต้อง ❌', 'กรุณาเลือกสถานะที่ไม่ใช่ Lost', 'warning');
    return;
  }

  const result = await Swal.fire({
    title: 'คุณแน่ใจไหม?',
    text: "คุณกำลังจะแก้ไขข้อมูลครุภัณฑ์!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'ใช่, แก้ไขเลย!',
    cancelButtonText: 'ยกเลิก'
  })
  if (!result.isConfirmed) return  // ถ้าไม่ยืนยัน ให้หยุดการทำงาน
  try {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`

    const formData = new FormData()
    formData.append('location', asset.value.location)
    formData.append('room', asset.value.room)
    formData.append('status', asset.value.status)
    formData.append('inspection_date', todayStr)
    formData.append('notes', asset.value.notes || '')
    formData.append('email', email.value)
    if (fileToUpload.value) formData.append('image', fileToUpload.value)

    const res = await axios.post(
      `http://localhost:3000/asset/${asset.value.asset_id}/update`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )

    // success message
      await Swal.fire(
        'สำเร็จ!',
        'ข้อมูลครุภัณฑ์ถูกแก้ไขเรียบร้อย ✅',
        'success'
      ).then(() => {
  router.back()
})

      if (res.data.updatedFields.photo_url) asset.value.photo_url = res.data.updatedFields.photo_url
      previewImg.value = null
      fileToUpload.value = null
    } catch (err) {
      console.error(err)
      Swal.fire('เกิดข้อผิดพลาด ❌', 'ไม่สามารถบันทึกข้อมูลได้', 'error')
    }
  }
</script>



<style scoped>
.container { max-width: 450px; margin: 20px auto; font-family: 'Segoe UI', sans-serif; }
.title { text-align: center; margin-bottom: 20px; color: #333; }

.camera-wrapper, .asset-image-wrapper { display: flex; flex-direction: column; align-items: center; margin-bottom: 15px; }
.video, .asset-image { border-radius: 8px; border: 2px solid #007bff; margin-bottom: 10px; object-fit: cover; }

.placeholder-image {
  width: 300px; height: 200px; display: flex; justify-content: center; align-items: center;
  border: 2px dashed #aaa; border-radius: 8px; color: #555; cursor: pointer;
  transition: all 0.2s; font-size: 18px;
}
.placeholder-image:hover { border-color: #007bff; color: #007bff; }

.asset-info { margin-bottom: 15px; }
.asset-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
.label { font-weight: 500; color: #555; }
.value { color: #333; }

.button-row { display: flex; justify-content: center; gap: 15px; margin-top: 10px; flex-wrap: wrap; }
.btn { padding: 8px 16px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; transition: all 0.2s; }
.btn.capture { background-color: #28a745; color: #fff; }
.btn.capture:hover { background-color: #218838; }
.btn.save { background-color: #007bff; color: #fff; }
.btn.save:hover { background-color: #0056b3; }
.btn.cancel { background-color: #dc3545; color: #fff; }
.btn.cancel:hover { background-color: #c82333; }
.asset-card {
  max-width: 500px;
  margin: 20px auto;
  padding: 20px;
  background-color: #fafafa;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.08);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.asset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.label {
  font-weight: 600;
  color: #333;
}

.value {
  color: #555;
}

.value-input {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  min-width: 150px;
  outline: none;
  transition: border-color 0.2s;
}

.value-input:focus {
  border-color: #3b82f6; /* สีฟ้าเวลาตัวกรอกถูกเลือก */
}

select.value-input {
  background-color: #fff;
  cursor: pointer;
}
</style>