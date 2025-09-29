<template>
  <div class="home-page">
    <!-- ================== หัวข้อใหญ่ ================== -->
    <p class="title">ตรวจสอบครุภัณฑ์ประจำปี 2568</p>

    

    <!-- ================== กล่องข่าวประกาศ ================== -->
    <div class="notification-box">
      <!-- แถวหัวข้อ + ปุ่มเพิ่ม -->
      <div class="header-row">
        <h2>ประกาศแจ้งเตือน</h2>
        <button class="add-btn" @click="openPopup()">+ เพิ่มข่าวประกาศ</button>
      </div>

      <!-- ================== แสดงข่าวทั้งหมด ================== -->
      <div
        v-for="(item, index) in sortedByUpdated"
        :key="item.news_id"
        class="announcement"
      >
        <!-- หมายเลขลำดับ -->
        <div class="number-circle">{{ index + 1 }}</div>

        <!-- เนื้อหาข่าว -->
        <div class="content">
          <div class="title-row">
            <strong>{{ item.title }}</strong>
          </div>
          <p class="detail">{{ item.description }}</p>
          <p class="date">
            วันที่ {{ formatDate(item.start_date) }}
            <span v-if="isExpired(item.start_date)" style="color:red;">(หมดอายุแล้ว)</span>
          </p>
        </div>

        <!-- ปุ่มแก้ไข/ลบ -->
        <div class="action-btns">
          <div class="icon edit-icon" @click="openPopup(item)">
            <span class="material-icons">edit</span>
          </div>
          <div class="icon delete-icon" @click="deleteAnnouncement(item.news_id)">
            <span class="material-icons">delete</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ================== Popup สำหรับเพิ่ม/แก้ไข ================== -->
    <div v-if="showPopup" class="popup-overlay">
      <div class="popup">
        <h3>{{ editIndex !== null ? 'แก้ไขข่าวประกาศ' : 'เพิ่มข่าวประกาศ' }}</h3>

        <!-- กรอกหัวข้อ -->
        <label>หัวข้อข่าวประกาศ</label>
        <input v-model="form.title" type="text" required />

        <!-- กรอกรายละเอียด -->
        <label>รายละเอียดข่าวประกาศ</label>
        <textarea v-model="form.description" required></textarea>

        <!-- เลือกวันที่ (ป้องกันย้อนหลังด้วย min) -->
        <label>กำหนดวันเริ่มต้น</label>
        <input
          type="date"
          v-model="form.start_date"
          class="date-input"
          :min="today"
          required
        />

        <!-- ปุ่มบันทึก/ยกเลิก -->
        <div class="popup-actions">
          <button class="save-btn" @click="saveAnnouncement">บันทึก</button>
          <button class="cancel-btn" @click="closePopup">ยกเลิก</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import Swal from "sweetalert2";

