import { createApp } from 'vue'
import Antd from 'ant-design-vue';
import App from './App.vue'
import './samples/node-api'
import 'ant-design-vue/dist/antd.css';
import InstantSearch from 'vue-instantsearch/vue3/es';


(window as any).Hls = require('hls.js');

const app = createApp(App);
app.use(Antd);
app.use(InstantSearch);
app.mount('#app').$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
});

 