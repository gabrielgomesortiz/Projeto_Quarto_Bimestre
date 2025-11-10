CREATE TABLE funcionario (
    id_func SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf CHAR(11) UNIQUE NOT NULL,
    cargo VARCHAR(50) NOT NULL,
    salario NUMERIC(10,2) NOT NULL,
    departamento VARCHAR(50) NOT NULL
);

CREATE TABLE aluno (
    ra INT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    curso VARCHAR(10) NOT NULL,
    periodo VARCHAR(10) NOT NULL
);


INSERT INTO aluno (ra, nome, curso, periodo) VALUES
(1001, 'João', 'ADS', 'Noturno'),
(1002, 'Maria', 'ADS', 'Noturno'),
(1003, 'Pedro', 'SI', 'Diurno'),
(1004, 'Ana', 'ADS', 'Noturno'),
(1005, 'Lucas', 'SI', 'Diurno');
