<template>
  <div class="inspectors-page">
    <h1>รายชื่อกรรมการตรวจสอบ ปี {{ currentYear }}</h1>

    <div class="top-bar">
      <button class="filter-btn" @click="showImportModal = true">คัดลอกรายชื่อ</button>
      <button class="add-btn" @click="showAddModal = true">เพิ่มรายชื่อ</button>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Name</th>
            <th>Position</th>
            <th>Year</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(inspector, index) in currentInspectors" :key="inspector.user_id">
            <td>{{ index + 1 }}</td>
            <td>{{ inspector.username }}</td>
            <td>{{ inspector.position }}</td>
            <td>{{ inspector.year }}</td>
            <td>
              <button class="delete-btn" @click="deleteInspector(inspector.user_id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!currentInspectors.length" class="no-data">ไม่มีข้อมูลกรรมการในปีนี้</p>
    </div>

    <!-- Add Inspector Modal -->
    <div v-if="showAddModal" class="modal-backdrop">
      <div class="modal">
        <h3>เพิ่มรายชื่อกรรมการ</h3>
        <div class="modal-input">
          <label for="new-email">Email (Google) :</label>
          <input id="new-email" v-model.trim="newInspectorEmail" type="email" placeholder="กรอก Email Google" />
        </div>
        <div class="modal-buttons">
          <button class="cancel-btn" @click="showAddModal = false">ยกเลิก</button>
          <button class="import-btn" @click="addInspectorByEmail">เพิ่มรายชื่อ</button>
        </div>
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="modal-backdrop">
      <div class="modal">
        <h3>คัดลอกรายชื่อกรรมการจากปีเก่า</h3>

        <div class="modal-input">
          <label for="select-year">เลือกปี:</label>
          <select id="select-year" v-model="selectedYear" @change="loadInspectorsFromYear">
            <option value="">-- เลือกปี --</option>
            <option v-for="year in academicYears" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>

        <div v-if="availableInspectors.length" class="checkbox-list">
          <div v-for="ins in availableInspectors" :key="ins.user_id" class="checkbox-row">
            <input type="checkbox" :value="ins.user_id" v-model="selectedImportInspectors" />
            <span>
              <strong>{{ ins.username }}</strong> - {{ ins.position }} (ปี {{ ins.year }})
            </span>
          </div>
        </div>
        <p v-else style="margin-top:10px;">ไม่มีกรรมการในปีที่เลือก</p>

        <div class="modal-buttons">
          <button class="cancel-btn" @click="showImportModal = false">ยกเลิก</button>
          <button class="import-btn" @click="importSelectedInspectors">คัดลอก</button>
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
      inspectors: [],
      currentYear: new Date().getFullYear() + 543, // พ.ศ.
      showImportModal: false,
      showAddModal: false,
      newInspectorEmail: "",
      selectedYear: "",
      availableInspectors: [],
      selectedImportInspectors: [],
      academicYears: []
    };
  },
  computed: {
    currentInspectors() {
      return this.inspectors.filter((ins) => Number(ins.year) === Number(this.currentYear));
    }
  },
  mounted() {
    this.fetchInspectors();
    this.fetchYears();
  },
  methods: {
    parseYearToBE(yearFromApi) {
      const n = Number(yearFromApi);
      if (!n) return null;
      return n > 2400 ? n : n + 543;
    },
    toGregorianFromBE(yearBE) {
      const n = Number(yearBE);
      return n > 2400 ? n - 543 : n;
    },

    async fetchInspectors() {
      try {
        const res = await axios.get("http://localhost:3000/api/audit_committee");
        this.inspectors = res.data.map((item) => {
          const yearBE = this.parseYearToBE(item.year) || this.currentYear;
          return {
            user_id: item.user_id,
            username: item.username || (item.email ? item.email.split("@")[0] : ""),
            position: "Audit Committee", // กำหนดตรง ๆ
            year: yearBE
          };
        });

        console.log("Inspectors (mapped):", this.inspectors);

        const yearsFromInspectors = Array.from(
          new Set(this.inspectors.map(i => i.year).filter(y => y && y !== this.currentYear))
        );
        const mergedSet = new Set([...(this.academicYears || []), ...yearsFromInspectors]);
        this.academicYears = Array.from(mergedSet).sort((a, b) => b - a);

        console.log("Academic Years after fetchInspectors:", this.academicYears);
      } catch (err) {
        console.error("fetchInspectors error:", err);
        Swal.fire({ icon: "error", title: "ไม่สามารถโหลดข้อมูลกรรมการได้" });
      }
    },

    async fetchYears() {
      try {
        const res = await axios.get("http://localhost:3000/api/audit-committee/years");
        const yearsFromApi = Array.isArray(res.data)
          ? res.data.map(y => this.parseYearToBE(y)).filter(y => y && y !== this.currentYear)
          : [];
        const merged = new Set([...(this.academicYears || []), ...yearsFromApi]);
        this.academicYears = Array.from(merged).sort((a, b) => b - a);
        console.log("Academic Years (dropdown):", this.academicYears);
      } catch (err) {
        console.error("Fetch Years Error:", err);
      }
    },

    async addInspectorByEmail() {
      if (!this.newInspectorEmail) {
        Swal.fire({ icon: "warning", title: "กรุณากรอก Email" });
        return;
      }
      try {
        const res = await axios.post("http://localhost:3000/api/add_audit_committee", {
          email: this.newInspectorEmail.trim().toLowerCase()
        });
        Swal.fire({ icon: "success", title: res.data.message });
        this.newInspectorEmail = "";
        await this.fetchInspectors();
        this.showAddModal = false;
      } catch (err) {
        console.error("addInspector error:", err);
        Swal.fire({ icon: "error", title: err.response?.data?.message || "ไม่สามารถเพิ่มกรรมการได้" });
      }
    },

    loadInspectorsFromYear() {
      if (!this.selectedYear) {
        this.availableInspectors = [];
        return;
      }
      const sy = Number(this.selectedYear);
      const inspectorsFromYear = this.inspectors.filter(ins => Number(ins.year) === sy);
      this.availableInspectors = inspectorsFromYear.filter(
        ins => !this.currentInspectors.some(curr => Number(curr.user_id) === Number(ins.user_id))
      );
      this.selectedImportInspectors = [];
    },

    async importSelectedInspectors() {
      if (!this.selectedYear || this.selectedImportInspectors.length === 0) {
        Swal.fire({ icon: "warning", title: "กรุณาเลือกกรรมการที่ต้องการคัดลอก" });
        return;
      }
      try {
        const targetGregorianYear = this.toGregorianFromBE(this.currentYear);
        const requests = this.selectedImportInspectors.map((userId) => {
          const inspector = this.inspectors.find(ins => Number(ins.user_id) === Number(userId));
          return axios.post("http://localhost:3000/api/audit_committee/copy", {
            user_id: inspector.user_id,
            year: targetGregorianYear
          });
        });

        await Promise.all(requests);
        await this.fetchInspectors();
        Swal.fire({ icon: "success", title: "คัดลอกรายชื่อไปปีปัจจุบันเรียบร้อย" });

        this.showImportModal = false;
        this.selectedImportInspectors = [];
        this.selectedYear = "";
        this.availableInspectors = [];
      } catch (err) {
        console.error("importSelectedInspectors error:", err);
        Swal.fire({ icon: "error", title: "คัดลอกไม่สำเร็จ" });
      }
    },

    async deleteInspector(userId) {
  try {
    const targetGregorianYear = this.toGregorianFromBE(this.currentYear);
    await axios.delete(`http://localhost:3000/api/audit_committee/${userId}`, {
      params: { year: targetGregorianYear }
    });
    await this.fetchInspectors();
    Swal.fire({ icon: "success", title: "ลบกรรมการเรียบร้อย" });
  } catch (err) {
    console.error("deleteInspector error:", err);
    Swal.fire({ icon: "error", title: err.response?.data?.message || "ไม่สามารถลบกรรมการได้" });
  }
}
  }
};
</script>


