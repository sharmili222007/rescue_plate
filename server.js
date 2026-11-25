const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./db').promise();

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/signup', async (req, res) => {
  const { full_name, email, password, role } = req.body;
  if (!full_name || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.execute(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [full_name, email, hash, role || 'donor']
    );
    res.status(201).json({ message: 'Account created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password_hash)))
      return res.status(401).json({ error: 'Invalid email or password' });
    const { id, full_name, role } = rows[0];
    res.json({ message: 'Login successful', user: { id, full_name, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(3000, () => console.log('Running on http://localhost:3000'));