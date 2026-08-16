import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import router from './router';
import { useAuth } from './composables/useAuth';

const { restoreSession } = useAuth();

restoreSession();

const app = createApp(App);

app.use(router as any);
app.mount('#app');
