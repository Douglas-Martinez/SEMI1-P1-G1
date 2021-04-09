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
const { type } = require('os');
const { exists } = require('fs');
const s3 = new AWS.S3(aws_keys.s3);
const rek = new AWS.Rekognition(aws_keys.rekognition);
const translate = new AWS.Translate(aws_keys.translate);

//Configuration
const port = process.env.PORT || 3000;
const app = express();

//Middlewares
app.set('json spaces', 2);
app.use(morgan('dev'));
app.use(
    cors({
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

/*
**
**
=============== TAREA LAMBDA-APIGATEWAY ===============
**
**
*/
app.post("/rekognition", async(req, res) => {
    let body = req.body;
    
    params = {
        SourceImage: {
            Bytes: Buffer.from(body.imagen1, 'base64')
        },
        TargetImage: {
            Bytes: Buffer.from(body.imagen2, 'base64')
        },
        SimilarityThreshold: body.similitud
    }
    rek.compareFaces(params, (err, data) => {
        if(err) {
            console.log(err.message);
            res.json({
                error: err.message
            })
        } else {
            res.json(data)
        }
    });
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

//Loggin y Perfil (NORMAL)
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

                //GET TAGS
                paramsTag = {
                    Image: {
                        S3Object: {
                            Bucket: 'practica1-g1-imagenes',
                            Name: 'Fotos_Perfil/' + result[0].im_perfil
                        }
                    },
                    Attributes: ['ALL']
                }
                rek.detectFaces(paramsTag, (err4, dataTag)=> {
                    if(err4){
                        console.log(err4.message);
                        //res.send('ERR con el rekognition');                                
                        res.json({
                            estado: "ERR",
                            mensaje: 'Error con operacion de Rekognition (Tags)',
                            content: er4.message
                        });
                    } else {
                        console.log('========== Rekognition TAGS ==========');
                        //console.log(dataTag.FaceDetails[0]);
                
                        result[0].tags = dataTag.FaceDetails[0];
                        res.json({
                            estado: "OK",
                            mensaje: "Login, acceso permitido",
                            content: result
                        });
                    }
                });
            }
        }
    });
});

