"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Shop {
  id: number;
  name: string;
  server_name: string;
  subscription_status: string;
}

interface BTCPayServer {
  id: number;
  name: string;
  host_url: string;
  description: string;
  lightning_address: string;
  available_slots: number;
  current_shops: number;
  is_online: boolean;
  last_seen_online?: string;
  is_owner: number;
  owner_id: number;
  created_at: string;
}

// Revenue Component for inline display - only shown to owners
function RevenueDisplay({ serverId }: { serverId: number }) {
  const [revenuePeriod, setRevenuePeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  // Calculate revenue for this specific server (placeholder - $10 per active subscription)
  const monthlyRevenue = 10; // Placeholder - would be calculated based on server's shops
  const yearlyRevenue = monthlyRevenue * 12;
  const currentRevenue = revenuePeriod === 'monthly' ? monthlyRevenue : yearlyRevenue;
  
  // Convert to satoshis (1 USD ≈ 3,000,000 sats as placeholder)
  const satoshiRate = 3000000;
  const revenueInSats = Math.round(currentRevenue * satoshiRate);

  return (
    <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3 ml-4 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="p-1 bg-orange-100 dark:bg-orange-900/50 rounded">
            <svg className="w-4 h-4 text-orange-600 dark:text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div className="ml-2">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Revenue</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">${currentRevenue}</p>
          </div>
        </div>
        
        {/* Period Toggle */}
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-600 rounded p-1">
          <button
            onClick={() => setRevenuePeriod('monthly')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              revenuePeriod === 'monthly'
                ? 'bg-white dark:bg-neutral-500 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            M
          </button>
          <button
            onClick={() => setRevenuePeriod('yearly')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              revenuePeriod === 'yearly'
                ? 'bg-white dark:bg-neutral-500 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Y
          </button>
        </div>
      </div>
      
      {/* Satoshi Conversion */}
      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {revenueInSats.toLocaleString()} sats
        </p>
      </div>
    </div>
  );
}

// Contact Admin Component for non-owners
function ContactAdminDisplay({ serverName }: { serverName: string }) {
  return (
    <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3 ml-4 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="p-1 bg-amber-100 dark:bg-amber-900/50 rounded">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="ml-2">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Contact Admin</p>
            <p className="text-xs text-gray-900 dark:text-white font-medium">{serverName}</p>
          </div>
        </div>
      </div>
      
      {/* Contact Button */}
      <div className="text-center">
        <button className="text-xs bg-gradient-to-r from-amber-600 to-amber-600 hover:from-amber-700 hover:to-amber-700 text-white px-3 py-1 rounded-lg shadow-sm hover:shadow transition-all duration-200">
          Message Admin
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [servers, setServers] = useState<BTCPayServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user's own shops
        const shopsResponse = await fetch('/api/user/shops');
        if (shopsResponse.ok) {
          const shopsData = await shopsResponse.json();
          setShops(shopsData.shops);
        }

        // Fetch user's own infrastructure providers
        const providersResponse = await fetch('/api/user/providers');
        if (providersResponse.ok) {
          const providersData = await providersResponse.json();
          // Transform providers to match server interface for backward compatibility
          const transformedProviders = providersData.providers.map((provider: any) => ({
            id: provider.id,
            name: provider.name,
            host_url: provider.website || '',
            description: provider.description,
            lightning_address: provider.lightning_address,
            available_slots: provider.slots_available,
            current_shops: provider.active_shops,
            is_online: true, // Default to online
            last_seen_online: new Date().toISOString(),
            is_owner: 1, // User owns all their providers
            owner_id: provider.owner.id,
            created_at: provider.created_at
          }));
          setServers(transformedProviders);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate additional stats
  const activeSubscriptions = shops.filter(shop => shop.subscription_status === 'active').length;
  const pendingSubscriptions = shops.filter(shop => shop.subscription_status === 'pending').length;
  const cancelledSubscriptions = shops.filter(shop => shop.subscription_status === 'cancelled').length;

  // Calculate total shops across all servers
  const totalShops = servers.reduce((sum, server) => sum + (server.current_shops || 0), 0);

  // Conditional display logic
  const ownedServers = servers.filter(server => server.is_owner === 1);
  const hasOwnedServers = ownedServers.length > 0;
  const hasActiveSubscriptions = activeSubscriptions > 0;

  // Helper function to format last seen time
  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than 1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-xl p-6 sm:p-8 mb-6 border border-orange-100 dark:border-orange-900/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-2">Dashboard</h1>
              <p className="text-neutral-600 dark:text-neutral-300">
                Manage your Bitcoin infrastructure and shops
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-all duration-200 shadow-sm hover:shadow w-fit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
        
        {/* Enhanced Overview Section */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-6 mb-8 border border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{servers.length}</div>
              <div className="text-neutral-600 dark:text-neutral-400">Total Servers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalShops}</div>
              <div className="text-neutral-600 dark:text-neutral-400">Total Shops</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{activeSubscriptions}</div>
              <div className="text-neutral-600 dark:text-neutral-400">Active Subscriptions</div>
            </div>
          </div>
        </div>
        
        {/* Two Boxes Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Box - BTCPay Servers */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">BTCPay Servers</h2>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 dark:border-orange-400 mx-auto"></div>
                  <p className="mt-2 text-neutral-600 dark:text-neutral-400">Loading servers...</p>
                </div>
              ) : error ? (
                <div className="text-center text-red-600 dark:text-red-400 py-8">
                  <p>{error}</p>
                </div>
              ) : servers.length === 0 ? (
                <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                  <p>You currently have not listed your BTCPay Server, please add one here.</p>
                  <Link href="/infrastructure/add-server">
                    <button className="mt-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl magnetic-pull">Add Server</button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {servers.map((server) => (
                    <div key={server.id} className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-lg transition-all duration-300">
                      <Link href={`/infrastructure/${server.id}`} className="flex-1 cursor-pointer transition-colors rounded p-2 -m-2">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-neutral-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-500 transition-colors">{server.name}</h3>
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${server.is_online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className={`text-xs font-medium ${server.is_online ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {server.is_online ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 transition-colors">{server.host_url}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-500 transition-colors">Added {new Date(server.created_at).toLocaleDateString()}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-500 transition-colors">
                          {server.current_shops || 0} shops connected
                        </p>
                        {!server.is_online && server.last_seen_online && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            Last seen online: {formatLastSeen(server.last_seen_online)}
                          </p>
                        )}
                      </Link>
                      
                      {/* Revenue Display inline with server - only for owners */}
                      {server.is_owner === 1 && <RevenueDisplay serverId={server.id} />}
                      
                      {/* Contact Admin Display for non-owners */}
                      {server.is_owner === 0 && <ContactAdminDisplay serverName={server.name} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Box - My Shops */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">My Shops</h2>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 dark:border-orange-400 mx-auto"></div>
                  <p className="mt-2 text-neutral-600 dark:text-neutral-400">Loading shops...</p>
                </div>
              ) : error ? (
                <div className="text-center text-red-600 dark:text-red-400 py-8">
                  <p>{error}</p>
                </div>
              ) : shops.length === 0 ? (
                <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                  <p>You currently have not listed your shop, please add one here.</p>
                  <Link href="/shops/add-shop">
                    <button className="mt-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl magnetic-pull">Add Shop</button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {shops.map((shop) => (
                    <div key={shop.id} className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-lg transition-all duration-300">
                      <div>
                        <h3 className="font-medium text-neutral-900 dark:text-white">{shop.name}</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">{shop.server_name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-500">Subscription: {shop.subscription_status}</p>
                      </div>
                      <Link
                        href={`/shops/${shop.id}`}
                        className="text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 font-semibold"
                      >
                        View Details →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 