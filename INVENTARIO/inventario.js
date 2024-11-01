const express = require ('express');
const { Pool } = require ('pg');
const amqp = require('amqplib'); // Asegúrate de tener amqplib instalado
const puerto = 3001;

//------Configuracion del servidor y PostgreSQL------//
const app = express();
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'inventario_db',
    password: 'ginno',
    port: 5432,
});

//------Middleware para leer JSON------//
app.use(express.json());

// ------------------ COMUNICACION ASINCRONA ----------------------
async function receiveProductFromQueue() {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    const queue = 'inventario';

    await channel.assertQueue(queue, { durable: true });
    console.log("Esperando mensajes en la cola 'inventario'...");

    channel.consume(queue, async (msg) => {
        const content = JSON.parse(msg.content.toString());
        const { producto_id, cantidad } = content;

        try {
            await pool.query(
                'INSERT INTO inventario (producto_id, cantidad) VALUES ($1, $2)',
                [producto_id, cantidad]
            );
            console.log(`Producto con ID ${producto_id} agregado al inventario.`);
            channel.ack(msg); // Confirmar que el mensaje fue procesado
        } catch (error) {
            console.error('Error al agregar producto al inventario:', error);
        }
    });
}
receiveProductFromQueue().catch(console.error);

//-----CREACION DE RUTAS (APIs)------//

//------Consulta de todo el Inventario------//
app.get('/inventario', async (req, res) => {
    const result = await pool.query('SELECT * FROM inventario');
    res.json(result.rows);
});

//------Obtener la cantidad de productos en el inventario------//
app.get('/inventario/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
        'SELECT * FROM inventario WHERE producto_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).send('ERROR. Producto no encontrado.')
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ mensaje: 'ERROR. No se obtener pudo la cantidad de producto.'})
    }
});

//------Actualizar Producto del inventario------//
app.put('/inventario/:id', async (req, res) => {
    const { id } = req.params;
    const { cantidad } = req.body;
    
    if (!cantidad) {
        return res.status(400).send('ERROR. Se deben ingresar todos los datos.')
    }

    try {
        const result = await pool.query(
            'UPDATE inventario SET cantidad = $1 WHERE id = $2 RETURNING *',
            [cantidad, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).send('ERROR. Producto no encontrado.')
        }

        res.json(result.rows[0]);  
    } catch (err) {
        res.status(500).send('ERROR. No se pudo actualizar el producto.')
    }
});

//------Iniciar servidor------//
app.listen(puerto, () => {
    console.log(`Servidor ejecutandose en http://localhost:${puerto}`)
});