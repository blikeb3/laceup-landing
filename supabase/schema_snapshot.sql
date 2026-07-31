-- LaceUP schema snapshot (generated via Supabase Management API)
-- Project: xnbbgmkywspodwdrlzhq
-- Server: PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit
--
-- Read-only snapshot of the live database for version control.
-- NOT a migration: do not apply with db push; objects already exist.

-- ============================================
-- EXTENSIONS (reference)
-- ============================================

-- hypopg v1.4.1

-- index_advisor v0.2.0

-- pg_stat_statements v1.11

-- pgcrypto v1.3

-- plpgsql v1.0

-- supabase_vault v0.3.1

-- uuid-ossp v1.1


-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'athlete', 'mentor', 'employer');

CREATE TYPE public.badge_type AS ENUM ('FOUNDING_MEMBER');

CREATE TYPE public.feedback_status AS ENUM ('NEW', 'REVIEWED', 'RESOLVED');

CREATE TYPE public.referral_status AS ENUM ('sent', 'bounced', 'accepted');


-- ============================================
-- TABLES
-- ============================================

CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(100) NOT NULL,
  description text,
  icon character varying(50) DEFAULT 'â­'::character varying,
  color_bg character varying(50) DEFAULT 'bg-amber-100'::character varying,
  color_text character varying(50) DEFAULT 'text-amber-800'::character varying,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  image_url text
);

CREATE TABLE public.connection_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connected_user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.endorsements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  endorser_id uuid NOT NULL,
  endorsed_user_id uuid NOT NULL,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  context_url text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  status feedback_status DEFAULT 'NEW'::feedback_status
);

CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.group_message_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.group_message_reads (
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.group_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  thread_name text,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  image_url text,
  file_url text,
  file_name text,
  file_type text,
  created_at timestamp with time zone DEFAULT now(),
  is_system_message boolean DEFAULT false,
  system_message_type text,
  status text DEFAULT 'sent'::text
);

CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  image_url text,
  file_url text,
  file_name text,
  file_type text,
  read_at timestamp with time zone,
  status text DEFAULT 'sent'::text
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type character varying(50) NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE public.opportunities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  posted_by uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  company_name text NOT NULL,
  location text,
  location_type text,
  employment_level text,
  career_interest text,
  description text NOT NULL,
  requirements text[],
  compensation text,
  mentorship_slots integer,
  application_deadline timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_logo_url text
);

CREATE TABLE public.opportunity_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL,
  applicant_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  cover_letter text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.post_bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.post_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.post_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  media_url text,
  media_type text,
  scheduled_at timestamp with time zone,
  published_at timestamp with time zone DEFAULT now(),
  is_published boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.preapproved_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  approved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.profile_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  viewer_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  biography text,
  location text,
  about text,
  skills text[],
  avatar_url text,
  approval_status text NOT NULL DEFAULT 'approved'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  phone text,
  university text,
  sport text,
  athletic_accomplishments text,
  academic_accomplishments text,
  contact_privacy text DEFAULT 'connections'::text,
  first_name text,
  last_name text,
  resume_url text,
  job_experiences jsonb,
  degrees jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_email text NOT NULL,
  invited_name text,
  message text,
  status referral_status NOT NULL DEFAULT 'sent'::referral_status,
  token text NOT NULL,
  provider_message_id text,
  sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  accepted_at timestamp with time zone,
  accepted_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.resource_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL,
  user_id uuid NOT NULL,
  clicked_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.resources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  url text NOT NULL,
  category text NOT NULL,
  content_type text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  logo_url text,
  is_featured boolean DEFAULT false
);

CREATE TABLE public.role_change_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  "current_role" text NOT NULL,
  requested_role text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.typing_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id text NOT NULL,
  started_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  badge_id uuid
);

CREATE TABLE public.user_hidden_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid NOT NULL,
  hidden_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_mfa_backup_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'user'::app_role,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_security_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);


-- ============================================
-- CONSTRAINTS (PK, UNIQUE, CHECK, FK)
-- ============================================

ALTER TABLE public.badges ADD CONSTRAINT badges_pkey PRIMARY KEY (id);

ALTER TABLE public.connection_requests ADD CONSTRAINT connection_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.connections ADD CONSTRAINT connections_pkey PRIMARY KEY (id);

ALTER TABLE public.endorsements ADD CONSTRAINT endorsements_pkey PRIMARY KEY (id);

ALTER TABLE public.feedback ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);

ALTER TABLE public.group_members ADD CONSTRAINT group_members_pkey PRIMARY KEY (id);

ALTER TABLE public.group_message_members ADD CONSTRAINT group_message_members_pkey PRIMARY KEY (id);

ALTER TABLE public.group_message_reads ADD CONSTRAINT group_message_reads_pkey PRIMARY KEY (message_id, user_id);

ALTER TABLE public.group_messages ADD CONSTRAINT group_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.groups ADD CONSTRAINT groups_pkey PRIMARY KEY (id);

ALTER TABLE public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);

ALTER TABLE public.opportunity_applications ADD CONSTRAINT opportunity_applications_pkey PRIMARY KEY (id);

ALTER TABLE public.post_bookmarks ADD CONSTRAINT post_bookmarks_pkey PRIMARY KEY (id);

ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_pkey PRIMARY KEY (id);

ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_pkey PRIMARY KEY (id);

ALTER TABLE public.post_media ADD CONSTRAINT post_media_pkey PRIMARY KEY (id);

ALTER TABLE public.post_shares ADD CONSTRAINT post_shares_pkey PRIMARY KEY (id);

ALTER TABLE public.posts ADD CONSTRAINT posts_pkey PRIMARY KEY (id);

ALTER TABLE public.preapproved_emails ADD CONSTRAINT preapproved_emails_pkey PRIMARY KEY (id);

ALTER TABLE public.profile_views ADD CONSTRAINT profile_views_pkey PRIMARY KEY (id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.referrals ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);

ALTER TABLE public.resource_clicks ADD CONSTRAINT resource_clicks_pkey PRIMARY KEY (id);

ALTER TABLE public.resources ADD CONSTRAINT resources_pkey PRIMARY KEY (id);

ALTER TABLE public.role_change_requests ADD CONSTRAINT role_change_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.typing_status ADD CONSTRAINT typing_status_pkey PRIMARY KEY (id);

ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);

ALTER TABLE public.user_hidden_messages ADD CONSTRAINT user_hidden_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.user_mfa_backup_codes ADD CONSTRAINT user_mfa_backup_codes_pkey PRIMARY KEY (id);

ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

ALTER TABLE public.user_security_events ADD CONSTRAINT user_security_events_pkey PRIMARY KEY (id);

ALTER TABLE public.badges ADD CONSTRAINT badges_name_key UNIQUE (name);

ALTER TABLE public.connection_requests ADD CONSTRAINT unique_request UNIQUE (requester_id, receiver_id);

