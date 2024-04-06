const express = require('express');
const { config } = require('dotenv');
const pg = require('pg');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
})

app.get('/api/allInfo', (req, res) => {
    pool.query('SELECT * FROM users', (error, result) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.json(result.rows);
      }
    });
  });

app.get('/api/users/email', (req, res) => {
    pool.query('SELECT email FROM users', (error, result) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            const emails = result.rows.map(row => row.email);
            res.json(emails);
        }
    });
});
app.get('/', (req, res) => {
    res.send('Hello Word!')
})

app.get('/ping', async (req, res) => {
    const result = await pool.query('SELECT NOW()')
    return res.json(result.rows[0])
})

app.listen(3000);
console.log('Server on port', 3000);