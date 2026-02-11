import pg from 'pg';

const { Pool, types } = pg;

// Force TIMESTAMP (1114) to be interpreted as UTC string
types.setTypeParser(1114, (str) => str + 'Z');

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