<style scoped>
.inspectors-page {
  font-family: 'Prompt', sans-serif;
  padding: 25px;
  background: linear-gradient(135deg, #f3f4f6, #e3f2fd);
  min-height: 100vh;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #0d47a1;
  font-size: 28px;
  font-weight: 700;
}

.top-bar {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-bottom: 25px;
}

.filter-btn, .add-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 15px;
  box-shadow: 0 3px 8px rgba(0,0,0,0.15);
}
.filter-btn {
  background: linear-gradient(135deg, #ffeb3b, #fbc02d);
  color: #000;
}
.add-btn {
  background: linear-gradient(135deg, #1565c0, #0d47a1);
  color: #fff;
}

.table-container {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 650px;
}

table th, table td {
  padding: 12px 15px;
  text-align: center;
  border-bottom: 1px solid #eee;
  font-size: 15px;
}

table th {
  background: #e3f2fd;
  color: #0d47a1;
  font-weight: 700;
}

table tbody tr:hover {
  background: #f9f9f9;
}

button.delete-btn {
  background: #e53935;
  color: #fff;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
}

.no-data {
  text-align: center;
  margin-top: 15px;
  color: #757575;
  font-style: italic;
}

/* --- Modal --- */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.modal {
  background: #fff;
  padding: 30px 25px;
  border-radius: 15px;
  width: 480px;
  max-width: 95%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 6px 25px rgba(0,0,0,0.2);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal h3 {
  margin-bottom: 20px;
  color: #0d47a1;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 10px;
}

.modal-input {
  margin-bottom: 15px;
}

.modal-input label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  color: #333;
  font-size: 14px;
}

.modal-input input, select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
  outline: none;
  font-size: 14px;
}

.modal-input input:focus, select:focus {
  border-color: #0d47a1;
  box-shadow: 0 0 6px rgba(13,71,161,0.2);
}

.checkbox-list {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 10px;
  margin-top: 10px;
  background: #f9f9f9;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background 0.2s ease;
  cursor: pointer;
}

.checkbox-row:hover {
  background: #e3f2fd;
}

.checkbox-row input[type="checkbox"] {
  margin: 0;
}

.checkbox-row span {
  font-size: 14px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.import-btn {
  background: linear-gradient(135deg, #43a047, #2e7d32);
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
}

.cancel-btn {
  background: #9e9e9e;
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
}

.import-btn:hover { transform: translateY(-2px); }
.cancel-btn:hover { background: #616161; }
</style>