ALTER TABLE public.connections ADD CONSTRAINT connections_user_id_connected_user_id_key UNIQUE (user_id, connected_user_id);

ALTER TABLE public.endorsements ADD CONSTRAINT endorsements_unique_pair UNIQUE (endorser_id, endorsed_user_id);

ALTER TABLE public.group_members ADD CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id);

ALTER TABLE public.group_message_members ADD CONSTRAINT group_message_members_thread_id_user_id_key UNIQUE (thread_id, user_id);

ALTER TABLE public.opportunity_applications ADD CONSTRAINT opportunity_applications_opportunity_id_applicant_id_key UNIQUE (opportunity_id, applicant_id);

ALTER TABLE public.post_bookmarks ADD CONSTRAINT post_bookmarks_post_id_user_id_key UNIQUE (post_id, user_id);

ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_post_id_user_id_key UNIQUE (post_id, user_id);

ALTER TABLE public.post_media ADD CONSTRAINT post_media_post_id_display_order_key UNIQUE (post_id, display_order);

ALTER TABLE public.preapproved_emails ADD CONSTRAINT preapproved_emails_email_unique UNIQUE (email);

ALTER TABLE public.referrals ADD CONSTRAINT referrals_token_key UNIQUE (token);

ALTER TABLE public.typing_status ADD CONSTRAINT typing_status_user_id_conversation_id_key UNIQUE (user_id, conversation_id);

ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_badge_unique UNIQUE (user_id, badge_id);

ALTER TABLE public.user_hidden_messages ADD CONSTRAINT user_hidden_messages_user_id_message_id_key UNIQUE (user_id, message_id);

ALTER TABLE public.user_mfa_backup_codes ADD CONSTRAINT unique_code_hash UNIQUE (code_hash);

ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

ALTER TABLE public.connection_requests ADD CONSTRAINT connection_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])));

ALTER TABLE public.connection_requests ADD CONSTRAINT no_self_request CHECK ((requester_id <> receiver_id));

ALTER TABLE public.endorsements ADD CONSTRAINT no_self_endorsement CHECK ((endorser_id <> endorsed_user_id));

ALTER TABLE public.group_messages ADD CONSTRAINT group_messages_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text])));

ALTER TABLE public.messages ADD CONSTRAINT messages_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text])));

ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_employment_level_check CHECK ((employment_level = ANY (ARRAY['internship'::text, 'part-time'::text, 'full-time'::text, 'mentorship'::text])));

ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_location_type_check CHECK ((location_type = ANY (ARRAY['remote'::text, 'hybrid'::text, 'on-site'::text])));

ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_type_check CHECK ((type = ANY (ARRAY['job'::text, 'internship'::text, 'mentorship'::text])));

ALTER TABLE public.opportunity_applications ADD CONSTRAINT opportunity_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'accepted'::text, 'rejected'::text])));

ALTER TABLE public.posts ADD CONSTRAINT posts_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text])));

