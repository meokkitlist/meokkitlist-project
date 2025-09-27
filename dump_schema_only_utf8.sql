--
-- PostgreSQL database dump
--

\restrict uhafDZM80j6jEPkeoYgTXpKpoRQca9AaMpGl8r7tWQCKwfBVlxzcFb8DXp5KEvZ

-- Dumped from database version 17.6 (Debian 17.6-1.pgdg12+1)
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: restaurant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant (
    id integer NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    lat double precision,
    lon double precision,
    keywords text,
    review_count integer DEFAULT 0 NOT NULL,
    total_score double precision DEFAULT '0'::double precision NOT NULL,
    naver_score double precision DEFAULT '0'::double precision NOT NULL,
    preview text,
    url text,
    review text,
    sentiment_score double precision DEFAULT '0'::double precision NOT NULL
);


--
-- Name: restaurant_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.restaurant_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: restaurant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.restaurant_id_seq OWNED BY public.restaurant.id;


--
-- Name: review; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review (
    id integer NOT NULL,
    text text NOT NULL,
    restaurant_id integer NOT NULL,
    user_id text,
    source text NOT NULL,
    sentiment text,
    score integer,
    emoji text,
    percent integer,
    raw text
);


--
-- Name: review_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.review_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: review_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.review_id_seq OWNED BY public.review.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(120) NOT NULL,
    "passwordHash" character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: restaurant id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant ALTER COLUMN id SET DEFAULT nextval('public.restaurant_id_seq'::regclass);


--
-- Name: review id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review ALTER COLUMN id SET DEFAULT nextval('public.review_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: review PK_2e4299a343a81574217255c00ca; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review
    ADD CONSTRAINT "PK_2e4299a343a81574217255c00ca" PRIMARY KEY (id);


--
-- Name: restaurant PK_649e250d8b8165cb406d99aa30f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant
    ADD CONSTRAINT "PK_649e250d8b8165cb406d99aa30f" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: IDX_97672ac88f789774dd47f7c8be; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON public.users USING btree (email);


--
-- Name: idx_restaurant_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurant_name ON public.restaurant USING btree (name);


--
-- Name: idx_restaurant_review_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurant_review_count ON public.restaurant USING btree (review_count);


--
-- Name: idx_review_restaurant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_restaurant_id ON public.review USING btree (restaurant_id);


--
-- Name: idx_review_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_source ON public.review USING btree (source);


--
-- Name: review FK_9e0a456057cd16f910bfad306ad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review
    ADD CONSTRAINT "FK_9e0a456057cd16f910bfad306ad" FOREIGN KEY (restaurant_id) REFERENCES public.restaurant(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict uhafDZM80j6jEPkeoYgTXpKpoRQca9AaMpGl8r7tWQCKwfBVlxzcFb8DXp5KEvZ

