export interface PricingTier {
  name?: string;
  price?: number;
  model?: string;
  features?: string[];
  [key: string]: unknown;
}

export interface TechnicalSpecs {
  capacity?: number;
  uptime?: string;
  features?: string[];
  [key: string]: unknown;
}

export interface InfrastructureProvider {
  id: string;
  provider_id: number;
  type: 'infrastructure';
  source: 'local';
  name: string;
  description?: string;
  logo_url?: string;
  service_type: 'BTCPAY_SERVER' | 'BLFS' | 'OTHER';
  website?: string;
  contact_email?: string;
  lightning_address?: string;
  pricing_tiers?: PricingTier | PricingTier[] | null;
  technical_specs?: TechnicalSpecs | null;
  supports_nwc?: boolean;
  total_slots?: number | null;
  connected_shops: number;
  available_slots?: number | null;
  owner?: {
    id: number;
    username?: string;
    name?: string;
  };
  // Onboarding fields
  onboarding_welcome_text?: string | null;
  onboarding_setup_steps?: Array<{ text: string; order: number }> | null;
  onboarding_external_links?: Array<{ text: string; url: string }> | null;
  onboarding_contact_info?: {
    email?: string;
    chat?: string;
    hours?: string;
  } | null;
  created_at: string;
  updated_at: string;
}
