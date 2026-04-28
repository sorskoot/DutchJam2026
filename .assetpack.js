import {pixiPipes} from '@assetpack/core/pixi';
import {sdfFont} from '@assetpack/core/webfont';
import {fbxToGlb} from './scripts/assetpack-fbx-to-glb.plugin.mjs';

export default {
    entry: './raw-assets',
    output: './public/assets/',
    cache: true,
    pipes: [
        fbxToGlb(),
        ...pixiPipes({
                cacheBust: false,
                compression: {png: true, webp: false},
                resolutions: [1],
                texturePacker: {
                    texturePacker: {
                        allowTrim: false,
                        removeFileExtension: true,
                    },
                },
                manifest: {
                    output: './public/assets/assets-manifest.json',
                },
            },
        ),
        sdfFont()
    ],
};
