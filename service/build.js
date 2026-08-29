const esbuild = require('esbuild');
const { execSync } = require('child_process');
const path = require('path');

const fs = require('fs');

const OUTFILE = './dist/index.esm.js';

const isProduction = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// esbuild keeps `new URL('./encodedTransform.worker.ts', import.meta.url)` as
// written, so point it at the worker bundle that is emitted next to it. The
// source keeps the `.ts` specifier because bundlers used by consumers (Vite)
// resolve and compile the worker from source.
const rewriteWorkerUrlPlugin = {
    name: 'rewrite-worker-url',
    setup(build) {
        build.onEnd(() => {
            const outfile = path.resolve(__dirname, OUTFILE);
            if (!fs.existsSync(outfile)) {
                return;
            }
            const contents = fs.readFileSync(outfile, 'utf8');
            const workerUrlPattern = /(new URL\(\s*["'])\.\/encodedTransform\.worker\.ts(["'])/g;
            if (!workerUrlPattern.test(contents)) {
                console.warn('Worker URL not found in the bundle; the encoded transform worker may fail to load.');
                return;
            }
            // Same length as the original specifier, so the source map stays valid.
            fs.writeFileSync(outfile, contents.replace(workerUrlPattern, '$1./encodedTransform.worker.js$2'));
        });
    },
};

async function build() {
    console.log(`Building in ${isProduction ? 'production' : 'development'} mode...`);

    const buildOptions = {
        entryPoints: ['./src/sdk.ts'],
        bundle: true,
        outfile: OUTFILE,
        format: 'esm',
        platform: 'browser', // Adjust if this is for the browser
        sourcemap: true,
        minify: isProduction,
        logLevel: 'info',
        metafile: true,
        plugins: [rewriteWorkerUrlPlugin],
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
