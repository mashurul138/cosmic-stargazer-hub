export type UserRole = "stargazer" | "astronomer";

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Observation {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  celestial_target: string;
  location: string;
  rating: number;
  created_at: string;
}

export interface SavedEvent {
  id: string;
  user_id: string;
  event_title: string;
  event_date: string;
  notes: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };
      observations: {
        Row: Observation;
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          notes: string;
          celestial_target: string;
          location: string;
          rating: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          notes?: string;
          celestial_target?: string;
          location?: string;
          rating?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "observations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_events: {
        Row: SavedEvent;
        Insert: {
          id?: string;
          user_id: string;
          event_title: string;
          event_date: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_title?: string;
          event_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      handle_new_user: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      is_astronomer: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
