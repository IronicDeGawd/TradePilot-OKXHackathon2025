"use client";

import { useState, useEffect } from "react";
import { Eye } from "lucide-react";

export default function DisclaimerBanner() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if user has previously dismissed the banner
    const hasClosedBanner = localStorage.getItem("disclaimerBannerClosed");
    if (hasClosedBanner === "true") {
      setIsVisible(false);
      return;
    }

    // Auto-dismiss after 8 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("disclaimerBannerClosed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="card bg-blue-500/5 border-blue-500/20 p-4 md:p-6 mx-4 my-4 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-start md:space-x-3">
        <Eye className="w-6 h-6 text-blue-400 mb-3 md:mb-0 md:mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-400 mb-2">
            Development Version
          </h3>
          <p className="text-sm text-gray-300">
            This platform is still in development. APIs are rate-limited for
            testing, token values may lag behind actual market prices, and some
            data may be simulated for demonstration purposes.
          </p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-200 focus:outline-none self-start md:self-center ml-auto md:ml-0"
          aria-label="Close banner"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
