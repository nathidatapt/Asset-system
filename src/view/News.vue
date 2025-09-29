<template>
    <div class="container">
      <h2 class="title">กำหนดข่าวประกาศ</h2>
  
      <div class="input-group">
        <label class="label">หัวข้อประกาศ</label>
        <input type="text" v-model="title" placeholder="กำหนดหัวข้อ" class="text-input" />
      </div>
  
      <div class="input-group">
        <label class="label">คำอธิบาย</label>
        <input type="text" v-model="description" placeholder="คำอธิบายเพิ่มเติม" class="text-input" />
      </div>
  
      <div class="input-group">
        <label class="label">วันที่เริ่มต้น (ปี-เดือน-วัน)</label>
        <input type="date" v-model="startDate" class="date-input" />
      </div>
  
      <div class="input-group">
        <label class="label">วันที่สิ้นสุด (ปี-เดือน-วัน)</label>
        <input type="date" v-model="endDate" class="date-input" />
        <small v-if="isEndDateInvalid" class="error-text">
          วันที่สิ้นสุดต้องไม่เร็วกว่าวันที่เริ่มต้น
        </small>
      </div>
  
      <button class="save-btn" @click="save" :disabled="isEndDateInvalid">บันทึกข้อมูล</button>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        title: '',
        description: '',
        startDate: '',
        endDate: ''
      };
    },
    computed: {
      isEndDateInvalid() {
        return this.startDate && this.endDate && this.endDate < this.startDate;
      }
    },
    methods: {
      save() {
        if (this.isEndDateInvalid) {
          alert("กรุณาเลือกวันที่ให้ถูกต้อง");
          return;
        }
  
        const confirmed = confirm(
          `ยืนยันการบันทึกข้อมูลต่อไปนี้:\n\n` +
          `หัวข้อ: ${this.title}\n` +
          `คำอธิบาย: ${this.description}\n` +
          `วันที่เริ่มต้น: ${this.startDate}\n` +
          `วันที่สิ้นสุด: ${this.endDate}`
        );
  
        if (!confirmed) {
          return;
        }
  
        alert("บันทึกข้อมูลสำเร็จ");
        // สามารถส่งข้อมูลไปยัง backend ต่อได้ที่นี่
      }
    }
  };
  </script>
  
  <style scoped>
  .container {
    border: 3px solid #001f8f;
    border-radius: 12px;
    padding: 30px;
    max-width: 450px;
    margin: 50px auto;
    background-color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  .title {
    font-size: 24px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 30px;
  }
  .input-group {
    margin-bottom: 20px;
  }
  .label {
    display: block;
    font-weight: 500;
    margin-bottom: 8px;
  }
  .text-input,
  .date-input {
    width: 100%;
    padding: 10px;
    border: 2px solid #7d6ab2;
    border-radius: 8px;
    font-size: 16px;
  }
  .save-btn {
    background-color: #4CAF50;
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
  .error-text {
    color: red;
    font-size: 13px;
    margin-top: 5px;
  }
  </style>
  