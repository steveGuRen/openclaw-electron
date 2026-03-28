import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Index',
    component: () => import('../pages/Index.vue')
  },
  {
    path: '/risk',
    name: 'Risk',
    component: () => import('../pages/Risk.vue')
  },
  {
    path: '/deps-install',
    name: 'DepsInstall',
    component: () => import('../pages/DepsInstall.vue')
  },
  {
    path: '/install',
    name: 'Install',
    component: () => import('../pages/Install.vue')
  },
  {
    path: '/integration',
    name: 'IntegrationSelect',
    component: () => import('../pages/IntegrationSelect.vue')
  },
  {
    path: '/integration/auto',
    name: 'AutoIntegration',
    component: () => import('../pages/AutoIntegration.vue')
  },
  {
    path: '/integration/manual',
    name: 'ManualIntegration',
    component: () => import('../pages/ManualIntegration.vue')
  },
  {
    path: '/update',
    name: 'Update',
    component: () => import('../pages/Update.vue')
  },
  {
    path: '/uninstall',
    name: 'Uninstall',
    component: () => import('../pages/Uninstall.vue')
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('../pages/Config.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
