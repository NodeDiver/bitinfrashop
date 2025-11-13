"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useToast } from '@/contexts/ToastContext';
import ToggleSwitch from '@/components/ToggleSwitch';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

type Store = { 
  id: string; 
  name: string; 
  lightningAddress?: string;
  hasActiveSubscription?: boolean;
};

interface BTCPayServer {
  id: number;
  name: string;
  host_url: string;
  description: string;
  lightning_address: string;
  available_slots: number;
  current_shops: number;
}

export default function AddShop() {
  // BTCPay Server selection (filtered to public servers with 2+ slots)
  const [availableServers, setAvailableServers] = useState<BTCPayServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<BTCPayServer | null>(null);

  // Shop configuration
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [selectedShopHasSubscription, setSelectedShopHasSubscription] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);

  // Shop owner details (right side)
  const [shopOwnerLightningAddress, setShopOwnerLightningAddress] = useState("");
  const [isShopPublic, setIsShopPublic] = useState(true);

  // Subscription form fields
  const [amount, setAmount] = useState(500);
  const [timeframe, setTimeframe] = useState("30d");
  const [comment, setComment] = useState("");

  // Validation and feedback
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // State for the newly created shop ID
  const [createdShopId, setCreatedShopId] = useState<string | null>(null);
  const [showLightningSub, setShowLightningSub] = useState(false);

  // Helper function to convert frontend timeframe to backend interval
  const convertTimeframeToInterval = (timeframe: string): string => {
    const mapping: Record<string, string> = {
      '1h': 'hourly',
      '1d': 'daily', 
      '7d': 'weekly',
      '30d': 'monthly'
    };
    return mapping[timeframe] || 'daily';
  };

  // Fetch available BTCPay servers (public with 2+ slots)
  useEffect(() => {
    const fetchAvailableServers = async () => {
      try {
        const response = await fetch('/api/servers/public');
        if (response.ok) {
          const data = await response.json();
          // Filter servers with at least 2 available slots
          const filteredServers = data.servers.filter((server: BTCPayServer) => server.available_slots >= 2);
          setAvailableServers(filteredServers);
          if (filteredServers.length > 0) {
            setSelectedServer(filteredServers[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching servers:', error);
        showToast('Failed to fetch available servers', 'error');
      }
    };

    fetchAvailableServers();
  }, [showToast]);

  // Fetch stores when server changes
  useEffect(() => {
    if (!selectedServer) {
      setStores([]);
      setSelectedShop("");
      setSelectedShopHasSubscription(false);
      return;
    }
    
    const fetchStoresForServer = async () => {
      setLoadingStores(true);
      try {
        const response = await fetch(`/api/stores/${selectedServer.id}`);
        if (response.ok) {
          const data = await response.json();
          setStores(data.stores);
          
          // Select first available store (without active subscription)
          const availableStore = data.stores.find((store: Store) => !store.hasActiveSubscription);
          if (availableStore) {
            setSelectedShop(availableStore.id);
            setSelectedShopHasSubscription(false);
          } else {
            setSelectedShop("");
            setSelectedShopHasSubscription(false);
          }
        } else {
          console.error('Failed to fetch stores for server');
          setStores([]);
          setSelectedShop("");
          setSelectedShopHasSubscription(false);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
        setStores([]);
        setSelectedShop("");
        setSelectedShopHasSubscription(false);
      } finally {
        setLoadingStores(false);
      }
    };

    fetchStoresForServer();
  }, [selectedServer]);

  // Update selected shop subscription status when selection changes
  useEffect(() => {
    if (selectedShop && stores.length > 0) {
      const store = stores.find(s => s.id === selectedShop);
      setSelectedShopHasSubscription(store?.hasActiveSubscription || false);
    } else {
      setSelectedShopHasSubscription(false);
    }
  }, [selectedShop, stores]);

  // Update comment whenever shop or server changes
  useEffect(() => {
    const selected = stores.find((s) => s.id === selectedShop);
    const shopName = selected?.name || "";
    if (shopName && selectedServer) {
      setComment(`${shopName} subscription to ${selectedServer.name}`);
    }
  }, [selectedShop, selectedServer, stores]);

  // Handle subscribe button
  const handleSubscribe = async () => {
    setLoading(true);
    setErrors({});

    if (!selectedServer) {
      showToast('Please select a BTCPay server', 'error');
      setLoading(false);
      return;
    }

    if (!shopOwnerLightningAddress) {
      showToast('Please enter your lightning address for refunds', 'error');
      setLoading(false);
      return;
    }

    if (selectedShopHasSubscription) {
      showToast('Cannot create subscription to a shop that already has an active subscription', 'error');
      setLoading(false);
      return;
    }

    const selected = stores.find((s) => s.id === selectedShop);
    
    try {
      // First, create the shop in our database
      const shopResponse = await fetch('/api/shops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: selected?.name || 'My Shop',
          server_id: selectedServer.id,
          lightning_address: shopOwnerLightningAddress,
          is_public: isShopPublic,
        }),
      });

      if (!shopResponse.ok) {
        const data = await shopResponse.json();
        showToast(data.error || 'Failed to create shop', 'error');
        setLoading(false);
        return;
      }

      const shopData = await shopResponse.json();
      const shopId = shopData.shop.id;
      setCreatedShopId(shopId);
      setShowLightningSub(true);
      setLoading(false);
    } catch (error) {
      console.error('Error creating shop:', error);
      showToast('Failed to create shop', 'error');
      setLoading(false);
    }
  };

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
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Add New Shop</h1>
          </div>

          {/* Main Content */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - BTCPay Server Information (Non-customizable) */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-6 border border-neutral-200 dark:border-neutral-700">
              <h2 className="text-xl font-semibold mb-6 text-neutral-900 dark:text-white">BTCPay Server Information</h2>
              
              {/* BTCPay Server Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Select BTCPay Server
                </label>
                <select
                  value={selectedServer?.id || ''}
                  onChange={(e) => {
                    const server = availableServers.find(s => s.id.toString() === e.target.value);
                    setSelectedServer(server || null);
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700 transition-colors duration-200"
                >
                  <option value="">Select a server...</option>
                  {availableServers.map((server) => (
                    <option key={server.id} value={server.id}>
                      {server.name} ({server.available_slots} slots available)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Only public servers with 2+ available slots are shown
                </p>
              </div>

              {/* Server Information Display */}
              {selectedServer && (
                <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                  <h3 className="font-medium text-neutral-900 dark:text-white mb-2">{selectedServer.name}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{selectedServer.host_url}</p>
                  {selectedServer.description && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{selectedServer.description}</p>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Available slots: <span className="font-medium text-orange-600 dark:text-orange-400">{selectedServer.available_slots}</span>
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Connected shops: <span className="font-medium">{selectedServer.current_shops}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Shop Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Select Shop
                </label>
                {loadingStores ? (
                  <div className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-100 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400">
                    Loading shops from server...
                  </div>
                ) : stores.length === 0 ? (
                  <div className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-100 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400">
                    No shops found on this server
                  </div>
                ) : (
                  <select
                    value={selectedShop}
                    onChange={(e) => setSelectedShop(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700 transition-colors duration-200"
                  >
                    <option value="">Select a shop...</option>
                    {stores.map((store) => (
                      <option 
                        key={store.id} 
                        value={store.id}
                        disabled={store.hasActiveSubscription}
                        className={store.hasActiveSubscription ? 'text-gray-400' : ''}
                      >
                        {store.name} {store.hasActiveSubscription ? '(Already subscribed)' : ''}
                      </option>
                    ))}
                  </select>
                )}
                
                {/* Shop Status Messages */}
                {!loadingStores && selectedServer && stores.length === 0 && (
                  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      There are no shops on this BTCPay server. Please contact the server owner to add shops before creating a subscription.
                    </p>
                  </div>
                )}
                
                {!loadingStores && selectedServer && stores.length > 0 && (
                  <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    {stores.filter(s => !s.hasActiveSubscription).length} of {stores.length} shops available for subscription
                  </div>
                )}
              </div>

              {/* Shop Subscription Status */}
              {selectedShopHasSubscription && (
                <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-800 dark:text-red-200">
                      This shop already has an active subscription. Please select another shop or contact the server owner.
                    </p>
                  </div>
                </div>
              )}

              {/* Server Owner's Lightning Address (Read-only) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Server Owner's Lightning Address
                </label>
                <input
                  type="text"
                  value={selectedServer?.lightning_address || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-100 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
                  placeholder="Server owner's lightning address"
                />
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  This is where subscription payments will be sent
                </p>
              </div>

              {/* Subscribe Button */}
              <button
                onClick={handleSubscribe}
                disabled={loading || !selectedShop || !selectedServer || !shopOwnerLightningAddress || selectedShopHasSubscription || stores.length === 0 || stores.filter(s => !s.hasActiveSubscription).length === 0}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed magnetic-pull"
              >
                {loading ? 'Creating Shop...' : 
                 stores.length === 0 ? 'No Shops Available' :
                 stores.filter(s => !s.hasActiveSubscription).length === 0 ? 'No Available Shops' :
                 selectedShopHasSubscription ? 'Shop Already Subscribed' :
                 'Create Shop & Subscribe'}
              </button>
            </div>

            {/* Right Column - Shop Owner & Subscription Details */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-6 border border-neutral-200 dark:border-neutral-700">
              <h2 className="text-xl font-semibold mb-6 text-neutral-900 dark:text-white">Shop & Subscription Details</h2>

              {/* Shop Owner's Lightning Address */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Your Lightning Address *
                </label>
                <input
                  type="text"
                  value={shopOwnerLightningAddress}
                  onChange={(e) => setShopOwnerLightningAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700 transition-colors duration-200"
                  placeholder="your@lightning.address"
                />
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  This is where refunds will be sent if needed
                </p>
              </div>

              {/* Amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Amount (sats)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700 transition-colors duration-200"
                  min="1"
                />
              </div>

              {/* Timeframe */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timeframe
                </label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                >
                  <option value="30d">30 days</option>
                  <option value="7d">7 days</option>
                  <option value="1d">1 day</option>
                  <option value="1h">1 hour (test)</option>
                </select>
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Comment
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  rows={3}
                  placeholder="Subscription comment..."
                />
              </div>

              {/* Shop Public/Private Toggle */}
              <div className="mb-6">
                <ToggleSwitch
                  checked={isShopPublic}
                  onChange={setIsShopPublic}
                  label="Public Shop Listing"
                  description="List your shop in the public directory for other users to see"
                  size="md"
                />
              </div>

              {/* Preview */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div><strong>Amount:</strong> {amount} sats</div>
                  <div><strong>Timeframe:</strong> {timeframe} ({convertTimeframeToInterval(timeframe)})</div>
                  <div><strong>Comment:</strong> {comment}</div>
                  <div><strong>Shop Visibility:</strong> {isShopPublic ? 'Public' : 'Private'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* NWC Setup Modal */}
          {showLightningSub && createdShopId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Shop Created Successfully!
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                      Your shop has been created. To enable automatic subscription payments, 
                      you'll need to set up a NWC (Nostr Wallet Connect) connection.
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Next Steps:
                    </h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Go to NWC Management to set up your wallet connection</li>
                      <li>• Connect your Nostr wallet via NWC</li>
                      <li>• Configure automatic payments for your subscription</li>
                    </ul>
                  </div>

                  <div className="flex space-x-4">
                    <Link
                      href="/nwc-management"
                      className="flex-1 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-center"
                    >
                      Setup NWC Connection
                    </Link>
                    <button
                      onClick={() => {
                        setShowLightningSub(false);
                        setCreatedShopId(null);
                      }}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
} 