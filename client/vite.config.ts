import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        define: {
            'process.env.CHATE2EE_API_URL': JSON.stringify(env.CHATE2EE_API_URL ?? ''),
        },
    };
});
