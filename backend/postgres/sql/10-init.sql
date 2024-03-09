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

-- ALTER TABLE public.errors_http DROP CONSTRAINT errors_http_pkey;
-- DROP TABLE public.errors_http; 
-- ALTER TABLE public.project_products DROP CONSTRAINT project_products_fkey_3;
-- ALTER TABLE public.project_products DROP CONSTRAINT project_products_fkey_2;
-- ALTER TABLE public.project_products DROP CONSTRAINT project_products_fkey_1;
-- ALTER TABLE public.project_products DROP CONSTRAINT project_products_pkey;
-- DROP TABLE public.project_products;
-- ALTER TABLE public.project_keys DROP CONSTRAINT project_keys_fkey;
-- ALTER TABLE public.project_keys DROP CONSTRAINT project_keys_pkey;
-- DROP TABLE public.project_keys;
-- ALTER TABLE public.project_stages DROP CONSTRAINT project_stages_fkey;
-- ALTER TABLE public.project_stages DROP CONSTRAINT project_stages_pkey;
-- DROP TABLE public.project_stages;
-- ALTER TABLE public.projects DROP CONSTRAINT projects_pkey;
-- DROP TABLE public.projects;
-- ALTER TABLE public.idr_dnb_dpl DROP CONSTRAINT idr_dnb_dpl_pkey;
-- DROP TABLE public.idr_dnb_dpl;
-- DROP TRIGGER trgr_archive_dnb_product_00 ON public.products_dnb;
-- DROP FUNCTION public.f_archive_dnb_product_00();
-- DROP TRIGGER trgr_archive_dnb_product_01 ON public.products_dnb;
-- DROP FUNCTION public.f_archive_dnb_product_01();
-- DROP TRIGGER trgr_archive_dnb_product_02 ON public.products_dnb;
-- DROP FUNCTION public.f_archive_dnb_product_02();
-- DROP INDEX idx_archive_dnb;
-- ALTER TABLE public.archive_dnb DROP CONSTRAINT archive_dnb_pkey;
-- DROP TABLE public.archive_dnb;
-- ALTER TABLE public.products_dnb DROP CONSTRAINT products_dnb_pkey;
-- DROP TABLE public.products_dnb;
-- ALTER TABLE public.idr_lei DROP CONSTRAINT idr_lei_pkey;
-- DROP TABLE public.idr_lei;
-- DROP TRIGGER trgr_archive_gleif_product_00 ON public.products_gleif;
-- DROP FUNCTION public.f_archive_gleif_product_00();
-- DROP TRIGGER trgr_archive_gleif_product_01 ON public.products_gleif;
-- DROP FUNCTION public.f_archive_gleif_product_01();
-- ALTER TABLE public.archive_gleif DROP CONSTRAINT archive_gleif_pkey;
-- DROP TABLE public.archive_gleif;
-- ALTER TABLE public.products_gleif DROP CONSTRAINT products_gleif_pkey;
-- DROP TABLE public.products_gleif;
-- DROP SEQUENCE public.errors_http_id_seq;
-- DROP SEQUENCE public.project_id_seq;
-- DROP SEQUENCE public.idr_dnb_dpl_id_seq;
-- DROP SEQUENCE public.archive_dnb_id_seq;
-- DROP SEQUENCE public.idr_lei_id_seq;
-- DROP SEQUENCE public.archive_gleif_id_seq;

SET default_tablespace = 'pg_default';
SET default_with_oids = false;

-- Create the sequence for the primary key of table archive gleif
CREATE SEQUENCE public.archive_gleif_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

-- Create the sequence for the primary key of table LEI filter
CREATE SEQUENCE public.idr_lei_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

-- Create the sequence for the primary key of table archive D&B
CREATE SEQUENCE public.archive_dnb_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

-- Create the sequence for the primary key of table D&B Direct+ IDR
CREATE SEQUENCE public.idr_dnb_dpl_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

-- Create the sequence for the primary key of table projects
CREATE SEQUENCE public.project_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

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
   product_00 JSONB,
   http_status_00 smallint,
   tsz_00 timestamptz,
   product_01 JSONB,
   http_status_01 smallint,
   tsz_01 timestamptz,
   CONSTRAINT products_gleif_pkey PRIMARY KEY (lei)
);

