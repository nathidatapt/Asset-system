<template>
  <header :class="['navbar-custom', !navbarVisible && 'navbar-hidden']">
  <h1 class="mb-0 fw-bold text-white" style="display: inline;">ระบบตรวจสอบครุภัณฑ์</h1>
  <h3 class="role ms-auto mb-0 text-white">{{ email }}</h3>
</header>

</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const email = ref(localStorage.getItem('userEmail') || 'Guest')
const navbarVisible = ref(true)
let lastScrollY = 0

const handleScroll = () => {
  if (window.scrollY > lastScrollY) {
    // scroll down -> navbar หาย
    navbarVisible.value = false
  } else {
    // scroll up -> navbar โผล่
    navbarVisible.value = true
  }
  lastScrollY = window.scrollY
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>


<style scoped>
h1 {
  font-size: 20px;
}

.navbar-custom {
  position: fixed;
  top: 0;
  left: 350px;
  width: calc(100% - 300px);
  height: 78px;
  background-color: #03126A;
  padding: 16px 24px;
  box-sizing: border-box;
  z-index: 1000;
  display: flex;
  align-items: center;
  transition: transform 0.3s ease;
  transform: translateY(0);
}

.navbar-hidden {
  transform: translateY(-100%);
}

.role {
  margin-left: 800px; /* ดันไปขวาสุด */
  font-size: 18px;
  color: white;
}

</style>