ALTER TABLE public.preapproved_emails ADD CONSTRAINT preapproved_emails_email_lowercase CHECK ((email = lower(email)));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_approval_status_check CHECK ((approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_contact_privacy_check CHECK ((contact_privacy = ANY (ARRAY['public'::text, 'connections'::text, 'private'::text])));

ALTER TABLE public.role_change_requests ADD CONSTRAINT role_change_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public.badges ADD CONSTRAINT badges_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.connection_requests ADD CONSTRAINT connection_requests_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.connection_requests ADD CONSTRAINT connection_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.connections ADD CONSTRAINT connections_connected_user_id_fkey FOREIGN KEY (connected_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.connections ADD CONSTRAINT connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.endorsements ADD CONSTRAINT endorsements_endorsed_user_id_fkey FOREIGN KEY (endorsed_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.endorsements ADD CONSTRAINT endorsements_endorser_id_fkey FOREIGN KEY (endorser_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.feedback ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.group_members ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

ALTER TABLE public.group_members ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.group_message_members ADD CONSTRAINT group_message_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.group_message_reads ADD CONSTRAINT group_message_reads_message_id_fkey FOREIGN KEY (message_id) REFERENCES group_messages(id) ON DELETE CASCADE;

ALTER TABLE public.group_message_reads ADD CONSTRAINT group_message_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.group_messages ADD CONSTRAINT group_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.groups ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.messages ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.opportunity_applications ADD CONSTRAINT opportunity_applications_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.opportunity_applications ADD CONSTRAINT opportunity_applications_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE;

ALTER TABLE public.post_bookmarks ADD CONSTRAINT post_bookmarks_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE public.post_media ADD CONSTRAINT post_media_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE public.post_shares ADD CONSTRAINT post_shares_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE public.posts ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.preapproved_emails ADD CONSTRAINT preapproved_emails_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.referrals ADD CONSTRAINT referrals_accepted_user_id_fkey FOREIGN KEY (accepted_user_id) REFERENCES profiles(id);

ALTER TABLE public.referrals ADD CONSTRAINT referrals_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES profiles(id);

ALTER TABLE public.resource_clicks ADD CONSTRAINT resource_clicks_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE;

ALTER TABLE public.resource_clicks ADD CONSTRAINT resource_clicks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.resources ADD CONSTRAINT resources_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.role_change_requests ADD CONSTRAINT role_change_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.role_change_requests ADD CONSTRAINT role_change_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.typing_status ADD CONSTRAINT typing_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE;

ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_hidden_messages ADD CONSTRAINT user_hidden_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_mfa_backup_codes ADD CONSTRAINT user_mfa_backup_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_security_events ADD CONSTRAINT user_security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- ============================================
-- INDEXES (non-constraint)
-- ============================================

CREATE INDEX badges_is_active_idx ON public.badges USING btree (is_active);

CREATE INDEX idx_connection_requests_created_at ON public.connection_requests USING btree (created_at DESC);

CREATE INDEX idx_connection_requests_receiver_status ON public.connection_requests USING btree (receiver_id, status);

CREATE INDEX idx_connection_requests_requester_status ON public.connection_requests USING btree (requester_id, status);

CREATE INDEX idx_endorsements_endorsed_user ON public.endorsements USING btree (endorsed_user_id);

CREATE INDEX idx_endorsements_endorser ON public.endorsements USING btree (endorser_id);

CREATE INDEX feedback_created_at_idx ON public.feedback USING btree (created_at DESC);

CREATE INDEX feedback_status_idx ON public.feedback USING btree (status);

CREATE INDEX feedback_user_id_idx ON public.feedback USING btree (user_id);

CREATE INDEX idx_group_members_group ON public.group_members USING btree (group_id);

CREATE INDEX idx_group_members_user ON public.group_members USING btree (user_id);

CREATE INDEX group_message_members_thread_id_idx ON public.group_message_members USING btree (thread_id);

CREATE INDEX group_message_members_user_thread_idx ON public.group_message_members USING btree (user_id, thread_id);

CREATE INDEX idx_group_message_members_user_id ON public.group_message_members USING btree (user_id);

CREATE INDEX group_messages_thread_created_at_idx ON public.group_messages USING btree (thread_id, created_at DESC);

CREATE INDEX idx_group_messages_created_at ON public.group_messages USING btree (created_at);

CREATE INDEX idx_group_messages_sender_id ON public.group_messages USING btree (sender_id);

CREATE INDEX idx_group_messages_status ON public.group_messages USING btree (thread_id, status);

CREATE INDEX idx_group_messages_thread_id ON public.group_messages USING btree (thread_id);

CREATE INDEX idx_groups_category ON public.groups USING btree (category);

CREATE INDEX idx_messages_status_recipient ON public.messages USING btree (receiver_id, status);

CREATE INDEX messages_receiver_sender_created_at_idx ON public.messages USING btree (receiver_id, sender_id, created_at DESC);

CREATE INDEX messages_sender_receiver_created_at_idx ON public.messages USING btree (sender_id, receiver_id, created_at DESC);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, read, created_at DESC);

CREATE INDEX idx_post_bookmarks_user_id ON public.post_bookmarks USING btree (user_id);

CREATE INDEX post_bookmarks_post_id_idx ON public.post_bookmarks USING btree (post_id);

CREATE INDEX idx_post_comments_post_id ON public.post_comments USING btree (post_id);

CREATE INDEX idx_post_likes_post_id ON public.post_likes USING btree (post_id);

CREATE INDEX idx_post_media_display_order ON public.post_media USING btree (post_id, display_order);

CREATE INDEX idx_post_media_post_id ON public.post_media USING btree (post_id);

CREATE INDEX post_shares_post_id_idx ON public.post_shares USING btree (post_id);

CREATE INDEX idx_posts_published_at ON public.posts USING btree (published_at DESC);

CREATE INDEX idx_posts_user_id ON public.posts USING btree (user_id);

CREATE INDEX idx_profile_views_profile_id ON public.profile_views USING btree (profile_id);

CREATE INDEX idx_profile_views_viewer_id ON public.profile_views USING btree (viewer_id);

CREATE UNIQUE INDEX referrals_referrer_email_idx ON public.referrals USING btree (referrer_user_id, lower(referred_email));

CREATE INDEX referrals_referrer_id_idx ON public.referrals USING btree (referrer_user_id);

CREATE INDEX referrals_token_idx ON public.referrals USING btree (token);

CREATE INDEX idx_resource_clicks_resource ON public.resource_clicks USING btree (resource_id);

CREATE INDEX idx_resource_clicks_user ON public.resource_clicks USING btree (user_id);

CREATE INDEX idx_resources_active ON public.resources USING btree (is_active);

CREATE INDEX idx_resources_category ON public.resources USING btree (category);

CREATE INDEX idx_resources_is_featured ON public.resources USING btree (is_featured) WHERE (is_featured = true);

CREATE UNIQUE INDEX idx_role_change_requests_pending_per_user ON public.role_change_requests USING btree (user_id, status) WHERE (status = 'pending'::text);

CREATE INDEX idx_typing_status_conversation ON public.typing_status USING btree (conversation_id);

CREATE INDEX idx_typing_status_started_at ON public.typing_status USING btree (started_at);

CREATE INDEX user_badges_badge_id_idx ON public.user_badges USING btree (badge_id);

CREATE INDEX user_badges_user_id_idx ON public.user_badges USING btree (user_id);

CREATE INDEX idx_user_hidden_messages_message_id ON public.user_hidden_messages USING btree (message_id);

CREATE INDEX idx_user_hidden_messages_user_id ON public.user_hidden_messages USING btree (user_id);

CREATE INDEX idx_backup_codes_unused ON public.user_mfa_backup_codes USING btree (user_id, used_at) WHERE (used_at IS NULL);

CREATE INDEX idx_backup_codes_user_id ON public.user_mfa_backup_codes USING btree (user_id);

CREATE INDEX idx_security_events_created_at ON public.user_security_events USING btree (created_at DESC);

CREATE INDEX idx_security_events_type ON public.user_security_events USING btree (event_type);

CREATE INDEX idx_security_events_user_id ON public.user_security_events USING btree (user_id);


-- ============================================
-- VIEWS
-- ============================================


-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.approve_role_change_request(p_request_id uuid, p_admin_id uuid, p_decision text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_id      uuid;
  v_user_id      uuid;
  v_requested_role text;
BEGIN
  -- Use the authenticated session, NOT the caller-supplied p_admin_id
  caller_id := auth.uid();

  IF caller_id IS NULL THEN
    RETURN QUERY SELECT false, 'Authentication required'::text;
    RETURN;
  END IF;

  -- Verify the actual caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = caller_id AND role = 'admin'
  ) THEN
    RETURN QUERY SELECT false, 'Only admins can approve role change requests'::text;
    RETURN;
  END IF;

  -- Validate decision value
  IF p_decision NOT IN ('approved', 'denied') THEN
    RETURN QUERY SELECT false, 'Invalid decision value'::text;
    RETURN;
  END IF;

  -- Get the user_id and requested_role from the request
  SELECT user_id, requested_role INTO v_user_id, v_requested_role
  FROM role_change_requests
  WHERE id = p_request_id;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Role change request not found'::text;
    RETURN;
  END IF;

  -- Update the role change request (use caller_id, not p_admin_id)
  UPDATE role_change_requests
  SET
    status     = p_decision,
    reviewed_by = caller_id,
    reviewed_at = NOW(),
    updated_at  = NOW()
  WHERE id = p_request_id;

  -- If approved, update the user's role
  IF p_decision = 'approved' THEN
    IF EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = v_user_id
        AND role = v_requested_role::app_role
    ) THEN
      -- User already has the new role; clean up old non-admin roles
      DELETE FROM user_roles
      WHERE user_id = v_user_id
        AND role IN ('athlete'::app_role, 'mentor'::app_role, 'employer'::app_role)
        AND role != v_requested_role::app_role;
    ELSE
      UPDATE user_roles
      SET role = v_requested_role::app_role
      WHERE user_id = v_user_id
        AND role IN ('athlete'::app_role, 'mentor'::app_role, 'employer'::app_role);
    END IF;

    RETURN QUERY SELECT true, 'Role change request approved and role updated'::text;
  ELSE
    RETURN QUERY SELECT true, 'Role change request denied'::text;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Do not leak internal error details (SQLERRM) to the caller
  RETURN QUERY SELECT false, 'An unexpected error occurred'::text;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.are_users_connected(user_id_1 uuid, user_id_2 uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.connections
    WHERE (user_id = user_id_1 AND connected_user_id = user_id_2)
       OR (user_id = user_id_2 AND connected_user_id = user_id_1)
  )
$function$
;

CREATE OR REPLACE FUNCTION public.assign_user_role(p_user_id uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_id uuid;
  caller_is_admin boolean;
BEGIN
  -- 1. Require an authenticated session
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'assign_user_role: authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Hard-block assigning the admin role through this RPC
  IF lower(p_role) = 'admin' THEN
    RAISE EXCEPTION 'assign_user_role: admin role cannot be self-assigned'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Validate role is a known non-admin value
  IF lower(p_role) NOT IN ('athlete', 'mentor', 'employer', 'user') THEN
    RAISE EXCEPTION 'assign_user_role: invalid role "%"', p_role
      USING ERRCODE = '22023';
  END IF;

  -- 4. Non-admins may only set their own role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = caller_id AND role = 'admin'
  ) INTO caller_is_admin;

  IF NOT caller_is_admin AND caller_id != p_user_id THEN
    RAISE EXCEPTION 'assign_user_role: you may only assign a role to yourself'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role::public.app_role)
  ON CONFLICT DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.audit_auth_event(p_event_type text, p_user_id uuid, p_details jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log auth events for security monitoring
  INSERT INTO public.audit_logs (event_type, user_id, details, created_at)
  VALUES (p_event_type, p_user_id, p_details, NOW())
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN undefined_table THEN
  -- audit_logs table doesn't exist yet, silently ignore
  NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_approve_if_preapproved(p_user_id uuid, p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
  v_is_preapproved BOOLEAN;
  v_mvp_badge_id UUID;
BEGIN
  -- Check if email is pre-approved
  v_is_preapproved := EXISTS (
    SELECT 1 FROM preapproved_emails 
    WHERE LOWER(email) = LOWER(p_email)
  );

  -- If pending AND pre-approved, auto-approve and assign MVP badge
  IF v_is_preapproved THEN
    UPDATE profiles 
    SET approval_status = 'approved'
    WHERE id = p_user_id;

    -- Get MVP badge ID
    SELECT id INTO v_mvp_badge_id FROM badges 
    WHERE name = 'MVP' AND is_active = TRUE
    LIMIT 1;

    -- Assign MVP badge if it exists
    IF v_mvp_badge_id IS NOT NULL THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (p_user_id, v_mvp_badge_id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;$function$
;

CREATE OR REPLACE FUNCTION public.can_view_contact_info(viewed_user_id uuid, viewer_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    -- User can always view their own contact info
    WHEN viewed_user_id = viewer_id THEN TRUE
    -- Admin can always view contact info
    WHEN public.has_role(viewer_id, 'admin') THEN TRUE
    -- Check contact_privacy setting
    WHEN (SELECT contact_privacy FROM public.profiles WHERE id = viewed_user_id) = 'public' THEN TRUE
    WHEN (SELECT contact_privacy FROM public.profiles WHERE id = viewed_user_id) = 'connections' THEN
      EXISTS (
        SELECT 1 FROM public.connections
        WHERE (user_id = viewed_user_id AND connected_user_id = viewer_id)
           OR (user_id = viewer_id AND connected_user_id = viewed_user_id)
      )
    ELSE FALSE
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_mutual_connection(user_1 uuid, user_2 uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  mutual_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM connections 
    WHERE (
      (user_id = user_1 AND connected_user_id = user_2) OR
      (user_id = user_2 AND connected_user_id = user_1)
    )
    LIMIT 2
  ) AND (
    SELECT COUNT(*) FROM connections
    WHERE (user_id = user_1 AND connected_user_id = user_2)
      OR (user_id = user_2 AND connected_user_id = user_1)
  ) = 2 INTO mutual_exists;
  
  RETURN mutual_exists;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_user_approval()
 RETURNS TABLE(approval_status text, is_approved boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_approval_status TEXT;
  v_is_preapproved BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 'unauthenticated'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Get user email from profiles
  SELECT profiles.email INTO v_user_email FROM profiles WHERE profiles.id = v_user_id;
  
  IF v_user_email IS NULL THEN
    RETURN QUERY SELECT 'pending'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Check if email is pre-approved
  v_is_preapproved := EXISTS (
    SELECT 1 FROM preapproved_emails 
    WHERE preapproved_emails.email = LOWER(v_user_email)
  );

  -- Get current approval status
  SELECT profiles.approval_status INTO v_approval_status FROM profiles WHERE profiles.id = v_user_id;

  -- If pending AND pre-approved, auto-approve
  IF v_approval_status = 'pending' AND v_is_preapproved THEN
    UPDATE profiles 
    SET approval_status = 'approved'
    WHERE id = v_user_id;
    v_approval_status := 'approved';
  END IF;

  -- Return approval status and whether user is approved
  RETURN QUERY SELECT v_approval_status AS approval_status, (v_approval_status = 'approved') AS is_approved;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_link text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS notifications
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    new_notification public.notifications;
BEGIN
    -- Insert the notification
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata, read)
    VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata, false)
    RETURNING * INTO new_notification;
    
    RETURN new_notification;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_post_with_media(p_user_id uuid, p_content text, p_media_url text, p_media_type text, p_is_published boolean, p_published_at timestamp with time zone, p_scheduled_at timestamp with time zone)
 RETURNS TABLE(post_id uuid, success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_post_id uuid;
  v_is_published boolean;
  v_published_at timestamptz;
BEGIN
  -- Verify the user is creating their own post
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, false, 'User ID is required'::text;
    RETURN;
  END IF;

  -- Validate scheduled date is in the future
  IF p_scheduled_at IS NOT NULL AND p_scheduled_at <= NOW() THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Scheduled date must be in the future'::text;
    RETURN;
  END IF;

  -- Determine publication status based on scheduling
  IF p_scheduled_at IS NOT NULL THEN
    -- Scheduled post - keep as draft until scheduled time
    v_is_published := false;
    v_published_at := p_scheduled_at;
  ELSIF p_is_published THEN
    -- Normal published post
    v_is_published := true;
    v_published_at := COALESCE(p_published_at, NOW());
  ELSE
    -- Draft post
    v_is_published := false;
    v_published_at := NULL;
  END IF;

  -- Insert the post
  INSERT INTO posts (
    user_id,
    content,
    media_url,
    media_type,
    is_published,
    published_at,
    scheduled_at,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_content,
    p_media_url,
    p_media_type,
    v_is_published,
    v_published_at,
    p_scheduled_at,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_post_id;

  RETURN QUERY SELECT v_post_id, true, 'Post created successfully'::text;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::uuid, false, ('Error: ' || SQLERRM)::text;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_conversation_summaries(user_uuid uuid)
 RETURNS TABLE(id text, thread_id uuid, name text, avatar_url text, role text, role_type text, last_message text, last_message_date timestamp with time zone, unread_count bigint, is_group boolean, user_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH 
-- Get partners from connections table
connections AS (
  SELECT c.connected_user_id AS partner_id
  FROM connections c
  WHERE c.user_id = user_uuid
),
-- Get partners from messages table (anyone we've messaged with)
message_partners AS (
  SELECT DISTINCT 
    CASE WHEN m.sender_id = user_uuid THEN m.receiver_id ELSE m.sender_id END AS partner_id
  FROM messages m
  WHERE (m.sender_id = user_uuid OR m.receiver_id = user_uuid)
    AND m.id NOT IN (SELECT message_id FROM user_hidden_messages WHERE user_id = user_uuid)
),
-- Combine both sources of partners
all_partners AS (
  SELECT partner_id FROM connections
  UNION
  SELECT partner_id FROM message_partners
),
profiles AS (
  SELECT p.id, p.first_name, p.last_name, p.avatar_url, p.university
  FROM profiles p
  WHERE p.id IN (SELECT partner_id FROM all_partners)
),
user_roles AS (
  SELECT ur.user_id, ur.role
  FROM user_roles ur
  WHERE ur.user_id IN (SELECT partner_id FROM all_partners)
),
last_1to1 AS (
  SELECT
    CASE WHEN m.sender_id = user_uuid THEN m.receiver_id ELSE m.sender_id END AS partner_id,
    m.content AS last_message,
    m.created_at AS last_message_date,
    ROW_NUMBER() OVER (PARTITION BY (CASE WHEN m.sender_id = user_uuid THEN m.receiver_id ELSE m.sender_id END) ORDER BY m.created_at DESC) AS rn
  FROM messages m
  WHERE (m.sender_id = user_uuid OR m.receiver_id = user_uuid)
    AND m.id NOT IN (SELECT message_id FROM user_hidden_messages WHERE user_id = user_uuid)
),
unread_1to1 AS (
  SELECT m.sender_id AS partner_id, COUNT(*) AS unread_count
  FROM messages m
  WHERE m.receiver_id = user_uuid 
    AND m.read_at IS NULL
    AND m.id NOT IN (SELECT message_id FROM user_hidden_messages WHERE user_id = user_uuid)
  GROUP BY m.sender_id
),
one_to_one AS (
  SELECT
    p.id::text AS id,
    NULL::uuid AS thread_id,
    CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS name,
    p.avatar_url,
    COALESCE(p.university, 'LaceUP Member') AS role,
    ur.role::text AS role_type,
    l.last_message,
    l.last_message_date,
    COALESCE(u.unread_count, 0) AS unread_count,
    FALSE AS is_group,
    p.id AS user_id
  FROM all_partners ap
  JOIN profiles p ON p.id = ap.partner_id
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN (SELECT * FROM last_1to1 WHERE rn = 1) l ON l.partner_id = p.id
  LEFT JOIN unread_1to1 u ON u.partner_id = p.id
),
memberships AS (
  -- Get all group threads the user is a member of
  -- This is independent of 1:1 conversation hiding
  SELECT gmm.thread_id
  FROM group_message_members gmm
  WHERE gmm.user_id = user_uuid
),
last_group AS (
  SELECT gm.thread_id, gm.content AS last_message, gm.created_at AS last_message_date,
         ROW_NUMBER() OVER (PARTITION BY gm.thread_id ORDER BY gm.created_at DESC) AS rn
  FROM group_messages gm
  WHERE gm.thread_id IN (SELECT thread_id FROM memberships)
    AND gm.id NOT IN (SELECT message_id FROM user_hidden_messages WHERE user_id = user_uuid)
),
group_unread AS (
  SELECT gm.thread_id, COUNT(*) AS unread_count
  FROM group_messages gm
  LEFT JOIN group_message_reads gmr
    ON gmr.message_id = gm.id AND gmr.user_id = user_uuid
  WHERE gm.thread_id IN (SELECT thread_id FROM memberships)
    AND gm.sender_id <> user_uuid
    AND gmr.message_id IS NULL
    AND gm.id NOT IN (SELECT message_id FROM user_hidden_messages WHERE user_id = user_uuid)
  GROUP BY gm.thread_id
),
group_names AS (
  SELECT gmm.thread_id,
         STRING_AGG(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')), ', ') FILTER (WHERE p.id <> user_uuid) AS thread_name
  FROM group_message_members gmm
  JOIN profiles p ON p.id = gmm.user_id
  WHERE gmm.thread_id IN (SELECT thread_id FROM memberships)
  GROUP BY gmm.thread_id
),
groups AS (
  SELECT
    ('thread:'||m.thread_id)::text AS id,
    m.thread_id,
    COALESCE(gn.thread_name, 'Group') AS name,
    NULL::text AS avatar_url,
    ('Group - '|| (SELECT COUNT(*) FROM group_message_members g WHERE g.thread_id = m.thread_id))::text AS role,
    NULL::text AS role_type,
    lg.last_message,
    lg.last_message_date,
    COALESCE(gu.unread_count, 0) AS unread_count,
    TRUE AS is_group,
    NULL::uuid AS user_id
  FROM memberships m
  LEFT JOIN (SELECT * FROM last_group WHERE rn = 1) lg ON lg.thread_id = m.thread_id
  LEFT JOIN group_unread gu ON gu.thread_id = m.thread_id
  LEFT JOIN group_names gn ON gn.thread_id = m.thread_id
)
SELECT * FROM one_to_one
UNION ALL
SELECT * FROM groups
ORDER BY last_message_date DESC NULLS LAST;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pending_requests_for_user(user_id uuid)
 RETURNS TABLE(request_id uuid, requester_id uuid, requester_name text, requester_avatar uuid, requester_university text, requester_skills text[], created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id,
    cr.requester_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown User'),
    p.id,
    p.university,
    p.skills,
    cr.created_at
  FROM connection_requests cr
  LEFT JOIN profiles p ON cr.requester_id = p.id
  WHERE cr.receiver_id = user_id
  AND cr.status = 'pending'
  ORDER BY cr.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_group_member_removal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When a group member is removed, insert a system message
  INSERT INTO group_messages (thread_id, sender_id, content, is_system_message, system_message_type)
  VALUES (
    OLD.thread_id,
    OLD.user_id,
    (SELECT CONCAT(first_name, ' ', last_name) FROM profiles WHERE id = OLD.user_id) || ' left the group',
    true,
    'user_left'
  );
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, email, approval_status, created_at, updated_at)
  values (new.id, new.email, 'approved', now(), now())
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_role_request_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$
;

CREATE OR REPLACE FUNCTION public.is_thread_member(p_thread_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM group_message_members
    WHERE thread_id = p_thread_id
    AND user_id = auth.uid()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = is_user_admin.user_id
    AND user_roles.role = 'admin'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_notification_read()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.read = TRUE AND OLD.read = FALSE THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.migrate_connections_to_requests()
 RETURNS TABLE(requester_id uuid, receiver_id uuid, migration_type text, status text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  conn RECORD;
  mutual_exists BOOLEAN;
  migration_count INT := 0;
BEGIN
  -- Loop through all existing connections
  FOR conn IN SELECT user_id, connected_user_id FROM connections LOOP
    -- Check if mutual connection exists (reverse direction)
    SELECT EXISTS(
      SELECT 1 FROM connections 
      WHERE user_id = conn.connected_user_id 
      AND connected_user_id = conn.user_id
    ) INTO mutual_exists;

    -- If not mutual, create a pending connection request
    IF NOT mutual_exists THEN
      BEGIN
        INSERT INTO connection_requests (requester_id, receiver_id, status)
        VALUES (conn.user_id, conn.connected_user_id, 'pending')
        ON CONFLICT (requester_id, receiver_id) DO UPDATE
        SET status = 'pending', updated_at = now();
        
        RETURN QUERY 
        SELECT conn.user_id, conn.connected_user_id, 'ONE_WAY'::TEXT, 'pending'::TEXT;
        migration_count := migration_count + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error migrating connection from % to %: %', 
          conn.user_id, conn.connected_user_id, SQLERRM;
      END;
    ELSE
      -- For mutual connections, mark the requests as accepted
      BEGIN
        INSERT INTO connection_requests (requester_id, receiver_id, status)
        VALUES (conn.user_id, conn.connected_user_id, 'accepted')
        ON CONFLICT (requester_id, receiver_id) DO UPDATE
        SET status = 'accepted', updated_at = now();
        
        RETURN QUERY 
        SELECT conn.user_id, conn.connected_user_id, 'MUTUAL'::TEXT, 'accepted'::TEXT;
        migration_count := migration_count + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error migrating mutual connection from % to %: %', 
          conn.user_id, conn.connected_user_id, SQLERRM;
      END;
    END IF;
  END LOOP;

  RAISE NOTICE 'Connection migration completed. % records processed.', migration_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_connection_requests_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_base_role(p_user_id uuid, p_new_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base_role_id uuid;
  v_caller_is_admin boolean;
BEGIN
  -- Check if caller is an admin (direct query without RLS)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) INTO v_caller_is_admin;

  IF NOT v_caller_is_admin THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;

  -- Validate the new role
  IF p_new_role NOT IN ('athlete', 'mentor', 'employer') THEN
    RAISE EXCEPTION 'Invalid role: must be athlete, mentor, or employer';
  END IF;

  -- Find the user's base role (not admin)
  SELECT id INTO v_base_role_id
  FROM public.user_roles
  WHERE user_id = p_user_id
  AND role != 'admin'
  LIMIT 1;

  IF v_base_role_id IS NOT NULL THEN
    -- Update existing base role
    UPDATE public.user_roles
    SET role = p_new_role::app_role
    WHERE id = v_base_role_id;
  ELSE
    -- Insert new base role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, p_new_role::app_role);
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_preapproved_emails(p_emails text[], p_admin_id uuid)
 RETURNS TABLE(processed_count integer, inserted_or_updated integer, auto_approved integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  with normalized as (
    select distinct lower(trim(e)) as email
    from unnest(p_emails) as e
    where e is not null and length(trim(e)) > 0
  ), upserted as (
    insert into public.preapproved_emails (email, approved_by)
    select email, p_admin_id from normalized
    on conflict (email) do update
      set approved_by = excluded.approved_by,
          created_at = now()
    returning email
  ), matched as (
    update public.profiles p
    set approval_status = 'approved'
    where p.approval_status = 'pending'
      and lower(p.email) in (select email from upserted)
    returning p.id
  )
  select
    coalesce((select count(*) from normalized), 0)::int as processed_count,
    coalesce((select count(*) from upserted), 0)::int as inserted_or_updated,
    coalesce((select count(*) from matched), 0)::int as auto_approved;
end;
$function$
;


-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER connection_requests_updated_at_trigger BEFORE UPDATE ON public.connection_requests FOR EACH ROW EXECUTE FUNCTION update_connection_requests_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.endorsements FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_group_member_removal AFTER DELETE ON public.group_message_members FOR EACH ROW EXECUTE FUNCTION handle_group_member_removal();

CREATE TRIGGER trigger_mark_notification_read BEFORE UPDATE ON public.notifications FOR EACH ROW WHEN ((new.read IS DISTINCT FROM old.read)) EXECUTE FUNCTION mark_notification_read();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunity_applications_updated_at BEFORE UPDATE ON public.opportunity_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_change_requests_updated_at BEFORE UPDATE ON public.role_change_requests FOR EACH ROW EXECUTE FUNCTION handle_role_request_updated_at();


-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.group_message_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.group_message_reads ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.opportunity_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.preapproved_emails ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.resource_clicks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_hidden_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_mfa_backup_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_security_events ENABLE ROW LEVEL SECURITY;


-- ============================================
-- POLICIES (public + storage)
-- ============================================

CREATE POLICY "Admins can manage badges" ON public.badges FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));

CREATE POLICY "Authenticated users can view active badges" ON public.badges FOR SELECT TO authenticated USING ((is_active = true));

CREATE POLICY connection_requests_delete_either ON public.connection_requests FOR DELETE TO public USING (((auth.uid() = requester_id) OR (auth.uid() = receiver_id)));

CREATE POLICY connection_requests_insert_requester ON public.connection_requests FOR INSERT TO public WITH CHECK (((auth.uid() IS NOT NULL) AND (auth.uid() = requester_id)));

CREATE POLICY connection_requests_select_self ON public.connection_requests FOR SELECT TO public USING (((auth.uid() = requester_id) OR (auth.uid() = receiver_id)));

CREATE POLICY connection_requests_update_receiver ON public.connection_requests FOR UPDATE TO public USING ((auth.uid() = receiver_id)) WITH CHECK ((auth.uid() = receiver_id));

CREATE POLICY connections_delete_self ON public.connections FOR DELETE TO public USING (((auth.uid() = user_id) OR (auth.uid() = connected_user_id)));

CREATE POLICY connections_insert_self ON public.connections FOR INSERT TO public WITH CHECK (((auth.uid() IS NOT NULL) AND ((auth.uid() = user_id) OR (auth.uid() = connected_user_id))));

CREATE POLICY connections_select_authenticated ON public.connections FOR SELECT TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Admins can manage all endorsements" ON public.endorsements FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can create endorsements" ON public.endorsements FOR INSERT TO authenticated WITH CHECK (((auth.uid() = endorser_id) AND (endorser_id <> endorsed_user_id)));

CREATE POLICY "Authenticated users can delete own endorsements" ON public.endorsements FOR DELETE TO authenticated USING ((auth.uid() = endorser_id));

CREATE POLICY "Authenticated users can update own endorsements" ON public.endorsements FOR UPDATE TO authenticated USING ((auth.uid() = endorser_id)) WITH CHECK ((auth.uid() = endorser_id));

CREATE POLICY "Authenticated users can view all endorsements" ON public.endorsements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated admins can update feedback" ON public.feedback FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));

CREATE POLICY "Authenticated admins can view all feedback" ON public.feedback FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));

CREATE POLICY "Authenticated users can create feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Admins can manage all group members" ON public.group_members FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can join groups" ON public.group_members FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Authenticated users can leave groups" ON public.group_members FOR DELETE TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY "Authenticated users can view group members" ON public.group_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can add members to threads" ON public.group_message_members FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) OR is_thread_member(thread_id)));

CREATE POLICY "Authenticated users can leave threads" ON public.group_message_members FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can view thread memberships" ON public.group_message_members FOR SELECT TO authenticated USING ((is_thread_member(thread_id) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can delete own message reads" ON public.group_message_reads FOR DELETE TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY "Authenticated users can insert own message reads" ON public.group_message_reads FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Authenticated users can update own message reads" ON public.group_message_reads FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Authenticated users can view own message reads" ON public.group_message_reads FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can send messages to their threads" ON public.group_messages FOR INSERT TO authenticated WITH CHECK (((sender_id = auth.uid()) AND is_thread_member(thread_id)));

CREATE POLICY "Authenticated users can view messages in their threads" ON public.group_messages FOR SELECT TO authenticated USING ((is_thread_member(thread_id) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can delete own messages" ON public.messages FOR DELETE TO authenticated USING (((sender_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can view sent/received messages" ON public.messages FOR SELECT TO authenticated USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY merged_a_700633a1 ON public.messages FOR INSERT TO authenticated WITH CHECK ((((( SELECT auth.uid() AS uid) = sender_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.approval_status = 'approved'::text))))) OR ((( SELECT auth.uid() AS uid) = sender_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.approval_status = 'approved'::text)))) AND (EXISTS ( SELECT 1
   FROM connections
  WHERE (((connections.user_id = ( SELECT auth.uid() AS uid)) AND (connections.connected_user_id = messages.receiver_id)) OR ((connections.user_id = messages.receiver_id) AND (connections.connected_user_id = ( SELECT auth.uid() AS uid)))))))));

CREATE POLICY merged_w_700633a1 ON public.messages FOR UPDATE TO authenticated USING (((receiver_id = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) = sender_id))) WITH CHECK (((receiver_id = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) = sender_id)));

CREATE POLICY "Authenticated users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Authenticated users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY service_role_all_access ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view active opportunities" ON public.opportunities FOR SELECT TO authenticated USING ((is_active = true));

CREATE POLICY "Users can delete their own opportunities" ON public.opportunities FOR DELETE TO authenticated USING ((auth.uid() = posted_by));

CREATE POLICY "Users can update their own opportunities" ON public.opportunities FOR UPDATE TO authenticated USING ((auth.uid() = posted_by)) WITH CHECK ((auth.uid() = posted_by));

CREATE POLICY merged_a_700633a1 ON public.opportunities FOR INSERT TO authenticated WITH CHECK ((((( SELECT auth.uid() AS uid) = posted_by) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.approval_status = 'approved'::text))))) OR ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['mentor'::app_role, 'employer'::app_role, 'admin'::app_role]))))) AND (posted_by = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Users can update their own applications" ON public.opportunity_applications FOR UPDATE TO authenticated USING (((( SELECT auth.uid() AS uid) = applicant_id) OR (( SELECT auth.uid() AS uid) IN ( SELECT opportunities.posted_by
   FROM opportunities
  WHERE (opportunities.id = opportunity_applications.opportunity_id)))));

