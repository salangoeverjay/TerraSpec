import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                'resources/js/app.jsx',
            ],
            refresh: true,
        }),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
    build: {
        rollupOptions: {
            onwarn(warning, warn) {
                if (
                    warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
                    typeof warning.id === 'string' &&
                    warning.id.includes('node_modules/lucide-react/')
                ) {
                    return;
                }

                warn(warning);
            },
        },
    },
});
