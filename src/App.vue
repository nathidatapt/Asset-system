<template>
  <div class="app">
    <!-- แสดง Sidebar เฉพาะเมื่อไม่ใช่หน้า Login -->
    <Sidebar v-if="!isLoginPage && role === 'Admin'" class="sidebar" />
    <sidebar_ad v-if="!isLoginPage && role === 'Audit Committee'" class="sidebarad" />

    <div class="main-content">
      <!-- แสดง Navbar เฉพาะเมื่อไม่ใช่หน้า Login -->
      <Navbar v-if="!isLoginPage" class="navbar" />

      <main>
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'
import Sidebar from './components/Sidebar.vue'
import sidebar_ad from './components/sidebar_ad.vue'

const role = ref('')
const isLoginPage = ref(false)
const route = useRoute()

watchEffect(() => {
  isLoginPage.value = route.name === 'Login'
  // ดึง role จาก localStorage
  // ตรงนี้ให้แน่ใจว่า role ที่เก็บใน localStorage เป็น 'Admin' หรือ 'Audit' ตามฐานข้อมูล
  role.value = localStorage.getItem('userRole') || ''
  console.log('Current role:', role.value, 'Is Login page:', isLoginPage.value)
})
</script>

<style lang="scss">
:root {
  --primary: #061C90;
  --black: #000;
  --white: #fff;
  --bg: #E2E2E2;
  --primary-alt: #C6E4F7;
  --grey: #64748b;
  --dark-alt: #C6E4F7;
  --light: #fff;  /* พื้นหลัง */
  --sidebar-width: 300px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Fira Sans', sans-serif;
}

body {
  background: var(--light);
}

button {
  cursor: pointer;
  appearance: none;
  border: none;
  outline: none;
  background: none;
}

.app {
  display: flex;
}

/* Sidebar (ใช้ class แทน tag) */
.sidebar {
  width: var(--sidebar-width);
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  background-color: var(--primary);
  color: var(--white);
  z-index: 1000;
  overflow-y: auto;
}

/* Main Content */
.main-content {
  margin-left: var(--sidebar-width);
  width: calc(100% - var(--sidebar-width));
}

/* Navbar (ใช้ class แทน tag) */
.navbar {
  width: 75%;
  height: 60px;
  background-color: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  position: fixed;
  top: 0;
  right: var(--sidebar-width);
  right: 0;
  z-index: 1001;
}

/* Main Content Area */
main {
  margin-top: 60px;
  padding: 2rem;
  background: var(--light);
  min-height: calc(100vh - 60px);
}
</style>

<!-- (ติดตั้งเพิ่ม) npm install jspdf qrcode -->