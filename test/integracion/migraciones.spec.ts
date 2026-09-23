import * as fs from 'node:fs';
import * as path from 'node:path';

const raiz = path.join(__dirname, '..', '..');

describe('Bootstrap de migraciones RLS (MVP-007)', () => {
  it('incluye 0000 y 0001 en el journal real de Drizzle y expone migration:run', () => {
    const journal = JSON.parse(
      fs.readFileSync(path.join(raiz, 'drizzle/meta/_journal.json'), 'utf8'),
    ) as { entries: Array<{ idx: number; tag: string; breakpoints: boolean }> };
    const tags = journal.entries.map((entrada) => entrada.tag);

    expect(tags).toEqual([
      '0000_base_rls_postgis',
      '0001_mvp007_rls_contexto',
      '0002_contratos',
      '0003_compras',
      '0004_ventas',
      '0005_ciclos_costos',
      '0006_sesiones_refresh_tokens',
    ]);
    expect(journal.entries.map((entrada) => entrada.idx)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(journal.entries.every((entrada) => entrada.breakpoints === false)).toBe(true);
    for (const tag of tags) {
      expect(fs.existsSync(path.join(raiz, 'drizzle', `${tag}.sql`))).toBe(true);
    }

    const packageJson = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts['migration:run']).toBe(
      'drizzle-kit migrate --config ./drizzle.config.ts',
    );
  });

  it('separa credenciales de migración/admin y runtime en el bootstrap Docker', () => {
    const compose = fs.readFileSync(path.join(raiz, 'docker-compose.yml'), 'utf8');
    const init = fs.readFileSync(path.join(raiz, 'docker/postgres/init/001-roles.sh'), 'utf8');
    const config = fs.readFileSync(path.join(raiz, 'src/db/drizzle.config.ts'), 'utf8');

    expect(compose).toMatch(/POSTGRES_RUNTIME_USER/);
    expect(compose).toMatch(/POSTGRES_RUNTIME_PASSWORD/);
    expect(init).toMatch(/NOSUPERUSER/);
    expect(init).toMatch(/NOBYPASSRLS/);
    expect(init).toMatch(/GRANT CONNECT/);
    expect(config).toMatch(/DATABASE_MIGRATION_URL/);
    expect(config).toMatch(/elinain_admin/);
  });
});
