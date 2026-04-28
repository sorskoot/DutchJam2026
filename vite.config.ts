import {defineConfig, loadEnv} from 'vite';

export default ({ mode }:{mode:string}) => {
    return defineConfig({
        server:  {
            port: 4623,
            host: '0.0.0.0',
        },
    });
};