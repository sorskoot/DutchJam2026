import {defineConfig} from 'vite';

export default () => {
    return defineConfig({
        server:  {
            port: 4623,
            host: '0.0.0.0',
        },
    });
};