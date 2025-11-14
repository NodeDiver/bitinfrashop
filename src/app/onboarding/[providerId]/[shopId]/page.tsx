"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import ProtectedRoute from '@/components/ProtectedRoute';

interface OnboardingData {
  provider: {
    id: number;
    name: string;
    service_type: string;
    host_url?: string;
    onboarding_welcome_text?: string;
    onboarding_setup_steps?: Array<{ text: string; order: number }>;
    onboarding_external_links?: Array<{ text: string; url: string }>;
    onboarding_contact_info?: {
      email?: string;
      chat?: string;
      hours?: string;
    };
  };
  shop: {
    id: number;
    name: string;
    btcpay_username?: string;
    btcpay_password?: string;
  };
}

export default function OnboardingPage() {
  const params = useParams();
  const { providerId, shopId } = params;
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OnboardingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOnboardingData();
  }, [providerId, shopId]);

  const fetchOnboardingData = async () => {
    try {
      const response = await fetch(`/api/onboarding/${providerId}/${shopId}`);
      if (response.ok) {
        const onboardingData = await response.json();
        setData(onboardingData);
      } else {
        setError('Failed to load onboarding information');
      }
    } catch (err) {
      console.error('Error fetching onboarding data:', err);
      setError('Network error loading onboarding information');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-neutral-600 dark:text-neutral-300">Loading onboarding information...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !data) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-red-900 dark:text-red-200 mb-3">Error</h2>
              <p className="text-red-800 dark:text-red-300 mb-4">{error}</p>
              <Link
                href="/dashboard"
                className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 p-6">
        <div className="max-w-4xl mx-auto">
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
          </div>

          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-2xl p-8 mb-8 border border-orange-100 dark:border-orange-900/50">
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-3">
              Welcome to {data.provider.name}! 🎉
            </h1>
            <p className="text-xl text-neutral-700 dark:text-neutral-300">
              Your shop "{data.shop.name}" is connected
            </p>
          </div>

          {/* Welcome Text */}
          {data.provider.onboarding_welcome_text && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {data.provider.onboarding_welcome_text}
              </p>
            </div>
          )}

          {/* BTCPay Credentials (if applicable) */}
          {data.shop.btcpay_username && data.shop.btcpay_password && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <span>🔑</span>
                Your BTCPay Server Credentials
              </h2>

              <div className="space-y-4 bg-neutral-50 dark:bg-neutral-700 rounded-xl p-4">
                {/* Server URL */}
                {data.provider.host_url && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Server URL
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 rounded-lg text-sm font-mono">
                        {data.provider.host_url}
                      </code>
                      <button
                        onClick={() => copyToClipboard(data.provider.host_url || '', 'Server URL')}
                        className="px-3 py-2 bg-neutral-200 dark:bg-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-500 rounded-lg text-sm font-medium transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Username
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 rounded-lg text-sm font-mono">
                      {data.shop.btcpay_username}
                    </code>
                    <button
                      onClick={() => copyToClipboard(data.shop.btcpay_username || '', 'Username')}
                      className="px-3 py-2 bg-neutral-200 dark:bg-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-500 rounded-lg text-sm font-medium transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Temporary Password
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 rounded-lg text-sm font-mono">
                      {data.shop.btcpay_password}
                    </code>
                    <button
                      onClick={() => copyToClipboard(data.shop.btcpay_password || '', 'Password')}
                      className="px-3 py-2 bg-neutral-200 dark:bg-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-500 rounded-lg text-sm font-medium transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
                    <span className="text-lg">⚠️</span>
                    <span>Change your password after first login for security</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Setup Steps */}
          {data.provider.onboarding_setup_steps && data.provider.onboarding_setup_steps.length > 0 && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                Next Steps
              </h2>
              <div className="space-y-3">
                {data.provider.onboarding_setup_steps
                  .sort((a, b) => a.order - b.order)
                  .map((step, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{index + 1}</span>
                      </div>
                      <p className="flex-1 text-neutral-700 dark:text-neutral-300 pt-1">
                        {step.text}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* External Links */}
          {data.provider.onboarding_external_links && data.provider.onboarding_external_links.length > 0 && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                Helpful Links
              </h2>
              <div className="space-y-2">
                {data.provider.onboarding_external_links.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors group"
                  >
                    <span className="flex-1 text-neutral-900 dark:text-white font-medium">
                      {link.text}
                    </span>
                    <svg className="w-5 h-5 text-neutral-500 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Contact Information */}
          {data.provider.onboarding_contact_info && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                Need Help?
              </h2>
              <div className="space-y-2 text-neutral-700 dark:text-neutral-300">
                {data.provider.onboarding_contact_info.email && (
                  <p>
                    <strong>Email:</strong>{' '}
                    <a href={`mailto:${data.provider.onboarding_contact_info.email}`} className="text-orange-600 dark:text-orange-400 hover:underline">
                      {data.provider.onboarding_contact_info.email}
                    </a>
                  </p>
                )}
                {data.provider.onboarding_contact_info.chat && (
                  <p>
                    <strong>Chat:</strong>{' '}
                    <a href={data.provider.onboarding_contact_info.chat} target="_blank" rel="noopener noreferrer" className="text-orange-600 dark:text-orange-400 hover:underline">
                      Join our chat
                    </a>
                  </p>
                )}
                {data.provider.onboarding_contact_info.hours && (
                  <p>
                    <strong>Support Hours:</strong> {data.provider.onboarding_contact_info.hours}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl text-center"
            >
              Go to Dashboard
            </Link>
            {data.provider.host_url && (
              <a
                href={data.provider.host_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-6 py-3 border-2 border-orange-600 dark:border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl font-semibold transition-all duration-200 text-center"
              >
                Open {data.provider.service_type === 'BTCPAY_SERVER' ? 'BTCPay Server' : 'Provider Dashboard'}
              </a>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