-- Create table for archiving a GLEIF data product
CREATE TABLE public.archive_gleif (
   id integer NOT NULL DEFAULT nextval('archive_gleif_id_seq'::regclass),
   lei character varying(32) COLLATE pg_catalog."default",
   product JSONB,
   product_key character(2),
   http_status smallint,
   tsz_begin timestamptz,
   tsz_end timestamptz DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT archive_gleif_pkey PRIMARY KEY (id)
);

-- Create a function to archive a GLEIF info product
CREATE FUNCTION public.f_archive_gleif_product_00()
   RETURNS trigger
   LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
   INSERT INTO archive_gleif(lei, product, product_key, http_status, tsz_begin)
   VALUES (OLD.lei, OLD.product_00, '00', OLD.http_status_00, OLD.tsz_00);
   RETURN NEW;
END;
$BODY$;

-- Create a function to archive a GLEIF relation product
CREATE FUNCTION public.f_archive_gleif_product_01()
   RETURNS trigger
   LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
   INSERT INTO archive_gleif(lei, product, product_key, http_status, tsz_begin)
   VALUES (OLD.lei, OLD.product_01, '01', OLD.http_status_01, OLD.tsz_01);
   RETURN NEW;
END;
$BODY$;

-- Create a database trigger to archive a GLEIF info product on update
CREATE TRIGGER trgr_archive_gleif_product_00
   AFTER UPDATE OF product_00
   ON public.products_gleif
   FOR EACH ROW
   WHEN (OLD.product_00 IS NOT NULL)
   EXECUTE PROCEDURE public.f_archive_gleif_product_00();

-- Create a database trigger to archive a GLEIF info product on update
CREATE TRIGGER trgr_archive_gleif_product_01
   AFTER UPDATE OF product_01
   ON public.products_gleif
   FOR EACH ROW
   WHEN (OLD.product_01 IS NOT NULL)
   EXECUTE PROCEDURE public.f_archive_gleif_product_01();

-- Create table for persisting lei filter requests
CREATE TABLE public.idr_lei (
   id integer NOT NULL DEFAULT nextval('idr_lei_id_seq'::regclass),
   req_params JSONB,
   resp_idr JSONB,
   http_status smallint,
   tsz timestamptz,
   CONSTRAINT idr_lei_pkey PRIMARY KEY (id)
);

-- Create table for storing D&B data products
CREATE TABLE public.products_dnb (
   duns character varying(9) COLLATE pg_catalog."default",
   product_00 JSONB,
   http_status_00 smallint,
   tsz_00 timestamptz,
   product_01 JSONB,
   http_status_01 smallint,
   tsz_01 timestamptz,
   product_02 JSONB,
   http_status_02 smallint,
   tsz_02 timestamptz,
   CONSTRAINT products_dnb_pkey PRIMARY KEY (duns)
);

-- Create table for archiving a D&B data product
CREATE TABLE public.archive_dnb (
   id integer NOT NULL DEFAULT nextval('archive_dnb_id_seq'::regclass),
   duns character varying(9) COLLATE pg_catalog."default",
   product JSONB,
   product_key character(2),
   http_status smallint,
   tsz_begin timestamptz,
   tsz_end timestamptz DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT archive_dnb_pkey PRIMARY KEY (id)
);

-- Enable quick DUNS search in archive
CREATE INDEX idx_archive_dnb ON archive_dnb (duns);

-- Create a function to archive a D&B data product
CREATE FUNCTION public.f_archive_dnb_product_00()
   RETURNS trigger
   LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
   INSERT INTO archive_dnb(duns, product, product_key, http_status, tsz_begin)
   VALUES (OLD.duns, OLD.product_00, '00', OLD.http_status_00, OLD.tsz_00);
   RETURN NEW;
END;
$BODY$;

CREATE FUNCTION public.f_archive_dnb_product_01()
   RETURNS trigger
   LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
   INSERT INTO archive_dnb(duns, product, product_key, http_status, tsz_begin)
   VALUES (OLD.duns, OLD.product_01, '01', OLD.http_status_01, OLD.tsz_01);
   RETURN NEW;
END;
$BODY$;

