'use client';

import React from 'react';

export default function Preloader() {
  return (
    <div className="preloader-overlay">
      <div className="logo-loader-container">
        <img src="/assets/easyfr8.png" alt="EasyFr8 Logo" className="preloader-logo" />
        <div className="preloader-loading-text">
          <span>Loading</span>
          <span className="preloader-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .preloader-overlay {
          position: fixed;
          inset: 0;
          background: #ffffff;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 99999;
          animation: fadeInPreloader 0.3s ease-out;
        }

        .logo-loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .preloader-logo {
          width: 280px;
          max-width: 80vw;
          height: auto;
          animation: pulsePreloader 1.5s infinite ease-in-out;
          object-fit: contain;
        }

        .preloader-loading-text {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #e43d35;
          letter-spacing: 2px;
          display: flex;
          align-items: center;
          text-transform: uppercase;
        }

        .preloader-dots {
          display: inline-flex;
          margin-left: 4px;
        }

        .preloader-dots span {
          animation: dotsPreloader 1.4s infinite;
          opacity: 0;
          font-size: 20px;
          line-height: 10px;
        }

        .preloader-dots span:nth-child(1) { animation-delay: 0s; }
        .preloader-dots span:nth-child(2) { animation-delay: 0.2s; }
        .preloader-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes fadeInPreloader {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes pulsePreloader {
          0% {
            opacity: .6;
            transform: scale(.95);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          100% {
            opacity: .6;
            transform: scale(.95);
          }
        }

        @keyframes dotsPreloader {
          0% { opacity: 0; }
          20% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}} />
    </div>
  );
}
