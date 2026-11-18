const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

const ALLOWED_ORIGIN = "http://mi-bucket-s3-ander-18857.s3-website-us-east-1.amazonaws.com"; 

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,         
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,    
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME      
});


async function initDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      symptom TEXT NOT NULL,
      urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(createTableQuery);
    console.log('[DB] Tabla "patients" verificada y lista en PostgreSQL.');
  } catch (err) {
    console.error('[DB ERROR] No se pudo inicializar la base de datos:', err.message);
  }
}

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'OK' })
  } catch (err) {
    console.error('[HEALTHCHECK FAIL]:', err.message);
    res.status(500).json({ status: 'BAD' })
  }
});


app.get('/patients', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, symptom, urgency FROM patients ORDER BY id ASC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('[GET /patients ERROR]:', err.message);
    res.status(500).json({ error: 'Error al obtener la lista de pacientes' });
  }
});

app.post('/patients', async (req, res) => {
  const { name, symptom, urgency } = req.body;

  const validUrgencies = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  if (!name || !symptom || !validUrgencies.includes(urgency)) {
    return res.status(400).json({
      error: 'Datos inválidos. Se requiere name, symptom y urgency (LOW, MEDIUM, HIGH, CRITICAL).'
    });
  }

  try {
    const insertQuery = `
      INSERT INTO patients (name, symptom, urgency)
      VALUES ($1, $2, $3)
      RETURNING id, name, symptom, urgency;
    `;
    const result = await pool.query(insertQuery, [name, symptom, urgency]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[POST /patients ERROR]:', err.message);
    res.status(500).json({ error: 'Error al registrar el paciente en la base de datos' });
  }
});

app.delete('/patients/:id', async (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  if (isNaN(patientId)) {
    return res.status(400).json({ error: 'El ID del paciente debe ser numérico' });
  }

  try {
    const result = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING id', [patientId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    res.status(200).json({ message: 'Paciente dado de alta correctamente', id: patientId });
  } catch (err) {
    console.error('[DELETE /patients/:id ERROR]:', err.message);
    res.status(500).json({ error: 'Error al eliminar el registro del paciente' });
  }
});

const PORT = "5000"; 
const HOST = "0.0.0.0"; 

app.listen(PORT, HOST, async () => {
  await initDatabase();
  console.log(`[VoriMed API] Servidor corriendo en http://${HOST}:${PORT}`);
});