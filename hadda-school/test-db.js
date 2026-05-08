const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: 'postgresql://postgres.qjufkksmilaaianinwpc:Binmas%24uud1@aws-1-eu-north-1.pooler.supabase.com:6543/postgres'
  });

  try {
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log(res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection error', err.message);
  }
}

testConnection();
