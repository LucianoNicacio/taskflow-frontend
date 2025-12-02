import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guest: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  // Route requires auth and user is not logged in
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next('/login')
  }
  // Route is for guests only and user is logged in
  else if (to.meta.guest && auth.isAuthenticated) {
    next('/dashboard')
  }
  // Otherwise proceed
  else {
    next()
  }
})

export default router