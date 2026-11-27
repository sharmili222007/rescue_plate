const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db').promise();

const app = express();
app.use(express.json());

// ---------- Keep server files private ----------
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  const blocked = ['/server.js', '/db.js', '/package.json', '/package-lock.json'];
  if (blocked.includes(p) || p.startsWith('/node_modules') || p.startsWith('/database') || p.startsWith('/.git')) {
    return res.status(404).send('Not found');
  }
  next();
});

app.use(express.static(__dirname));

// ---------- Photo upload setup ----------
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) =>
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only JPG, PNG or WEBP images are allowed')),
});

// ---------- Signup ----------
app.post('/api/signup', async (req, res) => {
  const { full_name, email, password, role } = req.body;
  if (!full_name || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.execute(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [full_name, email, hash, role === 'receiver' ? 'receiver' : 'donor']
    );
    res.status(201).json({ message: 'Account created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- Login ----------
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

// ---------- Donate ----------
const toSql = (v) => v.replace('T', ' ') + ':00';

app.post('/api/donate', (req, res) => {
  upload.single('foodImage')(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message });

    const b = req.body;
    const required = ['donorName', 'donorPhone', 'donorEmail', 'foodName', 'foodCategory',
      'foodQuantity', 'servings', 'foodDescription', 'preparedAt', 'expiryAt',
      'foodStorage', 'foodType', 'pickupAddress', 'locality', 'city', 'pincode', 'pickupTime'];

    if (required.some((f) => !b[f] || !String(b[f]).trim()))
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    if (!req.file)
      return res.status(400).json({ error: 'Please upload a food image.' });
    if (new Date(b.expiryAt) <= new Date(b.preparedAt))
      return res.status(400).json({ error: 'Expiry must be after the preparation time.' });

    try {
      await db.execute(
        `INSERT INTO donations
        (user_id, donor_name, organization, donor_phone, donor_email, food_name, food_category,
         food_quantity, servings, food_description, image_path, prepared_at, expiry_at,
         food_storage, food_type, pickup_address, locality, city, pincode, pickup_time,
         pickup_instructions)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          b.user_id || null, b.donorName, b.organization || null, b.donorPhone, b.donorEmail,
          b.foodName, b.foodCategory, b.foodQuantity, Number(b.servings), b.foodDescription,
          req.file.filename, toSql(b.preparedAt), toSql(b.expiryAt), b.foodStorage, b.foodType,
          b.pickupAddress, b.locality, b.city, b.pincode, toSql(b.pickupTime),
          b.pickupInstructions || null,
        ]
      );
      res.status(201).json({ message: 'Donation submitted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// ---------- List available donations ----------
app.get('/api/donations', async (req, res) => {
  const q = (req.query.q || '').trim();
  try {
    let sql = `SELECT id, food_name, food_category, food_quantity, servings,
                      food_description, image_path, locality, city, pincode,
                      prepared_at, expiry_at, pickup_time, pickup_instructions,
                      food_storage, food_type
               FROM donations
               WHERE status = 'available' AND expiry_at > NOW()`;
    const params = [];

    if (q) {
      sql += ' AND (locality LIKE ? OR city LIKE ? OR pincode LIKE ? OR food_name LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- Claim a donation (receivers only) ----------
app.post('/api/donations/:id/claim', async (req, res) => {
  const donationId = Number(req.params.id);
  const userId = Number(req.body.user_id);
  if (!donationId || !userId)
    return res.status(400).json({ error: 'Invalid request' });

  try {
    const [users] = await db.execute('SELECT role FROM users WHERE id = ?', [userId]);
    if (users.length === 0 || users[0].role !== 'receiver')
      return res.status(403).json({ error: 'Only receiver accounts can claim food.' });

    const [result] = await db.execute(
      `UPDATE donations
       SET status = 'claimed', claimed_by = ?, claimed_at = NOW()
       WHERE id = ? AND status = 'available' AND expiry_at > NOW()`,
      [userId, donationId]
    );
    if (result.affectedRows === 0)
      return res.status(409).json({ error: 'Sorry, this donation is no longer available.' });

    const [rows] = await db.execute(
      `SELECT donor_name, organization, donor_phone, donor_email,
              pickup_address, locality, city, pincode
       FROM donations WHERE id = ?`,
      [donationId]
    );
    res.json({ message: 'Donation claimed', contact: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(3000, () => console.log('Running on http://localhost:3000'));