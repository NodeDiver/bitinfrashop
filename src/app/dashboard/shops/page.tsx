'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConnectionStatus from '@/components/ConnectionStatus';

interface Shop {
  id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  contact_email: string | null;
  lightning_address: string | null;
  is_public: boolean;
  btcpay_username: string | null;
  onboarding_completed: boolean;
  created_at: string;
  connections: Array<{
    id: number;
    status: 'ACTIVE' | 'PENDING' | 'PENDING_SETUP' | 'FAILED' | 'DISCONNECTED';
    connection_type: string;
    subscription_amount: number | null;
    setup_error: string | null;
    retry_count: number;
    provider: {
      id: number;
      name: string;
      service_type: string;
    };
  }>;
  payment_history: Array<{
    id: number;
    payment_amount: number;
    payment_date: string;
    status: string;
  }>;
}

export default function ShopOwnerDashboard() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShop, setSelectedShop] = useState<number | null>(null);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/shops');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to fetch shops');
      }

      const data = await response.json();
      setShops(data.shops);

      // Auto-select first shop
      if (data.shops.length > 0 && !selectedShop) {
        setSelectedShop(data.shops[0].id);
      }

    } catch (error) {
      console.error('Error fetching shops:', error);
      setError('Failed to load your shops');
    } finally {
      setLoading(false);
    }
  };

  const currentShop = shops.find(s => s.id === selectedShop);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-neutral-600 dark:text-neutral-400">Loading your shops...</div>
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

  if (shops.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            No Shops Yet
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Create your first shop to get started!
          </p>
          <button
            onClick={() => router.push('/shops/add-shop')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg"
          >
            Create Shop
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
          Shop Dashboard
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Manage your shops and connections
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shop List Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Your Shops
              </h2>
              <button
                onClick={() => router.push('/shops/add-shop')}
                className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm"
              >
                + New
              </button>
            </div>

            <div className="space-y-2">
              {shops.map(shop => (
                <button
                  key={shop.id}
                  onClick={() => setSelectedShop(shop.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedShop === shop.id
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500'
                      : 'bg-neutral-50 dark:bg-neutral-700 border-2 border-transparent hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">
                    {shop.name}
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {shop.connections.length} connection{shop.connections.length !== 1 ? 's' : ''}
                  </div>
                  {shop.connections.some(c => c.status === 'FAILED' || c.status === 'PENDING_SETUP') && (
                    <div className="mt-1">
                      <span className="inline-block px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded">
                        Needs Attention
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Shop Details */}
        {currentShop && (
          <div className="lg:col-span-2 space-y-6">
            {/* Shop Info Card */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {currentShop.name}
                  </h2>
                  {currentShop.description && (
                    <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                      {currentShop.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => router.push(`/shops/${currentShop.id}/edit`)}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-100 rounded-lg text-sm"
                >
                  Edit Shop
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {currentShop.website && (
                  <div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">Website</div>
                    <a
                      href={currentShop.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      {currentShop.website}
                    </a>
                  </div>
                )}
                {currentShop.contact_email && (
                  <div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">Email</div>
                    <div className="text-neutral-900 dark:text-neutral-100">{currentShop.contact_email}</div>
                  </div>
                )}
                {currentShop.lightning_address && (
                  <div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">Lightning Address</div>
                    <div className="text-neutral-900 dark:text-neutral-100 font-mono text-sm">
                      {currentShop.lightning_address}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">Visibility</div>
                  <div className="text-neutral-900 dark:text-neutral-100">
                    {currentShop.is_public ? 'Public' : 'Private'}
                  </div>
                </div>
              </div>
            </div>

            {/* Connections Card */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  Provider Connections
                </h3>
                <button
                  onClick={() => router.push('/providers')}
                  className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
                >
                  Find Providers
                </button>
              </div>

              {currentShop.connections.length === 0 ? (
                <div className="text-center py-8 text-neutral-600 dark:text-neutral-400">
                  <p>No provider connections yet.</p>
                  <button
                    onClick={() => router.push('/providers')}
                    className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                  >
                    Connect to Provider
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentShop.connections.map(connection => (
                    <div
                      key={connection.id}
                      className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg"
                    >
                      <ConnectionStatus
                        connection={connection}
                        onRetrySuccess={fetchShops}
                      />

                      {connection.subscription_amount && (
                        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-600">
                          <div className="text-sm text-neutral-600 dark:text-neutral-400">
                            Subscription: {connection.subscription_amount.toLocaleString()} sats
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment History Card */}
            {currentShop.payment_history && currentShop.payment_history.length > 0 && (
              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                  Recent Payments
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {currentShop.payment_history.slice(0, 5).map(payment => (
                        <tr key={payment.id} className="border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <td className="py-3 text-neutral-900 dark:text-neutral-100">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-neutral-900 dark:text-neutral-100">
                            {payment.payment_amount.toLocaleString()} sats
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              payment.status === 'success'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