export default {
  data() {
    return {
      announcements: [],
      showPopup: false,
      editIndex: null,
      form: {
        news_id: null,
        title: "",
        description: "",
        start_date: "",
      },
    };
  },
  computed: {
    today() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
    },
    sortedByUpdated() {
      return this.announcements
        .filter((item) => !this.isExpired(item.start_date))
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    },
  },
  methods: {
    async fetchAnnouncements() {
      try {
        const res = await axios.get("http://localhost:3000/news");
        if (res.data.success) {
          this.announcements = res.data.data;
        }
      } catch (err) {
        console.error(err);
        Swal.fire("ผิดพลาด", "ไม่สามารถดึงข่าวได้", "error");
      }
    },
    isExpired(dateStr) {
      const expiry = new Date(dateStr);
      expiry.setDate(expiry.getDate() + 14);
      return new Date() > expiry;
    },
    formatDate(dateStr) {
      return new Date(dateStr).toISOString().split("T")[0];
    },
    openPopup(item = null) {
      if (item) {
        this.form = { ...item };
        this.editIndex = this.announcements.findIndex(
          (n) => n.news_id === item.news_id
        );
      } else {
        this.form = { news_id: null, title: "", description: "", start_date: "" };
        this.editIndex = null;
      }
      this.showPopup = true;
    },
    closePopup() {
      this.showPopup = false;
    },
    async saveAnnouncement() {
      // ✅ ตรวจช่องว่าง: หัวข้อ/รายละเอียด/วันที่
      const titleOK = this.form.title && this.form.title.trim().length > 0;
      const descOK = this.form.description && this.form.description.trim().length > 0;
      const dateOK = !!this.form.start_date;

      if (!titleOK || !descOK) {
        Swal.fire("กรุณากรอกข้อความ", "กรุณากรอกหัวข้อและรายละเอียดข่าว", "warning");
        return;
      }
      if (!dateOK) {
        Swal.fire("กรุณากรอกข้อความ", "กรุณาเลือกวันที่", "warning");
        return;
      }
      if (this.form.start_date < this.today) {
        Swal.fire("ผิดพลาด", "กรุณาเลือกวันที่", "error");
        return;
      }

      // ✅ แสดงคอนเฟิร์มก่อนบันทึก
      Swal.fire({
        title: this.editIndex !== null ? "ยืนยันการแก้ไข?" : "ยืนยันการเพิ่มข่าว?",
        text: "คุณต้องการบันทึกข้อมูลนี้ใช่หรือไม่",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#d33",
        confirmButtonText: "บันทึก",
        cancelButtonText: "ยกเลิก",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const now = new Date();
            if (this.editIndex !== null) {
              this.form.updated_at = now;
              await axios.put(
                `http://localhost:3000/news/${this.form.news_id}`,
                { ...this.form }
              );
              this.announcements[this.editIndex] = { ...this.form };
              Swal.fire("สำเร็จ", "แก้ไขข่าวเรียบร้อย", "success");
            } else {
              this.form.created_at = now;
              this.form.updated_at = now;
              const res = await axios.post("http://localhost:3000/news", {
                ...this.form,
              });
              if (res.data.success) {
                this.announcements.push({
                  ...this.form,
                  news_id: res.data.news_id,
                });
                Swal.fire("สำเร็จ", "เพิ่มข่าวเรียบร้อย", "success");
              }
            }
            this.closePopup();
          } catch (err) {
            console.error(err);
            Swal.fire("ผิดพลาด", "บันทึกข่าวไม่สำเร็จ", "error");
          }
        }
      });
    },
    async deleteAnnouncement(news_id) {
      Swal.fire({
        title: "ยืนยันการลบ?",
        text: "คุณต้องการลบข่าวนี้ใช่หรือไม่",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#e53935",
        cancelButtonColor: "#aaa",
        confirmButtonText: "ลบ",
        cancelButtonText: "ยกเลิก",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await axios.delete(`http://localhost:3000/news/${news_id}`);
            this.announcements = this.announcements.filter(
              (n) => n.news_id !== news_id
            );
            Swal.fire("สำเร็จ", "ลบข่าวเรียบร้อย", "success");
          } catch (err) {
            console.error(err);
            Swal.fire("ผิดพลาด", "ลบข่าวไม่สำเร็จ", "error");
          }
        }
      });
    },
  },
  mounted() {
    this.fetchAnnouncements();
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/icon?family=Material+Icons");

.home-page {
  padding: 20px;
}

.title {
  font-size: 2.5rem;
  color: #020d57;
  margin-bottom: 20px;
}

.notification-box {
  border: 1px solid #020d57;
  border-radius: 8px;
  padding: 20px;
  max-width: 800px;
  background-color: white;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.add-btn {
  background: #28a745;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.announcement {
  display: flex;
  align-items: center;
  background-color: #d5def2;
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.number-circle {
  width: 36px;
  height: 36px;
  background-color: white;
  color: #020d57;
  border-radius: 50%;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.content {
  flex-grow: 1;
}

.detail,
.date {
  font-size: 0.9rem;
  margin-top: 4px;
}

.action-btns {
  display: flex;
  gap: 8px;
}

.icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.edit-icon {
  background-color: #fff3cd;
  color: #ff9800;
}

.delete-icon {
  background-color: #f8d7da;
  color: #e53935;
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
}

.popup {
  background: white;
  padding: 20px;
  border-radius: 12px;
  width: 400px;
}

.popup input,
.popup textarea {
  width: 100%;
  margin-bottom: 12px;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.popup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.save-btn {
  background: #28a745;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.cancel-btn {
  background: #e24d4d;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.date-input {
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #ccc;
}
</style>