import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-6 animate-fade-in-down">
        <nav className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="text-2xl font-bold text-gray-800 hover:scale-105 transition-transform duration-200 cursor-pointer animate-pop-up">
            NexoNotes
          </div>
          <div className="space-x-4">
            <Link
              href="/login"
              className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:scale-105 transition-all duration-200"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 hover:scale-105 hover:shadow-lg transition-all duration-200"
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center w-full px-6 text-center animate-fade-in">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6 animate-bounce-in">
          Welcome to{" "}
          <span className="text-blue-600 animate-pulse">NexoNotes</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl animate-slide-up animation-delay-200">
          Your ultimate note-taking companion. Organize, create, and access your
          notes seamlessly across all your devices.
        </p>
        <div className="space-x-4 animate-slide-up animation-delay-400">
          <Link
            href="/register"
            className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 hover:scale-105 hover:shadow-xl transition-all duration-300 transform"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 border border-blue-600 text-blue-600 text-lg rounded-lg hover:bg-blue-50 hover:scale-105 hover:shadow-lg transition-all duration-300 transform"
          >
            Login
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="absolute bottom-0 left-0 right-0 p-6 animate-fade-in-up animation-delay-600">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 transform hover:-translate-y-1">
            <h3 className="font-semibold text-gray-800 mb-2">Cloud Sync</h3>
            <p className="text-sm text-gray-600">
              Access your notes anywhere, anytime
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 transform hover:-translate-y-1 animation-delay-100">
            <h3 className="font-semibold text-gray-800 mb-2">Rich Editing</h3>
            <p className="text-sm text-gray-600">
              Format your notes with powerful tools
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 transform hover:-translate-y-1 animation-delay-200">
            <h3 className="font-semibold text-gray-800 mb-2">Secure</h3>
            <p className="text-sm text-gray-600">
              Your data is safe and encrypted
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

