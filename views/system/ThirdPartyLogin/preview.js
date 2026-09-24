import { createApp, h } from 'vue'
import { createRouter, createWebHistory, RouterView } from 'vue-router'
import andtv from 'ant-design-vue'
import JetLinksComponents from '@jetlinks-web/components'
import components from '@jetlinks-web-core/components'
import i18n from '@jetlinks-web-core/locales'
import ThirdPartyLogin from './index.vue'
import '@jetlinks-web-core/style.css'
import '@jetlinks-web-core/style/global.less'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: ThirdPartyLogin }],
})

createApp({ render: () => h(RouterView) })
  .use(router)
  .use(andtv)
  .use(i18n)
  .use(JetLinksComponents)
  .use(components)
  .mount('#app')
