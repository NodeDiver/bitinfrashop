"use client";

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Provider {
  id: number;
  name: string;
  description: string;
  service_type: string;
  website?: string;
  contact_email?: string;
  pricing_tiers?: any;
  supports_nwc: boolean;
  total_slots?: number | null;
  connected_shops: number;
  available_slots?: number | null;
}

interface Shop {
  id: number;
  name: string;
  description?: string;
  website?: string;
  has_active_connection: boolean;
}

export default function ConnectProviderPage({ params }: { params: Promise<{ providerId: string }> }) {
  const router = useRouter();
  const { providerId } = use(params);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [connectionType, setConnectionType] = useState<'PAID_SUBSCRIPTION' | 'FREE_LISTING' | 'SELF_REPORTED'>('FREE_LISTING');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviderAndShops();
  }, [providerId]);

  const fetchProviderAndShops = async () => {
    try {
      // Fetch provider details
      const providerResponse = await fetch(`/api/providers/${providerId}`);
      if (providerResponse.ok) {
        const providerData = await providerResponse.json();
        setProvider(providerData.provider);
      } else {
        setError('Provider not found');
        return;
      }

      // Fetch user's unlinked shops
      const shopsResponse = await fetch('/api/shops/unlinked');
      if (shopsResponse.ok) {
        const shopsData = await shopsResponse.json();
        setShops(shopsData.shops || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedShopId) {
      setError('Please select a shop');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: selectedShopId,
          providerId: parseInt(providerId),
          connectionType
        })
      });

      if (response.ok) {
        router.push('/dashboard?message=connection_pending');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create connection');
      }
    } catch (err) {
      console.error('Error creating connection:', err);
      setError('Failed to create connection');
    } finally {
      setSubmitting(false);
    }
  };

  const getServiceTypeName = (type: string) => {
    switch (type) {
      case 'BTCPAY_SERVER': return 'BTCPay Server';
      case 'BLFS': return 'BLFS';
      case 'OTHER': return 'Other';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600 dark:text-neutral-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !provider) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-8 border border-neutral-200 dark:border-neutral-700 text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">{error}</h2>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-all duration-200 shadow-sm hover:shadow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Discover</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 mb-4 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-all duration-200 shadow-sm hover:shadow w-fit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Discover</span>
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Connect to Infrastructure Provider
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300 mt-2">
            Link your shop to start accepting Bitcoin payments
          </p>
        </div>

        {/* Provider Info Card */}
        {provider && (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-6 mb-6 border border-amber-200 dark:border-amber-700/50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="inline-block text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 mb-2">
                  {getServiceTypeName(provider.service_type)}
                </span>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {provider.name}
                </h2>
                {provider.description && (
                  <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                    {provider.description}
                  </p>
                )}
              </div>
              {provider.available_slots !== null && (
                <span className="text-xs px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300">
                  {provider.available_slots} spots left
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              {provider.website && (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 font-medium"
                >
                  Visit Website →
                </a>
              )}
              {provider.contact_email && (
                <a
                  href={`mailto:${provider.contact_email}`}
                  className="text-sm text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 font-medium"
                >
                  Contact Provider →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Connection Form */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-6 border border-neutral-200 dark:border-neutral-700">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
            Select Shop to Connect
          </h3>

          <form onSubmit={handleSubmit}>
            {/* Shop Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                Your Shops
              </label>

              {shops.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl">
                  <svg className="w-12 h-12 text-neutral-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                    You don't have any shops available to connect.
                  </p>
                  <Link
                    href="/shops/new"
                    className="inline-block px-6 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Add Your Shop
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {shops.map((shop) => (
                    <label
                      key={shop.id}
                      className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedShopId === shop.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-orange-300 dark:hover:border-orange-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shop"
                        value={shop.id}
                        checked={selectedShopId === shop.id}
                        onChange={() => setSelectedShopId(shop.id)}
                        className="mt-1 text-orange-600 focus:ring-orange-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-semibold text-neutral-900 dark:text-white">
                          {shop.name}
                        </p>
                        {shop.description && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            {shop.description}
                          </p>
                        )}
                        {shop.website && (
                          <a
                            href={shop.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 mt-1 inline-block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {shop.website}
                          </a>
                        )}
                      </div>
                    </label>
                  ))}

                  {/* Add new shop option */}
                  <Link
                    href="/shops/new"
                    className="flex items-center justify-center p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-600 dark:text-neutral-400 hover:border-orange-400 dark:hover:border-orange-600 hover:text-orange-600 dark:hover:text-orange-500 transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Another Shop
                  </Link>
                </div>
              )}
            </div>

            {/* Connection Type */}
            {shops.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  Connection Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-start p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <input
                      type="radio"
                      name="connectionType"
                      value="FREE_LISTING"
                      checked={connectionType === 'FREE_LISTING'}
                      onChange={() => setConnectionType('FREE_LISTING')}
                      className="mt-0.5 text-orange-600 focus:ring-orange-500"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-neutral-900 dark:text-white">Free Listing</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Connect for free without payment setup
                      </p>
                    </div>
                  </label>

                  {provider?.supports_nwc && (
                    <label className="flex items-start p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                      <input
                        type="radio"
                        name="connectionType"
                        value="PAID_SUBSCRIPTION"
                        checked={connectionType === 'PAID_SUBSCRIPTION'}
                        onChange={() => setConnectionType('PAID_SUBSCRIPTION')}
                        className="mt-0.5 text-orange-600 focus:ring-orange-500"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-neutral-900 dark:text-white">Paid Subscription</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Subscribe with automatic payments via NWC
                        </p>
                      </div>
                    </label>
                  )}

                  <label className="flex items-start p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <input
                      type="radio"
                      name="connectionType"
                      value="SELF_REPORTED"
                      checked={connectionType === 'SELF_REPORTED'}
                      onChange={() => setConnectionType('SELF_REPORTED')}
                      className="mt-0.5 text-orange-600 focus:ring-orange-500"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-neutral-900 dark:text-white">Self-Reported</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        I already use this provider (not verified)
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            {shops.length > 0 && (
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting || !selectedShopId}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:from-neutral-400 disabled:to-neutral-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                >
                  {submitting ? 'Connecting...' : 'Create Connection'}
                </button>
                <Link
                  href="/discover"
                  className="px-6 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 font-semibold transition-colors duration-200 text-center"
                >
                  Cancel
                </Link>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
