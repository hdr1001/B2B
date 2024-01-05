-- *********************************************************************
--
-- SQL DDL statements for persisting API data 
-- SQL code file: init.sql
--
-- Copyright 2023 Hans de Rooij
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
--       http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, 
-- software distributed under the License is distributed on an 
-- "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
-- either express or implied. See the License for the specific 
-- language governing permissions and limitations under the 
-- License.
--
-- *********************************************************************

-- DROP TABLE public.errors_http; 
-- DROP TABLE public.project_keys;
-- DROP TABLE public.projects;
-- DROP TABLE public.products_dnb;
-- DROP TABLE public.products_gleif;
-- DROP SEQUENCE public.errors_http_id_seq;

-- Create the sequence for the primary key of table errors_http
CREATE SEQUENCE public.errors_http_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

-- Create table for storing GLEIF data products
CREATE TABLE public.products_gleif (
   lei character varying(32) COLLATE pg_catalog."default",
   product JSONB,
   http_status smallint,
   tsz timestamptz DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT products_gleif_pkey PRIMARY KEY (lei)
)
WITH (
   OIDS = false
)
TABLESPACE pg_default;

-- Create table for storing D&B data products
CREATE TABLE public.products_dnb (
   duns character varying(9) COLLATE pg_catalog."default",
   product JSONB,
   http_status smallint,
   tsz timestamptz DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT products_dnb_pkey PRIMARY KEY (duns)
)
WITH (
   OIDS = false
)
TABLESPACE pg_default;

-- Create table for storing projects 
CREATE TABLE public.projects (
   id character(8) COLLATE pg_catalog."default",
   descr character varying(128) COLLATE pg_catalog."default",
   CONSTRAINT projects_pkey PRIMARY KEY (id)
)
WITH (
   OIDS = false
)
TABLESPACE pg_default;

-- Create table for keeping track of keys associated wih projects 
CREATE TABLE public.project_keys (
   id character(8) COLLATE pg_catalog."default",
   rec_key character varying(32) COLLATE pg_catalog."default",
   http_status smallint,
   note character varying(256) COLLATE pg_catalog."default",
   tsz timestamptz DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT project_keys_pkey PRIMARY KEY (id, rec_key),
   CONSTRAINT project_keys_fkey FOREIGN KEY(id) REFERENCES projects(id)
)
WITH (
   OIDS = false
)
TABLESPACE pg_default;

-- Create table for logging HTTP errors
CREATE TABLE public.errors_http (
   id integer NOT NULL DEFAULT nextval('errors_http_id_seq'::regclass),
   req JSONB,
   err JSONB,
   http_status smallint,
   tsz timestamptz DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT errors_http_pkey PRIMARY KEY (id)
)
WITH (
   OIDS = false
)
TABLESPACE pg_default;
