const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

// Configure PostgreSQL connection
const pool = new Pool({
  connectionString:"postgres://admin:Q1wJG4pmcdf4mFuFSazG3Wwrsb0aMhDQ@dpg-cnnuk0djm4es73ce026g-a.singapore-postgres.render.com/smart_tracking_ystem",
  ssl: {
    rejectUnauthorized: false
  }
});

// Test PostgreSQL connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err);
  } else {
    console.log('Connected to PostgreSQL');
    console.log('PostgreSQL current timestamp:', res.rows[0].now);
  }
});

module.exports = pool;
