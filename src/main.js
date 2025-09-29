import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'


// Import Bootstrap CSS
// import 'bootstrap/dist/css/bootstrap.min.css'
// import 'bootstrap'

// // สำหรับ BootstrapVue 3 (optional)
// import BootstrapVue3 from 'bootstrap-vue-3'
// import 'bootstrap-vue-3/dist/bootstrap-vue-3.css'

createApp(App).use(router).mount('#app')
