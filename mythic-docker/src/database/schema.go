package database

var Schema = `
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: buildparameterinstance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buildparameterinstance (
    id integer NOT NULL,
    build_parameter_id integer NOT NULL,
    payload_id integer NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    enc_key bytea,
    dec_key bytea
);


--
-- Name: buildparameterinstance_deckey(public.buildparameterinstance); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.buildparameterinstance_deckey(buildparameterinstance_row public.buildparameterinstance) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT encode(buildparameterinstance_row.dec_key, 'base64')
$$;


--
-- Name: buildparameterinstance_enckey(public.buildparameterinstance); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.buildparameterinstance_enckey(buildparameterinstance_row public.buildparameterinstance) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT encode(buildparameterinstance_row.enc_key, 'base64')
$$;


--
-- Name: c2profileparametersinstance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.c2profileparametersinstance (
    id integer NOT NULL,
    c2_profile_parameters_id integer NOT NULL,
    c2_profile_id integer NOT NULL,
    value text NOT NULL,
    enc_key bytea,
    dec_key bytea,
    payload_id integer,
    instance_name text,
    operation_id integer,
    callback_id integer
);


--
-- Name: c2profileparametersinstance_deckey(public.c2profileparametersinstance); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.c2profileparametersinstance_deckey(c2profileparametersinstance_row public.c2profileparametersinstance) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT encode(c2profileparametersinstance_row.dec_key, 'base64')
$$;


--
-- Name: c2profileparametersinstance_enckey(public.c2profileparametersinstance); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.c2profileparametersinstance_enckey(c2profileparametersinstance_row public.c2profileparametersinstance) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT encode(c2profileparametersinstance_row.enc_key, 'base64')
$$;


--
-- Name: callback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.callback (
    id integer NOT NULL,
    display_id integer NOT NULL,
    agent_callback_id text NOT NULL,
    init_callback timestamp without time zone DEFAULT now() NOT NULL,
    last_checkin timestamp without time zone DEFAULT now() NOT NULL,
    "user" text DEFAULT ''::text NOT NULL,
    host text DEFAULT ''::text NOT NULL,
    pid integer DEFAULT 0 NOT NULL,
    ip text DEFAULT ''::text NOT NULL,
    external_ip text DEFAULT ''::text NOT NULL,
    process_name text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    operator_id integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    registered_payload_id integer NOT NULL,
    integrity_level integer DEFAULT 2 NOT NULL,
    locked boolean DEFAULT false NOT NULL,
    locked_operator_id integer,
    operation_id integer NOT NULL,
    crypto_type text DEFAULT ''::text NOT NULL,
    dec_key bytea,
    enc_key bytea,
    os text DEFAULT ''::text NOT NULL,
    architecture text DEFAULT ''::text NOT NULL,
    domain text DEFAULT ''::text NOT NULL,
    extra_info text DEFAULT ''::text NOT NULL,
    sleep_info text DEFAULT ''::text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: callback_deckey(public.callback); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.callback_deckey(callback_row public.callback) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT encode(callback_row.dec_key, 'base64')
$$;


--
-- Name: callback_enckey(public.callback); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.callback_enckey(callback_row public.callback) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT encode(callback_row.enc_key, 'base64')
$$;


--
-- Name: credential; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credential (
    id integer NOT NULL,
    type text DEFAULT 'plaintext'::text NOT NULL,
    task_id integer,
    account text DEFAULT ''::text NOT NULL,
    realm text DEFAULT ''::text NOT NULL,
    operation_id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    credential bytea DEFAULT '\x'::bytea NOT NULL,
    operator_id integer NOT NULL,
    comment text DEFAULT ''::text NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    metadata text DEFAULT ''::text NOT NULL
);


--
-- Name: credential_credentials(public.credential); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.credential_credentials(credential_row public.credential) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT convert_from(credential_row.credential, 'utf8')
$$;


--
-- Name: current_time(public.callback); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public."current_time"(callback_row public.callback) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  Select Now();
$$;


--
-- Name: default_payload_command_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.default_payload_command_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ 
DECLARE
   current_version integer;
BEGIN 
    IF NEW.version IS NULL THEN
        SELECT version INTO current_version FROM command WHERE id = NEW.command_id;
        NEW.version := current_version;
    END IF;
RETURN NEW; 
END; 
$$;


--
-- Name: filemeta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.filemeta (
    id integer NOT NULL,
    agent_file_id text NOT NULL,
    total_chunks integer DEFAULT 0 NOT NULL,
    chunks_received integer DEFAULT 0 NOT NULL,
    chunk_size integer DEFAULT 0 NOT NULL,
    task_id integer,
    complete boolean DEFAULT false NOT NULL,
    path text NOT NULL,
    full_remote_path bytea DEFAULT '\x'::bytea NOT NULL,
    host text DEFAULT ''::text NOT NULL,
    is_payload boolean DEFAULT false NOT NULL,
    is_screenshot boolean DEFAULT false NOT NULL,
    is_download_from_agent boolean DEFAULT false NOT NULL,
    mythictree_id integer,
    filename bytea DEFAULT '\x'::bytea NOT NULL,
    delete_after_fetch boolean DEFAULT true NOT NULL,
    operation_id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    operator_id integer NOT NULL,
    md5 text DEFAULT ''::text NOT NULL,
    sha1 text DEFAULT ''::text NOT NULL,
    comment text DEFAULT ''::text NOT NULL
);


--
-- Name: filemeta_filename(public.filemeta); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.filemeta_filename(meta_row public.filemeta) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT encode(meta_row.filename, 'base64')
$$;


--
-- Name: filemeta_filename_utf7(public.filemeta); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.filemeta_filename_utf7(meta_row public.filemeta) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT convert_from(meta_row.filename, 'utf8')
$$;


--
-- Name: filemeta_filename_utf8(public.filemeta); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.filemeta_filename_utf8(meta_row public.filemeta) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT encode(meta_row.filename, 'escape')
$$;


--
-- Name: filemeta_full_remote_path(public.filemeta); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.filemeta_full_remote_path(meta_row public.filemeta) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT encode(meta_row.full_remote_path, 'base64')
$$;


--
-- Name: filemeta_full_remote_path_utf8(public.filemeta); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.filemeta_full_remote_path_utf8(meta_row public.filemeta) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT encode(meta_row.full_remote_path, 'escape')
$$;


--
-- Name: keylog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keylog (
    id integer NOT NULL,
    task_id integer NOT NULL,
    keystrokes bytea DEFAULT '\x'::bytea NOT NULL,
    "window" text DEFAULT 'UNKNOWN'::text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    operation_id integer NOT NULL,
    "user" text DEFAULT 'UNKNOWN'::text NOT NULL
);


--
-- Name: keylog_keystrokes(public.keylog); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.keylog_keystrokes(keylog_row public.keylog) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT convert_from(keylog_row.keystrokes, 'utf8')
$$;


--
-- Name: mythictree; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mythictree (
    id integer NOT NULL,
    task_id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    operation_id integer NOT NULL,
    host text DEFAULT ''::text NOT NULL,
    name bytea DEFAULT '\x'::bytea NOT NULL,
    parent_path bytea DEFAULT '\x'::bytea NOT NULL,
    comment text DEFAULT ''::text NOT NULL,
    can_have_children boolean DEFAULT false NOT NULL,
    success boolean,
    deleted boolean DEFAULT false NOT NULL,
    full_path bytea DEFAULT '\x'::bytea NOT NULL,
    metadata jsonb DEFAULT jsonb_build_object() NOT NULL,
    tree_type text DEFAULT 'file'::text NOT NULL,
    os text NOT NULL
);


--
-- Name: mythictree_full_path(public.mythictree); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mythictree_full_path(fileobj_row public.mythictree) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT convert_from(fileobj_row.full_path, 'utf8')
$$;


--
-- Name: mythictree_name(public.mythictree); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mythictree_name(fileobj_row public.mythictree) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT convert_from(fileobj_row."name", 'utf8')
$$;


--
-- Name: mythictree_parent_path(public.mythictree); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mythictree_parent_path(fileobj_row public.mythictree) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT convert_from(fileobj_row.parent_path, 'utf8')
$$;


--
-- Name: new_callback_display_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.new_callback_display_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ 
DECLARE
   current_max integer;
BEGIN 
    SELECT GREATEST(0, Max(display_id) )
    INTO current_max
    FROM callback
    WHERE operation_id = NEW.operation_id;
    NEW.display_id := current_max + 1; 
RETURN NEW; 
END; 
$$;


--
-- Name: new_task_display_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.new_task_display_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ 
DECLARE
   current_max integer;
BEGIN 
    SELECT GREATEST(0, Max(display_id) )
    INTO current_max
    FROM task
    WHERE operation_id = NEW.operation_id;
            
    NEW.display_id := current_max + 1; 
RETURN NEW; 
END; 
$$;


--
-- Name: payload_update_timestamp_on_all_build_updates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payload_update_timestamp_on_all_build_updates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ 
BEGIN 
    UPDATE public.payload SET timestamp = NOW() WHERE id=NEW.payload_id;
    RETURN NEW;
END; 
$$;


--
-- Name: response; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.response (
    id integer NOT NULL,
    response bytea DEFAULT '\x'::bytea NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    task_id integer NOT NULL,
    sequence_number integer,
    operation_id integer NOT NULL
);


--
-- Name: response(public.response); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.response(response_row public.response) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT encode(response_row.response, 'base64')
$$;


--
-- Name: response_escape(public.response); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.response_escape(response_row public.response) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT encode(response_row.response, 'escape')
$$;


--
-- Name: response_update_task_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.response_update_task_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ 
BEGIN 
    UPDATE public.task SET timestamp=NOW() WHERE id=NEW.task_id;
    RETURN NEW;
END; 
$$;


--
-- Name: set_current_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_current_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."timestamp" = NOW();
  RETURN _new;
END;
$$;


--
-- Name: tag_update_linked_table(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tag_update_linked_table() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ 
BEGIN 
IF (TG_OP = 'DELETE') THEN
    IF OLD.task_id IS NOT NULL THEN
        UPDATE public.task SET timestamp=Now() WHERE id=OLD.task_id;
    END IF;
    IF OLD.filemeta_id IS NOT NULL THEN
        UPDATE public.filemeta SET timestamp=NOW() WHERE id=OLD.filemeta_id;
    END IF;
    IF OLD.mythictree_id IS NOT NULL THEN
        UPDATE public.mythictree SET timestamp=NOW() WHERE id=OLD.mythictree_id;
    END IF;
    IF OLD.credential_id IS NOT NULL THEN
        UPDATE public.credential SET timestamp=NOW() WHERE id=OLD.credential_id;
    END IF;
    IF OLD.taskartifact_id IS NOT NULL THEN
        UPDATE public.taskartifact SET timestamp=NOW() WHERE id=OLD.taskartifact_id;
    END IF;
    IF OLD.keylog_id IS NOT NULL THEN
        UPDATE public.keylog SET timestamp=NOW() WHERE id=OLD.keylog_id;
    END IF;
    IF OLD.response_id IS NOT NULL THEN
        UPDATE public.response SET timestamp=NOW() WHERE id=OLD.response_id;
    END IF;
    RETURN OLD;
ELSIF (TG_OP = 'INSERT') THEN
    IF NEW.task_id IS NOT NULL THEN
        UPDATE public.task SET timestamp=Now() WHERE id=NEW.task_id;
    END IF;
    IF NEW.filemeta_id IS NOT NULL THEN
        UPDATE public.filemeta SET timestamp=NOW() WHERE id=NEW.filemeta_id;
    END IF;
    IF NEW.mythictree_id IS NOT NULL THEN
        UPDATE public.mythictree SET timestamp=NOW() WHERE id=NEW.mythictree_id;
    END IF;
    IF NEW.credential_id IS NOT NULL THEN
        UPDATE public.credential SET timestamp=NOW() WHERE id=NEW.credential_id;
    END IF;
    IF NEW.taskartifact_id IS NOT NULL THEN
        UPDATE public.taskartifact SET timestamp=NOW() WHERE id=NEW.taskartifact_id;
    END IF;
    IF NEW.keylog_id IS NOT NULL THEN
        UPDATE public.keylog SET timestamp=NOW() WHERE id=NEW.keylog_id;
    END IF;
    IF NEW.response_id IS NOT NULL THEN
        UPDATE public.response SET timestamp=NOW() WHERE id=NEW.response_id;
    END IF;
    RETURN NEW;
END IF;
RETURN NULL;
END; 
$$;


--
-- Name: task_update_timestamp_on_all_updates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.task_update_timestamp_on_all_updates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ 
BEGIN 
    NEW."timestamp" = NOW();
    RETURN NEW;
END; 
$$;


--
-- Name: taskartifact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taskartifact (
    id integer NOT NULL,
    task_id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    artifact bytea DEFAULT '\x'::bytea NOT NULL,
    operation_id integer NOT NULL,
    host text NOT NULL,
    base_artifact text DEFAULT ''::text NOT NULL
);


--
-- Name: taskartifact_artifact_instance(public.taskartifact); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.taskartifact_artifact_instance(taskartifact_row public.taskartifact) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT convert_from(taskartifact_row.artifact, 'utf8')
$$;


--
-- Name: update_mythictree_timestamp_on_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_mythictree_timestamp_on_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.timestamp := now(); RETURN NEW; END; $$;


--
-- Name: update_operation_alert_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_operation_alert_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ 
DECLARE
   current_max integer;
BEGIN 
    SELECT COUNT(*) 
    INTO current_max
    FROM operationeventlog
    WHERE operation_id = NEW.operation_id AND resolved=false AND deleted=false AND level='warning';

	UPDATE operation SET alert_count = current_max WHERE id = NEW.operation_id;
RETURN NEW; 
END; 
$$;


--
-- Name: update_task_response_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_response_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ 
DECLARE
   current_max integer;
BEGIN 
    SELECT COUNT(*) 
    INTO current_max
    FROM response
    WHERE task_id = NEW.task_id;
	UPDATE task SET response_count = current_max WHERE id = NEW.task_id;
RETURN NEW; 
END; 
$$;


--
-- Name: update_task_timestamp_on_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_timestamp_on_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.timestamp := now(); RETURN NEW; END; $$;


--
-- Name: agentstorage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agentstorage (
    id integer NOT NULL,
    data bytea DEFAULT '\x'::bytea NOT NULL,
    unique_id text NOT NULL
);


--
-- Name: agentstorage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agentstorage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agentstorage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agentstorage_id_seq OWNED BY public.agentstorage.id;


--
-- Name: apitokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.apitokens (
    id integer NOT NULL,
    token_type text NOT NULL,
    token_value text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    creation_time timestamp without time zone DEFAULT now() NOT NULL,
    operator_id integer NOT NULL
);


--
-- Name: apitokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.apitokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: apitokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.apitokens_id_seq OWNED BY public.apitokens.id;


--
-- Name: attack; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attack (
    id integer NOT NULL,
    t_num text NOT NULL,
    name text NOT NULL,
    os text NOT NULL,
    tactic text NOT NULL
);


--
-- Name: attack_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attack_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attack_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attack_id_seq OWNED BY public.attack.id;


--
-- Name: attackcommand; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attackcommand (
    id integer NOT NULL,
    attack_id integer NOT NULL,
    command_id integer NOT NULL
);


--
-- Name: attackcommand_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attackcommand_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attackcommand_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attackcommand_id_seq OWNED BY public.attackcommand.id;


--
-- Name: attacktask; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attacktask (
    id integer NOT NULL,
    attack_id integer NOT NULL,
    task_id integer NOT NULL
);


--
-- Name: attacktask_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attacktask_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attacktask_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attacktask_id_seq OWNED BY public.attacktask.id;


--
-- Name: browserscript; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.browserscript (
    id integer NOT NULL,
    operator_id integer,
    script text DEFAULT ''::text NOT NULL,
    command_id integer NOT NULL,
    payload_type_id integer NOT NULL,
    creation_time timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL,
    author text DEFAULT ''::text NOT NULL,
    user_modified boolean DEFAULT false NOT NULL,
    container_version text DEFAULT ''::text NOT NULL,
    container_version_author text DEFAULT ''::text NOT NULL,
    for_new_ui boolean DEFAULT false NOT NULL
);


--
-- Name: browserscript_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.browserscript_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: browserscript_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.browserscript_id_seq OWNED BY public.browserscript.id;


--
-- Name: browserscriptoperation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.browserscriptoperation (
    id integer NOT NULL,
    browserscript_id integer NOT NULL,
    operation_id integer NOT NULL
);


--
-- Name: browserscriptoperation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.browserscriptoperation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: browserscriptoperation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.browserscriptoperation_id_seq OWNED BY public.browserscriptoperation.id;


--
-- Name: buildparameter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buildparameter (
    id integer NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    parameter_type text DEFAULT 'None'::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    payload_type_id integer NOT NULL,
    required boolean DEFAULT true NOT NULL,
    verifier_regex text DEFAULT ''::text NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    default_value text DEFAULT ''::text NOT NULL,
    randomize boolean DEFAULT false NOT NULL,
    format_string text DEFAULT ''::text NOT NULL,
    crypto_type boolean DEFAULT false NOT NULL,
    choices jsonb DEFAULT jsonb_build_array() NOT NULL
);


--
-- Name: buildparameter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.buildparameter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: buildparameter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.buildparameter_id_seq OWNED BY public.buildparameter.id;


--
-- Name: buildparameterinstance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.buildparameterinstance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: buildparameterinstance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.buildparameterinstance_id_seq OWNED BY public.buildparameterinstance.id;


--
-- Name: c2profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.c2profile (
    id integer NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    creation_time timestamp without time zone DEFAULT now() NOT NULL,
    running boolean DEFAULT false NOT NULL,
    container_running boolean DEFAULT false NOT NULL,
    author text DEFAULT ''::text NOT NULL,
    is_p2p boolean DEFAULT false NOT NULL,
    is_server_routed boolean DEFAULT false NOT NULL,
    deleted boolean DEFAULT false NOT NULL
);


--
-- Name: c2profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.c2profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: c2profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.c2profile_id_seq OWNED BY public.c2profile.id;


--
-- Name: c2profileparameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.c2profileparameters (
    id integer NOT NULL,
    c2_profile_id integer NOT NULL,
    description text NOT NULL,
    name text NOT NULL,
    default_value text DEFAULT ''::text NOT NULL,
    randomize boolean DEFAULT false NOT NULL,
    format_string text DEFAULT ''::text NOT NULL,
    parameter_type text DEFAULT 'String'::text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    verifier_regex text DEFAULT ''::text NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    crypto_type boolean DEFAULT false NOT NULL,
    choices jsonb DEFAULT jsonb_build_array() NOT NULL
);


--
-- Name: c2profileparameters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.c2profileparameters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: c2profileparameters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.c2profileparameters_id_seq OWNED BY public.c2profileparameters.id;


--
-- Name: c2profileparametersinstance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.c2profileparametersinstance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: c2profileparametersinstance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.c2profileparametersinstance_id_seq OWNED BY public.c2profileparametersinstance.id;


--
-- Name: callback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.callback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: callback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.callback_id_seq OWNED BY public.callback.id;


--
-- Name: callbackc2profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.callbackc2profiles (
    id integer NOT NULL,
    callback_id integer NOT NULL,
    c2_profile_id integer NOT NULL
);


--
-- Name: callbackc2profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.callbackc2profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: callbackc2profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.callbackc2profiles_id_seq OWNED BY public.callbackc2profiles.id;


--
-- Name: callbackgraphedge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.callbackgraphedge (
    id integer NOT NULL,
    start_timestamp timestamp without time zone DEFAULT now() NOT NULL,
    end_timestamp timestamp without time zone,
    operation_id integer NOT NULL,
    source_id integer NOT NULL,
    destination_id integer NOT NULL,
    metadata text DEFAULT ''::text NOT NULL,
    c2_profile_id integer NOT NULL
);


--
-- Name: callbackgraphedge_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.callbackgraphedge_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: callbackgraphedge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.callbackgraphedge_id_seq OWNED BY public.callbackgraphedge.id;


--
-- Name: callbackport_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.callbackport_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: callbackport; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.callbackport (
    id integer DEFAULT nextval('public.callbackport_id_seq'::regclass) NOT NULL,
    callback_id integer NOT NULL,
    local_port integer NOT NULL,
	remote_port integer NOT NULL DEFAULT 0,
	remote_ip text DEFAULT ''::text NOT NULL,
    task_id integer NOT NULL,
    operation_id integer NOT NULL,
    port_type text DEFAULT 'socks'::text NOT NULL
);


--
-- Name: callbacktoken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.callbacktoken (
    id integer NOT NULL,
    token_id integer NOT NULL,
    callback_id integer NOT NULL,
    os text DEFAULT 'Windows'::text NOT NULL,
    task_id integer NOT NULL,
    timestamp_created timestamp without time zone DEFAULT now() NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    host text NOT NULL
);


--
-- Name: callbacktoken_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.callbacktoken_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: callbacktoken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.callbacktoken_id_seq OWNED BY public.callbacktoken.id;


--
-- Name: command; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.command (
    id integer NOT NULL,
    needs_admin boolean DEFAULT false NOT NULL,
    help_cmd text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    cmd text DEFAULT ''::text NOT NULL,
    payload_type_id integer NOT NULL,
    creation_time timestamp without time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    supported_ui_features jsonb DEFAULT jsonb_build_array() NOT NULL,
    author text DEFAULT ''::text NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    attributes jsonb DEFAULT jsonb_build_object() NOT NULL,
    script_only boolean DEFAULT false NOT NULL
);


--
-- Name: command_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.command_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: command_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.command_id_seq OWNED BY public.command.id;


--
-- Name: commandparameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commandparameters (
    id integer NOT NULL,
    command_id integer NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    display_name text DEFAULT ''::text NOT NULL,
    cli_name text DEFAULT ''::text NOT NULL,
    type text DEFAULT 'String'::text NOT NULL,
    default_value text DEFAULT ''::text NOT NULL,
    choices jsonb DEFAULT jsonb_build_array() NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    supported_agents jsonb DEFAULT jsonb_build_array() NOT NULL,
    supported_agent_build_parameters jsonb DEFAULT jsonb_build_object() NOT NULL,
    choice_filter_by_command_attributes jsonb DEFAULT jsonb_build_object() NOT NULL,
    choices_are_all_commands boolean DEFAULT false NOT NULL,
    choices_are_loaded_commands boolean DEFAULT false NOT NULL,
    dynamic_query_function text DEFAULT ''::text NOT NULL,
    parameter_group_name text DEFAULT 'default'::text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    ui_position integer NOT NULL
);


--
-- Name: commandparameters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.commandparameters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: commandparameters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.commandparameters_id_seq OWNED BY public.commandparameters.id;


--
-- Name: credential_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credential_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credential_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.credential_id_seq OWNED BY public.credential.id;


--
-- Name: disabledcommandsprofile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disabledcommandsprofile (
    id integer NOT NULL,
    name text DEFAULT 'UNKNOWN'::text NOT NULL,
    command_id integer NOT NULL,
    operation_id integer NOT NULL
);


--
-- Name: disabledcommandsprofile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.disabledcommandsprofile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: disabledcommandsprofile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.disabledcommandsprofile_id_seq OWNED BY public.disabledcommandsprofile.id;


--
-- Name: filemeta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.filemeta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: filemeta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.filemeta_id_seq OWNED BY public.filemeta.id;


--
-- Name: keylog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.keylog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: keylog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.keylog_id_seq OWNED BY public.keylog.id;


--
-- Name: loadedcommands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loadedcommands (
    id integer NOT NULL,
    command_id integer NOT NULL,
    callback_id integer NOT NULL,
    operator_id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL
);


--
-- Name: loadedcommands_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.loadedcommands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: loadedcommands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.loadedcommands_id_seq OWNED BY public.loadedcommands.id;


--
-- Name: mythictree_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mythictree_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mythictree_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mythictree_id_seq OWNED BY public.mythictree.id;


--
-- Name: operation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operation (
    id integer NOT NULL,
    name text DEFAULT gen_random_uuid() NOT NULL,
    admin_id integer NOT NULL,
    complete boolean DEFAULT false NOT NULL,
    webhook text DEFAULT ''::text NOT NULL,
    channel text DEFAULT '#random'::text NOT NULL,
    alert_count integer DEFAULT 0 NOT NULL,
    deleted boolean DEFAULT false NOT NULL
);


--
-- Name: operation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: operation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operation_id_seq OWNED BY public.operation.id;


--
-- Name: operationeventlog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operationeventlog (
    id integer NOT NULL,
    operator_id integer,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    message text NOT NULL,
    operation_id integer NOT NULL,
    level text DEFAULT 'info'::text NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    source text DEFAULT ''::text NOT NULL,
    count integer DEFAULT 1 NOT NULL
);


--
-- Name: operationeventlog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operationeventlog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: operationeventlog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operationeventlog_id_seq OWNED BY public.operationeventlog.id;


--
-- Name: operator; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operator (
    id integer NOT NULL,
    username text NOT NULL,
    password bytea NOT NULL,
    admin boolean DEFAULT false NOT NULL,
    salt text NOT NULL,
    creation_time timestamp without time zone DEFAULT now() NOT NULL,
    last_login timestamp without time zone,
    failed_login_count integer DEFAULT 0 NOT NULL,
    last_failed_login_timestamp timestamp without time zone,
    active boolean DEFAULT false NOT NULL,
    view_utc_time boolean DEFAULT false NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    current_operation_id integer
);


--
-- Name: operator_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operator_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: operator_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operator_id_seq OWNED BY public.operator.id;


--
-- Name: operatoroperation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operatoroperation (
    id integer NOT NULL,
    operator_id integer NOT NULL,
    operation_id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    base_disabled_commands_id integer,
    view_mode text DEFAULT 'operator'::text NOT NULL
);


--
-- Name: operatoroperation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operatoroperation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: operatoroperation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operatoroperation_id_seq OWNED BY public.operatoroperation.id;


--
-- Name: payload; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload (
    id integer NOT NULL,
    uuid text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    operator_id integer NOT NULL,
    creation_time timestamp without time zone DEFAULT now() NOT NULL,
    payload_type_id integer NOT NULL,
    operation_id integer NOT NULL,
    wrapped_payload_id integer,
    deleted boolean DEFAULT false NOT NULL,
    build_container text NOT NULL,
    build_phase text DEFAULT 'building'::text NOT NULL,
    build_message text DEFAULT ''::text NOT NULL,
    build_stderr text DEFAULT ''::text NOT NULL,
    build_stdout text DEFAULT ''::text NOT NULL,
    callback_alert boolean DEFAULT true NOT NULL,
    auto_generated boolean DEFAULT false NOT NULL,
    os text DEFAULT ''::text NOT NULL,
    task_id integer,
    file_id integer,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: payload_build_step; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload_build_step (
    id integer NOT NULL,
    payload_id integer,
    step_number integer DEFAULT 0 NOT NULL,
    step_stdout text DEFAULT ''::text NOT NULL,
    step_stderr text DEFAULT ''::text NOT NULL,
    step_name text DEFAULT ''::text NOT NULL,
    step_description text DEFAULT ''::text NOT NULL,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    step_success boolean DEFAULT false NOT NULL,
    payloadtype_id integer
);


--
-- Name: payload_build_step_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_build_step_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_build_step_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_build_step_id_seq OWNED BY public.payload_build_step.id;


--
-- Name: payload_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_id_seq OWNED BY public.payload.id;


--
-- Name: payloadc2profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payloadc2profiles (
    id integer NOT NULL,
    payload_id integer NOT NULL,
    c2_profile_id integer NOT NULL
);


--
-- Name: payloadc2profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payloadc2profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payloadc2profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payloadc2profiles_id_seq OWNED BY public.payloadc2profiles.id;


--
-- Name: payloadcommand; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payloadcommand (
    id integer NOT NULL,
    payload_id integer NOT NULL,
    command_id integer NOT NULL,
    creation_time timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL
);


--
-- Name: payloadcommand_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payloadcommand_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payloadcommand_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payloadcommand_id_seq OWNED BY public.payloadcommand.id;


--
-- Name: payloadonhost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payloadonhost (
    id integer NOT NULL,
    host text NOT NULL,
    payload_id integer NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    operation_id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    task_id integer
);


--
-- Name: payloadonhost_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payloadonhost_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payloadonhost_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payloadonhost_id_seq OWNED BY public.payloadonhost.id;


--
-- Name: payloadtype; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payloadtype (
    id integer NOT NULL,
    name text NOT NULL,
    mythic_encrypts boolean NOT NULL,
    creation_time timestamp without time zone DEFAULT now() NOT NULL,
    file_extension text DEFAULT ''::text NOT NULL,
    wrapper boolean DEFAULT false NOT NULL,
    supported_os jsonb DEFAULT jsonb_build_array() NOT NULL,
    container_running boolean DEFAULT false NOT NULL,
    author text DEFAULT ''::text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    supports_dynamic_loading boolean DEFAULT false NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    translation_container_id integer,
    container_count integer DEFAULT 0 NOT NULL
);


--
-- Name: payloadtype_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payloadtype_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payloadtype_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payloadtype_id_seq OWNED BY public.payloadtype.id;


--
-- Name: payloadtypec2profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payloadtypec2profile (
    id integer NOT NULL,
    payload_type_id integer NOT NULL,
    c2_profile_id integer NOT NULL
);


--
-- Name: payloadtypec2profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payloadtypec2profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payloadtypec2profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payloadtypec2profile_id_seq OWNED BY public.payloadtypec2profile.id;


--
-- Name: response_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.response_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: response_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.response_id_seq OWNED BY public.response.id;


--
-- Name: staginginfo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staginginfo (
    id integer NOT NULL,
    session_id text DEFAULT ''::text NOT NULL,
    enc_key bytea,
    dec_key bytea,
    crypto_type text DEFAULT ''::text NOT NULL,
    staging_uuid text NOT NULL,
    payload_id integer NOT NULL
);


--
-- Name: staginginfo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staginginfo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staginginfo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staginginfo_id_seq OWNED BY public.staginginfo.id;


--
-- Name: tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tag (
    id integer NOT NULL,
    tagtype_id integer NOT NULL,
    data jsonb DEFAULT jsonb_build_object() NOT NULL,
    url text DEFAULT ''::text NOT NULL,
    source text DEFAULT ''::text NOT NULL,
    operation_id integer NOT NULL,
    filemeta_id integer,
    mythictree_id integer,
    credential_id integer,
    task_id integer,
    taskartifact_id integer,
    keylog_id integer,
    response_id integer
);


--
-- Name: tag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tag_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tag_id_seq OWNED BY public.tag.id;


--
-- Name: tagtype; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tagtype (
    id integer NOT NULL,
    name text NOT NULL,
    color text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    operation_id integer NOT NULL
);


--
-- Name: tagtype_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tagtype_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tagtype_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tagtype_id_seq OWNED BY public.tagtype.id;


--
-- Name: task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task (
    id integer NOT NULL,
    agent_task_id text NOT NULL,
    display_id integer NOT NULL,
    operation_id integer NOT NULL,
    command_id integer,
    command_name text DEFAULT ''::text NOT NULL,
    params text DEFAULT ''::text NOT NULL,
    status_timestamp_preprocessing timestamp without time zone DEFAULT now() NOT NULL,
    status_timestamp_submitted timestamp without time zone,
    status_timestamp_processing timestamp without time zone,
    status_timestamp_processed timestamp without time zone,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    callback_id integer NOT NULL,
    operator_id integer NOT NULL,
    status text NOT NULL,
    original_params text DEFAULT ''::text NOT NULL,
    display_params text DEFAULT ''::text NOT NULL,
    comment text DEFAULT ''::text NOT NULL,
    comment_operator_id integer,
    stdout text DEFAULT ''::text NOT NULL,
    stderr text DEFAULT ''::text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    opsec_pre_blocked boolean,
    opsec_pre_message text DEFAULT ''::text NOT NULL,
    opsec_pre_bypassed boolean DEFAULT false NOT NULL,
    opsec_pre_bypass_role text DEFAULT 'lead'::text NOT NULL,
    opsec_pre_bypass_user_id integer,
    opsec_post_blocked boolean,
    opsec_post_message text DEFAULT ''::text NOT NULL,
    opsec_post_bypassed boolean DEFAULT false NOT NULL,
    opsec_post_bypass_role text DEFAULT 'lead'::text NOT NULL,
    opsec_post_bypass_user_id integer,
    parent_task_id integer,
    subtask_callback_function text DEFAULT ''::text NOT NULL,
    subtask_callback_function_completed boolean DEFAULT false NOT NULL,
    group_callback_function text DEFAULT ''::text NOT NULL,
    group_callback_function_completed boolean DEFAULT false NOT NULL,
    completed_callback_function text DEFAULT ''::text NOT NULL,
    completed_callback_function_completed boolean DEFAULT false NOT NULL,
    subtask_group_name text DEFAULT ''::text NOT NULL,
    tasking_location text DEFAULT 'command_line'::text NOT NULL,
    parameter_group_name text DEFAULT 'Default'::text NOT NULL,
    token_id integer,
    response_count integer DEFAULT 0 NOT NULL
);


--
-- Name: task_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_id_seq OWNED BY public.task.id;


--
-- Name: taskartifact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.taskartifact_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: taskartifact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.taskartifact_id_seq OWNED BY public.taskartifact.id;


--
-- Name: token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.token (
    id integer NOT NULL,
    token_id integer NOT NULL,
    "user" text DEFAULT ''::text NOT NULL,
    groups text DEFAULT ''::text NOT NULL,
    default_dacl text DEFAULT ''::text NOT NULL,
    session_id integer DEFAULT 0 NOT NULL,
    restricted boolean DEFAULT false NOT NULL,
    capabilities text DEFAULT ''::text NOT NULL,
    logon_sid text DEFAULT ''::text NOT NULL,
    integrity_level_sid text DEFAULT ''::text NOT NULL,
    app_container_sid text DEFAULT ''::text NOT NULL,
    privileges text DEFAULT ''::text NOT NULL,
    handle integer DEFAULT 0 NOT NULL,
    task_id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    host text DEFAULT ''::text NOT NULL,
    thread_id integer DEFAULT 0 NOT NULL,
    process_id integer DEFAULT 0 NOT NULL,
    description text,
    operation_id integer NOT NULL,
    app_container_number integer DEFAULT 0 NOT NULL
);


--
-- Name: token_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.token_id_seq OWNED BY public.token.id;


--
-- Name: translationcontainer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.translationcontainer (
    id integer NOT NULL,
    name text NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    container_running boolean DEFAULT true NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    author text DEFAULT ''::text NOT NULL
);


--
-- Name: translationcontainer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.translationcontainer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: translationcontainer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.translationcontainer_id_seq OWNED BY public.translationcontainer.id;


--
-- Name: wrappedpayloadtypes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wrappedpayloadtypes (
    id integer NOT NULL,
    wrapper_id integer NOT NULL,
    wrapped_id integer NOT NULL
);


--
-- Name: wrappedpayloadtypes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wrappedpayloadtypes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wrappedpayloadtypes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wrappedpayloadtypes_id_seq OWNED BY public.wrappedpayloadtypes.id;


--
-- Name: agentstorage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agentstorage ALTER COLUMN id SET DEFAULT nextval('public.agentstorage_id_seq'::regclass);


--
-- Name: apitokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apitokens ALTER COLUMN id SET DEFAULT nextval('public.apitokens_id_seq'::regclass);


--
-- Name: attack id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attack ALTER COLUMN id SET DEFAULT nextval('public.attack_id_seq'::regclass);


--
-- Name: attackcommand id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attackcommand ALTER COLUMN id SET DEFAULT nextval('public.attackcommand_id_seq'::regclass);


--
-- Name: attacktask id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attacktask ALTER COLUMN id SET DEFAULT nextval('public.attacktask_id_seq'::regclass);


--
-- Name: browserscript id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.browserscript ALTER COLUMN id SET DEFAULT nextval('public.browserscript_id_seq'::regclass);


--
-- Name: browserscriptoperation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.browserscriptoperation ALTER COLUMN id SET DEFAULT nextval('public.browserscriptoperation_id_seq'::regclass);


--
-- Name: buildparameter id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildparameter ALTER COLUMN id SET DEFAULT nextval('public.buildparameter_id_seq'::regclass);


--
-- Name: buildparameterinstance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildparameterinstance ALTER COLUMN id SET DEFAULT nextval('public.buildparameterinstance_id_seq'::regclass);


--
-- Name: c2profile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c2profile ALTER COLUMN id SET DEFAULT nextval('public.c2profile_id_seq'::regclass);


--
-- Name: c2profileparameters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c2profileparameters ALTER COLUMN id SET DEFAULT nextval('public.c2profileparameters_id_seq'::regclass);


--
-- Name: c2profileparametersinstance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c2profileparametersinstance ALTER COLUMN id SET DEFAULT nextval('public.c2profileparametersinstance_id_seq'::regclass);


--
-- Name: callback id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callback ALTER COLUMN id SET DEFAULT nextval('public.callback_id_seq'::regclass);


--
-- Name: callbackc2profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackc2profiles ALTER COLUMN id SET DEFAULT nextval('public.callbackc2profiles_id_seq'::regclass);


--
-- Name: callbackgraphedge id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackgraphedge ALTER COLUMN id SET DEFAULT nextval('public.callbackgraphedge_id_seq'::regclass);


--
-- Name: callbacktoken id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbacktoken ALTER COLUMN id SET DEFAULT nextval('public.callbacktoken_id_seq'::regclass);


--
-- Name: command id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command ALTER COLUMN id SET DEFAULT nextval('public.command_id_seq'::regclass);


--
-- Name: commandparameters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commandparameters ALTER COLUMN id SET DEFAULT nextval('public.commandparameters_id_seq'::regclass);


--
-- Name: credential id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credential ALTER COLUMN id SET DEFAULT nextval('public.credential_id_seq'::regclass);


--
-- Name: disabledcommandsprofile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disabledcommandsprofile ALTER COLUMN id SET DEFAULT nextval('public.disabledcommandsprofile_id_seq'::regclass);


--
-- Name: filemeta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filemeta ALTER COLUMN id SET DEFAULT nextval('public.filemeta_id_seq'::regclass);


--
-- Name: keylog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keylog ALTER COLUMN id SET DEFAULT nextval('public.keylog_id_seq'::regclass);


--
-- Name: loadedcommands id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loadedcommands ALTER COLUMN id SET DEFAULT nextval('public.loadedcommands_id_seq'::regclass);


--
-- Name: mythictree id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mythictree ALTER COLUMN id SET DEFAULT nextval('public.mythictree_id_seq'::regclass);


--
-- Name: operation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation ALTER COLUMN id SET DEFAULT nextval('public.operation_id_seq'::regclass);


--
-- Name: operationeventlog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operationeventlog ALTER COLUMN id SET DEFAULT nextval('public.operationeventlog_id_seq'::regclass);


--
-- Name: operator id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operator ALTER COLUMN id SET DEFAULT nextval('public.operator_id_seq'::regclass);


--
-- Name: operatoroperation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operatoroperation ALTER COLUMN id SET DEFAULT nextval('public.operatoroperation_id_seq'::regclass);


--
-- Name: payload id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload ALTER COLUMN id SET DEFAULT nextval('public.payload_id_seq'::regclass);


--
-- Name: payload_build_step id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_build_step ALTER COLUMN id SET DEFAULT nextval('public.payload_build_step_id_seq'::regclass);


--
-- Name: payloadc2profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadc2profiles ALTER COLUMN id SET DEFAULT nextval('public.payloadc2profiles_id_seq'::regclass);


--
-- Name: payloadcommand id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadcommand ALTER COLUMN id SET DEFAULT nextval('public.payloadcommand_id_seq'::regclass);


--
-- Name: payloadonhost id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadonhost ALTER COLUMN id SET DEFAULT nextval('public.payloadonhost_id_seq'::regclass);


--
-- Name: payloadtype id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadtype ALTER COLUMN id SET DEFAULT nextval('public.payloadtype_id_seq'::regclass);


--
-- Name: payloadtypec2profile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadtypec2profile ALTER COLUMN id SET DEFAULT nextval('public.payloadtypec2profile_id_seq'::regclass);


--
-- Name: response id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response ALTER COLUMN id SET DEFAULT nextval('public.response_id_seq'::regclass);


--
-- Name: staginginfo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staginginfo ALTER COLUMN id SET DEFAULT nextval('public.staginginfo_id_seq'::regclass);


--
-- Name: tag id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag ALTER COLUMN id SET DEFAULT nextval('public.tag_id_seq'::regclass);


--
-- Name: tagtype id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tagtype ALTER COLUMN id SET DEFAULT nextval('public.tagtype_id_seq'::regclass);


--
-- Name: task id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task ALTER COLUMN id SET DEFAULT nextval('public.task_id_seq'::regclass);


--
-- Name: taskartifact id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taskartifact ALTER COLUMN id SET DEFAULT nextval('public.taskartifact_id_seq'::regclass);


--
-- Name: token id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token ALTER COLUMN id SET DEFAULT nextval('public.token_id_seq'::regclass);


--
-- Name: translationcontainer id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translationcontainer ALTER COLUMN id SET DEFAULT nextval('public.translationcontainer_id_seq'::regclass);


--
-- Name: wrappedpayloadtypes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wrappedpayloadtypes ALTER COLUMN id SET DEFAULT nextval('public.wrappedpayloadtypes_id_seq'::regclass);


--
-- Name: agentstorage agentstorage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agentstorage
    ADD CONSTRAINT agentstorage_pkey PRIMARY KEY (id);


--
-- Name: apitokens apitokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apitokens
    ADD CONSTRAINT apitokens_pkey PRIMARY KEY (id);


--
-- Name: attack attack_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attack
    ADD CONSTRAINT attack_pkey PRIMARY KEY (id);


--
-- Name: attackcommand attackcommand_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attackcommand
    ADD CONSTRAINT attackcommand_pkey PRIMARY KEY (id);


--
-- Name: attacktask attacktask_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attacktask
    ADD CONSTRAINT attacktask_pkey PRIMARY KEY (id);


--
-- Name: browserscript browserscript_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.browserscript
    ADD CONSTRAINT browserscript_pkey PRIMARY KEY (id);


--
-- Name: browserscriptoperation browserscriptoperation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.browserscriptoperation
    ADD CONSTRAINT browserscriptoperation_pkey PRIMARY KEY (id);


--
-- Name: buildparameter buildparameter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildparameter
    ADD CONSTRAINT buildparameter_pkey PRIMARY KEY (id);


--
-- Name: buildparameterinstance buildparameterinstance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildparameterinstance
    ADD CONSTRAINT buildparameterinstance_pkey PRIMARY KEY (id);


--
-- Name: c2profile c2profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c2profile
    ADD CONSTRAINT c2profile_pkey PRIMARY KEY (id);


--
-- Name: c2profileparameters c2profileparameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c2profileparameters
    ADD CONSTRAINT c2profileparameters_pkey PRIMARY KEY (id);


--
-- Name: c2profileparametersinstance c2profileparametersinstance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c2profileparametersinstance
    ADD CONSTRAINT c2profileparametersinstance_pkey PRIMARY KEY (id);


--
-- Name: callback callback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callback
    ADD CONSTRAINT callback_pkey PRIMARY KEY (id);


--
-- Name: callbackc2profiles callbackc2profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackc2profiles
    ADD CONSTRAINT callbackc2profiles_pkey PRIMARY KEY (id);


--
-- Name: callbackgraphedge callbackgraphedge_end_timestamp_source_id_destination_id_c2_pro; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackgraphedge
    ADD CONSTRAINT callbackgraphedge_end_timestamp_source_id_destination_id_c2_pro UNIQUE (end_timestamp, source_id, destination_id, c2_profile_id);


--
-- Name: callbackgraphedge callbackgraphedge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackgraphedge
    ADD CONSTRAINT callbackgraphedge_pkey PRIMARY KEY (id);


--
-- Name: callbackport callbackport_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackport
    ADD CONSTRAINT callbackport_pkey PRIMARY KEY (id);


--
-- Name: callbacktoken callbacktoken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbacktoken
    ADD CONSTRAINT callbacktoken_pkey PRIMARY KEY (id);


--
-- Name: callbacktoken callbacktoken_token_id_callback_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbacktoken
    ADD CONSTRAINT callbacktoken_token_id_callback_id_key UNIQUE (token_id, callback_id);


--
-- Name: command command_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command
    ADD CONSTRAINT command_pkey PRIMARY KEY (id);


--
-- Name: commandparameters commandparameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commandparameters
    ADD CONSTRAINT commandparameters_pkey PRIMARY KEY (id);


--
-- Name: credential credential_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credential
    ADD CONSTRAINT credential_pkey PRIMARY KEY (id);


--
-- Name: credential credential_type_account_realm_credential_operation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

--
-- Name: disabledcommandsprofile disabledcommandsprofile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disabledcommandsprofile
    ADD CONSTRAINT disabledcommandsprofile_pkey PRIMARY KEY (id);


--
-- Name: filemeta filemeta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filemeta
    ADD CONSTRAINT filemeta_pkey PRIMARY KEY (id);


--
-- Name: keylog keylog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keylog
    ADD CONSTRAINT keylog_pkey PRIMARY KEY (id);


--
-- Name: loadedcommands loadedcommands_command_id_callback_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loadedcommands
    ADD CONSTRAINT loadedcommands_command_id_callback_id_key UNIQUE (command_id, callback_id);


--
-- Name: loadedcommands loadedcommands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loadedcommands
    ADD CONSTRAINT loadedcommands_pkey PRIMARY KEY (id);


--
-- Name: mythictree mythictree_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mythictree
    ADD CONSTRAINT mythictree_pkey PRIMARY KEY (id);


--
-- Name: mythictree mythictree_tree_type_full_path_host_operation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mythictree
    ADD CONSTRAINT mythictree_tree_type_full_path_host_operation_id_key UNIQUE (tree_type, full_path, host, operation_id);


--
-- Name: operation operation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation
    ADD CONSTRAINT operation_pkey PRIMARY KEY (id);


--
-- Name: operationeventlog operationeventlog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operationeventlog
    ADD CONSTRAINT operationeventlog_pkey PRIMARY KEY (id);


--
-- Name: operator operator_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operator
    ADD CONSTRAINT operator_pkey PRIMARY KEY (id);


--
-- Name: operatoroperation operatoroperation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operatoroperation
    ADD CONSTRAINT operatoroperation_pkey PRIMARY KEY (id);


--
-- Name: payload_build_step payload_build_step_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_build_step
    ADD CONSTRAINT payload_build_step_pkey PRIMARY KEY (id);


--
-- Name: payload payload_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload
    ADD CONSTRAINT payload_pkey PRIMARY KEY (id);


--
-- Name: payloadc2profiles payloadc2profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadc2profiles
    ADD CONSTRAINT payloadc2profiles_pkey PRIMARY KEY (id);


--
-- Name: payloadcommand payloadcommand_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadcommand
    ADD CONSTRAINT payloadcommand_pkey PRIMARY KEY (id);


--
-- Name: payloadonhost payloadonhost_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadonhost
    ADD CONSTRAINT payloadonhost_pkey PRIMARY KEY (id);


--
-- Name: payloadtype payloadtype_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadtype
    ADD CONSTRAINT payloadtype_pkey PRIMARY KEY (id);


--
-- Name: payloadtypec2profile payloadtypec2profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadtypec2profile
    ADD CONSTRAINT payloadtypec2profile_pkey PRIMARY KEY (id);


--
-- Name: response response_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response
    ADD CONSTRAINT response_pkey PRIMARY KEY (id);


--
-- Name: staginginfo staginginfo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staginginfo
    ADD CONSTRAINT staginginfo_pkey PRIMARY KEY (id);


--
-- Name: tag tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_pkey PRIMARY KEY (id);


--
-- Name: tagtype tagtype_name_operation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tagtype
    ADD CONSTRAINT tagtype_name_operation_id_key UNIQUE (name, operation_id);


--
-- Name: tagtype tagtype_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tagtype
    ADD CONSTRAINT tagtype_pkey PRIMARY KEY (id);


--
-- Name: task task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (id);


--
-- Name: taskartifact taskartifact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taskartifact
    ADD CONSTRAINT taskartifact_pkey PRIMARY KEY (id);


--
-- Name: token token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_pkey PRIMARY KEY (id);


--
-- Name: token token_token_id_host_operation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_token_id_host_operation_id_key UNIQUE (token_id, host, operation_id);


--
-- Name: translationcontainer translationcontainer_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translationcontainer
    ADD CONSTRAINT translationcontainer_name_key UNIQUE (name);


--
-- Name: translationcontainer translationcontainer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translationcontainer
    ADD CONSTRAINT translationcontainer_pkey PRIMARY KEY (id);


--
-- Name: wrappedpayloadtypes wrappedpayloadtypes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wrappedpayloadtypes
    ADD CONSTRAINT wrappedpayloadtypes_pkey PRIMARY KEY (id);


--
-- Name: active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX active ON public.callback USING btree (active);


--
-- Name: agentstorage_unique_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX agentstorage_unique_id ON public.agentstorage USING btree (unique_id);


--
-- Name: apitokens_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX apitokens_operator_id ON public.apitokens USING btree (operator_id);


--
-- Name: attack_t_num; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX attack_t_num ON public.attack USING btree (t_num);


--
-- Name: attackcommand_attack_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attackcommand_attack_id ON public.attackcommand USING btree (attack_id);


--
-- Name: attackcommand_command_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attackcommand_command_id ON public.attackcommand USING btree (command_id);


--
-- Name: attacktask_attack_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attacktask_attack_id ON public.attacktask USING btree (attack_id);


--
-- Name: attacktask_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attacktask_task_id ON public.attacktask USING btree (task_id);


--
-- Name: browserscript_command_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX browserscript_command_id ON public.browserscript USING btree (command_id);


--
-- Name: browserscript_command_id_operator_id_for_new_ui; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX browserscript_command_id_operator_id_for_new_ui ON public.browserscript USING btree (command_id, operator_id, for_new_ui);


--
-- Name: browserscript_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX browserscript_operator_id ON public.browserscript USING btree (operator_id);


--
-- Name: browserscript_payload_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX browserscript_payload_type_id ON public.browserscript USING btree (payload_type_id);


--
-- Name: browserscriptoperation_browserscript_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX browserscriptoperation_browserscript_id ON public.browserscriptoperation USING btree (browserscript_id);


--
-- Name: browserscriptoperation_browserscript_id_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX browserscriptoperation_browserscript_id_operation_id ON public.browserscriptoperation USING btree (browserscript_id, operation_id);


--
-- Name: browserscriptoperation_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX browserscriptoperation_operation_id ON public.browserscriptoperation USING btree (operation_id);


--
-- Name: buildparameter_payload_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX buildparameter_payload_type_id ON public.buildparameter USING btree (payload_type_id);


--
-- Name: buildparameterinstance_build_parameter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX buildparameterinstance_build_parameter_id ON public.buildparameterinstance USING btree (build_parameter_id);


--
-- Name: buildparameterinstance_enc_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX buildparameterinstance_enc_key ON public.buildparameterinstance USING btree (enc_key);


--
-- Name: buildparameterinstance_payload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX buildparameterinstance_payload_id ON public.buildparameterinstance USING btree (payload_id);


--
-- Name: c2profile_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX c2profile_name ON public.c2profile USING btree (name);


--
-- Name: c2profileparameters_c2_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX c2profileparameters_c2_profile_id ON public.c2profileparameters USING btree (c2_profile_id);


--
-- Name: c2profileparameters_c2_profile_id_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX c2profileparameters_c2_profile_id_name ON public.c2profileparameters USING btree (c2_profile_id, name);


--
-- Name: c2profileparametersinstance_c2_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX c2profileparametersinstance_c2_profile_id ON public.c2profileparametersinstance USING btree (c2_profile_id);


--
-- Name: c2profileparametersinstance_c2_profile_parameters_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX c2profileparametersinstance_c2_profile_parameters_id ON public.c2profileparametersinstance USING btree (c2_profile_parameters_id);


--
-- Name: c2profileparametersinstance_c2_profile_parameters_id_ins_93bb57; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX c2profileparametersinstance_c2_profile_parameters_id_ins_93bb57 ON public.c2profileparametersinstance USING btree (c2_profile_parameters_id, instance_name, operation_id);


--
-- Name: c2profileparametersinstance_c2_profile_parameters_id_payload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX c2profileparametersinstance_c2_profile_parameters_id_payload_id ON public.c2profileparametersinstance USING btree (c2_profile_parameters_id, payload_id);


--
-- Name: c2profileparametersinstance_callback_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX c2profileparametersinstance_callback_id ON public.c2profileparametersinstance USING btree (callback_id);


--
-- Name: c2profileparametersinstance_dec_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX c2profileparametersinstance_dec_key ON public.c2profileparametersinstance USING btree (dec_key);


--
-- Name: c2profileparametersinstance_enc_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX c2profileparametersinstance_enc_key ON public.c2profileparametersinstance USING btree (enc_key);


--
-- Name: c2profileparametersinstance_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX c2profileparametersinstance_operation_id ON public.c2profileparametersinstance USING btree (operation_id);


--
-- Name: c2profileparametersinstance_payload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX c2profileparametersinstance_payload_id ON public.c2profileparametersinstance USING btree (payload_id);


--
-- Name: callback_agent_callback_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX callback_agent_callback_id ON public.callback USING btree (agent_callback_id);


--
-- Name: callback_locked_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callback_locked_operator_id ON public.callback USING btree (locked_operator_id);


--
-- Name: callback_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callback_operation_id ON public.callback USING btree (operation_id);


--
-- Name: callback_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callback_operator_id ON public.callback USING btree (operator_id);


--
-- Name: callback_registered_payload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callback_registered_payload_id ON public.callback USING btree (registered_payload_id);


--
-- Name: callbackc2profiles_c2_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callbackc2profiles_c2_profile_id ON public.callbackc2profiles USING btree (c2_profile_id);


--
-- Name: callbackc2profiles_callback_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callbackc2profiles_callback_id ON public.callbackc2profiles USING btree (callback_id);


--
-- Name: callbackgraphedge_c2_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callbackgraphedge_c2_profile_id ON public.callbackgraphedge USING btree (c2_profile_id);


--
-- Name: callbackgraphedge_destination_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callbackgraphedge_destination_id ON public.callbackgraphedge USING btree (destination_id);


--
-- Name: callbackgraphedge_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callbackgraphedge_operation_id ON public.callbackgraphedge USING btree (operation_id);


--
-- Name: callbackgraphedge_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callbackgraphedge_source_id ON public.callbackgraphedge USING btree (source_id);


--
-- Name: callbackport_callback_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callbackport_callback_id ON public.callbackport USING btree (callback_id);


--
-- Name: callbacktoken_callback_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callbacktoken_callback_id ON public.callbacktoken USING btree (callback_id);


--
-- Name: callbacktoken_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callbacktoken_task_id ON public.callbacktoken USING btree (task_id);


--
-- Name: callbacktoken_token_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX callbacktoken_token_id ON public.callbacktoken USING btree (token_id);


--
-- Name: cmd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cmd ON public.command USING btree (cmd);


--
-- Name: command_cmd_payload_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX command_cmd_payload_type_id ON public.command USING btree (cmd, payload_type_id);


--
-- Name: command_payload_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX command_payload_type_id ON public.command USING btree (payload_type_id);


--
-- Name: commandparameters_command_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commandparameters_command_id ON public.commandparameters USING btree (command_id);


--
-- Name: commandparameters_command_id_name_parameter_group_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX commandparameters_command_id_name_parameter_group_name ON public.commandparameters USING btree (command_id, name, parameter_group_name);


--
-- Name: credential_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credential_operation_id ON public.credential USING btree (operation_id);


--
-- Name: credential_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credential_operator_id ON public.credential USING btree (operator_id);


--
-- Name: credential_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credential_task_id ON public.credential USING btree (task_id);


--
-- Name: deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deleted ON public.command USING btree (deleted);


--
-- Name: disabledcommandsprofile_command_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX disabledcommandsprofile_command_id ON public.disabledcommandsprofile USING btree (command_id);


--
-- Name: disabledcommandsprofile_command_id_name_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX disabledcommandsprofile_command_id_name_operation_id ON public.disabledcommandsprofile USING btree (command_id, name, operation_id);


--
-- Name: disabledcommandsprofile_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX disabledcommandsprofile_operation_id ON public.disabledcommandsprofile USING btree (operation_id);


--
-- Name: end_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX end_timestamp ON public.callbackgraphedge USING btree (end_timestamp);


--
-- Name: filemeta_agent_file_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX filemeta_agent_file_id ON public.filemeta USING btree (agent_file_id);


--
-- Name: filemeta_host; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX filemeta_host ON public.filemeta USING btree (host);


--
-- Name: filemeta_is_download_from_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX filemeta_is_download_from_agent ON public.filemeta USING btree (is_download_from_agent);


--
-- Name: filemeta_mythictree_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX filemeta_mythictree_id ON public.filemeta USING btree (mythictree_id);


--
-- Name: filemeta_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX filemeta_operation_id ON public.filemeta USING btree (operation_id);


--
-- Name: filemeta_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX filemeta_operator_id ON public.filemeta USING btree (operator_id);


--
-- Name: filemeta_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX filemeta_task_id ON public.filemeta USING btree (task_id);


--
-- Name: keylog_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX keylog_operation_id ON public.keylog USING btree (operation_id);


--
-- Name: keylog_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX keylog_task_id ON public.keylog USING btree (task_id);


--
-- Name: loadedcommands_callback_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loadedcommands_callback_id ON public.loadedcommands USING btree (callback_id);


--
-- Name: loadedcommands_command_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loadedcommands_command_id ON public.loadedcommands USING btree (command_id);


--
-- Name: loadedcommands_command_id_callback_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX loadedcommands_command_id_callback_id ON public.loadedcommands USING btree (command_id, callback_id);


--
-- Name: loadedcommands_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loadedcommands_operator_id ON public.loadedcommands USING btree (operator_id);


--
-- Name: mythictree_host; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mythictree_host ON public.mythictree USING btree (host);


--
-- Name: mythictree_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mythictree_name ON public.mythictree USING btree (name);


--
-- Name: mythictree_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mythictree_operation_id ON public.mythictree USING btree (operation_id);


--
-- Name: mythictree_parent_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mythictree_parent_path ON public.mythictree USING btree (parent_path);


--
-- Name: mythictree_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mythictree_task_id ON public.mythictree USING btree (task_id);


--
-- Name: mythictree_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mythictree_timestamp ON public.mythictree USING btree ("timestamp");


--
-- Name: mythictree_tree_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mythictree_tree_type ON public.mythictree USING btree (tree_type);


--
-- Name: operation_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operation_admin_id ON public.operation USING btree (admin_id);


--
-- Name: operation_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX operation_name ON public.operation USING btree (name);


--
-- Name: operationeventlog_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operationeventlog_deleted ON public.operationeventlog USING btree (deleted);


--
-- Name: operationeventlog_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operationeventlog_level ON public.operationeventlog USING btree (level);


--
-- Name: operationeventlog_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operationeventlog_operation_id ON public.operationeventlog USING btree (operation_id);


--
-- Name: operationeventlog_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operationeventlog_operator_id ON public.operationeventlog USING btree (operator_id);


--
-- Name: operationeventlog_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operationeventlog_timestamp ON public.operationeventlog USING btree ("timestamp");


--
-- Name: operator_current_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operator_current_operation_id ON public.operator USING btree (current_operation_id);


--
-- Name: operator_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX operator_username ON public.operator USING btree (username);


--
-- Name: operatoroperation_base_disabled_commands_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operatoroperation_base_disabled_commands_id ON public.operatoroperation USING btree (base_disabled_commands_id);


--
-- Name: operatoroperation_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operatoroperation_operation_id ON public.operatoroperation USING btree (operation_id);


--
-- Name: operatoroperation_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operatoroperation_operator_id ON public.operatoroperation USING btree (operator_id);


--
-- Name: operatoroperation_operator_id_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX operatoroperation_operator_id_operation_id ON public.operatoroperation USING btree (operator_id, operation_id);


--
-- Name: payload_build_step_end_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_build_step_end_time ON public.payload_build_step USING btree (end_time);


--
-- Name: payload_build_step_step_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_build_step_step_number ON public.payload_build_step USING btree (step_number);


--
-- Name: payload_file_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_file_id ON public.payload USING btree (file_id);


--
-- Name: payload_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_operation_id ON public.payload USING btree (operation_id);


--
-- Name: payload_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_operator_id ON public.payload USING btree (operator_id);


--
-- Name: payload_payload_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_payload_type_id ON public.payload USING btree (payload_type_id);


--
-- Name: payload_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_task_id ON public.payload USING btree (task_id);


--
-- Name: payload_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payload_uuid ON public.payload USING btree (uuid);


--
-- Name: payload_wrapped_payload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_wrapped_payload_id ON public.payload USING btree (wrapped_payload_id);


--
-- Name: payloadc2profiles_c2_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payloadc2profiles_c2_profile_id ON public.payloadc2profiles USING btree (c2_profile_id);


--
-- Name: payloadc2profiles_payload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payloadc2profiles_payload_id ON public.payloadc2profiles USING btree (payload_id);


--
-- Name: payloadcommand_command_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payloadcommand_command_id ON public.payloadcommand USING btree (command_id);


--
-- Name: payloadcommand_payload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payloadcommand_payload_id ON public.payloadcommand USING btree (payload_id);


--
-- Name: payloadcommand_payload_id_command_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payloadcommand_payload_id_command_id ON public.payloadcommand USING btree (payload_id, command_id);


--
-- Name: payloadonhost_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payloadonhost_operation_id ON public.payloadonhost USING btree (operation_id);


--
-- Name: payloadonhost_payload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payloadonhost_payload_id ON public.payloadonhost USING btree (payload_id);


--
-- Name: payloadonhost_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payloadonhost_task_id ON public.payloadonhost USING btree (task_id);


--
-- Name: payloadtype_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payloadtype_deleted ON public.payloadtype USING btree (deleted);


--
-- Name: payloadtype_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payloadtype_name ON public.payloadtype USING btree (name);


--
-- Name: payloadtype_translation_container_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payloadtype_translation_container_id ON public.payloadtype USING btree (translation_container_id);


--
-- Name: payloadtypec2profile_c2_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payloadtypec2profile_c2_profile_id ON public.payloadtypec2profile USING btree (c2_profile_id);


--
-- Name: payloadtypec2profile_payload_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payloadtypec2profile_payload_type_id ON public.payloadtypec2profile USING btree (payload_type_id);


--
-- Name: payloadtypec2profile_payload_type_id_c2_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payloadtypec2profile_payload_type_id_c2_profile_id ON public.payloadtypec2profile USING btree (payload_type_id, c2_profile_id);


--
-- Name: resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resolved ON public.operationeventlog USING btree (resolved);


--
-- Name: response_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX response_task_id ON public.response USING btree (task_id);


--
-- Name: staginginfo_payload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX staginginfo_payload_id ON public.staginginfo USING btree (payload_id);


--
-- Name: staginginfo_staging_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX staginginfo_staging_uuid ON public.staginginfo USING btree (staging_uuid);


--
-- Name: start_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX start_timestamp ON public.callbackgraphedge USING btree (start_timestamp);

--
-- Name: tag_filemeta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tag_filemeta_id ON public.tag USING btree (filemeta_id);


--
-- Name: tag_mythictree_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tag_mythictree_id ON public.tag USING btree (mythictree_id);


--
-- Name: tag_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tag_operation_id ON public.tag USING btree (operation_id);


--
-- Name: tag_tagtype_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tag_tagtype_id ON public.tag USING btree (tagtype_id);


--
-- Name: tag_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tag_task_id ON public.tag USING btree (task_id);


--
-- Name: tagtype_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tagtype_operation_id ON public.tagtype USING btree (operation_id);


--
-- Name: task_agent_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX task_agent_task_id ON public.task USING btree (agent_task_id);


--
-- Name: task_callback_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_callback_id ON public.task USING btree (callback_id);


--
-- Name: task_command_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_command_id ON public.task USING btree (command_id);


--
-- Name: task_comment_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_comment_operator_id ON public.task USING btree (comment_operator_id);


--
-- Name: task_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_operator_id ON public.task USING btree (operator_id);


--
-- Name: task_opsec_post_bypass_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_opsec_post_bypass_user_id ON public.task USING btree (opsec_post_bypass_user_id);


--
-- Name: task_opsec_pre_bypass_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_opsec_pre_bypass_user_id ON public.task USING btree (opsec_pre_bypass_user_id);


--
-- Name: task_parent_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_parent_task_id ON public.task USING btree (parent_task_id);


--
-- Name: task_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_timestamp ON public.task USING btree ("timestamp");


--
-- Name: task_token_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_token_id ON public.task USING btree (token_id);


--
-- Name: taskartifact_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX taskartifact_operation_id ON public.taskartifact USING btree (operation_id);


--
-- Name: taskartifact_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX taskartifact_task_id ON public.taskartifact USING btree (task_id);


--
-- Name: token_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX token_operation_id ON public.token USING btree (operation_id);


--
-- Name: token_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX token_task_id ON public.token USING btree (task_id);


--
-- Name: translationcontainer_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX translationcontainer_name ON public.translationcontainer USING btree (name);


--
-- Name: user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user" ON public.keylog USING btree ("user");


--
-- Name: window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "window" ON public.keylog USING btree ("window");


--
-- Name: wrappedpayloadtypes_wrapped_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wrappedpayloadtypes_wrapped_id ON public.wrappedpayloadtypes USING btree (wrapped_id);


--
-- Name: wrappedpayloadtypes_wrapper_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wrappedpayloadtypes_wrapper_id ON public.wrappedpayloadtypes USING btree (wrapper_id);


--
-- Name: callback new_callback_display_id_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER new_callback_display_id_trigger BEFORE INSERT ON public.callback FOR EACH ROW EXECUTE FUNCTION public.new_callback_display_id();


--
-- Name: loadedcommands new_default_callback_command_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER new_default_callback_command_version BEFORE INSERT ON public.loadedcommands FOR EACH ROW EXECUTE FUNCTION public.default_payload_command_version();


--
-- Name: payloadcommand new_default_payload_command_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER new_default_payload_command_version BEFORE INSERT ON public.payloadcommand FOR EACH ROW EXECUTE FUNCTION public.default_payload_command_version();


--
-- Name: task new_task_display_id_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER new_task_display_id_trigger BEFORE INSERT ON public.task FOR EACH ROW EXECUTE FUNCTION public.new_task_display_id();


--
-- Name: payload_build_step payload_update_timestamp_on_all_build_updates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payload_update_timestamp_on_all_build_updates AFTER UPDATE ON public.payload_build_step FOR EACH ROW EXECUTE FUNCTION public.payload_update_timestamp_on_all_build_updates();


--
-- Name: response response_update_task_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER response_update_task_timestamp AFTER INSERT ON public.response FOR EACH ROW EXECUTE FUNCTION public.response_update_task_timestamp();


--
-- Name: callback set_public_callback_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_public_callback_timestamp BEFORE UPDATE ON public.callback FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp();


--
-- Name: payload set_public_payload_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_public_payload_timestamp BEFORE UPDATE ON public.payload FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp();


--
-- Name: tag tag_update_linked_table; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tag_update_linked_table AFTER INSERT OR DELETE ON public.tag FOR EACH ROW EXECUTE FUNCTION public.tag_update_linked_table();


--
-- Name: task task_update_timestamp_on_all_updates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_update_timestamp_on_all_updates BEFORE UPDATE ON public.task FOR EACH ROW EXECUTE FUNCTION public.task_update_timestamp_on_all_updates();


--
-- Name: mythictree update_mythictree_timestamp_on_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mythictree_timestamp_on_update BEFORE UPDATE ON public.mythictree FOR EACH ROW EXECUTE FUNCTION public.update_mythictree_timestamp_on_update();


--
-- Name: operationeventlog update_operation_alert_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_operation_alert_count_trigger AFTER INSERT OR UPDATE ON public.operationeventlog FOR EACH ROW EXECUTE FUNCTION public.update_operation_alert_count();


--
-- Name: response update_task_response_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_task_response_count_trigger AFTER INSERT ON public.response FOR EACH ROW EXECUTE FUNCTION public.update_task_response_count();


--
-- Name: apitokens apitokens_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apitokens
    ADD CONSTRAINT apitokens_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: attackcommand attackcommand_attack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attackcommand
    ADD CONSTRAINT attackcommand_attack_id_fkey FOREIGN KEY (attack_id) REFERENCES public.attack(id) ON DELETE CASCADE;


--
-- Name: attackcommand attackcommand_command_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attackcommand
    ADD CONSTRAINT attackcommand_command_id_fkey FOREIGN KEY (command_id) REFERENCES public.command(id) ON DELETE CASCADE;


--
-- Name: attacktask attacktask_attack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attacktask
    ADD CONSTRAINT attacktask_attack_id_fkey FOREIGN KEY (attack_id) REFERENCES public.attack(id) ON DELETE CASCADE;


--
-- Name: attacktask attacktask_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attacktask
    ADD CONSTRAINT attacktask_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id) ON DELETE CASCADE;


--
-- Name: browserscript browserscript_command_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.browserscript
    ADD CONSTRAINT browserscript_command_id_fkey FOREIGN KEY (command_id) REFERENCES public.command(id) ON DELETE CASCADE;


--
-- Name: browserscript browserscript_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.browserscript
    ADD CONSTRAINT browserscript_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: browserscript browserscript_payload_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.browserscript
    ADD CONSTRAINT browserscript_payload_type_id_fkey FOREIGN KEY (payload_type_id) REFERENCES public.payloadtype(id) ON DELETE CASCADE;


--
-- Name: browserscriptoperation browserscriptoperation_browserscript_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.browserscriptoperation
    ADD CONSTRAINT browserscriptoperation_browserscript_id_fkey FOREIGN KEY (browserscript_id) REFERENCES public.browserscript(id) ON DELETE CASCADE;


--
-- Name: browserscriptoperation browserscriptoperation_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.browserscriptoperation
    ADD CONSTRAINT browserscriptoperation_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: buildparameter buildparameter_payload_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildparameter
    ADD CONSTRAINT buildparameter_payload_type_id_fkey FOREIGN KEY (payload_type_id) REFERENCES public.payloadtype(id) ON DELETE CASCADE;


--
-- Name: buildparameterinstance buildparameterinstance_build_parameter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildparameterinstance
    ADD CONSTRAINT buildparameterinstance_build_parameter_id_fkey FOREIGN KEY (build_parameter_id) REFERENCES public.buildparameter(id) ON DELETE CASCADE;


--
-- Name: buildparameterinstance buildparameterinstance_payload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildparameterinstance
    ADD CONSTRAINT buildparameterinstance_payload_id_fkey FOREIGN KEY (payload_id) REFERENCES public.payload(id) ON DELETE CASCADE;


--
-- Name: c2profileparameters c2profileparameters_c2_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c2profileparameters
    ADD CONSTRAINT c2profileparameters_c2_profile_id_fkey FOREIGN KEY (c2_profile_id) REFERENCES public.c2profile(id) ON DELETE CASCADE;


--
-- Name: c2profileparametersinstance c2profileparametersinstance_c2_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c2profileparametersinstance
    ADD CONSTRAINT c2profileparametersinstance_c2_profile_id_fkey FOREIGN KEY (c2_profile_id) REFERENCES public.c2profile(id) ON DELETE CASCADE;


--
-- Name: c2profileparametersinstance c2profileparametersinstance_c2_profile_parameters_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c2profileparametersinstance
    ADD CONSTRAINT c2profileparametersinstance_c2_profile_parameters_id_fkey FOREIGN KEY (c2_profile_parameters_id) REFERENCES public.c2profileparameters(id) ON DELETE CASCADE;


--
-- Name: c2profileparametersinstance c2profileparametersinstance_callback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c2profileparametersinstance
    ADD CONSTRAINT c2profileparametersinstance_callback_id_fkey FOREIGN KEY (callback_id) REFERENCES public.callback(id) ON DELETE CASCADE;


--
-- Name: c2profileparametersinstance c2profileparametersinstance_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c2profileparametersinstance
    ADD CONSTRAINT c2profileparametersinstance_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: c2profileparametersinstance c2profileparametersinstance_payload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c2profileparametersinstance
    ADD CONSTRAINT c2profileparametersinstance_payload_id_fkey FOREIGN KEY (payload_id) REFERENCES public.payload(id) ON DELETE CASCADE;


--
-- Name: callback callback_locked_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callback
    ADD CONSTRAINT callback_locked_operator_id_fkey FOREIGN KEY (locked_operator_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: callback callback_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callback
    ADD CONSTRAINT callback_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: callback callback_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callback
    ADD CONSTRAINT callback_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: callback callback_registered_payload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callback
    ADD CONSTRAINT callback_registered_payload_id_fkey FOREIGN KEY (registered_payload_id) REFERENCES public.payload(id) ON DELETE CASCADE;


--
-- Name: callbackc2profiles callbackc2profiles_c2_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackc2profiles
    ADD CONSTRAINT callbackc2profiles_c2_profile_id_fkey FOREIGN KEY (c2_profile_id) REFERENCES public.c2profile(id) ON DELETE CASCADE;


--
-- Name: callbackc2profiles callbackc2profiles_callback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackc2profiles
    ADD CONSTRAINT callbackc2profiles_callback_id_fkey FOREIGN KEY (callback_id) REFERENCES public.callback(id) ON DELETE CASCADE;


--
-- Name: callbackgraphedge callbackgraphedge_c2_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackgraphedge
    ADD CONSTRAINT callbackgraphedge_c2_profile_id_fkey FOREIGN KEY (c2_profile_id) REFERENCES public.c2profile(id) ON DELETE CASCADE;


--
-- Name: callbackgraphedge callbackgraphedge_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackgraphedge
    ADD CONSTRAINT callbackgraphedge_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.callback(id) ON DELETE CASCADE;


--
-- Name: callbackgraphedge callbackgraphedge_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackgraphedge
    ADD CONSTRAINT callbackgraphedge_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: callbackgraphedge callbackgraphedge_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackgraphedge
    ADD CONSTRAINT callbackgraphedge_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.callback(id) ON DELETE CASCADE;


--
-- Name: callbackport callbackport_callback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackport
    ADD CONSTRAINT callbackport_callback_id_fkey FOREIGN KEY (callback_id) REFERENCES public.callback(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: callbackport callbackport_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackport
    ADD CONSTRAINT callbackport_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: callbackport callbackport_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbackport
    ADD CONSTRAINT callbackport_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: callbacktoken callbacktoken_callback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbacktoken
    ADD CONSTRAINT callbacktoken_callback_id_fkey FOREIGN KEY (callback_id) REFERENCES public.callback(id) ON DELETE CASCADE;


--
-- Name: callbacktoken callbacktoken_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbacktoken
    ADD CONSTRAINT callbacktoken_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id) ON DELETE CASCADE;


--
-- Name: callbacktoken callbacktoken_token_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbacktoken
    ADD CONSTRAINT callbacktoken_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.token(id) ON DELETE CASCADE;


--
-- Name: command command_payload_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command
    ADD CONSTRAINT command_payload_type_id_fkey FOREIGN KEY (payload_type_id) REFERENCES public.payloadtype(id) ON DELETE CASCADE;


--
-- Name: commandparameters commandparameters_command_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commandparameters
    ADD CONSTRAINT commandparameters_command_id_fkey FOREIGN KEY (command_id) REFERENCES public.command(id) ON DELETE CASCADE;


--
-- Name: credential credential_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credential
    ADD CONSTRAINT credential_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: credential credential_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credential
    ADD CONSTRAINT credential_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: credential credential_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credential
    ADD CONSTRAINT credential_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id) ON DELETE CASCADE;


--
-- Name: disabledcommandsprofile disabledcommandsprofile_command_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disabledcommandsprofile
    ADD CONSTRAINT disabledcommandsprofile_command_id_fkey FOREIGN KEY (command_id) REFERENCES public.command(id) ON DELETE CASCADE;


--
-- Name: disabledcommandsprofile disabledcommandsprofile_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disabledcommandsprofile
    ADD CONSTRAINT disabledcommandsprofile_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: filemeta filemeta_mythictree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filemeta
    ADD CONSTRAINT filemeta_mythictree_id_fkey FOREIGN KEY (mythictree_id) REFERENCES public.mythictree(id) ON DELETE CASCADE;


--
-- Name: filemeta filemeta_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filemeta
    ADD CONSTRAINT filemeta_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: filemeta filemeta_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filemeta
    ADD CONSTRAINT filemeta_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: filemeta filemeta_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filemeta
    ADD CONSTRAINT filemeta_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id) ON DELETE CASCADE;


--
-- Name: operator fk_operator_current_operation_id_refs_operation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operator
    ADD CONSTRAINT fk_operator_current_operation_id_refs_operation FOREIGN KEY (current_operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: payload fk_payload_file_id_refs_filemeta; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload
    ADD CONSTRAINT fk_payload_file_id_refs_filemeta FOREIGN KEY (file_id) REFERENCES public.filemeta(id) ON DELETE CASCADE;


--
-- Name: payload fk_payload_task_id_refs_task; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload
    ADD CONSTRAINT fk_payload_task_id_refs_task FOREIGN KEY (task_id) REFERENCES public.task(id) ON DELETE CASCADE;


--
-- Name: payloadonhost fk_payloadonhost_task_id_refs_task; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadonhost
    ADD CONSTRAINT fk_payloadonhost_task_id_refs_task FOREIGN KEY (task_id) REFERENCES public.task(id) ON DELETE CASCADE;


--
-- Name: task fk_task_token_id_refs_token; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT fk_task_token_id_refs_token FOREIGN KEY (token_id) REFERENCES public.token(id) ON DELETE CASCADE;


--
-- Name: keylog keylog_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keylog
    ADD CONSTRAINT keylog_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: keylog keylog_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keylog
    ADD CONSTRAINT keylog_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id) ON DELETE CASCADE;


--
-- Name: loadedcommands loadedcommands_callback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loadedcommands
    ADD CONSTRAINT loadedcommands_callback_id_fkey FOREIGN KEY (callback_id) REFERENCES public.callback(id) ON DELETE CASCADE;


--
-- Name: loadedcommands loadedcommands_command_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loadedcommands
    ADD CONSTRAINT loadedcommands_command_id_fkey FOREIGN KEY (command_id) REFERENCES public.command(id) ON DELETE CASCADE;


--
-- Name: loadedcommands loadedcommands_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loadedcommands
    ADD CONSTRAINT loadedcommands_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: mythictree mythictree_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mythictree
    ADD CONSTRAINT mythictree_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: mythictree mythictree_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mythictree
    ADD CONSTRAINT mythictree_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id) ON DELETE CASCADE;


--
-- Name: operation operation_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation
    ADD CONSTRAINT operation_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: operationeventlog operationeventlog_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operationeventlog
    ADD CONSTRAINT operationeventlog_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: operationeventlog operationeventlog_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operationeventlog
    ADD CONSTRAINT operationeventlog_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: operatoroperation operatoroperation_base_disabled_commands_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operatoroperation
    ADD CONSTRAINT operatoroperation_base_disabled_commands_id_fkey FOREIGN KEY (base_disabled_commands_id) REFERENCES public.disabledcommandsprofile(id) ON DELETE CASCADE;


--
-- Name: operatoroperation operatoroperation_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operatoroperation
    ADD CONSTRAINT operatoroperation_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: operatoroperation operatoroperation_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operatoroperation
    ADD CONSTRAINT operatoroperation_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: payload_build_step payload_build_step_payload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_build_step
    ADD CONSTRAINT payload_build_step_payload_id_fkey FOREIGN KEY (payload_id) REFERENCES public.payload(id) ON DELETE CASCADE;


--
-- Name: payload_build_step payload_build_step_payloadtype_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_build_step
    ADD CONSTRAINT payload_build_step_payloadtype_id_fkey FOREIGN KEY (payloadtype_id) REFERENCES public.payloadtype(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payload payload_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload
    ADD CONSTRAINT payload_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: payload payload_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload
    ADD CONSTRAINT payload_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: payload payload_payload_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload
    ADD CONSTRAINT payload_payload_type_id_fkey FOREIGN KEY (payload_type_id) REFERENCES public.payloadtype(id) ON DELETE CASCADE;


--
-- Name: payload payload_wrapped_payload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload
    ADD CONSTRAINT payload_wrapped_payload_id_fkey FOREIGN KEY (wrapped_payload_id) REFERENCES public.payload(id) ON DELETE CASCADE;


--
-- Name: payloadc2profiles payloadc2profiles_c2_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadc2profiles
    ADD CONSTRAINT payloadc2profiles_c2_profile_id_fkey FOREIGN KEY (c2_profile_id) REFERENCES public.c2profile(id) ON DELETE CASCADE;


--
-- Name: payloadc2profiles payloadc2profiles_payload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadc2profiles
    ADD CONSTRAINT payloadc2profiles_payload_id_fkey FOREIGN KEY (payload_id) REFERENCES public.payload(id) ON DELETE CASCADE;


--
-- Name: payloadcommand payloadcommand_command_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadcommand
    ADD CONSTRAINT payloadcommand_command_id_fkey FOREIGN KEY (command_id) REFERENCES public.command(id) ON DELETE CASCADE;


--
-- Name: payloadcommand payloadcommand_payload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadcommand
    ADD CONSTRAINT payloadcommand_payload_id_fkey FOREIGN KEY (payload_id) REFERENCES public.payload(id) ON DELETE CASCADE;


--
-- Name: payloadonhost payloadonhost_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadonhost
    ADD CONSTRAINT payloadonhost_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: payloadonhost payloadonhost_payload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadonhost
    ADD CONSTRAINT payloadonhost_payload_id_fkey FOREIGN KEY (payload_id) REFERENCES public.payload(id) ON DELETE CASCADE;


--
-- Name: payloadtype payloadtype_translation_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadtype
    ADD CONSTRAINT payloadtype_translation_container_id_fkey FOREIGN KEY (translation_container_id) REFERENCES public.translationcontainer(id) ON DELETE CASCADE;


--
-- Name: payloadtypec2profile payloadtypec2profile_c2_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadtypec2profile
    ADD CONSTRAINT payloadtypec2profile_c2_profile_id_fkey FOREIGN KEY (c2_profile_id) REFERENCES public.c2profile(id) ON DELETE CASCADE;


--
-- Name: payloadtypec2profile payloadtypec2profile_payload_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payloadtypec2profile
    ADD CONSTRAINT payloadtypec2profile_payload_type_id_fkey FOREIGN KEY (payload_type_id) REFERENCES public.payloadtype(id) ON DELETE CASCADE;


--
-- Name: response response_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response
    ADD CONSTRAINT response_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: response response_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response
    ADD CONSTRAINT response_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id) ON DELETE CASCADE;


--
-- Name: staginginfo staginginfo_payload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staginginfo
    ADD CONSTRAINT staginginfo_payload_id_fkey FOREIGN KEY (payload_id) REFERENCES public.payload(id) ON DELETE CASCADE;


--
-- Name: tag tag_credential_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_credential_id_fkey FOREIGN KEY (credential_id) REFERENCES public.credential(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tag tag_filemeta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_filemeta_id_fkey FOREIGN KEY (filemeta_id) REFERENCES public.filemeta(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tag tag_keylog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_keylog_id_fkey FOREIGN KEY (keylog_id) REFERENCES public.keylog(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tag tag_mythictree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_mythictree_id_fkey FOREIGN KEY (mythictree_id) REFERENCES public.mythictree(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tag tag_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tag tag_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.response(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tag tag_tagtype_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_tagtype_id_fkey FOREIGN KEY (tagtype_id) REFERENCES public.tagtype(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tag tag_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tag tag_taskartifact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_taskartifact_id_fkey FOREIGN KEY (taskartifact_id) REFERENCES public.taskartifact(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tagtype tagtype_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tagtype
    ADD CONSTRAINT tagtype_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: task task_callback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_callback_id_fkey FOREIGN KEY (callback_id) REFERENCES public.callback(id) ON DELETE CASCADE;


--
-- Name: task task_command_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_command_id_fkey FOREIGN KEY (command_id) REFERENCES public.command(id) ON DELETE CASCADE;


--
-- Name: task task_comment_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_comment_operator_id_fkey FOREIGN KEY (comment_operator_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: task task_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: task task_opsec_post_bypass_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_opsec_post_bypass_user_id_fkey FOREIGN KEY (opsec_post_bypass_user_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: task task_opsec_pre_bypass_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_opsec_pre_bypass_user_id_fkey FOREIGN KEY (opsec_pre_bypass_user_id) REFERENCES public.operator(id) ON DELETE CASCADE;


--
-- Name: task task_parent_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.task(id) ON DELETE CASCADE;


--
-- Name: taskartifact taskartifact_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taskartifact
    ADD CONSTRAINT taskartifact_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operation(id) ON DELETE CASCADE;


--
-- Name: taskartifact taskartifact_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taskartifact
    ADD CONSTRAINT taskartifact_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id) ON DELETE CASCADE;


--
-- Name: token token_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id) ON DELETE CASCADE;


--
-- Name: wrappedpayloadtypes wrappedpayloadtypes_wrapped_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wrappedpayloadtypes
    ADD CONSTRAINT wrappedpayloadtypes_wrapped_id_fkey FOREIGN KEY (wrapped_id) REFERENCES public.payloadtype(id) ON DELETE CASCADE;


--
-- Name: wrappedpayloadtypes wrappedpayloadtypes_wrapper_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wrappedpayloadtypes
    ADD CONSTRAINT wrappedpayloadtypes_wrapper_id_fkey FOREIGN KEY (wrapper_id) REFERENCES public.payloadtype(id) ON DELETE CASCADE;

CREATE EXTENSION pg_stat_statements SCHEMA public;

--
-- PostgreSQL database dump complete
--

-- 
-- bash-5.0# pg_dump -U mythic_user --schema-only -n public --no-owner --no-security-labels --create --no-comments --no-publications  mythic_db
-- CREATE EXTENSION pg_stat_statements SCHEMA public;
--
`