CREATE POLICY merged_a_700633a1 ON public.opportunity_applications FOR INSERT TO authenticated WITH CHECK ((((( SELECT auth.uid() AS uid) = applicant_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.approval_status = 'approved'::text))))) OR ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['athlete'::app_role, 'admin'::app_role]))))) AND (applicant_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY merged_r_700633a1 ON public.opportunity_applications FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM opportunities
  WHERE ((opportunities.id = opportunity_applications.opportunity_id) AND (opportunities.posted_by = ( SELECT auth.uid() AS uid))))) OR (applicant_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "Authenticated approved users can create bookmarks" ON public.post_bookmarks FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.approval_status = 'approved'::text))))));

CREATE POLICY "Authenticated users can delete own bookmarks" ON public.post_bookmarks FOR DELETE TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can view own bookmarks" ON public.post_bookmarks FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated approved users can create comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.approval_status = 'approved'::text))))));

CREATE POLICY "Authenticated users can delete own comments or admins" ON public.post_comments FOR DELETE TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can update own comments" ON public.post_comments FOR UPDATE TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY "Authenticated users can view all comments" ON public.post_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated approved users can create likes" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.approval_status = 'approved'::text))))));

CREATE POLICY "Authenticated users can delete own likes" ON public.post_likes FOR DELETE TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can view all likes" ON public.post_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete own post media" ON public.post_media FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM posts
  WHERE ((posts.id = post_media.post_id) AND (posts.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can insert own post media" ON public.post_media FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM posts
  WHERE ((posts.id = post_media.post_id) AND (posts.user_id = auth.uid())))));