CREATE FUNCTION public.f_archive_dnb_product_02()
   RETURNS trigger
   LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
   INSERT INTO archive_dnb(duns, product, product_key, http_status, tsz_begin)
   VALUES (OLD.duns, OLD.product_02, '02', OLD.http_status_02, OLD.tsz_02);
   RETURN NEW;
END;
$BODY$;

-- Create database triggers to archive D&B data products on update
CREATE TRIGGER trgr_archive_dnb_product_00
   AFTER UPDATE OF product_00
   ON public.products_dnb
   FOR EACH ROW
   WHEN (OLD.product_00 IS NOT NULL)
   EXECUTE PROCEDURE public.f_archive_dnb_product_00();

CREATE TRIGGER trgr_archive_dnb_product_01
   AFTER UPDATE OF product_01
   ON public.products_dnb
   FOR EACH ROW
   WHEN (OLD.product_01 IS NOT NULL)
   EXECUTE PROCEDURE public.f_archive_dnb_product_01();

CREATE TRIGGER trgr_archive_dnb_product_02
   AFTER UPDATE OF product_02
   ON public.products_dnb
   FOR EACH ROW
   WHEN (OLD.product_02 IS NOT NULL)
   EXECUTE PROCEDURE public.f_archive_dnb_product_02();

-- Create table for persisting IDR requests
CREATE TABLE public.idr_dnb_dpl (
   id integer NOT NULL DEFAULT nextval('idr_dnb_dpl_id_seq'::regclass),
   req_params JSONB,
   resp_idr JSONB,
   http_status smallint,
   tsz timestamptz,
   CONSTRAINT idr_dnb_dpl_pkey PRIMARY KEY (id)
);

-- Create table for storing projects 
CREATE TABLE public.projects (
   id integer NOT NULL DEFAULT nextval('project_id_seq'::regclass),
   descr character varying(128) COLLATE pg_catalog."default",
   CONSTRAINT projects_pkey PRIMARY KEY (id)
);

-- Create table for storing project stages 
CREATE TABLE public.project_stages (
   project_id integer NOT NULL,
   stage smallint NOT NULL,
   finished BOOLEAN DEFAULT FALSE,
   params JSONB,
   CONSTRAINT project_stages_pkey PRIMARY KEY (project_id, stage),
   CONSTRAINT project_stages_fkey FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Create table for storing project keys
CREATE TABLE public.project_keys (
   project_id integer NOT NULL,
   req_key character varying(32) NOT NULL,
   CONSTRAINT project_keys_pkey PRIMARY KEY (project_id, req_key),
   CONSTRAINT project_keys_fkey FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Create table for storing products retrieved while fulfilling projects
CREATE TABLE public.project_products (
   project_id integer NOT NULL,
   stage smallint NOT NULL,
   req_key character varying(32) NOT NULL,
   product JSONB,
   http_status smallint,
   tsz timestamptz DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT project_products_pkey PRIMARY KEY (project_id, stage, req_key),
   CONSTRAINT project_products_fkey_1 FOREIGN KEY (project_id) REFERENCES projects(id),
   CONSTRAINT project_products_fkey_2 FOREIGN KEY (project_id, stage) REFERENCES project_stages(project_id, stage),
   CONSTRAINT project_products_fkey_3 FOREIGN KEY (project_id, req_key) REFERENCES project_keys(project_id, req_key)
);

-- Create table for logging HTTP errors
CREATE TABLE public.errors_http (
   id integer NOT NULL DEFAULT nextval('errors_http_id_seq'::regclass),
   req JSONB,
   err JSONB,
   http_status smallint,
   tsz timestamptz DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT errors_http_pkey PRIMARY KEY (id)
);

DO $$
DECLARE p_id integer;
BEGIN
   INSERT INTO projects ( descr ) VALUES ('Test project') RETURNING id INTO p_id;

   INSERT INTO project_stages
      ( project_id, stage, params )
   VALUES
      (
         p_id,
         1,
         '{ "script": "product", "provider": "dnb", "api": "dpl", "reqParams": { "blockIDs": "companyinfo_L2_v1,hierarchyconnections_L1_v1", "orderReason": 6332 }}'
      );

   INSERT INTO project_keys
      ( project_id, req_key )
   VALUES
      ( p_id, '407809623' ), ( p_id, '372428847' ), ( p_id, '373230036' );
END $$;
