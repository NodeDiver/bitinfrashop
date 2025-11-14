"use client";

import { useState, useEffect, useCallback } from 'react';
import { InfrastructureProvider } from '@/types/provider';

interface ProviderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProvider: (provider: InfrastructureProvider) => void;
}

export default function ProviderSelectionModal({
  isOpen,
  onClose,
  onSelectProvider
}: ProviderSelectionModalProps) {
  const [providers, setProviders] = useState<InfrastructureProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<InfrastructureProvider | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProviders();
    }
  }, [isOpen, serviceTypeFilter, searchInput]);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('type', 'infrastructure');
      if (serviceTypeFilter !== 'all') {
        params.append('serviceType', serviceTypeFilter);
      }
      if (searchInput) {
        params.append('search', searchInput);
      }

      const response = await fetch(`/api/search/unified?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProviders(data.results);
      } else {
        setError('Failed to load providers');
      }
    } catch (err) {
      setError('Network error loading providers');
      console.error('Error fetching providers:', err);
    } finally {
      setLoading(false);
    }
  }, [serviceTypeFilter, searchInput]);

  const handleProviderClick = (provider: InfrastructureProvider) => {
    setSelectedProvider(provider);
  };

  const handleBack = () => {
    setSelectedProvider(null);
  };

  const handleSubscribe = () => {
    if (selectedProvider) {
      onSelectProvider(selectedProvider);
    }
  };

  if (!isOpen) return null;

  const getServiceTypeName = (type: string) => {
    switch (type) {
      case 'BTCPAY_SERVER': return 'BTCPay Server';
      case 'BLFS': return 'BLFS (Rizful)';
      case 'OTHER': return 'Other';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            {selectedProvider && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                aria-label="Back to list"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {selectedProvider ? 'Provider Details' : 'Find Infrastructure Provider'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedProvider ? (
            <>
              {/* Search and Filters */}
              <div className="mb-6 space-y-4">
                {/* Search Bar */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search providers..."
                    className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700"
                  />
                </div>

                {/* Service Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Service Type
                  </label>
                  <select
                    value={serviceTypeFilter}
                    onChange={(e) => setServiceTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700"
                  >
                    <option value="all">All Types</option>
                    <option value="BTCPAY_SERVER">BTCPay Server</option>
                    <option value="BLFS">BLFS (Rizful)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Provider List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-4 text-neutral-600 dark:text-neutral-300">Loading providers...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-4">{error}</p>
                  <button
                    onClick={fetchProviders}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : providers.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-neutral-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-neutral-600 dark:text-neutral-400">No providers found</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">Try adjusting your filters or check back later</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className="bg-white dark:bg-neutral-700 rounded-xl border border-neutral-200 dark:border-neutral-600 p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                      onClick={() => handleProviderClick(provider)}
                    >
                      {/* Badges */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                          {getServiceTypeName(provider.service_type)}
                        </span>
                        {provider.available_slots !== null && provider.available_slots > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300">
                            {provider.available_slots} slots
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                        {provider.name}
                      </h3>

                      {/* Description */}
                      {provider.description && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
                          {provider.description}
                        </p>
                      )}

                      {/* View Details Button */}
                      <button className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-500 text-neutral-900 dark:text-white rounded-lg font-medium transition-colors">
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Provider Details View */
            <div className="space-y-6">
              {/* Badges */}
              <div className="flex items-center gap-2">
                <span className="text-sm px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                  {getServiceTypeName(selectedProvider.service_type)}
                </span>
                {selectedProvider.available_slots !== null && selectedProvider.available_slots > 0 && (
                  <span className="text-sm px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300">
                    {selectedProvider.available_slots} slots available
                  </span>
                )}
              </div>

              {/* Name */}
              <h3 className="text-3xl font-bold text-neutral-900 dark:text-white">
                {selectedProvider.name}
              </h3>

              {/* Description */}
              {selectedProvider.description && (
                <p className="text-neutral-600 dark:text-neutral-400">
                  {selectedProvider.description}
                </p>
              )}

              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6 space-y-4">
                {/* Lightning Address */}
                {selectedProvider.lightning_address && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      ⚡ Server Owner's Lightning Address
                    </h4>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-sm font-mono">
                        {selectedProvider.lightning_address}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(selectedProvider.lightning_address || '')}
                        className="px-3 py-2 bg-neutral-200 dark:bg-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-500 rounded-lg text-sm font-medium transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                {(selectedProvider.contact_email || selectedProvider.website) && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      📧 Contact Information
                    </h4>
                    <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                      {selectedProvider.contact_email && (
                        <p>Email: {selectedProvider.contact_email}</p>
                      )}
                      {selectedProvider.website && (
                        <p>
                          Website:{' '}
                          <a
                            href={selectedProvider.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 dark:text-orange-400 hover:underline"
                          >
                            {selectedProvider.website}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Features */}
                <div>
                  <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    ✨ Features
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProvider.supports_nwc && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded">
                        NWC Support
                      </span>
                    )}
                    <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded">
                      {selectedProvider.connected_shops} shop{selectedProvider.connected_shops !== 1 ? 's' : ''} connected
                    </span>
                  </div>
                </div>
              </div>

              {/* Subscribe Button */}
              <button
                onClick={handleSubscribe}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Subscribe to This Provider
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
