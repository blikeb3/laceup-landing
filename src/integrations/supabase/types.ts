export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          color_bg: string | null
          color_text: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          color_bg?: string | null
          color_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          color_bg?: string | null
          color_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          connected_user_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          connected_user_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          connected_user_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      endorsements: {
        Row: {
          comment: string | null
          created_at: string
          endorsed_user_id: string
          endorser_id: string
          id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          endorsed_user_id: string
          endorser_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          endorsed_user_id?: string
          endorser_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "endorsements_endorsed_user_id_fkey"
            columns: ["endorsed_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endorsements_endorser_id_fkey"
            columns: ["endorser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          context_url: string
          created_at: string
          id: string
          message: string
          status: Database["public"]["Enums"]["feedback_status"] | null
          user_id: string
        }
        Insert: {
          context_url: string
          created_at?: string
          id?: string
          message: string
          status?: Database["public"]["Enums"]["feedback_status"] | null
          user_id: string
        }
        Update: {
          context_url?: string
          created_at?: string
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["feedback_status"] | null
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_message_members: {
        Row: {
          id: string
          joined_at: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: []
      }
      group_message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          image_url: string | null
          is_system_message: boolean | null
          sender_id: string
          status: string | null
          system_message_type: string | null
          thread_id: string
          thread_name: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_system_message?: boolean | null
          sender_id: string
          status?: string | null
          system_message_type?: string | null
          thread_id: string
          thread_name?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_system_message?: boolean | null
          sender_id?: string
          status?: string | null
          system_message_type?: string | null
          thread_id?: string
          thread_name?: string | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          image_url: string | null
          read_at: string | null
          receiver_id: string
          sender_id: string
          status: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
          status?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          application_deadline: string | null
          career_interest: string | null
          company_name: string
          compensation: string | null
          created_at: string | null
          description: string
          employment_level: string | null
          id: string
          is_active: boolean | null
          location: string | null
          location_type: string | null
          mentorship_slots: number | null
          posted_by: string
          requirements: string[] | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          application_deadline?: string | null
          career_interest?: string | null
          company_name: string
          compensation?: string | null
          created_at?: string | null
          description: string
          employment_level?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          location_type?: string | null
          mentorship_slots?: number | null
          posted_by: string
          requirements?: string[] | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          application_deadline?: string | null
          career_interest?: string | null
          company_name?: string
          compensation?: string | null
          created_at?: string | null
          description?: string
          employment_level?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          location_type?: string | null
          mentorship_slots?: number | null
          posted_by?: string
          requirements?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      opportunity_applications: {
        Row: {
          applicant_id: string
          cover_letter: string | null
          created_at: string | null
          id: string
          opportunity_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          applicant_id: string
          cover_letter?: string | null
          created_at?: string | null
          id?: string
          opportunity_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          applicant_id?: string
          cover_letter?: string | null
          created_at?: string | null
          id?: string
          opportunity_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      post_bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          media_type: string
          media_url: string
          post_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          media_type: string
          media_url: string
          post_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          media_type?: string
          media_url?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          id: string
          is_published: boolean | null
          media_type: string | null
          media_url: string | null
          published_at: string | null
          scheduled_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          media_type?: string | null
          media_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          media_type?: string | null
          media_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preapproved_emails: {
        Row: {
          approved_by: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preapproved_emails_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          id: string
          profile_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          profile_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          profile_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about: string | null
          academic_accomplishments: string | null
          approval_status: string
          athletic_accomplishments: string | null
          avatar_url: string | null
          biography: string | null
          contact_privacy: string | null
          created_at: string | null
          degree: string | null
          email: string
          first_name: string | null
          id: string
          job_experiences: Json | null
          last_name: string | null
          location: string | null
          phone: string | null
          resume_url: string | null
          skills: string[] | null
          sport: string | null
          university: string | null
          updated_at: string | null
        }
        Insert: {
          about?: string | null
          academic_accomplishments?: string | null
          approval_status?: string
          athletic_accomplishments?: string | null
          avatar_url?: string | null
          biography?: string | null
          contact_privacy?: string | null
          created_at?: string | null
          degree?: string | null
          email: string
          first_name?: string | null
          id: string
          job_experiences?: Json | null
          last_name?: string | null
          location?: string | null
          phone?: string | null
          resume_url?: string | null
          skills?: string[] | null
          sport?: string | null
          university?: string | null
          updated_at?: string | null
        }
        Update: {
          about?: string | null
          academic_accomplishments?: string | null
          approval_status?: string
          athletic_accomplishments?: string | null
          avatar_url?: string | null
          biography?: string | null
          contact_privacy?: string | null
          created_at?: string | null
          degree?: string | null
          email?: string
          first_name?: string | null
          id?: string
          job_experiences?: Json | null
          last_name?: string | null
          location?: string | null
          phone?: string | null
          resume_url?: string | null
          skills?: string[] | null
          sport?: string | null
          university?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      resource_clicks: {
        Row: {
          clicked_at: string | null
          id: string
          resource_id: string
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          id?: string
          resource_id: string
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          id?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_clicks_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          category: string
          content_type: string
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          logo_url: string | null
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          category: string
          content_type: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          category?: string
          content_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      role_change_requests: {
        Row: {
          created_at: string
          current_role: string
          id: string
          reason: string
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_role: string
          id?: string
          reason: string
          requested_role: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_role?: string
          id?: string
          reason?: string
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_change_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_status: {
        Row: {
          conversation_id: string
          id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_hidden_messages: {
        Row: {
          hidden_at: string | null
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          hidden_at?: string | null
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          hidden_at?: string | null
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_users_connected: {
        Args: { user_id_1: string; user_id_2: string }
        Returns: boolean
      }
      assign_user_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      audit_auth_event: {
        Args: { p_details: Json; p_event_type: string; p_user_id: string }
        Returns: undefined
      }
      auto_approve_if_preapproved: {
        Args: { p_email: string; p_user_id: string }
        Returns: boolean
      }
      can_view_contact_info: {
        Args: { viewed_user_id: string; viewer_id: string }
        Returns: boolean
      }
      check_user_approval: {
        Args: never
        Returns: {
          approval_status: string
          is_approved: boolean
        }[]
      }
      get_conversation_summaries: {
        Args: { user_uuid: string }
        Returns: {
          avatar_url: string
          id: string
          is_group: boolean
          last_message: string
          last_message_date: string
          name: string
          role: string
          role_type: string
          thread_id: string
          unread_count: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_thread_member: { Args: { p_thread_id: string }; Returns: boolean }
      update_user_base_role: {
        Args: { p_new_role: string; p_user_id: string }
        Returns: undefined
      }
      upsert_preapproved_emails: {
        Args: { p_admin_id: string; p_emails: string[] }
        Returns: {
          auto_approved: number
          inserted_or_updated: number
          processed_count: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "athlete" | "mentor" | "employer"
      badge_type: "FOUNDING_MEMBER"
      feedback_status: "NEW" | "REVIEWED" | "RESOLVED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "athlete", "mentor", "employer"],
      badge_type: ["FOUNDING_MEMBER"],
      feedback_status: ["NEW", "REVIEWED", "RESOLVED"],
    },
  },
} as const