CREATE POLICY "Authenticated users can view post media" ON public.post_media FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM posts
  WHERE ((posts.id = post_media.post_id) AND (posts.is_published = true)))) OR (EXISTS ( SELECT 1
   FROM posts
  WHERE ((posts.id = post_media.post_id) AND (posts.user_id = auth.uid()))))));

CREATE POLICY "Authenticated approved users can create shares" ON public.post_shares FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.approval_status = 'approved'::text))))));

CREATE POLICY "Authenticated users can view all shares" ON public.post_shares FOR SELECT TO authenticated USING (true);

CREATE POLICY "Approved users can view published posts" ON public.posts FOR SELECT TO authenticated USING (((is_published = true) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.approval_status = 'approved'::text))))));

CREATE POLICY "Authenticated approved users can create posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.approval_status = 'approved'::text))))));

CREATE POLICY "Authenticated users can delete own posts" ON public.posts FOR DELETE TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can update own posts" ON public.posts FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Authenticated users can view own unpublished posts" ON public.posts FOR SELECT TO authenticated USING (((auth.uid() = user_id) AND (is_published = false)));

CREATE POLICY "Authenticated users can view published posts" ON public.posts FOR SELECT TO authenticated USING ((is_published = true));

CREATE POLICY "Authenticated admins can delete preapproved emails" ON public.preapproved_emails FOR DELETE TO authenticated USING (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))))));

