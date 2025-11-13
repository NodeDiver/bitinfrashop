"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function ServerDashboard({ params }: { params: Promise<{ serverId: string }> }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [server, setServer] = useState<{
    id: number;
    name: string;
    host_url: string;
    isOwner: boolean;
  } | null>(null);
  const [shops, setShops] = useState<Array<{
    id: string;
    name: string;
    lightningAddress?: string;
    hasActiveSubscription: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serverId, setServerId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const handleDeleteServer = async () => {
    if (!server || !serverId) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Redirect to infrastructure page after successful deletion
        router.push('/infrastructure');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete server');
      }
    } catch (error) {
      console.error('Error deleting server:', error);
      setError('Failed to delete server');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    const fetchServerData = async () => {
      try {
        const { serverId: resolvedServerId } = await params;
        setServerId(resolvedServerId);
        
        // Fetch server details
        const serverResponse = await fetch(`/api/servers/${resolvedServerId}`);
        if (serverResponse.ok) {
          const serverData = await serverResponse.json();
          setServer(serverData.server);
        }

        // Fetch shops for this server
        const shopsResponse = await fetch(`/api/stores/${resolvedServerId}`);
        if (shopsResponse.ok) {
          const shopsData = await shopsResponse.json();
          setShops(shopsData.stores);
        }
      } catch (error) {
        console.error('Error fetching server data:', error);
        setError('Failed to fetch server data');
      } finally {
        setLoading(false);
      }
    };

    fetchServerData();
  }, [params]);
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
                  <span>Back to Servers</span>
                </Link>
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {server ? server.name : 'Server Dashboard'}
                </h1>
              </div>
            <div className="flex items-center space-x-4">
              {server && server.isOwner && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Server'}
                </button>
              )}
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                  Delete Server
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  Are you sure you want to delete "{server?.name}"? This action cannot be undone and will:
                </p>
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 space-y-1">
                  <li>• Remove the server from your account</li>
                  <li>• Cancel all active subscriptions</li>
                  <li>• Delete all associated shop data</li>
                </ul>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 px-4 py-2 rounded-xl font-semibold border-2 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteServer}
                    disabled={isDeleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 dark:border-orange-400 mx-auto"></div>
              <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading server data...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 dark:text-red-400 py-8">
              <p>{error}</p>
            </div>
          ) : server ? (
            <>
              {/* Info Box */}
              <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-6 mb-8 border border-neutral-200 dark:border-neutral-700">
                <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">Server Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">Server Name</div>
                    <div className="font-medium text-neutral-900 dark:text-white">{server.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">Host URL</div>
                    <div className="font-medium text-neutral-900 dark:text-white">{server.host_url}</div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">Number of Shops</div>
                    <div className="font-medium text-neutral-900 dark:text-white">{shops.length}</div>
                  </div>
                </div>
              </div>

              {/* Shops List */}
              <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Shops on this Server</h2>
                </div>
                <div className="p-6">
                  {shops.length === 0 ? (
                    <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                      <p>No shops found on this server.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {shops.map((shop) => (
                        <div key={shop.id} className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-lg transition-all duration-300">
                          <div>
                            <h3 className="font-medium text-neutral-900 dark:text-white">{shop.name}</h3>
                            {shop.lightningAddress && (
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">{shop.lightningAddress}</p>
                            )}
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Subscription: {shop.hasActiveSubscription ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                shop.hasActiveSubscription
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                              }`}>
                                {shop.hasActiveSubscription ? 'Subscribed' : 'Available'}
                              </span>
                              <Link
                                href={`/infrastructure/${serverId}/stores/${shop.id}`}
                                className="text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 font-medium transition-colors duration-200"
                              >
                                View Details →
                              </Link>
                            </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
              <p>Server not found.</p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
} 