//Login y Perfil (IMAGEN)
app.post('/usuarios/loginFace', async (req, res) => {
    let imEntrada = req.body.entrada;

    let sqlGet = `SELECT id_usuario, username, nombre, im_perfil FROM usuario WHERE username = '${req.body.username}';`;
    conn.query(sqlGet, (err, resBD) =>{
        if(err) {
            console.log(err.message);
            
            res.json({
                estado: "ERR",
                mensaje: 'Error con datos de loggin (username)',
                content: err.message
            });
        } else {
            console.log('===== BD =====');
            
            if(resBD == '') {
                res.json({
                    estado: "ERR",
                    mensaje: "El usuario no existe"
                });
            } else {
                console.log(resBD);
                //console.log(typeof resBD[0]);

                //S3
                let imgName = 'Fotos_Perfil/' + resBD[0].im_perfil;
                let params = {
                    Bucket: 'practica1-g1-imagenes',
                    Key: imgName
                }
                s3.getObject(params, (err2, dataS3)=> {
                    if(err2) {
                        console.log(err2.message);
                        
                        res.json({
                            estado: "ERR",
                            mensaje: 'Error con la operacion de S3 (fotoPerfil)',
                            content: err.message
                        });
                    } else {
                        console.log('===== S3 =====');
                        var base64 = imEntrada;
                        const base64Data = new Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');

                        paramRek = {
                            SourceImage: {
                                S3Object: {
                                    Bucket: params.Bucket,
                                    Name: params.Key
                                }
                            },
                            TargetImage: {
                                Bytes: Buffer.from(base64Data, 'base64')
                            },
                            SimilarityThreshold: '80'
                        }
                        rek.compareFaces(paramRek, (err3, dataRek) =>{
                            if(err3) {
                                console.log(err3.message);
                                res.json({
                                    estado: "ERR",
                                    mensaje: 'Error con operacion de Rekognition (compareFaces)',
                                    content: err3.message
                                });
                            } else {
                                console.log('===== Rekognition FACES =====');
                                
                                if((dataRek.FaceMatches == '') && (dataRek.UnmatchedFaces != '')) {
                                    res.json({
                                        estado: "ERR",
                                        mensaje: "Las imagenes no coinciden"
                                    });
                                } else if((dataRek.FaceMatches != '') && (dataRek.UnmatchedFaces == '')){
                                    //GET TAGS
                                    paramsTag = {
                                        Image: {
                                            S3Object: {
                                                Bucket: 'practica1-g1-imagenes',
                                                Name: imgName
                                            }
                                        },
                                        Attributes: ['ALL']
                                    }
                                    rek.detectFaces(paramsTag, (err4, dataTag)=> {
                                        if(err4){
                                            console.log(err4.message);
                                            //res.send('ERR con el rekognition');                                
                                            res.json({
                                                estado: "ERR",
                                                mensaje: 'Error con operacion de Rekognition (Tags)',
                                                content: er4.message
                                            });
                                        } else {
                                            console.log('========== Rekognition TAGS ==========');
                                            //console.log(dataTag.FaceDetails[0]);
                                    
                                            resBD[0].tags = dataTag.FaceDetails[0];
                                            res.json({
                                                estado: "OK",
                                                mensaje: "Login, acceso permitido",
                                                content: resBD
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            }
        }
    });
});

//Inicio
app.get("/usuarios/:id?", async (req, res) => {
    let id = parseInt(req.params.id, 10);
    
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
                
                //GET TAGS
                paramsTag = {
                    Image: {
                        S3Object: {
                            Bucket: 'practica1-g1-imagenes',
                            Name: 'Fotos_Perfil/' + result[0].im_perfil
                        }
                    },
                    Attributes: ['ALL']
                }
                rek.detectFaces(paramsTag, (err4, dataTag)=> {
                    if(err4){
                        console.log(err4.message);
                        //res.send('ERR con el rekognition');                                
                        res.json({
                            estado: "ERR",
                            mensaje: 'Error con operacion de Rekognition (Tags)',
                            content: er4.message
                        });
                    } else {
                        console.log('========== Rekognition TAGS ==========');
                        //console.log(dataTag.FaceDetails[0]);
                
                        result[0].tags = dataTag.FaceDetails[0];
                        res.json({
                            estado: "OK",
                            content: result
                        });
                    }
                });
            }
        }
    });
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

//Detectar Texto;
app.post('/usuarios/detectText', async (req, res) => {
    var base64 = req.body.imagen;
    const base64Data = new Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    
    var params = {
        Image: {
            Bytes: Buffer.from(base64Data, 'base64')
        }
    };
    rek.detectText(params, (err,data) => {
        if(err) {
            console.log(err.message);

            res.json({
                estado: "ERR",
                mensaje: 'Error con identificar texto de imagen',
                content: err.message
            });
        } else {
            res.json({
                estado: "OK",
                content: data.TextDetections
            });
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
//Subir foto fase 2
app.post('/fotosv2/:id?', async (req, res) => { //El id del url (/fotosv2/:id?) es el idUsuario
    let idUsuario = parseInt(req.params.id, 10);
    let body = req.body;
    
    if(!idUsuario) {
        console.log('Id NULL');
        res.send({
            estado: "ERR",
            mensaje: 'Error. IdUsuario requerido'
        });
        return;
    }
    if(!body.nombre || !body.imagen || !body.descripcion) {
        console.log('Faltan datos');
        res.send({
            estado: "ERR",
            mensaje: 'Error. Falta nombre, descripcion y/o imagen'
        });
        return;
    }
    console.log('Datos Correctos');
    
    var base64 = body.imagen;
    const base64Data = new Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');

    //GET LABELS
    let paramsLabels = {
        Image: {
            Bytes: Buffer.from(base64Data, 'base64')
        },
        MaxLabels: 5
    }
    rek.detectLabels(paramsLabels, async (err, data) => {
        if(err) {
            console.log(err.message);

            res.json({
                estado: "ERR",
                mensaje: 'Error al detectar tags de la imagen: "' + nombreimagen + '"',
                content: err.message
            });
        } else {
            if(data.Labels == "") {
                res.json({
                    estado: "ERR",
                    mensaje: 'No se detectaron tags'
                });
            } else {
                console.log('===== FOTO =====');
                let nombreimagen = body.nombre;
                if(body.imagen != ""){
                    const aux = body.imagen;
                    const tipo = aux.split(';')[0].split('/')[1];

                    nombreimagen = nombreimagen + '_' + uuid.v4() + '.' + tipo;
                }

                //INSERTAR IMAGEN BD
                let idFotov2;
                let qInsertFoto2 = `INSERT INTO fotov2 (nombre_foto, descripcion) VALUES ('${nombreimagen}','${body.descripcion}');`;
                conn.query(qInsertFoto2, (errF2, resultF2) => {
                    if(errF2) {
                        console.log(errF2.message);
                        
                        res.json({
                            estado: "ERR",
                            mensaje: 'Error al insertar la foto en la BD',
                            content: err.message
                        });
                    } else {
                        console.log('FOTO INSERTADA EN BD');
                        console.log(resultF2.insertId);
                        idFotov2 = resultF2.insertId;

                        //INSERTAR IMAGEN S3
                        const type = base64.split(';')[0].split('/')[1];
                        const params = {
                            Bucket: 'practica1-g1-imagenes',
                            Key: `Fotos_Publicadas/${nombreimagen}`, // type is not required
                            Body: base64Data,
                            ACL: 'public-read',
                            ContentEncoding: 'base64', // required
                            ContentType: `image/${type}` // required. Notice the back ticks
                        }
                        s3.upload(params, (errS3, dataS3) => {
                            if (errS3) {
                                console.log(errS3.message);
                                res.json({
                                    estado: "ERR",
                                    mensaje: 'ERROR al cargar la foto a S3'
                                });
                                return;
                            }
                            console.log(`FOTO INSERTADA SATISFACTORIAMENTE EN S3.\n ${dataS3.Location}`)
                        });

                        //VERIFICAR ALBUMES
                        console.log('===== ALBUMES =====');
                        let tags = []
                        for (const lab of data.Labels) {
                            tags.push(lab.Name);

                            let verAlbum = `SELECT id_album FROM album WHERE id_usuario = ${idUsuario} AND nombre_album = '${lab.Name}';`;
                            conn.query(verAlbum, (err1, result) => {
                                if(err1) {
                                    console.log(err1);
                                    
                                    res.json({
                                        estado: "ERR",
                                        mensaje: 'Error al obtener el album ' + lab.Name,
                                        content: err1.message
                                    });
                                } else {
                                    if(result == '') {
                                        //INSERTAR ALBUM
                                        let insertAlbum = `INSERT INTO album (nombre_album, id_usuario) VALUES ('${lab.Name}',${idUsuario});`;
                                        conn.query(insertAlbum, (errAlbum, resultAlbum) => {
                                            if(errAlbum) {
                                                console.log(errAlbum.message);

                                                res.json({
                                                    estado: "ERR",
                                                    mensaje: 'Error al insertar el album ' + lab.Name,
                                                    content: err1.message
                                                });
                                            } else {
                                                console.log("SE INSERTO EL ALBUM CON TAG: " + lab.Name);
                                                console.log("ID: " + resultAlbum.insertId);
                                                
                                                // ASIGNAR EN DETALLE
                                                let qDetalle = `INSERT INTO album_foto (id_album, id_foto) VALUES (${resultAlbum.insertId},${idFotov2});`;
                                                conn.query(qDetalle, (errD, resD) => {
                                                    if(errD) {
                                                        console.log(errD.message);

                                                        res.json({
                                                            estado: "ERR",
                                                            mensaje: 'Error1 al asignar foto al detalle del album',
                                                            content: errD.message
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    } else {
                                        idAlbum = result[0].id_album;
                                        console.log('SE AGREGARA UNA FOTO AL ALBUM CON TAG: ' + lab.Name);
                                        
                                        // ASIGNAR EN DETALLE
                                        let qDetalle = `INSERT INTO album_foto (id_album, id_foto) VALUES (${idAlbum},${idFotov2});`;
                                        conn.query(qDetalle, (errD, resD) => {
                                            if(errD) {
                                                console.log(errD.message);

                                                res.json({
                                                    estado: "ERR",
                                                    mensaje: 'Error2 al asignar foto al detalle del album',
                                                    content: errD.message
                                                });
                                            }
                                        });
                                    }
                                }
                            });
                        }
                        res.json({
                            estado: "OK",
                            mensaje: "Fotografia cargada",
                            id: idFotov2,
                            content: resultF2
                        });
                    }
                });
            }
        }
    });
});

// Ver todas las fotos
app.get('/fotos/:id?', async (req, res) => {
    let id = parseInt(req.params.id, 10);

    let contenido = {};
    
    let sqlperfil = `SELECT id_fperfil, nombre_imagen FROM foto_perfil WHERE id_usuario = ${id};`;
    let sql = `SELECT F.id_foto, F.nombre_foto, F.descripcion, A.id_album, A.nombre_album
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
//Ver todas las fotos fase 2
app.get('/fotosv2/:id?', async (req, res) => {
    let idUsuario = parseInt(req.params.id, 10);

    let contenido = {};
    
    let sqlperfil = `SELECT id_fperfil, nombre_imagen FROM foto_perfil WHERE id_usuario = ${idUsuario};`;
    let sql = `SELECT F.id_foto, F.nombre_foto, F.descripcion, A.id_album, A.nombre_album
            FROM fotov2 F, album A, album_foto FA, usuario U
            WHERE F.id_foto = FA.id_foto
            AND FA.id_album = A.id_album
            AND A.id_usuario = U.id_usuario
            AND U.id_usuario = ${idUsuario}
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

//Traducir un texto con el idioma especificado
//          (debe estar en el codigo respectivo)
app.post('/traducir', async (req, res) => {
    
    let params = {
        Text: req.body.text || 'Hello there',
        SourceLanguageCode: 'auto',
        TargetLanguageCode: req.body.idioma || 'no'
    };

    translate.translateText(params, function (err, data) {
        if (err) {
            console.log(err.message);

            res.json({
                estado: "ERR",
                mensaje: 'Error con la traduccion',
                content: err.message
            });
        } else {
            console.log(data);

            res.json({
                estado: "OK",
                mensaje: "Traduccion realizada",
                content: data
            });
        }
    });
});

//Servidor
app.listen(port, (err) => {
    if(err) console.log('Ocurrio un error'), process.exit(1);

    console.log(`Escuchando en puerto ${port}`);
});