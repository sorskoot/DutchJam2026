import { mkdir, readFile } from 'node:fs/promises';
import { checkExt, createNewAssetAt } from '@assetpack/core';
import convertFbx from 'fbx2gltf';

export function fbxToGlb(defaultOptions = {}) {
    return {
        folder: false,
        name: 'fbx-to-glb',
        defaultOptions: {
            inputExtensions: ['.fbx'],
            outputExtension: '.glb',
            converterArgs: [],
            strict: true,
            ...defaultOptions,
        },
        test(asset, options) {
            return checkExt(asset.path, ...options.inputExtensions);
        },
        async transform(asset, options) {
            const extension = asset.extension;
            const baseFileName = asset.filename.slice(0, -extension.length);
            const outputName = `${baseFileName}${options.outputExtension}`;
            const outputAsset = createNewAssetAt(asset, outputName);

            await mkdir(outputAsset.directory, { recursive: true });

            try {
                await convertFbx(asset.path, outputAsset.path, options.converterArgs);
            } catch (error) {
                if (!options.strict) {
                    return [asset];
                }
                throw error;
            }

            // Keep the converted file in memory for downstream pipes and final copy.
            outputAsset.buffer = await readFile(outputAsset.path);
            return [outputAsset];
        },
    };
}


