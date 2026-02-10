import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  user: 'avnadmin',
  password: 'AVNS_QJEsuUI1dU6xaP3hUXE',
  host: 'brondau-brondau.i.aivencloud.com',
  port: 27752,
  database: 'defaultdb',
  ssl: {
    rejectUnauthorized: false
  }
});

export default pool;