CREATE POLICY "Authenticated admins can insert preapproved emails" ON public.preapproved_emails FOR INSERT TO authenticated WITH CHECK (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))))));

CREATE POLICY "Authenticated admins can update preapproved emails" ON public.preapproved_emails FOR UPDATE TO authenticated USING (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))))) WITH CHECK (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))))));

CREATE POLICY "Authenticated admins can view preapproved emails" ON public.preapproved_emails FOR SELECT TO authenticated USING (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))))));

CREATE POLICY "Authenticated users can track profile views" ON public.profile_views FOR INSERT TO authenticated WITH CHECK ((auth.uid() = viewer_id));

CREATE POLICY "Authenticated users can view own profile views or admins" ON public.profile_views FOR SELECT TO authenticated USING (((auth.uid() = profile_id) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'admin'::app_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'admin'::app_role)))));

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Users can view approved profiles" ON public.profiles FOR SELECT TO authenticated USING (((approval_status = 'approved'::text) OR (( SELECT auth.uid() AS uid) = id) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)));

CREATE POLICY profiles_insert_own_authenticated ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));

CREATE POLICY "Authenticated users can view own referrals" ON public.referrals FOR SELECT TO authenticated USING (((auth.uid() = referrer_user_id) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Users can insert own referrals" ON public.referrals FOR INSERT TO authenticated WITH CHECK ((auth.uid() = referrer_user_id));

CREATE POLICY "Authenticated users can track resource clicks" ON public.resource_clicks FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Authenticated users can view own clicks or admins" ON public.resource_clicks FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated admins can delete resources" ON public.resources FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated admins can insert resources" ON public.resources FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated admins can update resources" ON public.resources FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active resources" ON public.resources FOR SELECT TO authenticated USING (((is_active = true) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated admins can update requests or pending users" ON public.role_change_requests FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))) OR ((auth.uid() = user_id) AND (status = 'pending'::text)))) WITH CHECK (((auth.uid() = user_id) AND (status = 'pending'::text)));

