const esbuild = require('esbuild');
const { execSync } = require('child_process');
const path = require('path');

const isProduction = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function build() {
    console.log(`Building in ${isProduction ? 'production' : 'development'} mode...`);

    const buildOptions = {
        entryPoints: ['./src/sdk.ts'],
        bundle: true,
        outfile: './dist/index.esm.js',
        format: 'esm',
        platform: 'browser', // Adjust if this is for the browser
        sourcemap: true,
        minify: isProduction,
        logLevel: 'info',
        metafile: true,
    };
    const workerBuildOptions = {
        entryPoints: ['./src/webrtc/encodedTransform.worker.ts'],
        bundle: true,
        outfile: './dist/encodedTransform.worker.js',
        format: 'esm',
        platform: 'browser',
        sourcemap: true,
        minify: isProduction,
        logLevel: 'info',
    };

    if (watch) {
        let ctx = await esbuild.context(buildOptions);
        let workerCtx = await esbuild.context(workerBuildOptions);
        await Promise.all([ctx.watch(), workerCtx.watch()]);
        console.log('Watching for changes...');
    } else {
        await esbuild.build(buildOptions);
        await esbuild.build(workerBuildOptions);
        console.log('Build complete.');

        // Generate type definitions
        console.log('Generating type definitions...');
        try {
            execSync('npx tsc --emitDeclarationOnly --outDir dist/types --skipLibCheck true', { stdio: 'inherit', cwd: __dirname });
            console.log('Type definitions generated.');
        } catch (error) {
            console.error('Failed to generate type definitions:', error.message);
        }
    }
}

build().catch((err) => {
    console.error(err);
    process.exit(1);
});
