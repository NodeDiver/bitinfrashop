"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ServerIcon, ShoppingBagIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

type UserType = 'server-admin' | 'shop-owner' | 'explorer';

export default function OnboardPage() {
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // If user is already logged in, show loading while redirecting
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 dark:border-orange-400 mx-auto"></div>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const handleUserTypeSelect = (userType: UserType) => {
    setSelectedType(userType);
    
    // Store user type in sessionStorage for registration page
    sessionStorage.setItem('selectedUserType', userType);
    
    // Redirect to appropriate registration page
    switch (userType) {
      case 'server-admin':
        router.push('/register?type=server-admin');
        break;
      case 'shop-owner':
        router.push('/register?type=shop-owner');
        break;
      case 'explorer':
        router.push('/register?type=explorer');
        break;
    }
  };

  const userTypes = [
    {
      id: 'server-admin' as UserType,
      title: 'BTCPay Server Administrator',
      description: 'I run a BTCPay Server and want to offer my services to shops through subscriptions to earn revenue.',
      icon: ServerIcon,
      gradient: 'from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700',
      color: 'orange'
    },
    {
      id: 'shop-owner' as UserType,
      title: 'Shop Owner',
      description: 'I need a solution to start accepting Bitcoin payments and need someone to handle the payment processing.',
      icon: ShoppingBagIcon,
      gradient: 'from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700',
      color: 'orange'
    },
    {
      id: 'explorer' as UserType,
      title: 'I\'m not sure yet',
      description: 'I want to explore the platform and learn more about Bitcoin payment solutions before deciding.',
      icon: QuestionMarkCircleIcon,
      gradient: 'from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700',
      color: 'orange'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-6">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Bitinfrashop
            </span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Let's get you started! First, tell us what brings you here today.
          </p>
        </div>
      </div>

      {/* User Type Selection */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
              What describes you best?
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Choose the option that best matches your current situation
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {userTypes.map((userType) => {
              const IconComponent = userType.icon;
              return (
                <button
                  key={userType.id}
                  onClick={() => handleUserTypeSelect(userType.id)}
                  className={`bg-gradient-to-r ${userType.gradient} text-white p-8 rounded-xl transition-all duration-300 text-left shadow-lg hover:shadow-xl magnetic-pull glow-effect group`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-4">
                      {userType.title}
                    </h3>
                    
                    <p className="text-white/90 leading-relaxed">
                      {userType.description}
                    </p>
                    
                    <div className="mt-6 text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                      Get Started →
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Back to Home */}
          <div className="text-center mt-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-all duration-200 shadow-sm hover:shadow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