CREATE POLICY "Authenticated users can create role change requests" ON public.role_change_requests FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Authenticated users can view own requests or admins" ON public.role_change_requests FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))) OR (auth.uid() = user_id)));

CREATE POLICY "Authenticated users can delete own typing status" ON public.typing_status FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can set own typing status" ON public.typing_status FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Authenticated users can view typing status" ON public.typing_status FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage user badges" ON public.user_badges FOR ALL TO authenticated USING (is_user_admin(auth.uid())) WITH CHECK (is_user_admin(auth.uid()));

CREATE POLICY "Users can view all user badges" ON public.user_badges FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can hide messages" ON public.user_hidden_messages FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Authenticated users can unhide messages" ON public.user_hidden_messages FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can view own hidden messages" ON public.user_hidden_messages FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Users can delete own backup codes" ON public.user_mfa_backup_codes FOR DELETE TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own backup codes" ON public.user_mfa_backup_codes FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own backup codes" ON public.user_mfa_backup_codes FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own backup codes" ON public.user_mfa_backup_codes FOR SELECT TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));

CREATE POLICY "Admins can delete user roles" ON public.user_roles FOR DELETE TO authenticated USING (is_user_admin(auth.uid()));

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));

CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (is_user_admin(auth.uid()));

CREATE POLICY "Admins can update user roles" ON public.user_roles FOR UPDATE TO authenticated USING (is_user_admin(auth.uid()));

