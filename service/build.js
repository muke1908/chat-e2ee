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

    if (watch) {
        let ctx = await esbuild.context(buildOptions);
        await ctx.watch();
        console.log('Watching for changes...');
    } else {
        await esbuild.build(buildOptions);
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
