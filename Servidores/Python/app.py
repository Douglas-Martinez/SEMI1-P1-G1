import boto3
from credentials import aws_keys
from flask import Flask, jsonify, request

creds_s3 = aws_keys['s3']

app = Flask(__name__)

@app.route('/')
def getRaiz():
    return 'SEMI1 - UGRAM'


if __name__ == '__main__':
    app.run(debug = True, port = 3000)