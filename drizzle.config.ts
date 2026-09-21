// Config raíz para que `npx drizzle-kit push` funcione sin --config.
// La config canónica vive en src/db/drizzle.config.ts; aquí solo se re-exporta
// para que drizzle-kit la encuentre por defecto en la raíz del repo.
export { default } from './src/db/drizzle.config';
