"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AddServer() {
  const [name, setName] = useState('');
  const [hostUrl, setHostUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [slotsAvailable, setSlotsAvailable] = useState(21);
  const [lightningAddress, setLightningAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const { showToast } = useToast();

  // Function to format URL automatically
  const formatHostUrl = (url: string): string => {
    if (!url) return url;
    
    // If it already has a protocol, return as is
    if (url.match(/^https?:\/\//)) {
      return url;
    }
    
    // If it looks like a domain (contains dots and no spaces), add https://
    if (url.includes('.') && !url.includes(' ')) {
      return `https://${url}`;
    }
    
    return url;
  };

  const handleHostUrlBlur = () => {
    const formattedUrl = formatHostUrl(hostUrl);
    if (formattedUrl !== hostUrl) {
      setHostUrl(formattedUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name, 
          host_url: hostUrl, 
          api_key: apiKey,
          description: description || undefined,
          is_public: isPublic,
          slots_available: slotsAvailable,
          lightning_address: lightningAddress
        }),
      });

      if (response.ok) {
        showToast('Server added successfully!', 'success');
        router.push('/dashboard');
      } else {
        const data = await response.json();
        if (data.details) {
          setErrors(data.details);
        } else {
          showToast(data.error || 'Failed to create server', 'error');
        }
      }
    } catch (error) {
      console.error('Error creating server:', error);
      showToast('Failed to create server', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 mb-4 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-all duration-200 shadow-sm hover:shadow w-fit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Add BTCPay Server</h1>
          </div>

        {/* Form */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-6 border border-neutral-200 dark:border-neutral-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Server Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700 transition-colors duration-200 ${
                  errors.name ? 'border-red-300 dark:border-red-600' : 'border-neutral-300 dark:border-neutral-600'
                }`}
                placeholder="My BTCPay Server"
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700 transition-colors duration-200 ${
                  errors.description ? 'border-red-300 dark:border-red-600' : 'border-neutral-300 dark:border-neutral-600'
                }`}
                placeholder="Brief description of your BTCPay server..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
              )}
            </div>

            <div>
              <label htmlFor="hostUrl" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Host URL *
              </label>
              <input
                type="url"
                id="hostUrl"
                value={hostUrl}
                onChange={(e) => setHostUrl(e.target.value)}
                onBlur={handleHostUrlBlur}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700 transition-colors duration-200 ${
                  errors.host_url ? 'border-red-300 dark:border-red-600' : 'border-neutral-300 dark:border-neutral-600'
                }`}
                placeholder="https://your-btcpay-server.com"
                required
              />
              {errors.host_url && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.host_url}</p>
              )}
            </div>

            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                API Key *
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700 transition-colors duration-200 ${
                  errors.api_key ? 'border-red-300 dark:border-red-600' : 'border-neutral-300 dark:border-neutral-600'
                }`}
                placeholder="Your BTCPay Server API key"
                required
              />
              {errors.api_key && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.api_key}</p>
              )}
            </div>

            <div>
              <label htmlFor="lightningAddress" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Lightning Address for Payments *
              </label>
              <input
                type="text"
                id="lightningAddress"
                value={lightningAddress}
                onChange={(e) => setLightningAddress(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700 transition-colors duration-200 ${
                  errors.lightning_address ? 'border-red-300 dark:border-red-600' : 'border-neutral-300 dark:border-neutral-600'
                }`}
                placeholder="yourlightningaddress@domain.com"
                required
              />
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                This is where you'll receive subscription payments from shop owners
              </p>
              {errors.lightning_address && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lightning_address}</p>
              )}
            </div>

            <div>
              <label htmlFor="slotsAvailable" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Available Slots for Shops *
              </label>
              <input
                type="number"
                id="slotsAvailable"
                value={slotsAvailable}
                onChange={(e) => setSlotsAvailable(Number(e.target.value))}
                min="1"
                max="1000"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700 transition-colors duration-200 ${
                  errors.slots_available ? 'border-red-300 dark:border-red-600' : 'border-neutral-300 dark:border-neutral-600'
                }`}
                required
              />
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                How many shops can your server handle? This depends on your server's resources.
                For example, a 4GB RAM, 2-core virtual machine (like m4.luna on LunaNode) can typically handle 20-30 shops comfortably.
              </p>
              {errors.slots_available && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.slots_available}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Public Listing *
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isPublic"
                    value="true"
                    checked={isPublic === true}
                    onChange={() => setIsPublic(true)}
                    className="mr-2 text-orange-600 dark:text-orange-400 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Yes - List on public directory</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isPublic"
                    value="false"
                    checked={isPublic === false}
                    onChange={() => setIsPublic(false)}
                    className="mr-2 text-orange-600 dark:text-orange-400 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">No - Private server only</span>
                </label>
              </div>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Public servers will be visible to shop owners looking for BTCPay servers
              </p>
              {errors.is_public && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.is_public}</p>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed magnetic-pull"
              >
                {loading ? 'Adding Server...' : 'Add Server'}
              </button>
              <Link
                href="/dashboard"
                className="flex-1 bg-white dark:bg-neutral-900 text-orange-600 dark:text-orange-500 py-3 px-4 rounded-xl font-semibold border-2 border-orange-600 dark:border-orange-500 hover:bg-orange-50 dark:hover:bg-neutral-800 transition-all duration-200 shadow-lg hover:shadow-xl text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
} 