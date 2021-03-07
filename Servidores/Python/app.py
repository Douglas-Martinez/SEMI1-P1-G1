import boto3
import hashlib
import base64
import uuid
import re
import sys
from flask import Flask, request, jsonify, json

from flask_cors import CORS
from flask_mysqldb import MySQL
from db import db_credentials
from creds import aws_keys

creds_s3 = aws_keys['s3']
s3 = boto3.resource(
            's3',
            region_name = creds_s3['region'],
            aws_access_key_id = creds_s3['accessKeyId'],
            aws_secret_access_key = creds_s3['secretAccessKey']
        )

creds_db = db_credentials['pool']

app = Flask(__name__)
app.config['MYSQL_HOST'] = creds_db['host']
app.config['MYSQL_PORT'] = creds_db['port']
app.config['MYSQL_USER'] = creds_db['user']
app.config['MYSQL_PASSWORD'] = creds_db['password']
app.config['MYSQL_DB'] = creds_db['database']
app.config['MYSQL_CURSORCLASS'] = "DictCursor"

mysql = MySQL(app)
CORS(app, supports_credentials = True, resources=r'/*')

#Pagina de Inicio
@app.route('/usuarios/<id>', methods = ['GET'])
def main(id):
    print("ID: " + id)

    cur = mysql.connection.cursor()
    cur.execute('SELECT id_usuario, username, nombre, im_perfil FROM usuario WHERE id_usuario = %s', (id,))
    
    result = cur.fetchall()
    print(result)
    
    return jsonify(
        estado = "OK",
        content = result,
    )

#Registro de Usuarios
@app.route('/usuarios', methods = ['POST'])
def registro_usuario():
    nombreimg = request.json['fperfil']
    imagen = request.json['imagen']
    
    hashmd5 = hashlib.md5(request.json['password'].encode()).hexdigest()

    if imagen != "":
        aux = imagen
        tipo = aux.split(';')[0].split('/')[1] 
        nombreimg = nombreimg + "_" + str(uuid.uuid4()) + '.' + tipo
    
    cur = mysql.connection.cursor()
    try:
        cur.execute('INSERT INTO usuario (username, nombre, password, im_perfil) VALUES (%s, %s, %s, %s)',
            (request.json['username'], request.json['nombre'], hashmd5, nombreimg)
        )
        mysql.connection.commit()
        
        print('>>> ', end = "")
        print (cur.rowcount)
        
        if imagen != "":
            base = request.json['imagen']
            todo = re.sub('^data:image\/\w+;base64,', '', base)
            base64data = base64.b64decode(todo)
            tipo = base.split(';')[0].split('/')[1] 
            print(nombreimg)

            try:
                bucketN = 'practica1-g1-imagenes'
                ubicacion = 'Fotos_Perfil/' + nombreimg
                obj = s3.Object(bucketN, ubicacion)
                obj.put(
                    Body = base64data,
                    ACL = 'public-read',
                    ContentEncoding = 'base64',
                    ContentType = ('image/' + tipo)
                )
                print('Imagen cargada satisfactoriamente.')

                cur2 = mysql.connection.cursor()
                try:
                    cur2.execute('INSERT INTO foto_perfil (nombre_imagen, id_usuario) VALUES (%s, %s)', 
                            (nombreimg, cur.lastrowid)
                    )
                    mysql.connection.commit()
                except Exception as err:
                    print(err)
                    return jsonify(
                        estado = "ERR",
                        mensaje = "Error al registrar la imagen",
                        content = err
                    )
            except Exception as er:
                print(er)
                return jsonify(
                    estado = "ERR",
                    mensaje = "Error con la carga de la imagen",
                    content = er
                )
        return jsonify(
            estado = "OK",
            mensaje = "Usuario creado",
            id =  cur.lastrowid
        )
    except Exception as e:
        print(e)
        return jsonify(
            estado = "ERR",
            mensaje = "Error con la operacion de registro",
            content = e
        )

#Login
@app.route('/usuarios/login', methods = ['POST'])
def login_usuario():
    username = request.json['username']
    hashmd5 = hashlib.md5(request.json['password'].encode()).hexdigest()
    cur = mysql.connection.cursor()

    try:
        cur.execute('SELECT id_usuario, username, nombre, im_perfil FROM usuario WHERE username = %s AND password = %s',
            (username, hashmd5)
        )
        mysql.connection.commit() #No deberia de dar error :v y si da pos F

        result = cur.fetchall()
        print(result)

        return jsonify(
            estado = "OK",
            mensaje = "Login exitoso",
            content =  result
        )
    except Exception as e:
        print(e)
        
        return jsonify(
            estado = "ERR",
            mensaje = "Error en el login",
            content = e
        )

#Obtener Albumes
@app.route('/albumes/<id>', methods = ['GET'])
def getAlbumes(id):
    print("ID: " + id)

    cur = mysql.connection.cursor()
    cur.execute('SELECT id_album, nombre_album FROM album WHERE id_usuario = %s', (id,))
    
    result = cur.fetchall()
    print(result)
    
    return jsonify(
        estado = "OK",
        content = result,
    )

#Eliminar Albumes
@app.route('/albumes/<id>', methods = ['DELETE'])
def deleteAlbumes(id):
    print("ID: " + id)

    cur = mysql.connection.cursor()
    cur.execute('DELETE FROM album WHERE id_album = %s', (id,))
    
    mysql.connection.commit()

    
    return jsonify(
        estado = "OK",
        mensaje = "Album eliminado",
        content = "Todo",
    )

#Crear Album
@app.route('/albumes/<id>', methods = ['POST'])
def crearAlbumes(id):
    nombreAlbum = request.json['nombre']
    print("ID: " + id)

    cur = mysql.connection.cursor()
    cur.execute('INSERT INTO album (nombre_album, id_usuario) VALUES ( %s , %s)', (nombreAlbum,id))

    mysql.connection.commit()
    
    return jsonify(
        estado = "OK",
        mensaje = "Album creado",
        content = "Todo",
    )

#Ver Fotos
@app.route('/fotos/<id>', methods = ['GET'])
def obtenerFotos(id):
    print("ID: " + id)
    contenidoFoto = []
    contenidoPerfil = []

    cur = mysql.connection.cursor()
    cur.execute('SELECT F.id_foto, F.nombre_foto, A.id_album, A.nombre_album FROM foto F, album A, usuario U WHERE F.id_album = A.id_album AND A.id_usuario = U.id_usuario AND U.id_usuario = %s ORDER BY A.id_album', (id,))
    
    result1 = cur.fetchall()

    if(result1):
        contenidoFoto = result1
    
    cur.execute('SELECT id_fperfil, nombre_imagen FROM foto_perfil WHERE id_usuario = %s', (id,))
    
    result1 = cur.fetchall()

    if(result1):
        contenidoPerfil = result1

    lol = {
        "fotos": contenidoFoto,
        "perfil": contenidoPerfil
    }

    return jsonify(
        estado = "OK",
        content = lol,
    )



if __name__ == '__main__':
    app.run(debug = True, port = 3000)