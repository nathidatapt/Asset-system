<template>
  <div class="container">
    <h2 class="title">ระยะเวลาการตรวจสอบ</h2>

    <div class="input-group">
      <label class="label">วันที่เริ่มต้น (เดือน-วัน-ปี)</label>
      <input type="date" v-model="startDate" class="date-input" :min="today" />
    </div>

    <div class="input-group">
      <label class="label">วันที่สิ้นสุด (เดือน-วัน-ปี)</label>
      <input type="date" v-model="endDate" class="date-input" :min="startDate || today" />
      <small v-if="isEndDateInvalid" class="error-text">
        วันที่สิ้นสุดต้องไม่เร็วกว่าวันที่เริ่มต้น
      </small>
    </div>

    <!-- ปุ่มบันทึก -->
    <button
      class="save-btn"
      @click="save"
      :disabled="isEndDateInvalid || isAlreadySaved"
    >
      บันทึกข้อมูล
    </button>

    <!-- ปุ่มแก้ไข -->
    <button v-if="isSaved" class="edit-btn" @click="confirmEditDates">
      แก้ไขวันที่
    </button>

    <!-- แสดงช่วงเวลาตรวจสอบเฉพาะเมื่อมีวันที่ตั้งแล้ว -->
    <div v-if="startDate && endDate" class="selected-dates">
      <div>ช่วงเวลาตรวจสอบ :</div>
      <div class="dates">
        {{ formatDate(startDate) }} - {{ formatDate(endDate) }}
      </div>
    </div>
  </div>
</template>

<script>
import Swal from 'sweetalert2';
import axios from 'axios';

export default {
  data() {
    return {
      startDate: '',           // วันที่เริ่มต้นช่วงตรวจสอบ
      endDate: '',             // วันที่สิ้นสุดช่วงตรวจสอบ
      isSaved: false,
      isAlreadySaved: false,
      userRole: localStorage.getItem('role') || '', // role จาก login
    };
  },
  computed: {
    today() {
      const d = new Date();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${d.getFullYear()}-${month}-${day}`;
    },
    isEndDateInvalid() {
      return this.endDate && this.startDate && this.endDate < this.startDate;
    },
    isDateActive() {
      if (!this.startDate || !this.endDate) return false;
      const today = new Date();
      today.setHours(0,0,0,0);

      const start = this.parseLocalDate(this.startDate);
      const end = this.parseLocalDate(this.endDate);
      end.setHours(23,59,59,999);

      return today >= start && today <= end;
    }
  },
  methods: {
    parseLocalDate(dateStr) {
      // รับ 'yyyy-mm-dd' หรือ ISO string แล้วแปลงเป็น Date Local
      const d = new Date(dateStr);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    },

    formatDate(dateStr) {
      const d = this.parseLocalDate(dateStr);
      return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
    },

    async save() {
      if (this.isEndDateInvalid) {
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'วันที่สิ้นสุดต้องไม่เร็วกว่าวันที่เริ่มต้น'
        });
        return;
      }

      const result = await Swal.fire({
        title: 'ยืนยันการบันทึกข้อมูลนี้?',
        html: `<strong>วันที่เริ่มต้น:</strong> ${this.formatDate(this.startDate)}<br>
               <strong>วันที่สิ้นสุด:</strong> ${this.formatDate(this.endDate)}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
      });

      if (!result.isConfirmed) return;

      try {
        const created_by = Number(localStorage.getItem('userId')) || null;

        await axios.post('http://localhost:3000/api/opening_times', {
          startDate: this.startDate,
          endDate: this.endDate,
          created_by
        });

        await this.fetchOpeningTimes();

        Swal.fire({ icon: 'success', title: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'บันทึกล้มเหลว',
          text: err.response?.data?.error || 'กรุณาลองใหม่อีกครั้ง'
        });
      }
    },

    async fetchOpeningTimes() {
      try {
        const { data } = await axios.get('http://localhost:3000/api/opening_times');
        if (data && data.open_datetime && data.close_datetime) {

          // แปลงเป็น Local yyyy-mm-dd เพื่อ v-model ของ <input type="date">
          const start = this.parseLocalDate(data.open_datetime);
          const end = this.parseLocalDate(data.close_datetime);

          this.startDate = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
          this.endDate = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;

          this.isSaved = true;
          this.isAlreadySaved = true;

          // อัปเดตสถานะทุกนาที
          setInterval(() => {
            this.isSaved = !!(this.startDate && this.endDate);
          }, 60000);
        } else {
          this.isSaved = false;
          this.isAlreadySaved = false;
        }
      } catch (err) {
        console.error('fetchOpeningTimes error', err);
      }
    },

    async confirmEditDates() {
      const result = await Swal.fire({
        title: 'ยืนยันการแก้ไขวันที่?',
        text: 'คุณต้องการที่จะลบข้อมูลวันที่ปัจจุบันหรือไม่?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
      });

      if (result.isConfirmed) this.editDates();
    },

    editDates() {
      this.startDate = '';
      this.endDate = '';
      this.isSaved = false;
      this.isAlreadySaved = false;

      localStorage.removeItem('startDate');
      localStorage.removeItem('endDate');
      localStorage.removeItem('isSaved');
      localStorage.removeItem('isAlreadySaved');
    },

    checkAccess() {
      if (this.userRole === 'Audit Committee' || this.userRole === 'audit') {
        if (!this.startDate || !this.endDate) return;

        const today = new Date().setHours(0, 0, 0, 0);
        const start = this.parseLocalDate(this.startDate).setHours(0, 0, 0, 0);
        const end = this.parseLocalDate(this.endDate).setHours(23, 59, 59, 999);

        if (today < start || today > end) {
          Swal.fire({
            icon: 'warning',
            title: 'ยังไม่ถึงเวลาตรวจสอบ',
            html: `คุณสามารถเข้าสู่ระบบได้ตั้งแต่ <strong>${this.formatDate(this.startDate)}</strong> ถึง <strong>${this.formatDate(this.endDate)}</strong>`
          }).then(() => {
            this.$router.push('/'); // กลับหน้า Home
          });
        }
      }
    }
  },

  mounted() {
    this.fetchOpeningTimes();
    this.checkAccess();
  }
};
</script>

<style scoped>
.container {
  border: 3px solid #061C90;
  border-radius: 12px;
  padding: 30px;
  max-width: 400px;
  min-height: 300px;
  margin: 50px auto;
  background-color: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.title {
  font-size: 22px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 30px;
}

.input-group {
  width: 100%;
  margin-bottom: 20px;
}

.label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
}

.date-input {
  width: 100%;
  padding: 10px;
  border: 2px solid #7d6ab2;
  border-radius: 8px;
  font-size: 16px;
}

.save-btn {
  background-color: #28AF50;
  color: white;
  padding: 10px 18px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  width: 100%;
  font-size: 16px;
}

.save-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.edit-btn {
  background-color: #FB8C00;
  color: white;
  padding: 10px 18px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  width: 100%;
  font-size: 16px;
  margin-top: 10px;
}

.error-text {
  color: red;
  font-size: 13px;
  margin-top: 5px;
}

.selected-dates {
  margin-top: auto;
  text-align: center;
  font-size: 16px;
  font-weight: 500;
  color: #061C90;
  width: 100%;
  padding: 10px;
  border-top: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.selected-dates .dates {
  margin-top: 5px;
  font-size: 18px;
  font-weight: 600;
  color: #061C90;
}
</style>