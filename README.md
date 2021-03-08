# SEMI1 - Práctica 1 - UGRAM

***

## Integrantes
**201602754** - José Andrés Morales Calderón

**201603168** - Douglas Omar Arreola Martínez

---

## Arquitectura

Se implementó una arquitectura server en la nube pública de AWS.

![image](https://user-images.githubusercontent.com/53403994/110373687-63aeca00-8015-11eb-8e69-7ff77d7d5405.png)
  
Para la funcionlalidad se tendrán 2 servidores desarrollados en Nodejs y Python respectivamente, cada uno dentro de una máquina virtual EC2, que tendrán la función de atender las peticiones de los clientes y serán coordinados por un Load Balancer para resguardar la conexión a la aplicación en todo momento. Ambos servidores tendrán acceso a una instancia RDS que tiene implementada como base de datos a MySQL para contener toda la información que los usuarios provean dentro de la página web; a su vez también contarán con el acceso a un Bucket S3 que contendrá las imágenes, tanto de perfil como personales, de los clientes. 
  
La página web fue desarrollada puramente con HTML, Javascript y CSS, y está alojada estáticamente en otro Bucket S3 para que se pueda acceder en cualquier momento y a su vez poder conectarse al balanceador de carga.

---

## Usuarios IAM
+ S3: Usuarios utilizados para acceder únicamente a los recursos de S3 de AWS necesarios para realizar la práctica y así implementar una medida más de seguirdad en el uso de la nube pública.
  * Pagina Web:
    - Nombre:
    - Politicas:
  * Bucket Imagenes:
    - Nombre: usr_s3
    - Politicas: AmazonS3FullAcces
+ EC2: Usuario con permisos para acceder y manejar únicamente las instanciass EC2 en AWS.
  - Nombre:
  - Politicas:
+ RDS: Usuario utilizado en la práctica para acceder y controlar únicamente los recursos de Amazon Relational Database Service (RDS).
  - Nombre: usr_rds
  - Politicas: AmazonRDSFullAcces

---

## Capturas de Pantalla
+ Buckets S3
  * Página Web
  * Contenedor de Imágenes
  ![s3bucketimagenes](https://user-images.githubusercontent.com/53403994/110375448-98238580-8017-11eb-999a-3438ad93aa1c.png)
  ![s3bucketimagenesfolders](https://user-images.githubusercontent.com/53403994/110375447-978aef00-8017-11eb-9031-73c91bc944ec.png)
+ EC2
  * Servidor Nodejs
  * Servidor Python
+ Instancia RDS
![rdsdatabasae](https://user-images.githubusercontent.com/53403994/110376183-8393bd00-8018-11eb-9d37-d228fd44376b.png)
+ Aplicación Web
