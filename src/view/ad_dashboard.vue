<template>
  <div class="container">
    <div class="dashboard">
      <div class="card all">
        <div class="icon">
          <span class="material-icons icon-all">assignment</span>
        </div>
        <div class="label">ครุภัณฑ์ทั้งหมด</div>
        <div class="count">{{ stats.total }}</div>
      </div>
      <div class="card normal">
        <div class="icon">
          <span class="material-icons icon-normal">description</span>
        </div>
        <div class="label">ครุภัณฑ์ปกติ</div>
        <div class="count">{{ stats.normal }}</div>
      </div>
      <div class="card damaged">
        <div class="icon">
          <span class="material-icons icon-damaged">settings</span>
        </div>
        <div class="label">ครุภัณฑ์เสื่อมสภาพ</div>
        <div class="count">{{ stats.damaged }}</div>
      </div>
      <div class="card lost">
        <div class="icon">
          <span class="material-icons icon-lost">cancel</span>
        </div>
        <div class="label">ครุภัณฑ์ที่สูญหาย</div>
        <div class="count">{{ stats.lost }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      stats: {
        total: 0,
        normal: 0,
        damaged: 0,
        lost: 0
      }
    };
  },
  methods: {
    async fetchStats() {
      try {
        // เรียก API จริง
        const response = await axios.get('http://localhost:3000/api/asset/count');
        console.log('API response:', response.data);

        // แปลงค่าเป็นตัวเลข
        this.stats = {
          total: Number(response.data.total) || 0,
          normal: Number(response.data.status.normal) || 0,
          damaged: Number(response.data.status.damaged) || 0,
          lost: Number(response.data.status.lost) || 0
        };
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }
  },
  mounted() {
    this.fetchStats(); // ดึงข้อมูลทันทีเมื่อโหลดหน้า
  }
};
</script>

<style scoped>
.container {
  padding: 40px;
  font-family: 'Prompt', sans-serif; /* ฟอนต์สวย ๆ */
  max-width: 1000px;
  margin: auto;
}

.dashboard {
  display: flex;
  gap: 40px;
  flex-wrap: wrap;
  justify-content: center;
}

.card {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.card .icon {
  margin-bottom: 12px;
}

.icon-all,
.icon-normal,
.icon-damaged,
.icon-lost {
  font-size: 55px;
}

.card .label {
  font-size: 18px;
}

.card .count {
  font-size: 32px;
  margin-top: 8px;
}

/* สีการ์ดและกรอบ */
.card.all {
  background-color: #d4def5;
  color: #1f3fa0;
  border: 1px solid #061C90;
}

.card.normal {
  background-color: #D4F8D5;
  color: #1F8223;
  border: 1px solid #1F8223;
}

.card.damaged {
  background-color: #f6d2a4;
  color: #EE6800;
  border: 1px solid #EE6800;
}

.card.lost {
  background-color: #f9bbba;
  color: #A70704;
  border: 1px solid #A70704;
}
</style>