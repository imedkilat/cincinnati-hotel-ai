import React from "react";
import { ViewState } from "../types";
import { HOTEL_NAME } from "../constants";

interface LandingPageProps {
  onNavigate: (view: ViewState) => void;
}

// Tel Aviv style modern beachfront hotel image
const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=2525&auto=format&fit=crop";

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_IMAGE_URL})` }}
      />

      {/* Gradient Overlay for Readability */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900/40 via-slate-900/20 to-slate-900/50 backdrop-blur-[2px]" />

      {/* Main Content Card - Frosted Glass Effect */}
      <div className="relative z-10 w-full max-w-2xl mx-4 animate-in fade-in zoom-in duration-700">
        <div className="bg-white/85 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-12 border border-white/50">
          <div className="flex flex-col items-center text-center pt-2">
            {/* Brand Logo Mark */}
            <div className="w-16 h-16 bg-gradient-to-br from-hotel-900 to-hotel-700 rounded-full flex items-center justify-center text-white font-serif font-bold text-2xl mb-10 shadow-lg shadow-hotel-900/20 ring-4 ring-white/50">
              CH
            </div>

            <div className="mb-10">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-3 tracking-tight">
                {HOTEL_NAME}
              </h1>
              <h2 className="text-xl md:text-2xl text-ocean-600 font-medium mb-8">
                Your AI Concierge · Always On
              </h2>

              {/* Feature Bullets */}
              <div className="flex flex-col gap-3 items-center text-slate-700 mb-8 text-sm md:text-base font-medium">
                <div className="flex items-center gap-2.5">
                  <svg
                    className="w-4 h-4 text-ocean-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>24/7 instant answers for guests</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg
                    className="w-4 h-4 text-hotel-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Your hotel’s concierge in every guest’s pocket.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Makes every stay effortless and memorable.</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 w-full">
              <button
                onClick={() => onNavigate("admin")}
                className="flex-1 group bg-white/50 hover:bg-white border border-slate-200 hover:border-ocean-300 p-6 rounded-2xl transition-all duration-300 text-center backdrop-blur-sm"
              >
                <span className="block text-slate-600 font-semibold text-lg mb-1 group-hover:text-ocean-700 transition-colors">
                  Admin
                </span>
                <span className="text-slate-500 text-xs">
                  Manage knowledge base
                </span>
              </button>

              <button
                onClick={() => onNavigate("chat")}
                className="flex-[1.5] group bg-gradient-to-r from-ocean-600 to-ocean-500 hover:from-ocean-500 hover:to-ocean-400 shadow-xl shadow-ocean-900/20 p-6 rounded-2xl transition-all duration-300 text-center transform hover:-translate-y-0.5"
              >
                <span className="block text-white font-semibold text-lg mb-1">
                  Chat with Us
                </span>
                <span className="text-ocean-50 text-xs">
                  Ask about rooms, facilities & more
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Trust Strip */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-2 text-white text-xs uppercase tracking-widest font-semibold text-shadow-md drop-shadow-md">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z" />
            </svg>
            <span>Secure and private</span>
          </div>
          <span className="hidden md:inline">·</span>
          <span>Answers are based only on your hotel guide PDF</span>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
