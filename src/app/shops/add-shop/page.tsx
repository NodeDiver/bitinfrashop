"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useToast } from '@/contexts/ToastContext';
import ToggleSwitch from '@/components/ToggleSwitch';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import ProviderSelectionModal from '@/components/ProviderSelectionModal';
import { InfrastructureProvider } from '@/types/provider';

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
  // Path selection state
  const [pathChoice, setPathChoice] = useState<'find_now' | 'list_first' | null>(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<InfrastructureProvider | null>(null);
  const [hasNWC, setHasNWC] = useState(false);
  const [checkingNWC, setCheckingNWC] = useState(false);

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
  const [shopDescription, setShopDescription] = useState("");
  const [isShopPublic, setIsShopPublic] = useState(true);

  // Subscription form fields
  const [amount, setAmount] = useState(500);
  const [timeframe, setTimeframe] = useState("30d");
  const [serviceRequirements, setServiceRequirements] = useState("");

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

  // Check if user has NWC configured
  const checkNWCStatus = async () => {
    setCheckingNWC(true);
    try {
      const response = await fetch('/api/nwc/status');
      if (response.ok) {
        const data = await response.json();
        setHasNWC(data.hasNWC || false);
        return data.hasNWC || false;
      }
      return false;
    } catch (error) {
      console.error('Error checking NWC status:', error);
      return false;
    } finally {
      setCheckingNWC(false);
    }
  };

  // Handle path selection
  const handlePathChoice = async (choice: 'find_now' | 'list_first') => {
    setPathChoice(choice);

    if (choice === 'find_now') {
      // Check NWC status before allowing to proceed
      const nwcStatus = await checkNWCStatus();
      if (!nwcStatus) {
        // Show NWC required message
        return;
      }
      // Open provider modal
      setShowProviderModal(true);
    }
  };

  // Handle provider selection from modal
  const handleProviderSelected = (provider: InfrastructureProvider) => {
    setSelectedProvider(provider);
    setShowProviderModal(false);
    // This will trigger the subscribe flow
    handleSubscribeToProvider(provider);
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


  // Handle subscribe to provider (new flow)
  const handleSubscribeToProvider = async (provider: InfrastructureProvider) => {
    setLoading(true);
    setErrors({});

    // Validation
    if (!shopOwnerLightningAddress) {
      showToast('Please enter your lightning address for refunds', 'error');
      setLoading(false);
      return;
    }

    if (!shopDescription || shopDescription.trim().length < 30) {
      showToast('Please provide a shop description (at least 30 characters)', 'error');
      setLoading(false);
      return;
    }

    if (shopDescription.length > 400) {
      showToast('Shop description must be 400 characters or less', 'error');
      setLoading(false);
      return;
    }

    try {
      // Create the shop with provider connection
      const shopResponse = await fetch('/api/shops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: shopDescription.substring(0, 50), // Use first part of description as name
          provider_id: provider.provider_id,
          lightning_address: shopOwnerLightningAddress,
          is_public: isShopPublic,
          description: shopDescription,
          service_requirements: serviceRequirements,
          amount: amount,
          timeframe: convertTimeframeToInterval(timeframe),
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

      // Redirect to onboarding page
      window.location.href = `/onboarding/${provider.provider_id}/${shopId}`;
    } catch (error) {
      console.error('Error creating shop:', error);
      showToast('Failed to create shop', 'error');
      setLoading(false);
    }
  };

  // Handle "List Shop First" path
  const handleListShopFirst = async () => {
    setLoading(true);
    setErrors({});

    // Validation
    if (!shopOwnerLightningAddress) {
      showToast('Please enter your lightning address', 'error');
      setLoading(false);
      return;
    }

    if (!shopDescription || shopDescription.trim().length < 30) {
      showToast('Please provide a shop description (at least 30 characters)', 'error');
      setLoading(false);
      return;
    }

    if (shopDescription.length > 400) {
      showToast('Shop description must be 400 characters or less', 'error');
      setLoading(false);
      return;
    }

    try {
      // Create shop without provider
      const shopResponse = await fetch('/api/shops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: shopDescription.substring(0, 50),
          provider_id: null,
          lightning_address: shopOwnerLightningAddress,
          is_public: true, // Always public for "list first" path
          description: shopDescription,
          service_requirements: serviceRequirements,
        }),
      });

      if (!shopResponse.ok) {
        const data = await shopResponse.json();
        showToast(data.error || 'Failed to create shop', 'error');
        setLoading(false);
        return;
      }

      showToast('Shop listed successfully! Browse providers on the Discover page.', 'success');
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
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
            {/* Left Column - Provider Selection */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm p-6 border border-neutral-200 dark:border-neutral-700">
              <h2 className="text-xl font-semibold mb-6 text-neutral-900 dark:text-white">Choose Your Path</h2>

              {/* Two-Path Choice UI */}
              {!pathChoice ? (
                <div className="space-y-4">
                  {/* Option A: Find Provider Now */}
                  <button
                    onClick={() => handlePathChoice('find_now')}
                    className="w-full text-left p-6 border-2 border-neutral-300 dark:border-neutral-600 hover:border-orange-500 dark:hover:border-orange-500 rounded-xl transition-all duration-200 group"
                    disabled={checkingNWC}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-neutral-400 dark:border-neutral-500 group-hover:border-orange-500 dark:group-hover:border-orange-400"></div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                          <span>⚡</span>
                          Find Provider Now
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                          Browse available infrastructure providers and connect immediately
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-500">
                          ⚠️ Requires NWC (Nostr Wallet Connect) for payments
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Option B: List Shop First */}
                  <button
                    onClick={() => handlePathChoice('list_first')}
                    className="w-full text-left p-6 border-2 border-neutral-300 dark:border-neutral-600 hover:border-orange-500 dark:hover:border-orange-500 rounded-xl transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-neutral-400 dark:border-neutral-500 group-hover:border-orange-500 dark:group-hover:border-orange-400"></div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                          <span>📋</span>
                          List Shop First
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                          Create your shop listing and reach out to providers later
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          ✓ No setup required
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              ) : pathChoice === 'find_now' && !hasNWC ? (
                /* NWC Required Message */
                <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl">
                  <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-200 mb-3 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    NWC Setup Required
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-4">
                    You need to set up Nostr Wallet Connect (NWC) before subscribing to a provider.
                  </p>
                  <div className="flex gap-3">
                    <Link
                      href="/nwc-management"
                      className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium text-center transition-colors"
                    >
                      Go to NWC Setup
                    </Link>
                    <button
                      onClick={() => setPathChoice(null)}
                      className="flex-1 px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : pathChoice === 'list_first' ? (
                /* List Shop First UI */
                <div className="space-y-4">
                  <div className="p-6 bg-neutral-50 dark:bg-neutral-700 rounded-xl">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">
                      List Your Shop
                    </h3>
                    <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                      <p className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400">✓</span>
                        <span>Your shop will be listed publicly in the marketplace</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400">✓</span>
                        <span>You can browse providers and contact them when ready</span>
                      </p>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                      ➜ Fill out shop details on the right, then create your listing
                    </p>
                  </div>

                  {/* Create Shop Listing Button */}
                  <button
                    onClick={handleListShopFirst}
                    disabled={loading || !shopOwnerLightningAddress || !shopDescription || shopDescription.trim().length < 30}
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating Shop Listing...' : 'Create Shop Listing'}
                  </button>

                  <button
                    onClick={() => setPathChoice(null)}
                    className="w-full px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    ← Change Choice
                  </button>
                </div>
              ) : null}
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

              {/* Shop Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  About Your Shop *
                </label>
                <textarea
                  value={shopDescription}
                  onChange={(e) => setShopDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700 transition-colors duration-200"
                  rows={4}
                  maxLength={400}
                  placeholder="e.g., Bitcoin merch shop. Need 99% uptime during US business hours."
                />
                <div className="mt-1 flex justify-between items-start">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 flex-1">
                    Describe your shop. Visible to customers and provider.
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 ml-2 flex-shrink-0">
                    {shopDescription.length}/400
                  </p>
                </div>
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
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Timeframe
                </label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-neutral-900 dark:text-white bg-white dark:bg-neutral-700 transition-colors duration-200"
                >
                  <option value="30d">30 days</option>
                  <option value="7d">7 days</option>
                  <option value="1d">1 day</option>
                  <option value="1h">1 hour (test)</option>
                </select>
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
              <div className="bg-neutral-50 dark:bg-neutral-700 rounded-md p-4">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Preview</h3>
                <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <div><strong>Shop Description:</strong> {shopDescription || '(Not provided)'}</div>
                  <div><strong>Amount:</strong> {amount} sats</div>
                  <div><strong>Timeframe:</strong> {timeframe} ({convertTimeframeToInterval(timeframe)})</div>
                  <div><strong>Shop Visibility:</strong> {isShopPublic ? 'Public' : 'Private'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* NWC Setup Modal */}
          {showLightningSub && createdShopId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                      Shop Created Successfully!
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-300">
                      Your shop has been created. To enable automatic subscription payments,
                      you'll need to set up a NWC (Nostr Wallet Connect) connection.
                    </p>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                      Next Steps:
                    </h4>
                    <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                      <li>• Go to NWC Management to set up your wallet connection</li>
                      <li>• Connect your Nostr wallet via NWC</li>
                      <li>• Configure automatic payments for your subscription</li>
                    </ul>
                  </div>

                  <div className="flex space-x-4">
                    <Link
                      href="/nwc-management"
                      className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 text-center"
                    >
                      Setup NWC Connection
                    </Link>
                    <button
                      onClick={() => {
                        setShowLightningSub(false);
                        setCreatedShopId(null);
                      }}
                      className="flex-1 bg-neutral-300 hover:bg-neutral-400 text-neutral-700 dark:bg-neutral-600 dark:hover:bg-neutral-500 dark:text-neutral-200 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Provider Selection Modal */}
          <ProviderSelectionModal
            isOpen={showProviderModal}
            onClose={() => setShowProviderModal(false)}
            onSelectProvider={handleProviderSelected}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
} 