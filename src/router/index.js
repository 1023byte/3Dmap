//router
import { createRouter, createWebHistory } from 'vue-router'
import map from '../components/map.vue'


const routes = [
  {
    path: '/',
    name: 'map',
    component: map
  },

]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router