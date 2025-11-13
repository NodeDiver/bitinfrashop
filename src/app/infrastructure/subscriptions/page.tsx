"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function InfrastructureSubscriptions() {
  const { user, logout } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Array<{
    id: number;
    shop_name: string;
    shop_owner: string;
    server_name: string;
    amount_sats: number;
    interval: string;
    status: string;
    created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const response = await fetch('/api/subscriptions');
        if (response.ok) {
          const data = await response.json();
          setSubscriptions(data.subscriptions);
        } else {
          setError('Failed to fetch subscriptions');
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        setError('Failed to fetch subscriptions');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <Link
                  href="/infrastructure"
                  className="inline-flex items-center gap-2 px-4 py-2 mb-4 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-all duration-200 shadow-sm hover:shadow w-fit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Back to Infrastructure</span>
                </Link>
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                  All Subscriptions
                </h1>
              </div>
            <div className="flex items-center space-x-4">
              <span className="text-neutral-600 dark:text-neutral-400">Welcome, {user?.username}</span>
              <button
                onClick={handleLogout}
                className="text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 dark:border-orange-400 mx-auto"></div>
              <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading subscriptions...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 py-8">
              <p>{error}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700">
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Subscription Overview</h2>
                <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                  {subscriptions.length} total subscriptions across all servers
                </p>
              </div>
              <div className="p-6">
                {subscriptions.length === 0 ? (
                  <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                    <p>No subscriptions found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                      <thead className="bg-neutral-50 dark:bg-neutral-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Shop
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Server
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Interval
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                        {subscriptions.map((subscription) => (
                          <tr key={subscription.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-neutral-900 dark:text-white">
                                {subscription.shop_name}
                              </div>
                              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                {subscription.shop_owner}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                              {subscription.server_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                              {subscription.amount_sats} sats
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                              {subscription.interval}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                                {subscription.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                              {new Date(subscription.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
} 