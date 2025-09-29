<template>
  <div class="qr-code-container">
    <h2 class="title">สแกนคโค้ด</h2>
    <div id="qr-reader"></div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Html5Qrcode } from "html5-qrcode";
import { useRouter } from "vue-router";
import axios from "axios";
import Swal from "sweetalert2";

export default {
  name: "QrcodeScanner",
  setup() {
    const qrCode = ref(null);
    let html5QrCode = null;
    const router = useRouter();

    const stopScan = async () => {
      if (html5QrCode) {
        try {
          await html5QrCode.stop();
          await html5QrCode.clear();
          html5QrCode = null;
        } catch (err) {
          console.error("Failed to stop camera:", err);
        }
      }
    };

    const startScan = async () => {
      const qrReaderElement = document.getElementById("qr-reader");
      if (!qrReaderElement) return;

      html5QrCode = new Html5Qrcode("qr-reader");

      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices.length) return;

        const cameraId = devices[0].id;
        await html5QrCode.start(
          cameraId,
          { fps: 10, qrbox: 300 },
          async (decodedText) => {
            const number = decodedText.trim();
            await stopScan();

            try {
              // 🔍 ดึง asset จาก asset_number
              const res = await axios.get(`http://localhost:3000/asset/number/${number}`);
              const asset = res.data;

              // ⚠️ แปลง status ให้เป็น string และ map ตัวเลขเป็น string
              const statusMap = { 0: 'Lost', 1: 'Normal', 2: 'Damaged' };
              const statusStr = statusMap[asset.status] || String(asset.status || '').trim();

              // 🚫 ถ้า Normal / Damaged ให้ Swal แจ้งเตือนและไม่ redirect
              if (statusStr.toLowerCase() === 'normal' || statusStr.toLowerCase() === 'damaged') {
                await Swal.fire({
                  icon: "warning",
                  title: "ไม่สามารถแก้ไขได้",
                  text: "❌ รายการนี้ไม่สามารถแก้ไขได้เนื่องจากทำการตรวจสอบแล้ว",
                  confirmButtonText: "ตกลง",
                });
                return;
              }

              // ✅ ถ้าไม่ใช่ Normal/Damaged ให้ redirect ไปหน้าแก้ไข
              router.push({ name: "ad_editasset", params: { id: asset.asset_id } });

            } catch (err) {
              await Swal.fire({
                icon: "error",
                title: "ไม่พบข้อมูล",
                text: "❌ ไม่พบข้อมูลครุภัณฑ์เลขนี้",
                confirmButtonText: "ตกลง",
              });
              console.error(err);
            }
          },
          (errorMessage) => console.warn("QR scan error:", errorMessage)
        );
      } catch (err) {
        console.error("Failed to start camera:", err);
        await Swal.fire({
          icon: "error",
          title: "ไม่สามารถเข้ากล้องได้",
          text: "❌ กรุณาตรวจสอบการอนุญาตกล้อง",
          confirmButtonText: "ตกลง",
        });
      }
    };

    onMounted(() => startScan());
    onBeforeUnmount(() => stopScan());

    return { qrCode, startScan, stopScan };
  },
};
</script>



<style>
.qr-code-container {
  max-width: 500px;
  margin: 30px auto;
  text-align: center;
  padding: 20px;
  font-family: 'Arial', sans-serif;
  color: #333;
  box-shadow: 0 0 15px rgba(0,0,0,0.1);
  border-radius: 12px;
  background-color: #fff;
}

.title {
  font-size: 2rem;
  font-weight: bold;
  color: #061C90;
  margin-bottom: 20px;
}

#qr-reader {
  width: 100%;
  height: 320px;
  border: 2px solid #ddd;
  border-radius: 10px;
  margin: 0 auto 20px;
  overflow: hidden;
  position: relative;
  background-color: #000;
}

#qr-reader video,
#qr-reader canvas {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
  border-radius: 10px;
}
</style>
