# SEMI1 - Práctica 1 - UGRAM PRO

***

## Integrantes
**201602754** - José Andrés Morales Calderón

**201603168** - Douglas Omar Arreola Martínez

---

## Arquitectura

Se implementó una arquitectura server en la nube pública de AWS.

![image](https://user-images.githubusercontent.com/53403994/113644057-0ec89880-9641-11eb-9bb1-b0b4458726f5.png)
  
Para la funcionlalidad se tendrán un servidor desarrollado en Nodejs dentro de una máquina virtual EC2, que tendrán la función de atender las peticiones de los clientes. El servidor tendrán conexión a diferentes servicios de AWS mediante el SDK para javascript, entre ellos ele servicio de amazon Rekognition, Amazon Translate, una instancia RDS que tiene implementada como base de datos a MySQL para contener toda la información que los usuarios provean dentro de la página web; también contará con el acceso a un Bucket S3 que contendrá las imágenes, tanto las fotos de perfil como las publicaciones personales de los clientes.
  
La página web fue desarrollada puramente con HTML, Javascript y CSS, y está alojada estáticamente en otro Bucket S3 para que se pueda acceder en cualquier momento y a su vez poder conectarse al balanceador de carga. En el codigo de Javascript de la pagina web se tiene implementado el servicio de chatbot usando Amazon Lex.

---

## Usuarios IAM
+ S3: Usuarios utilizados para acceder únicamente a los recursos de S3 de AWS necesarios para realizar la práctica y así implementar una medida más de seguirdad en el uso de la nube pública.
  * Pagina Web:
    - Nombre: s3_admin
    - Politicas: AmazonS3FullAccess 
  * Bucket Imagenes:
    - Nombre: usr_s3
    - Politicas: AmazonS3FullAcces
+ EC2: Usuario con permisos para acceder y manejar únicamente las instanciass EC2 en AWS.
  - Nombre: ec2_admin
  - Politicas: AmazonEC2FullAccess | ElasticLoadBalancingFullAccess 
+ RDS: Usuario utilizado en la práctica para acceder y controlar únicamente los recursos de Amazon Relational Database Service (RDS).
  - Nombre: usr_rds
  - Politicas: AmazonRDSFullAccess
+ Rekognition: Usuario IAM utilizado en la práctica para utilizar los servicios de reconocimiento y análisis de fotos.
  - Nombre: usr_rekognition
  - Politicas: AmazonRekognitionFullAccess
+ Translate: Usuario utilizado para utilizar el servicio de traducción de texto de AWS.
  - Nombre: usr_translate
  - Politicas: TranslateFullAccess
+ LEX: Usuario utilizado para conectarse con el bot de Amazon Lex y obtener sus respuestas.
  - Nombre: bot
  - Politicas: AmazonLexRunBotsOnly

---

## Descripción funcionalidades CHATBOT
### Intents
+ UInfo: Regresa la infromación de la App.<br>
![image](https://user-images.githubusercontent.com/53403994/113655604-68d45880-9657-11eb-8ecd-a01aef1fd105.png)
+ USupport: Utiliza un slot llamado "ProblemType" para guardar que problema tiene el usuario y lo envia a un técnico para que éste se haga cargo del seguimiento del problema.<br>
![image](https://user-images.githubusercontent.com/53403994/113655639-74c01a80-9657-11eb-84f0-54a41cd54372.png)
+ USesion: Utiliza dos slots, "SesionType" y "SesionDate", el primoero para saber la temática de la sesión de foto para poder prepararla, mientras que el segundo registra la fecha en que se realizará la sesión de fotos.<br>
![image](https://user-images.githubusercontent.com/53403994/113655709-93261600-9657-11eb-84b7-a148c8586aba.png)

---

## Descripción funcinalidades Rekognition
1. Compare Faces<br>
Utilizamos esta funcion para iniciar sesion mediante reconocimiento facial al comparar la imagen obtenida por la cámara del dispositivo con la foto de perfil almacenada.<br>
![image](https://user-images.githubusercontent.com/53403994/113657329-f6657780-965a-11eb-87ce-d2f453b7332d.png)

2. Facial Analysis<br>
Se utiliza esta funcion para obtener los datos del analisis facial de la foto de perfil del usuario en forma de Tags.
![image](https://user-images.githubusercontent.com/53403994/113656284-c917ca00-9658-11eb-898f-4a31ec0d382d.png)

3. Detect Text<br>
Se utiliza dicha función de Rekognition para identificar y obtener el texto inscrito en una foto proporcionada por el usuario.<br>
![image](https://user-images.githubusercontent.com/53403994/113658771-e307db80-965d-11eb-9789-e91c27432add.png)

4. Detect Labels<br>
Esta funcion de Rekognition se utiliza para obtener 5 etiquetas a partir de la imagen subida por el usuario y crear un álbum, si es que no ha sido creado previamente, con cada una de ellas, para posteriormente asignar dicha foto a cada uno de los albumes. Esto permite crear albumes automáticamente a partir de la información obtenida de cada foto subida por el usuario.<br>
![image](https://user-images.githubusercontent.com/53403994/113659124-9a9ced80-965e-11eb-9c68-5e352b0c16dc.png)

5. Translate Text<br>
Esta función permite al usuario poder traducir el texto que ha colocado en la descripción de sus fotos a uno de los siguientes idiomas: Inglés, Alemán e Italiano. La aplicación es capaz de identificar el idioma de origen y traducirlo al seleccionado por el usuario.<br>
![image](https://user-images.githubusercontent.com/53403994/113659327-04b59280-965f-11eb-8fde-b8ca832ecce9.png)
![image](https://user-images.githubusercontent.com/53403994/113659361-15fe9f00-965f-11eb-85c5-88ad06eb460e.png)
