import {defineConfig} from 'vite';

export default () => {
    return defineConfig({
        server: {
            port: 4623,
            host: '0.0.0.0',
        },
        build: {
            target: 'esnext',
            modulePreload: false,
            cssCodeSplit: false,
            assetsInlineLimit: 0,
            chunkSizeWarningLimit: 10 * 1024 * 1024,
            rolldownOptions: {
                output: {
                    codeSplitting: false,
                },
            },
        },
    });
};
