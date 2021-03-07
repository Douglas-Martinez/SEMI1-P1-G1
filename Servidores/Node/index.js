//Requires
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
var uuid = require('uuid');
const md5 = require('md5');

//MYSQL
const mysql = require('mysql');
const db_credentials = require('./credentials/db');
var conn = mysql.createPool(db_credentials);

//AWS
const AWS = require('aws-sdk');
const aws_keys = require('./credentials/creds');
const { Buffer } = require('buffer');
const s3 = new AWS.S3(aws_keys.s3);

//Configuration
const port = process.env.PORT || 3000;
const app = express();

//Middlewares
app.set('json spaces', 2);
app.use(morgan('dev'));
app.use(cors(
    {
        origin: true,
        optionsSuccessStatus: 200
    }
));
app.use(
    bodyParser.json({
        limit: '10mb',
        extended: true
    })
);
app.use(
    bodyParser.urlencoded({
        extended: true
    })
);

//Rutas - app.use('/', router);
app.get('/', function (req, res) {
    var inp = '1234alv';
    res.send(`Salida: ${md5(inp)}`);
});
//RegistroGET para pruebas
app.post('/', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.json({
        estado: "mensaje",
        mensaje: 'Error con datos de registro'
    });

    console.log(req.body);
});

//Registro
app.post("/usuarios", async (req, res) => {
    let body = req.body;
    
    let nombreimagen = body.fperfil;    
    if(body.imagen != ""){
        const aux = body.imagen;
        const tipo = aux.split(';')[0].split('/')[1];

        nombreimagen = nombreimagen + '_' + uuid.v4() + '.' + tipo;
    }

    let sql = `INSERT INTO usuario (username, nombre, password, im_perfil) VALUES ('${body.username}', '${body.nombre}', '${md5(body.password)}', '${nombreimagen}');`;

    conn.query(sql, (err, result) => {
        if(err) {
            console.log(err.message);

            res.json({
                estado: "ERR",
                mensaje: 'Error con datos de registro',
                content: err.message
            });
        } else {
            console.log(result);

            if(body.imagen != ""){
                var base64 = body.imagen;
                const base64Data = new Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                const type = base64.split(';')[0].split('/')[1];
                const userId = body.fperfil;

                const params = {
                    Bucket: 'practica1-g1-imagenes',
                    Key: `Fotos_Perfil/${nombreimagen}`, // type is not required
                    Body: base64Data,
                    ACL: 'public-read',
                    ContentEncoding: 'base64', // required
                    ContentType: `image/${type}` // required. Notice the back ticks
                }
                
                s3.upload(params, function(err, data) {
                    if (err) {
                        throw err
                    }
                    console.log(`File uploaded successfully. ${data.Location}`)

                    conn.query(`INSERT INTO foto_perfil (nombre_imagen, id_usuario) VALUES ('${nombreimagen}', ${result.insertId})`, (e, r) => {
                        if(e) {
                            console.log(e.message);

                            res.json({
                                estado: "ERR",
                                mensaje: 'Error al registrar la foto de perfil',
                                content: e.message
                            });
                        } else {
                            console.log('Imagen registrada con exito');
                            console.log(r);
                        }
                    });
                });
            }
    
            res.json({
                estado: "OK",
                mensaje: "Usuario creado",
                id: result.insertId,
                content: result
            });
        }
    });
});
//Loggin y Perfil
app.post("/usuarios/login", async (req, res) => {
    let body = req.body;
    console.log(body);
    
    let sqlGet = `SELECT id_usuario, username, nombre, im_perfil FROM usuario WHERE username = '${body.username}' AND password = '${md5(body.password)}';`;


    conn.query(sqlGet, (err, result) => {
        if(err) {
            console.log(err.message);
            
            res.json({
                estado: "ERR",
                mensaje: 'Error con datos de loggin (username y password)',
                content: err.message
            });
        } else {
            //console.log(result);
            if(result == '') {
                res.json({
                    estado: "ERR",
                    mensaje: "El username y password no coinciden"
                });
            } else {
                console.log(result);

                res.json({
                    estado: "OK",
                    mensaje: "Login, acceso permitido",
                    content: result
                });
            }
        }
    });
});
//Perfil y Consultas
app.get("/usuarios/:id?", async (req, res) => {
    let id = parseInt(req.params.id, 10);
    if(id) {
        conn.query(`SELECT id_usuario, username, nombre, im_perfil FROM usuario WHERE id_usuario = ${id}`, (err, result) => {
            if(err) {
                console.log(err.message);
                
                res.json({
                    estado: "ERR",
                    mensaje: 'Error con los datos de la consulta SELECT USUARIO',
                    content: err.message
                });
            } else {
                //console.log(result);
                if(result == '') {
                    res.json({
                        estado: "ERR",
                        mensaje: `Error, no existe el usuario con id ${id}`
                    });
                } else {
                    console.log(result);
                    
                    res.json({
                        estado: "OK",
                        content: result
                    });
                }
            }
        });
    } else {
        conn.query('SELECT * FROM usuario', (err, result) => {
            if(err) {
                console.log(err.message);
                
                res.json({
                    estado: "ERR",
                    mensaje: 'Error con los datos de la consulta SELECT * USUARIO',
                    content: err.message
                });
            } else {
                console.log(result);
                
                res.json({
                    estado: "OK",
                    content: result
                });
            }
        });
    }
});
//Editar Perfil (Solo se puede cambiar username)
app.put('/usuarios/:id?', async (req, res) => {
    let id = parseInt(req.params.id, 10);
    let body = req.body;

    let nombreimagen = body.fperfil;    
    if(body.imagen != ""){
        const aux = body.imagen;
        const tipo = aux.split(';')[0].split('/')[1];

        nombreimagen = nombreimagen + '_' + uuid.v4() + '.' + tipo;

        body.fperfil = nombreimagen;
    }
    
    //Verifico contraseña
    conn.query(`SELECT * FROM usuario WHERE id_usuario = ${id} AND password = '${md5(body.password)}';`, (err, result) => {
        if(err) {
            console.log(err.message);
            
            res.json({
                estado: "ERR",
                mensaje: "Error con la consulta SELECT",
                content: err.message
            });
        } else {
            //console.log(result);
            if(result == '') { //Contraseña incorrecta para el id proporcionado
                res.json({
                    estado: "ERR",
                    mensaje: "La contraseña es incorrecta"
                });
            } else { //Hacer el Update
                
                //Verificar y/o ingresar foto al bucket
                
                conn.query(`UPDATE usuario SET username = '${body.username}', nombre = '${body.nombre}', im_perfil = '${body.fperfil}' WHERE id_usuario = ${id};`,(err2,result2) => {
                    if(err2) {
                        console.log(err2.message);
                        
                        res.json({
                            estado: "ERR",
                            mensaje: "Error con la consulta UPDATE",
                            content: err2.message
                        });
                    } else {
                        console.log(result2);

                        if(body.imagen != ""){
                            var base64 = body.imagen;
                            const base64Data = new Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                            const type = base64.split(';')[0].split('/')[1];
                            const userId = body.fperfil;
            
                            const params = {
                                Bucket: 'practica1-g1-imagenes',
                                Key: `Fotos_Perfil/${userId}`, // type is not required
                                Body: base64Data,
                                ACL: 'public-read',
                                ContentEncoding: 'base64', // required
                                ContentType: `image/${type}` // required. Notice the back ticks
                            }
                            
                            s3.upload(params, function(err, data) {
                                if (err) {
                                    throw err
                                }
                                console.log(`File uploaded successfully. ${data.Location}`)
            
                                conn.query(`INSERT INTO foto_perfil (nombre_imagen, id_usuario) VALUES ('${nombreimagen}', ${id})`, (e, r) => {
                                    if(e) {
                                        console.log(e.message);
            
                                        res.json({
                                            estado: "ERR",
                                            mensaje: 'Error al registrar la foto de perfil',
                                            content: e.message
                                        });
                                    } else {
                                        console.log('Imagen registrada con exito');
                                        console.log(r);
                                    }
                                });
                            });
                        }

                        res.json({
                            estado: "OK",
                            mensaje: "Perfil actualizado",
                            content: result2
                        });
                    }
                });
            }
        }
    });
});
//Editar Album - Crear
app.post('/albumes/:id?', async (req, res) => {
    let id = parseInt(req.params.id, 10);
    let body = req.body;

    let sql = `INSERT INTO album (nombre_album, id_usuario) VALUES ('${body.nombre}', ${id});`;

    conn.query(sql, (err, result) => {
        if(err) {
            console.log(err.message);

            res.json({
                estado: "ERR",
                mensaje: 'Error con datos de creacion de album',
                content: err.message
            });
        } else {
            console.log(result);
    
            res.json({
                estado: "OK",
                mensaje: "Album creado",
                id: result.insertId,
                content: result
            });
        }
    });
});
//Editar GET
app.get('/albumes/:id?', async (req, res) => {
    let id = parseInt(req.params.id, 10);

    let sql = `SELECT id_album, nombre_album FROM album WHERE id_usuario = ${id};`;

    conn.query(sql, (err, result) => {
        if(err) {
            console.log(err.message);

            res.json({
                estado: "ERR",
                mensaje: 'Error con datos de album (id_usuario)',
                content: err.message
            });
        } else {
            //console.log(result);
            if(result == '') {
                res.json({
                    estado: "OK",
                    mensaje: "No hay albumes por el momento",
                    content: result
                });
            } else {
                console.log(result);

                res.json({
                    estado: "OK",
                    content: result
                });
            }
        }
    });
});
//Editar Album - Eliminar
app.delete('/albumes/:id?', async (req, res) => {
    let id = parseInt(req.params.id, 10);

    let sql = `DELETE FROM album WHERE id_album = ${id};`;

    conn.query(sql, (err, result) => {
        if(err) {
            console.log(err.message);

            res.json({
                estado: "ERR",
                mensaje: 'Error con datos de la sentencia DELETE album',
                content: err.message
            });
        } else {
            //console.log(result);
            if(result.affectedRows == 0) {
                //No hay album con ese id
                res.json({
                    estado: "ERR",
                    mensaje: "No existe Album con ese identificador",
                    content: result
                });
            } else {
                console.log(result);

                res.json({
                    estado: "OK",
                    mensaje: "Album eliminado",
                    content: result
                });
            }
            
        }
    });
});
// Subir fotos
app.post("/fotos/:id?", async (req, res) => {
    let id = parseInt(req.params.id, 10);
    let body = req.body;

    let nombreimagen = body.nombre;    
    if(body.imagen != ""){
        const aux = body.imagen;
        const tipo = aux.split(';')[0].split('/')[1];

        nombreimagen = nombreimagen + '_' + uuid.v4() + '.' + tipo;
    }

    let sql = `INSERT INTO foto (nombre_foto, id_album) VALUES ('${nombreimagen}', '${id}');`;

    conn.query(sql, (err, result) => {
        if(err) {
            console.log(err.message);

            res.json({
                estado: "ERR",
                mensaje: 'Error con datos al subir foto',
                content: err.message
            });
        } else {
            console.log(result);

            var base64 = body.imagen;
            const base64Data = new Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
            const type = base64.split(';')[0].split('/')[1];
            const userId = body.nombre;

            const params = {
                Bucket: 'practica1-g1-imagenes',
                Key: `Fotos_Publicadas/${nombreimagen}`, // type is not required
                Body: base64Data,
                ACL: 'public-read',
                ContentEncoding: 'base64', // required
                ContentType: `image/${type}` // required. Notice the back ticks
            }
            
            s3.upload(params, function(err, data) {
                if (err) {
                    throw err
                }
                console.log(`File uploaded successfully. ${data.Location}`)
            });
    
            res.json({
                estado: "OK",
                mensaje: "Fotografia cargada",
                id: result.insertId,
                content: result
            });
        }
    });
});
// Ver todas las fotos
app.get('/fotos/:id?', async (req, res) => {
    let id = parseInt(req.params.id, 10);

    let contenido = {};
    
    let sqlperfil = `SELECT id_fperfil, nombre_imagen FROM foto_perfil WHERE id_usuario = ${id};`;
    let sql = `SELECT F.id_foto, F.nombre_foto, A.id_album, A.nombre_album
            FROM foto F, album A, usuario U
            WHERE F.id_album = A.id_album
            AND A.id_usuario = U.id_usuario
            AND U.id_usuario = ${id}
            ORDER BY A.id_album
            ;`;

    conn.query(sql, (err, result) => {
        if(err) {
            console.log(err.message);

            res.json({
                estado: "ERR",
                mensaje: 'Error al obtener imagenes',
                content: err.message
            });
        } else {
            //console.log(result);

            if(result == '') {
                contenido.fotos = []
            } else {
                console.log(result);
                contenido.fotos = result;
            }

            conn.query(sqlperfil, (e,r) => {
                if(e) {
                    console.log(e.message);

                    res.json({
                        estado: "ERR",
                        mensaje: 'Error al obtener fotos de perfil',
                        content: e.message
                    });
                } else {
                    //console.log(r);
                    
                    if(r == '') {
                        contenido.perfil = []
                    } else {
                        console.log(r);
                        contenido.perfil = r;
                    }
                    
                    res.json({
                        estado: "OK",
                        content: contenido
                    });
                }
            });
        }
    });
});

//Servidor
app.listen(port, (err) => {
    if(err) console.log('Ocurrio un error'), process.exit(1);

    console.log(`Escuchando en puerto ${port}`);
});