import AppDataSource from './data-source';

async function runMigrations() {
  await AppDataSource.initialize();
  try {
    await AppDataSource.runMigrations();
  } finally {
    await AppDataSource.destroy();
  }
}

void runMigrations();
