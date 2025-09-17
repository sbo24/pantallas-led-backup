import { createRouter, createWebHistory } from 'vue-router'
import { requiresAuth, requiresGuest, requiresAdmin, navigationLogger } from './guards'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public routes - redirect to dashboard
    {
      path: '/',
      name: 'home',
      redirect: '/dashboard',
      meta: { title: 'ShowsTrack Admin' }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      beforeEnter: requiresGuest,
      meta: { title: 'Iniciar Sesión' }
    },
    
    // Protected routes
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      beforeEnter: requiresAuth,
      meta: { title: 'Dashboard', requiresAuth: true }
    },
    {
      path: '/shows',
      name: 'shows',
      component: () => import('../views/ShowsView.vue'),
      beforeEnter: requiresAuth,
      meta: { title: 'Gestión de Espectáculos', requiresAuth: true }
    },
    {
      path: '/events',
      name: 'events',
      component: () => import('../views/EventsView.vue'),
      beforeEnter: requiresAuth,
      meta: { title: 'Gestión de Eventos', requiresAuth: true }
    },
    {
      path: '/alerts',
      name: 'alerts',
      component: () => import('../views/AlertsView.vue'),
      beforeEnter: requiresAuth,
      meta: { title: 'Centro de Alertas', requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      beforeEnter: requiresAdmin,
      meta: { title: 'Configuración del Sistema', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/operator',
      name: 'operator',
      component: () => import('../views/OperatorView.vue'),
      beforeEnter: requiresAuth,
      meta: { title: 'Vista de Operador', requiresAuth: true }
    },
    
    // Utility routes
    {
      path: '/unauthorized',
      name: 'unauthorized',
      component: () => import('../views/UnauthorizedView.vue'),
      meta: { title: 'Acceso Denegado' }
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
      meta: { title: 'Acerca de' }
    },
    
    // Catch-all route
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
      meta: { title: 'Página No Encontrada' }
    }
  ]
})

// Global navigation guards
if (import.meta.env.DEV) {
  router.beforeEach(navigationLogger)
}

// Set page title
router.afterEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} | ShowsTrack Admin` : 'ShowsTrack Admin'
})

export default router
