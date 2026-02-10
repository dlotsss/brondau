import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';


dotenv.config();
import pool from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// ============ AUTHENTICATION ============

// Вход для Owner
app.post('/api/auth/owner', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM platform_owner WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      role: 'OWNER'
    });
  } catch (error) {
    console.error('Owner login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить список ресторанов для выбранного email администратора
app.post('/api/auth/admin/restaurants', async (req, res) => {
  try {
    const { email } = req.body;
    
    const result = await pool.query(`
      SELECT r.id, r.name 
      FROM admins a
      JOIN restaurants r ON a.restaurant_id = r.id
      WHERE a.email = $1
    `, [email]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get admin restaurants error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Вход администратора с выбором ресторана (оптимизированный запрос)
app.post('/api/auth/admin', async (req, res) => {
  try {
    const { email, password, restaurantId } = req.body;
    
    // Точечная проверка: email + restaurant_id (использует индекс)
    const result = await pool.query(
      'SELECT * FROM admins WHERE email = $1 AND restaurant_id = $2',
      [email, restaurantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({
      id: admin.id,
      email: admin.email,
      role: 'ADMIN',
      restaurantId: admin.restaurant_id
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ RESTAURANTS ============

app.get('/api/restaurants', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM restaurants ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/restaurants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM restaurants WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/restaurants', async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pool.query(
      'INSERT INTO restaurants (name, layout) VALUES ($1, $2) RETURNING *',
      [name, JSON.stringify([])]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create restaurant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/restaurants/:id/layout', async (req, res) => {
  try {
    const { id } = req.params;
    const { layout } = req.body;
    
    const result = await pool.query(
      'UPDATE restaurants SET layout = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(layout), id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update layout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ BOOKINGS ============

app.get('/api/restaurants/:restaurantId/bookings', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const result = await pool.query(
      'SELECT * FROM bookings WHERE restaurant_id = $1 ORDER BY date_time DESC',
      [restaurantId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/restaurants/:restaurantId/bookings', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { tableId, tableLabel, guestName, guestPhone, guestCount, dateTime } = req.body;
    
    const result = await pool.query(`
      INSERT INTO bookings (restaurant_id, table_id, table_label, guest_name, guest_phone, guest_count, date_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [restaurantId, tableId, tableLabel, guestName, guestPhone, guestCount, dateTime]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/bookings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, declineReason } = req.body;
    
    const result = await pool.query(
      'UPDATE bookings SET status = $1, decline_reason = $2 WHERE id = $3 RETURNING *',
      [status, declineReason || null, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Автоматическая отмена старых pending броней
app.post('/api/bookings/cleanup-expired', async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE bookings 
      SET status = 'DECLINED', 
          decline_reason = 'Automatic cancellation: No response from administrator.'
      WHERE status = 'PENDING' 
        AND created_at < NOW() - INTERVAL '3 minutes'
      RETURNING *
    `);
    
    res.json({ updated: result.rows.length, bookings: result.rows });
  } catch (error) {
    console.error('Cleanup expired bookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ ADMINS (только для Owner) ============

app.post('/api/admins', async (req, res) => {
  try {
    const { restaurantId, email, password } = req.body;
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO admins (restaurant_id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, restaurant_id, email',
      [restaurantId, email, passwordHash]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ error: 'Admin already exists for this restaurant' });
    }
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/restaurants/:restaurantId/admins', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const result = await pool.query(
      'SELECT id, email, created_at FROM admins WHERE restaurant_id = $1',
      [restaurantId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
