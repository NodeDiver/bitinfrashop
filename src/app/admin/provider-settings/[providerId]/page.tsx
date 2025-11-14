'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface ProviderSettings {
  id: number;
  name: string;
  description: string;
  serviceType: string;
  hostUrl: string;
  contactEmail: string;
  lightningAddress: string;
  onboardingWelcomeText: string;
  onboardingSetupSteps: Array<{ text: string; order: number }>;
  onboardingExternalLinks: Array<{ text: string; url: string }>;
  onboardingContactInfo: {
    email?: string;
    chat?: string;
    hours?: string;
  };
  btcpayApiKeySet: boolean;
  webhookSecretSet: boolean;
  connectedShopsCount: number;
}

export default function ProviderSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const providerId = params.providerId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<ProviderSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'onboarding' | 'integration'>('general');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hostUrl: '',
    contactEmail: '',
    lightningAddress: '',
    onboardingWelcomeText: '',
    onboardingSetupSteps: [] as Array<{ text: string; order: number }>,
    onboardingExternalLinks: [] as Array<{ text: string; url: string }>,
    onboardingContactInfo: {
      email: '',
      chat: '',
      hours: ''
    },
    btcpayApiKey: '',
    webhookSecret: ''
  });

  useEffect(() => {
    fetchProviderSettings();
  }, [providerId]);

  const fetchProviderSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/providers/${providerId}/settings`);

      if (!response.ok) {
        if (response.status === 403) {
          setError('Access denied. You must be the provider owner or admin.');
          return;
        }
        throw new Error('Failed to fetch provider settings');
      }

      const data = await response.json();
      setProvider(data.provider);

      // Initialize form data
      setFormData({
        name: data.provider.name || '',
        description: data.provider.description || '',
        hostUrl: data.provider.hostUrl || '',
        contactEmail: data.provider.contactEmail || '',
        lightningAddress: data.provider.lightningAddress || '',
        onboardingWelcomeText: data.provider.onboardingWelcomeText || '',
        onboardingSetupSteps: data.provider.onboardingSetupSteps || [],
        onboardingExternalLinks: data.provider.onboardingExternalLinks || [],
        onboardingContactInfo: data.provider.onboardingContactInfo || { email: '', chat: '', hours: '' },
        btcpayApiKey: '',
        webhookSecret: ''
      });

    } catch (error) {
      console.error('Error fetching provider settings:', error);
      setError('Failed to load provider settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/providers/${providerId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      setSuccess('Settings saved successfully!');
      await fetchProviderSettings();

      // Clear API key fields after save
      setFormData(prev => ({
        ...prev,
        btcpayApiKey: '',
        webhookSecret: ''
      }));

    } catch (error) {
      console.error('Error saving provider settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addSetupStep = () => {
    setFormData(prev => ({
      ...prev,
      onboardingSetupSteps: [
        ...prev.onboardingSetupSteps,
        { text: '', order: prev.onboardingSetupSteps.length }
      ]
    }));
  };

  const updateSetupStep = (index: number, text: string) => {
    setFormData(prev => ({
      ...prev,
      onboardingSetupSteps: prev.onboardingSetupSteps.map((step, i) =>
        i === index ? { ...step, text } : step
      )
    }));
  };

  const removeSetupStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      onboardingSetupSteps: prev.onboardingSetupSteps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, order: i }))
    }));
  };

  const addExternalLink = () => {
    setFormData(prev => ({
      ...prev,
      onboardingExternalLinks: [
        ...prev.onboardingExternalLinks,
        { text: '', url: '' }
      ]
    }));
  };

  const updateExternalLink = (index: number, field: 'text' | 'url', value: string) => {
    setFormData(prev => ({
      ...prev,
      onboardingExternalLinks: prev.onboardingExternalLinks.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const removeExternalLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      onboardingExternalLinks: prev.onboardingExternalLinks.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-neutral-600 dark:text-neutral-400">Loading provider settings...</div>
      </div>
    );
  }

  if (error && !provider) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Provider Settings
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          {provider?.name} - {provider?.connectedShopsCount} connected shops
        </p>
      </div>

      {/* Alert messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-neutral-200 dark:border-neutral-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'onboarding'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            Onboarding
          </button>
          <button
            onClick={() => setActiveTab('integration')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'integration'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            Integration
          </button>
        </nav>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Provider Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Host URL {provider?.serviceType === 'BTCPAY_SERVER' && '(BTCPay Server)'}
            </label>
            <input
              type="url"
              value={formData.hostUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, hostUrl: e.target.value }))}
              placeholder="https://btcpay.example.com"
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Lightning Address
              </label>
              <input
                type="text"
                value={formData.lightningAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, lightningAddress: e.target.value }))}
                placeholder="provider@getalby.com"
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Tab */}
      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Welcome Message
            </label>
            <textarea
              value={formData.onboardingWelcomeText}
              onChange={(e) => setFormData(prev => ({ ...prev, onboardingWelcomeText: e.target.value }))}
              rows={4}
              placeholder="Welcome to our BTCPay Server! Here's what you need to know..."
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Setup Steps
              </label>
              <button
                onClick={addSetupStep}
                className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
              >
                + Add Step
              </button>
            </div>
            <div className="space-y-3">
              {formData.onboardingSetupSteps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <span className="text-neutral-500 dark:text-neutral-400 pt-2">{index + 1}.</span>
                  <input
                    type="text"
                    value={step.text}
                    onChange={(e) => updateSetupStep(index, e.target.value)}
                    placeholder="Step description"
                    className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  />
                  <button
                    onClick={() => removeSetupStep(index)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                External Links
              </label>
              <button
                onClick={addExternalLink}
                className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
              >
                + Add Link
              </button>
            </div>
            <div className="space-y-3">
              {formData.onboardingExternalLinks.map((link, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={link.text}
                    onChange={(e) => updateExternalLink(index, 'text', e.target.value)}
                    placeholder="Link text"
                    className="w-1/3 px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateExternalLink(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  />
                  <button
                    onClick={() => removeExternalLink(index)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              Contact Information
            </label>
            <div className="space-y-3">
              <input
                type="email"
                value={formData.onboardingContactInfo.email}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  onboardingContactInfo: { ...prev.onboardingContactInfo, email: e.target.value }
                }))}
                placeholder="Support email"
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
              <input
                type="text"
                value={formData.onboardingContactInfo.chat}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  onboardingContactInfo: { ...prev.onboardingContactInfo, chat: e.target.value }
                }))}
                placeholder="Chat/Telegram link"
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
              <input
                type="text"
                value={formData.onboardingContactInfo.hours}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  onboardingContactInfo: { ...prev.onboardingContactInfo, hours: e.target.value }
                }))}
                placeholder="Support hours (e.g., 9AM-5PM EST)"
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Integration Tab */}
      {activeTab === 'integration' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              BTCPay Server API Key
            </label>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
              {provider?.btcpayApiKeySet ? 'API key is configured (encrypted)' : 'No API key configured'}
            </p>
            <input
              type="password"
              value={formData.btcpayApiKey}
              onChange={(e) => setFormData(prev => ({ ...prev, btcpayApiKey: e.target.value }))}
              placeholder="Enter new API key to update"
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Leave blank to keep existing key. API keys are encrypted before storage.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Webhook Secret
            </label>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
              {provider?.webhookSecretSet ? 'Webhook secret is configured' : 'No webhook secret configured'}
            </p>
            <input
              type="password"
              value={formData.webhookSecret}
              onChange={(e) => setFormData(prev => ({ ...prev, webhookSecret: e.target.value }))}
              placeholder="Enter new webhook secret to update"
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Leave blank to keep existing secret. Used for webhook signature verification.
            </p>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
