import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [react()],
        define: {
            'process.env.CHATE2EE_API_URL': JSON.stringify(env.CHATE2EE_API_URL ?? ''),
        },
    };
});
