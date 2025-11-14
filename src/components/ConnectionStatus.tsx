'use client';

import { useState } from 'react';

interface Connection {
  id: number;
  status: 'ACTIVE' | 'PENDING' | 'PENDING_SETUP' | 'FAILED' | 'DISCONNECTED';
  setupError?: string | null;
  retryCount?: number;
  provider: {
    id: number;
    name: string;
    serviceType: string;
  };
}

interface ConnectionStatusProps {
  connection: Connection;
  onRetrySuccess?: () => void;
}

export default function ConnectionStatus({ connection, onRetrySuccess }: ConnectionStatusProps) {
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRetry = async () => {
    try {
      setRetrying(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/connections/${connection.id}/retry`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Connection retry successful!');

        // If BTCPay credentials returned, show them
        if (data.btcpayCredentials) {
          setSuccess(
            `Connection successful! Your BTCPay credentials:\n` +
            `Username: ${data.btcpayCredentials.username}\n` +
            `Password: ${data.btcpayCredentials.tempPassword}\n` +
            `(Save these credentials, they won't be shown again)`
          );
        }

        // Call success callback
        if (onRetrySuccess) {
          setTimeout(() => {
            onRetrySuccess();
          }, 3000);
        }
      } else {
        setError(data.error || 'Retry failed');
      }

    } catch (err) {
      console.error('Retry error:', err);
      setError('Failed to retry connection. Please try again.');
    } finally {
      setRetrying(false);
    }
  };

  // Status badge component
  const getStatusBadge = () => {
    const statusConfig = {
      ACTIVE: {
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        label: 'Active'
      },
      PENDING: {
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        label: 'Pending'
      },
      PENDING_SETUP: {
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        label: 'Setup Incomplete'
      },
      FAILED: {
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        label: 'Failed'
      },
      DISCONNECTED: {
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
        label: 'Disconnected'
      }
    };

    const config = statusConfig[connection.status];

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const canRetry = connection.status === 'FAILED' || connection.status === 'PENDING_SETUP';
  const maxRetries = 5;
  const retriesLeft = maxRetries - (connection.retryCount || 0);

  return (
    <div className="space-y-3">
      {/* Status Badge */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          Connection to {connection.provider.name}:
        </span>
        {getStatusBadge()}
      </div>

      {/* Error Message */}
      {connection.setupError && (connection.status === 'FAILED' || connection.status === 'PENDING_SETUP') && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">
            <strong>Error:</strong> {connection.setupError}
          </p>
          {connection.retryCount && connection.retryCount > 0 && (
            <p className="text-xs text-red-500 dark:text-red-500 mt-1">
              Failed attempts: {connection.retryCount}/{maxRetries}
            </p>
          )}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400 whitespace-pre-wrap">
            {success}
          </p>
        </div>
      )}

      {/* Retry Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* Retry Button */}
      {canRetry && retriesLeft > 0 && !success && (
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {retrying ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Retrying...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Connection ({retriesLeft} attempts left)
            </>
          )}
        </button>
      )}

      {/* Max Retries Reached */}
      {canRetry && retriesLeft <= 0 && (
        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="text-sm text-orange-600 dark:text-orange-400">
            Maximum retry attempts reached. Please contact the provider directly for assistance.
          </p>
        </div>
      )}

      {/* Disconnected Help */}
      {connection.status === 'DISCONNECTED' && (
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            This connection has been disconnected. You may need to create a new connection or contact the provider.
          </p>
        </div>
      )}
    </div>
  );
}
