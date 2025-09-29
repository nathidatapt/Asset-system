import { createRouter, createWebHistory } from 'vue-router'
import Login from '../view/Login.vue'
import Home from '../view/Home.vue'

// ---------------- Routes ----------------
const routes = [
  // หน้า Login
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  // หน้า Home (ต้อง login)
  {
    path: '/home',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }
  },
  // สำหรับ admin
  {
    path: '/Dashbord',
    component: () => import('../view/Dashbord.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settime',
    component: () => import('../view/Settime.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/Listaudit',
    component: () => import('../view/Listaudit.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/History',
    component: () => import('../view/History.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/News',
    component: () => import('../view/News.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/Editasset/:id?',
    name: 'Editasset',
    component: () => import('../view/Editasset.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/Qrcode',
    component: () => import('../view/Qrcode.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/Listasset',
    component: () => import('../view/Listasset.vue'),
    meta: { requiresAuth: true }
  },

  // สำหรับ Audit Committee
  {
    path: '/ad_home',
    component: () => import('../view/ad_home.vue'),
    meta: { requiresAuth: true, roles: ['Audit Committee'] }
  },
  {
    path: '/ad_dashboard',
    component: () => import('../view/ad_dashboard.vue'),
    meta: { requiresAuth: true, roles: ['Audit Committee'] }
  },
  {
    path: '/ad_listasset',
    component: () => import('../view/ad_listasset.vue'),
    meta: { requiresAuth: true, roles: ['Audit Committee'] }
  },
  {
    path: '/ad_History',
    component: () => import('../view/ad_History.vue'),
    meta: { requiresAuth: true, roles: ['Audit Committee'] }
  },
  {
    path: '/ad_editasset/:id',
    name: 'ad_editasset',
    component: () => import('../view/ad_editasset.vue'),
    meta: { requiresAuth: true, roles: ['Audit Committee'] }
  },
  {
    path: '/ad_qrcode',
    component: () => import('../view/ad_qrcode.vue'),
    meta: { requiresAuth: true, roles: ['Audit Committee'] }
  }
]

// ---------------- Router ----------------
const router = createRouter({
  history: createWebHistory(),
  routes
})

// ---------------- ฟังก์ชันเช็คเวลา Audit ----------------
export function isAuditActive() {
  const startDate = localStorage.getItem('startDate')
  const endDate = localStorage.getItem('endDate')
  if (!startDate || !endDate) return false

  const today = new Date().setHours(0, 0, 0, 0)
  const start = new Date(startDate).setHours(0, 0, 0, 0)
  const end = new Date(endDate).setHours(23, 59, 59, 999)

  return today >= start && today <= end
}

// ---------------- Global Navigation Guard ----------------
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('userToken')
  const userRole = localStorage.getItem('userRole')

  // ถ้ายังไม่ได้ login
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next('/')
  }

  // ถ้าเปิด /home แต่ role = Audit Committee → redirect ไป ad_home
  if (to.path === '/home' && userRole === 'Audit Committee') {
    return next('/ad_home')
  }

  // ถ้ามี roles ไม่ตรง
  if (to.meta.roles && !to.meta.roles.includes(userRole)) {
    Swal.fire({
      icon: 'error',
      title: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้',
      confirmButtonText: 'ตกลง'
    })
    return next(userRole === 'Audit Committee' ? '/ad_home' : '/')
  }

  next()
})


export default router
