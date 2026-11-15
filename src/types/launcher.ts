export interface RobloxGame {
  id: string;
  placeId: string;
  universeId?: number;
  name: string;
  creator: string;
  category: string;
  rating: number; // e.g. 94%
  activePlayers: number;
  totalVisits: string;
  thumbnail: string;
  iconUrl?: string;
  bannerImage?: string;
  videoUrl?: string;
  description: string;
  lastUpdated: string;
  maxServerSize: number;
  isFavorite?: boolean;
  isBookmarked?: boolean;
  ageRating?: string;
}

export interface RobloxAccount {
  id: string; // Real Roblox User ID (e.g. 156, 80254)
  username: string;
  displayName: string;
  avatarUrl: string; // Headshot
  avatarFullBodyUrl?: string; // Full body 3D render
  avatarType?: string; // R6 / R15
  description?: string; // Bio
  createdDate?: string;
  friendsCount?: number;
  followersCount?: number;
  followingsCount?: number;
  groups?: { id: number; name: string; role: string; memberCount: number }[];
  collectibles?: { assetId: number; name: string; recentAveragePrice: number }[];
  presence?: 'Online' | 'Offline' | 'In Game' | 'In Studio';
  robux?: number;
  isPremium: boolean;
  isVerified: boolean;
  role: string;
  lastActive: string;
  isPrimary?: boolean;
}

export interface ServerInstance {
  jobId: string;
  region: string;
  countryCode: string;
  ping: number;
  players: number;
  maxPlayers: number;
  fps: number;
}

export interface RobloxUserSearchResult {
  id: string;
  username: string;
  displayName: string;
  hasVerifiedBadge: boolean;
  avatarUrl: string;
}

export interface RobloxGroupSearchResult {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  hasVerifiedBadge: boolean;
  iconUrl: string;
}

export interface RobloxCatalogSearchResult {
  id: number;
  name: string;
  description: string;
  itemType: string;
  creatorName: string;
  price: number;
  favoriteCount: number;
  thumbnailUrl?: string;
}

export interface UnifiedSearchResults {
  query: string;
  games: RobloxGame[];
  users: RobloxUserSearchResult[];
  groups: RobloxGroupSearchResult[];
  items: RobloxCatalogSearchResult[];
  totalCount: number;
}

export interface RobloxServiceStatus {
  name: string;
  endpoint: string;
  status: 'operational' | 'degraded';
  latencyMs: number;
  statusCode?: number;
}

export interface RobloxApiStatus {
  connected: boolean;
  overallStatus: 'operational' | 'partial_outage' | 'offline';
  operationalCount: number;
  totalServices: number;
  averageLatencyMs: number;
  timestamp: number;
  services: RobloxServiceStatus[];
}

export interface RobloxBadge {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  iconUrl: string;
  winRatePercentage: number;
  awardedCount: number;
}

export interface RobloxExperienceVideo {
  id: string;
  type: 'roblox' | 'youtube';
  title: string;
  thumbnailUrl: string;
  streamUrl?: string;
  embedUrl?: string;
}

export interface RobloxExperienceDetails {
  game: RobloxGame;
  iconUrl: string;
  bannerUrl: string;
  screenshots: string[];
  videos: RobloxExperienceVideo[];
  upVotes: number;
  downVotes: number;
  favoritedCount: number;
  createdDate: string;
  badges: RobloxBadge[];
  servers: ServerInstance[];
}

export interface RobloxClientVersion {
  windowsPlayerVersion: string;
  windowsPlayerUpload: string;
  windowsStudioVersion: string;
  fetchedAt: number;
}



