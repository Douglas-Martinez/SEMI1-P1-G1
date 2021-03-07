import boto3
import hashlib
import base64
import sys
from flask import Flask, request, jsonify, json

from flask_cors import CORS
from flask_mysqldb import MySQL
from db import db_credentials
from creds import aws_keys

creds_s3 = aws_keys['s3']
client = boto3.client(
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

mysql = MySQL(app)
CORS(app, supports_credentials = True, resources=r'/*')

@app.route('/usuarios/<id>')
def main(id):
    print("ID: " + id)

    ent = '1234alv'

    h = hashlib.md5(ent.encode()).hexdigest()


    cur = mysql.connection.cursor()
    cur.execute('SELECT * FROM usuario')
    data = cur.fetchall()
    cur.execute('INSERT INTO usuario () VALUES ()')
    
    lol = []
    for d in data:
        lol.append({
            "id_usuario": d[0],
            "username": d[1],
            "nombre": d[2],
            "password": d[3],
            "im_perfil": d[4]
        })
    
    return jsonify(
        estado = "OK",
        content = lol,
        md5 = h
    )

#Registro de Usuarios
@app.route('/usuarios', methods = ['POST'])
def regirstro_usuario():
    nombreimg = request.json['fperfil']
    imagen = request.json['imagen']

    if imagen != "":
        aux = imagen
        tipo = aux.split(';')[0].split('/')[1]
        
        nombreimg = nombreimg + '.' + tipo
    
    hashmd5 = hashlib.md5(request.json['password'].encode()).hexdigest()

    cur = mysql.connection.cursor()
    
    try:
        cur.execute('INSERT INTO usuario (username, nombre, password, im_perfil) VALUES (%s, %s, %s, %s)',
            (request.json['username'], request.json['nombre'], hashmd5, nombreimg)
        )
        mysql.connection.commit() #No deberia de dar error :v y si da pos F
        print('>>> ', end = "")
        print (cur.rowcount)
        
        if imagen != "":
            base = imagen

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

@app.route('/edit')
def edit_contact():
    return 'Editar contacto'

@app.route('/delete')
def delete_contact():
    return 'Eliminar contacto'

if __name__ == '__main__':
    app.run(debug = True, port = 3000)