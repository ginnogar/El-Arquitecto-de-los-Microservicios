const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const amqp = require('amqplib');
const CircuitBreaker = require('opossum');
const puerto = 3000;

//------Configuracion del servidor y PostgreSQL------//
const app = express();
const pool = new Pool ({
    user: 'postgres',
    host: 'localhost',
    database: 'productos_db',
    password: 'ginno',
    port: 5432,
});

//------Middleware para leer JSON------//
app.use(express.json());

//------TOKEN------//

// Clave secreta para JWT
const SECRET_KEY = 'Penguin';

//------Ruta para Registrar usuarios------//
app.post('/registro', async (req, res) => {
    const { username, password  } = req.body;
    
    if (!username || !password) {
        return res.status(400).send('ERROR. Se deben ingresar todos los datos.');
    }

    try {
        // Verificar si el usuairo ya existe
        const userCheck = await pool.query(
        'SELECT * FROM usuarios WHERE username = $1', [username]);
        if (userCheck.rows.length > 0) {
        // Si hay un usuario existente con ese nombre, envía un error
            return res.status(400).json({ message: 'Usuario ya registrado' });
        }
        
        // Encriptar contrasenha
        const hashedPassword = await bcrypt.hash(password, 10)

        // Insertar nuevo usuario en la base de datos 
        const result = await pool.query(
        'INSERT INTO usuarios (username, password) VALUES($1, $2)', [username, hashedPassword]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).send('ERROR. No se pudo hacer el registro.')
    }
});

// Ruta de login : Esta ruta autentica a los usuarios registrados y genera un token JWT que se les enviará.
app.post('/login', async(req, res) =>{
    const {username, password} = req.body;

    // Verificar si el usuario existe
    const user = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    if (user.rows.length === 0) {
        return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    // Comprobar contrasenha
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
        return res.status(400).json({ message: 'Contraseña incorrecta' });
    }

    // Generar el token JWT 
    const token = jwt.sign({ userId: user.rows[0].id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
});

// Middleware para verificar JWT
function authenticateToken(req, res, next){
    const token = req.header('Authorization').replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado' });
    }
    
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Token no válido' });
    }
}

// -------------COMUNICACIO ASINCRONA---------------------------
async function sendProductToInventory(productId) {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    const queue = 'inventario';

    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify({ producto_id: productId, cantidad: 0 })));

    console.log(`Producto enviado al inventario con ID: ${productId}`);
    await channel.close();
    await connection.close();
}
// ----------------CIRCUITO BREAKER---------------------------
// Configuración del Circuit Breaker
async function sendProductToInventory(productId) {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    const queue = 'inventario';

    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify({ producto_id: productId, cantidad: 0 })));

    console.log(`Producto enviado al inventario con ID: ${productId}`);
    await channel.close();
    await connection.close();
}

// Opciones de configuración para el Circuit Breaker
const breakerOptions = {
    timeout: 5000, // Tiempo máximo para intentar el envío (en ms)
    errorThresholdPercentage: 50, // Porcentaje de errores permitido antes de abrir el circuito
    resetTimeout: 30000 // Tiempo para intentar reactivar el circuito (en ms)
};

// Crear una instancia del Circuit Breaker
const breaker = new CircuitBreaker(sendProductToInventory, breakerOptions);


//-----CREACION DE RUTAS (APIs) CON AUTORIZACION------//

//------Consulta de Productos------//
app.get('/productos', authenticateToken, async (req, res) => {
    const result = await pool.query('SELECT * FROM productos');
    res.json(result.rows);
});

//------Crear un nuevo producto------//
// Crear un nuevo producto y enviar al inventario con Circuit Breaker
app.post('/productos', async (req, res) => {
    const { nombre, descripcion, precio } = req.body;

    if (!nombre || !descripcion || !precio) {
        return res.status(400).json({ error: 'ERROR. Se deben ingresar todos los datos.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO productos (nombre, descripcion, precio) VALUES($1, $2, $3) RETURNING *',
            [nombre, descripcion, precio]
        );
        const newProduct = result.rows[0];

        // Enviar mensaje a RabbitMQ utilizando el Circuit Breaker
        await breaker.fire(newProduct.id);

        res.status(201).json(newProduct);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('ERROR. No se pudo crear el producto.');
    }
});

//------Actualizar un producto------//
app.put('/productos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio } = req.body;

    if (!nombre || !descripcion || !precio){
        return res.status(400).json({ error: 'ERROR. Se deben ingresar todos los datos.'});
    }

    try {
        const result = await pool.query(
            'UPDATE productos SET nombre = $1, descripcion = $2, precio = $3 WHERE id = $4 RETURNING *', 
            [nombre, descripcion, precio, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).send('ERROR. No se pudo actualizar el producto.')
    }
});


//------Inicia el servidor------//
app.listen(puerto, () => {
    console.log(`Servidor ejecutandose en http://localhost:${puerto}`)
});
