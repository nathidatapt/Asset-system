<template>
  <div class="home-page">
    <!-- ================== หัวข้อใหญ่ ================== -->
    <p class="title">ตรวจสอบครุภัณฑ์ประจำปี 2568</p>

    <!-- ================== ช่วงเวลาตรวจสอบ ================== -->
    <p class="audit-dates">
      <span v-if="showDates">
        ช่วงเวลาตรวจสอบ {{ formatDate(startDate) }} - {{ formatDate(endDate) }}
      </span>
      <span v-else>
        ยังไม่มีการกำหนดช่วงเวลาตรวจสอบ
      </span>
    </p>

    <!-- ================== กล่องข่าวประกาศ ================== -->
    <div class="notification-box">
      <h2>ประกาศแจ้งเตือน</h2>

      <!-- ข่าวประกาศ -->
      <div
        v-for="(item, index) in sortedByUpdated"
        :key="item.news_id"
        class="announcement"
      >
        <div class="number-circle">{{ index + 1 }}</div>
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
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      announcements: [],

      // ====== ช่วงเวลาตรวจสอบ ======
      startDate: null,
      endDate: null,
      showDates: false, // true = มีข้อมูล, false = ไม่มี
    };
  },
  computed: {
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
      }
    },
    isExpired(dateStr) {
      const expiry = new Date(dateStr);
      expiry.setDate(expiry.getDate() + 14);
      return new Date() > expiry;
    },
    formatDate(dateInput) {
      if (!dateInput) return "";
      const d = new Date(dateInput);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    },
    async fetchOpeningTimes() {
      try {
        const { data } = await axios.get("http://localhost:3000/api/opening_times");
        if (data && data.open_datetime && data.close_datetime) {
          // แปลงเป็น Local Date
          this.startDate = new Date(data.open_datetime);
          this.endDate = new Date(data.close_datetime);
          this.showDates = true;
        } else {
          this.startDate = null;
          this.endDate = null;
          this.showDates = false;
        }
      } catch (e) {
        console.error("fetchOpeningTimes error", e);
        this.showDates = false;
      }
    },
  },
  mounted() {
    this.fetchAnnouncements();
    this.fetchOpeningTimes();
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/icon?family=Material+Icons");

/* ====== หัวข้อและช่วงเวลา ====== */
.title {
  font-size: 2.5rem;
  color: #020d57;
  margin-bottom: 5px;
}

.audit-dates {
  font-size: 1.1rem;
  font-weight: 500;
  color: #254bac;
  margin-bottom: 20px;
}
.audit-dates span[style] {
  color: #FF4D4D;
}

/* ====== ข่าวประกาศ ====== */
.notification-box {
  border: 1px solid #020d57;
  border-radius: 8px;
  padding: 20px;
  max-width: 800px;
  background-color: white;
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

.home-page {
  padding: 20px;
}
</style>