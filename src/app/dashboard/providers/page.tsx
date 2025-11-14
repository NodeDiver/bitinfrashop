'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProviderStats {
  id: number;
  name: string;
  service_type: string;
  total_connections: number;
  active_connections: number;
  failed_connections: number;
  pending_connections: number;
  total_revenue: number;
  monthly_revenue: number;
  connected_shops: Array<{
    id: number;
    shop_name: string;
    status: string;
    subscription_amount: number | null;
    connected_since: string;
    last_payment: string | null;
  }>;
  recent_events: Array<{
    id: number;
    event_type: string;
    shop_name: string;
    timestamp: string;
    details: string;
  }>;
}

export default function ProviderDashboard() {
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/providers');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to fetch providers');
      }

      const data = await response.json();
      setProviders(data.providers);

      if (data.providers.length > 0 && !selectedProvider) {
        setSelectedProvider(data.providers[0].id);
      }

    } catch (error) {
      console.error('Error fetching providers:', error);
      setError('Failed to load your providers');
    } finally {
      setLoading(false);
    }
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-neutral-600 dark:text-neutral-400">Loading your providers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            No Providers Yet
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Register as a provider to start offering services!
          </p>
          <button
            onClick={() => router.push('/providers/register')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg"
          >
            Register as Provider
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Provider Dashboard
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Manage your infrastructure services
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Provider List Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Your Providers
            </h2>

            <div className="space-y-2">
              {providers.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedProvider === provider.id
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500'
                      : 'bg-neutral-50 dark:bg-neutral-700 border-2 border-transparent hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">
                    {provider.name}
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {provider.active_connections} active
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Provider Details */}
        {currentProvider && (
          <div className="lg:col-span-3 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Total Connections</div>
                <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {currentProvider.total_connections}
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Active</div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {currentProvider.active_connections}
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Failed</div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {currentProvider.failed_connections}
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Monthly Revenue</div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {currentProvider.monthly_revenue.toLocaleString()}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">sats</div>
              </div>
            </div>

            {/* Header with Settings Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {currentProvider.name}
              </h2>
              <button
                onClick={() => router.push(`/admin/provider-settings/${currentProvider.id}`)}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-100 rounded-lg text-sm"
              >
                Settings
              </button>
            </div>

            {/* Connected Shops */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Connected Shops
              </h3>

              {currentProvider.connected_shops.length === 0 ? (
                <div className="text-center py-8 text-neutral-600 dark:text-neutral-400">
                  No shops connected yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
                        <th className="pb-3">Shop Name</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Subscription</th>
                        <th className="pb-3">Connected Since</th>
                        <th className="pb-3">Last Payment</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {currentProvider.connected_shops.map(shop => (
                        <tr key={shop.id} className="border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <td className="py-3 text-neutral-900 dark:text-neutral-100 font-medium">
                            {shop.shop_name}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              shop.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : shop.status === 'FAILED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {shop.status}
                            </span>
                          </td>
                          <td className="py-3 text-neutral-900 dark:text-neutral-100">
                            {shop.subscription_amount ? `${shop.subscription_amount.toLocaleString()} sats` : '-'}
                          </td>
                          <td className="py-3 text-neutral-900 dark:text-neutral-100">
                            {new Date(shop.connected_since).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-neutral-900 dark:text-neutral-100">
                            {shop.last_payment ? new Date(shop.last_payment).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Events */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Recent Events
              </h3>

              {currentProvider.recent_events.length === 0 ? (
                <div className="text-center py-8 text-neutral-600 dark:text-neutral-400">
                  No recent events.
                </div>
              ) : (
                <div className="space-y-3">
                  {currentProvider.recent_events.map(event => (
                    <div
                      key={event.id}
                      className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-neutral-100">
                            {event.event_type}
                          </div>
                          <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            {event.shop_name}: {event.details}
                          </div>
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
