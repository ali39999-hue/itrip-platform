import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT (SELECT setting FROM pg_settings WHERE name='max_connections') AS max_conn,
           (SELECT count(*) FROM pg_stat_activity) AS current_conns,
           (SELECT count(*) FROM pg_stat_activity WHERE state='idle') AS idle_conns,
           (SELECT count(*) FROM pg_stat_activity WHERE state='active') AS active_conns
  `);
  console.log('DB capacity:', JSON.stringify(rows[0], (_, v) => (typeof v === 'bigint' ? Number(v) : v)));
  const byApp = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(application_name,'(none)') AS app, client_addr::text AS client_addr, state, count(*)::int AS n
    FROM pg_stat_activity GROUP BY 1,2,3 ORDER BY n DESC LIMIT 10
  `);
  for (const r of byApp) console.log(`  ${r.app} | ${r.client_addr} | ${r.state} | ${r.n}`);
  process.exit(0);
} catch (e) {
  console.error('QUERY FAIL:', e.message.split('\n')[0]);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
