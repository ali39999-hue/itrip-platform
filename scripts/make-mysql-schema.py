"""Apply the repository's canonical MySQL Prisma settings after a schema sync."""
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "prisma" / "schema.prisma"
LOCK_PATH = ROOT / "prisma" / "migrations" / "migration_lock.toml"


def update_schema() -> None:
    content = SCHEMA_PATH.read_text(encoding="utf-8")
    content = content.replace(
        "// Prisma Schema for iTrip/Firuzo Travel Platform - PostgreSQL Master Model v2",
        "// Prisma Schema for iTrip/Firuzo Travel Platform - MySQL/MariaDB Master Model v2",
    )
    content = content.replace(
        '  provider = "postgresql"\n  url      = env("DATABASE_URL")',
        '  provider = "mysql"\n  url      = env("DATABASE_URL")',
    )
    if 'binaryTargets = ["native", "rhel-openssl-1.1.x", "debian-openssl-1.1.x"]' not in content:
        content = content.replace(
            '  provider = "prisma-client-js"\n',
            '  provider = "prisma-client-js"\n'
            '  binaryTargets = ["native", "rhel-openssl-1.1.x", "debian-openssl-1.1.x"]\n',
            1,
        )
    SCHEMA_PATH.write_text(content, encoding="utf-8")


def update_migration_lock() -> None:
    content = LOCK_PATH.read_text(encoding="utf-8")
    LOCK_PATH.write_text(content.replace('provider = "postgresql"', 'provider = "mysql"'), encoding="utf-8")


if __name__ == "__main__":
    update_schema()
    update_migration_lock()
    print("Applied MySQL Prisma settings.")
    print("Regenerate the client with: npx prisma generate")
    print("Existing PostgreSQL migrations must be replaced with a MySQL baseline before migrate deploy.")
