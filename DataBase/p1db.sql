CREATE TABLE IF NOT EXISTS usuario (
	id_usuario 	INT NOT NULL AUTO_INCREMENT,
	username 	VARCHAR(30) NOT NULL,
	password	VARCHAR(16) NOT NULL,
	im_perfil	VARCHAR(150),
	PRIMARY KEY(id_usuario),
	UNIQUE(username)
);

CREATE TABLE IF NOT EXISTS foto_perfil (
	id_fperfil		INT NOT NULL AUTO_INCREMENT,
	nombre_imagen	VARCHAR(150),
	id_usuario		INT NOT NULL,
	PRIMARY KEY (id_fperfil),
	FOREIGN KEY (id_usuario) 
		REFERENCES usuario (id_usuario)
		ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS album (
	id_album		INT NOT NULL AUTO_INCREMENT,
	nombre_album	VARCHAR(100),
	id_usuario		INT NOT NULL,
	PRIMARY KEY (id_album),
	FOREIGN KEY (id_usuario) 
		REFERENCES usuario (id_usuario)
		ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS foto (
	id_foto			INT NOT NULL AUTO_INCREMENT,
	nombre_foto		VARCHAR(150),
	id_album		INT NOT NULL,
	PRIMARY KEY (id_foto),
	FOREIGN KEY (id_album) 
		REFERENCES album (id_album)
		ON DELETE CASCADE
);