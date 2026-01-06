"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
      <p className="text-white text-lg">Loading...</p>
    </div>
  </div>
);

// Unauthorized access component
const UnauthorizedAccess = () => {
  const router = useRouter();

  const handleLoginRedirect = () => {
    router.push("/auth/login");
  };

  const handleBackHome = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl text-center max-w-md w-full">
        <div className="mb-6">
          <svg
            className="w-16 h-16 text-red-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-7V6m0 0V4m0 2h2m-2 0H10"
            />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-2">
            Authentication Required
          </h1>
          <p className="text-gray-300">
            You need to be logged in to access this page.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLoginRedirect}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            Sign In
          </button>

          <button
            onClick={handleBackHome}
            className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

// Higher-order component for protecting routes
export const withAuth = (WrappedComponent) => {
  const AuthenticatedComponent = (props) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // If not loading and no user, the component will show unauthorized access
      // No automatic redirect here to allow the unauthorized component to show
    }, [user, loading, router]);

    // Show loading spinner while checking authentication
    if (loading) {
      return <LoadingSpinner />;
    }

    // Show unauthorized access if no user
    if (!user) {
      return <UnauthorizedAccess />;
    }

    // User is authenticated, render the wrapped component
    return <WrappedComponent {...props} />;
  };

  AuthenticatedComponent.displayName = `withAuth(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;
  return AuthenticatedComponent;
};

// Component for protecting routes (alternative approach)
export const ProtectedRoute = ({
  children,
  fallback = null,
  redirectTo = "/auth/login",
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && redirectTo) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />;
  }

  // Show fallback or unauthorized access if no user
  if (!user) {
    return fallback || <UnauthorizedAccess />;
  }

  // User is authenticated, render children
  return children;
};

// Hook for checking if user has access to specific resources
export const useAuthGuard = () => {
  const { user, loading } = useAuth();

  const requireAuth = (callback, fallback) => {
    if (loading) return null;
    if (!user) return fallback ? fallback() : null;
    return callback();
  };

  const checkOwnership = (resourceUserId) => {
    if (!user) return false;
    return user.uid === resourceUserId;
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    requireAuth,
    checkOwnership,
  };
};

export default ProtectedRoute;