CREATE POLICY "Users can view all user roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY merged_r_700633a1 ON public.user_roles FOR SELECT TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (( SELECT auth.uid() AS uid) = user_id)));

CREATE POLICY "Admins can view all security events" ON public.user_security_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));

CREATE POLICY "Users can insert own security events" ON public.user_security_events FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own security events" ON public.user_security_events FOR SELECT TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY "Admins can delete resource files" ON storage.objects FOR DELETE TO public USING (((bucket_id = 'resource-files'::text) AND has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can update resource files" ON storage.objects FOR UPDATE TO public USING (((bucket_id = 'resource-files'::text) AND has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can upload resource files" ON storage.objects FOR INSERT TO public WITH CHECK (((bucket_id = 'resource-files'::text) AND has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Allow authenticated badge image deletion" ON storage.objects FOR DELETE TO public USING (((bucket_id = 'badge-images'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Allow authenticated badge image updates" ON storage.objects FOR UPDATE TO public WITH CHECK (((bucket_id = 'badge-images'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Allow authenticated badge image uploads" ON storage.objects FOR INSERT TO public WITH CHECK (((bucket_id = 'badge-images'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Allow public badge image reads" ON storage.objects FOR SELECT TO public USING ((bucket_id = 'badge-images'::text));

CREATE POLICY "Anyone can view post media" ON storage.objects FOR SELECT TO public USING ((bucket_id = 'post-media'::text));

CREATE POLICY "Anyone can view resource files" ON storage.objects FOR SELECT TO public USING ((bucket_id = 'resource-files'::text));

CREATE POLICY "Approved mentors can view athlete resumes for connected athlete" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'resumes'::text) AND (((auth.uid())::text = (storage.foldername(name))[1]) OR ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['mentor'::app_role, 'employer'::app_role]))))) AND (EXISTS ( SELECT 1
   FROM connections c
  WHERE (((c.user_id = auth.uid()) AND (c.connected_user_id = ((storage.foldername(objects.name))[1])::uuid)) OR ((c.connected_user_id = auth.uid()) AND (c.user_id = ((storage.foldername(objects.name))[1])::uuid)))))))));

CREATE POLICY "Approved users can upload post media" ON storage.objects FOR INSERT TO public WITH CHECK (((bucket_id = 'post-media'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.approval_status = 'approved'::text))))));

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT TO public USING ((bucket_id = 'avatars'::text));

CREATE POLICY "Users can delete own message files" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'message-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can delete own resumes" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'resumes'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can delete their own post media" ON storage.objects FOR DELETE TO public USING (((bucket_id = 'post-media'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "Users can update own resumes" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'resumes'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))) WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can update their own post media" ON storage.objects FOR UPDATE TO public USING (((bucket_id = 'post-media'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "Users can upload message files to own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'message-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can upload resumes to own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'resumes'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can view message files" ON storage.objects FOR SELECT TO authenticated USING ((bucket_id = 'message-files'::text));

CREATE POLICY "Users can view their own resume" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'resumes'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


-- ============================================
-- REALTIME PUBLICATION
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

ALTER PUBLICATION supabase_realtime ADD TABLE public.post_bookmarks;

ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;

ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;

ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_views;


-- ============================================
-- STORAGE BUCKETS (reference)
-- ============================================

-- bucket: avatars | public: true | size limit: none | mime types: any

-- bucket: badge-images | public: true | size limit: 5242880 | mime types: image/jpeg, image/png, image/gif, image/webp

-- bucket: message-files | public: true | size limit: none | mime types: any

-- bucket: post-media | public: true | size limit: none | mime types: any

-- bucket: resource-files | public: true | size limit: none | mime types: any

-- bucket: resumes | public: true | size limit: none | mime types: any

