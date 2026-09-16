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
  equipment_id: string | null;
  created_at: string;
}

export type EquipmentType = "telescope" | "eyepiece" | "binoculars";

export interface Equipment {
  id: string;
  user_id: string;
  name: string;
  type: EquipmentType;
  aperture_mm: number;
  focal_length_mm: number;
  eyepiece_focal_length_mm: number | null;
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

export interface StarParty {
  id: string;
  host_id: string;
  title: string;
  description: string;
  location_name: string;
  latitude: number;
  longitude: number;
  event_date: string;
  max_attendees: number;
  created_at: string;
}

export interface PartyAttendee {
  id: string;
  party_id: string;
  user_id: string;
  joined_at: string;
}

export interface StarPartyWithDetails extends StarParty {
  host?: {
    email: string;
    role: UserRole;
  } | null;
  attendee_count: number;
  is_attending: boolean;
}

export interface NotificationSettings {
  user_id: string;
  discord_webhook: string | null;
  min_score_threshold: number;
  enabled: boolean;
  updated_at: string;
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
          equipment_id?: string | null;
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
          equipment_id?: string | null;
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
      equipment: {
        Row: Equipment;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: EquipmentType;
          aperture_mm: number;
          focal_length_mm: number;
          eyepiece_focal_length_mm?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: EquipmentType;
          aperture_mm?: number;
          focal_length_mm?: number;
          eyepiece_focal_length_mm?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_user_id_fkey";
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
