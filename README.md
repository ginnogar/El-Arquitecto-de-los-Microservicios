# Proyecto de Microservicios: Gestión de Productos e Inventario

## Descripción del Proyecto
Este proyecto implementa un sistema de gestión de productos e inventario utilizando microservicios independientes. Los microservicios **PRODUCTO** e **INVENTARIO** se comunican de manera asincrónica 
mediante **RabbitMQ**. Además, se utiliza autenticación basada en **JWT** para proteger ciertas rutas y un **Circuit Breaker** para gestionar fallos en la comunicación entre los servicios.

## Tabla de Contenidos
- [Descripción del Proyecto](#descripción-del-proyecto)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Requisitos Previos](#requisitos-previos)
- [Instalación y Configuración](#instalación-y-configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Contratos de API](#contratos-de-api)
- [Cómo Ejecutar el Proyecto](#cómo-ejecutar-el-proyecto)
- [Autor](#autor)

## Tecnologías Utilizadas
- **Node.js** y **Express.js** para construir los microservicios.
- **PostgreSQL** como base de datos para almacenar productos e inventario.
- **RabbitMQ** para la comunicación asincrónica entre microservicios.
- **bcryptjs** para encriptación de contraseñas.
- **jsonwebtoken (JWT)** para autenticación de usuarios.
- **opossum** como implementación del Circuit Breaker.

## Requisitos Previos
- Node.js y npm instalados.
- PostgreSQL instalado y configurado.
- RabbitMQ instalado y en ejecución.

## Instalación y Configuración

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/ginnogar/El-Arquitecto-de-los-Microservicios.git
   cd <nombre-del-proyecto>

## Estructura del proyecto
├── producto.js          # Microservicio de PRODUCTO
├── inventario.js        # Microservicio de INVENTARIO
├── README.md            # Documentación del proyecto
└── contratosapi.txt     # Descripción de los contratos API

## Contratos de api
Microservicio de Productos (http://localhost:3000)
Registro de Usuarios:
POST /registro
Registra un nuevo usuario. Requiere username y password.

Login de Usuarios:
POST /login
Autentica al usuario y devuelve un token JWT.

Consultar Productos:
GET /productos
Requiere token JWT en el header Authorization.

Crear Producto:
POST /productos
Crea un producto y envía su ID a INVENTARIO. Requiere token JWT.

Actualizar Producto:
PUT /productos/:id
Actualiza los detalles de un producto. Requiere token JWT.

Microservicio de Inventario (http://localhost:3001)
Consultar Inventario Completo:
GET /inventario

Consultar Cantidad de un Producto:
GET /inventario/:id

Actualizar Cantidad de Producto:
PUT /inventario/:id
Para más detalles sobre cada endpoint y sus parámetros, consulta el archivo contratosapi.txt.

## Cómo ejecutar el proyecto
Ejecutar el Microservicio de PRODUCTO
node producto.js

Ejecutar el Microservicio de INVENTARIO
node inventario.js
Probar los Endpoints Puedes usar herramientas como Postman o Thunder Client para probar los endpoints descritos en los contratos API.

## Autor
Ginno - Participante de CODEPRO en Penguin Academy
