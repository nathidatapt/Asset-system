<template>
	<aside :class="is_expanded ? 'is-expanded' : ''">
	  <div class="logo">
		<img :src="logoURL" alt="Logo" />
	  </div>
  
	  <div class="menu-toggle-wrap">
		<button class="menu-toggle" @click="ToggleMenu">
		  <span class="material-icons">keyboard_double_arrow_right</span>
		</button>
	  </div>
  
	  <h3>Menu</h3>
	  <div class="menu">
		<router-link to="/Home" class="button">
		  <span class="material-icons">home</span>
		  <span class="text">หน้าแรก</span>
		</router-link>
		<router-link to="/Dashbord" class="button">
		  <span class="material-icons">data_thresholding</span>
		  <span class="text">แดชบอร์ด</span>
		</router-link>
		<router-link to="/settime" class="button">
		  <span class="material-icons">edit_calendar</span>
		  <span class="text">ระยะเวลาการตรวจสอบ</span>
		</router-link>
		<router-link to="/Listaudit" class="button">
		  <span class="material-icons">group_add</span>
		  <span class="text">รายชื่อผู้ตรวจสอบ</span>
		</router-link>
		<router-link to="/Listasset" class="button">
		  <span class="material-icons">description</span>
		  <span class="text">รายการครุภัณฑ์</span>
		</router-link>
		<router-link to="/Qrcode" class="button">
		  <span class="material-icons">qr_code_scanner</span>
		  <span class="text">สแกนคิวอาร์โค้ด</span>
		</router-link>
		<router-link to="/History" class="button">
		  <span class="material-icons">history</span>
		  <span class="text">ประวัติการแก้ไข</span>
		</router-link>
	  </div>
  
	  <div class="logout">
		<button class="logout-button" @click="handleLogout">
		  <span class="material-icons">logout</span>
		  <span class="text">ออกจากระบบ</span>
		</button>
	  </div>
	</aside>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import logoURL from '../assets/img/logo.png'
  import Swal from 'sweetalert2'
  
  const router = useRouter()
  const is_expanded = ref(localStorage.getItem("is_expanded") === "true")
  
  // ฟังก์ชันเปิด/ปิดแถบเมนู
  const ToggleMenu = () => {
	is_expanded.value = !is_expanded.value
	localStorage.setItem("is_expanded", is_expanded.value)
  }
  
  // ฟังก์ชันออกจากระบบและยืนยันก่อนออก
  const handleLogout = () => {
  Swal.fire({
    title: 'ออกจากระบบ?',
    text: 'คุณต้องการออกจากระบบใช่หรือไม่?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ตกลง',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.clear()
      router.push('/') // หรือ '/login' แล้วแต่หน้า login ของคุณ
    }
  })
}
  
  </script>
  
  <style lang="scss" scoped>
  aside {
	display: flex;
	flex-direction: column;
	background-color: var(--bg);
	color: #000;
	width: calc(2rem + 32px);
	overflow: hidden;
	min-height: 100vh;
	padding: 1rem;
	transition: width 0.3s ease-in-out;
  
	.logo {
	  margin-bottom: 1rem;
	  img {
		width: 17rem;
	  }
	}
  
	.menu-toggle-wrap {
	  display: flex;
	  justify-content: flex-end;
	  margin-bottom: 1rem;
	  position: relative;
	  top: 0;
	  transition: 0.2s ease-in-out;
  
	  .menu-toggle {
		transition: 0.2s ease-in-out;
		.material-icons {
		  font-size: 2rem;
		  color: var(--primary);
		  transition: 0.2s ease-out;
		}
  
		&:hover {
		  .material-icons {
			transform: translateX(0.5rem);
		  }
		}
	  }
	}
  
	h3 {
	  color: var(--grey);
	  font-size: 0.875rem;
	  margin-bottom: 0.5rem;
	  text-transform: uppercase;
	  opacity: 0;
	  display: none;
	  transition: all 0.3s ease-in-out;
	}
  
	.menu {
	  margin: 0 -1rem;
	  .button {
		display: flex;
		align-items: center;
		text-decoration: none;
		padding: 0.5rem 1rem;
		transition: 0.2s ease-in-out;
  
		.material-icons {
		  font-size: 2rem;
		  color: var(--primary);
		  transition: 0.2s ease-in-out;
		}
  
		.text {
		  color: var(--black);
		  margin-left: 1rem;
		  opacity: 0;
		  display: none;
		  transition: all 0.2s ease-in-out;
		  white-space: nowrap;
		}
  
		&:hover {
		  background-color: var(--dark-alt);
  
		  .material-icons,
		  .text {
			color: var(--primary);
		  }
		}
  
		&.router-link-exact-active {
		  background-color: var(--dark-alt);
		  border-left: 5px solid var(--primary);
  
		  .material-icons,
		  .text {
			color: var(--primary);
		  }
		}
	  }
	}
  
	.logout {
	  margin-top: auto;
	  padding-top: 1rem;
	  border-top: 1px solid #ccc;
  
	  .logout-button {
		width: 100%;
		background-color: #e53935;
		color: white;
		display: flex;
		align-items: center;
		padding: 0.5rem 1rem;
		border: none;
		cursor: pointer;
		transition: background-color 0.3s ease;
  
		.material-icons {
		  margin-right: 1rem;
		}
  
		.text {
		  opacity: 0;
		  display: none;
		  transition: all 0.2s ease-in-out;
		}
  
		&:hover {
		  background-color: #A70704;
		}
	  }
	}
  
	&.is-expanded {
	  width: var(--sidebar-width);
  
	  h3 {
		opacity: 1;
		display: block;
	  }
  
	  .menu-toggle-wrap {
		top: -3rem;
		.menu-toggle {
		  transform: rotate(-180deg);
		}
	  }
  
	  .button .text {
		opacity: 1;
		display: inline;
	  }
  
	  .logout-button .text {
		opacity: 1;
		display: inline;
	  }
	}
  
	@media (max-width: 1024px) {
	  position: absolute;
	  z-index: 99;
	}
  }
  </style>
  