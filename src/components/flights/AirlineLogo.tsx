import React from 'react';

interface AirlineLogoProps {
  airline: string;
  airlineEn?: string;
  className?: string;
  size?: number;
}

export function AirlineLogo({ airline, airlineEn = '', className = '', size = 38 }: AirlineLogoProps) {
  const norm = `${airline} ${airlineEn}`.toLowerCase();

  // 1. Mahan Air (Green elegant bird/wing emblem)
  if (norm.includes('mahan') || norm.includes('ماهان')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="Mahan Air"
      >
        <circle cx="24" cy="24" r="23" fill="#ECFDF5" stroke="#10B981" strokeWidth="1.5" />
        <path
          d="M35 15C33.5 17.5 30 20 25.5 20.5C21 21 16 19.5 13 23.5C11.5 25.5 12 28.5 14 30.5C16.5 33 21 34 25.5 32.5C29 31.5 32 29 33.5 25.5C34.5 23 34 20.5 34.5 18C34.8 16.5 35 15.5 35 15Z"
          fill="#059669"
        />
        <path
          d="M26 17C29 18.5 31.5 21 32 24.5C30.5 24 28 24.5 25.5 26C23 27.5 21 30 18.5 30C16.5 30 15 28.5 15.5 27C16.5 24.5 21 21.5 26 17Z"
          fill="#34D399"
        />
        <circle cx="31" cy="18" r="1.5" fill="#FFFFFF" />
      </svg>
    );
  }

  // 2. Iran Air (Homa bird in deep navy blue)
  if (norm.includes('iran air') || norm.includes('ایران ایر') || norm.includes('هما')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="Iran Air"
      >
        <circle cx="24" cy="24" r="23" fill="#EEF2FF" stroke="#312E81" strokeWidth="1.5" />
        <path
          d="M14 26C15 22 18 19 22 17C26 15 31 15.5 34 18C33 20 30.5 21 28 21.5C24.5 22 21 21.5 18 24C16 25.5 15 28 15 31C18 33 22 33.5 26 32C30 30.5 33 27 34 22.5C35 22 36 21 36 20C34.5 17 31 15 27 14.5C22 14 17 16 13.5 20C11.5 22.5 12 25.5 14 26Z"
          fill="#1E1B4B"
        />
        <path
          d="M21 21C20 23 18.5 25 16 26.5C18 25.5 20.5 24.5 23 24C25.5 23.5 28 23.5 30 22C27 21 24 20.5 21 21Z"
          fill="#4338CA"
        />
        <circle cx="31.5" cy="19" r="1.5" fill="#FFFFFF" />
      </svg>
    );
  }

  // 3. Turkish Airlines (Classic red circle with soaring white bird)
  if (norm.includes('turkish') || norm.includes('ترکیش') || norm.includes('ترکیه')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="Turkish Airlines"
      >
        <circle cx="24" cy="24" r="23" fill="#DC2626" />
        <path
          d="M13 25C17.5 24.5 24 22 29 17C31 15 33 13 35 14C34 16.5 31.5 20 27 23.5C22 27.5 16.5 30 13 31.5C14.5 29.5 15.5 27.5 16 25.5C15 25.5 14 25.2 13 25Z"
          fill="#FFFFFF"
        />
        <path
          d="M27 23C29.5 22 33 19.5 35 17.5C34.5 19.5 32.5 22 30 24C28 25.5 25 27.5 22 29C23.5 27.5 25.5 25 27 23Z"
          fill="#FEE2E2"
        />
      </svg>
    );
  }

  // 4. Aseman Airlines (Sky blue wings)
  if (norm.includes('aseman') || norm.includes('آسمان')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="Aseman Airlines"
      >
        <circle cx="24" cy="24" r="23" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.5" />
        <path
          d="M13 27C17 25 21 21 26 17C29 14.5 33 13 36 14C34 16 30 19 26 23C22 27 18 31 14 33C14.5 31 14 29 13 27Z"
          fill="#0284C7"
        />
        <path
          d="M18 28C22 26 26 23 30 19C33 16 35 15 36 15.5C35 17 32 20 28 24C24 28 20 31 17 32C17.5 30.5 18 29 18 28Z"
          fill="#38BDF8"
        />
      </svg>
    );
  }

  // 5. Emirates (Red luxury seal)
  if (norm.includes('emirates') || norm.includes('امارات')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="Emirates"
      >
        <rect x="2" y="2" width="44" height="44" rx="22" fill="#B91C1C" />
        <path
          d="M14 28C14 22 18 16 25 15C29 14.5 32 16.5 33 19C30 18.5 27 19.5 25 21C22 23 20 26 19 30C16.5 30 14 29 14 28Z"
          fill="#FDE047"
        />
        <path
          d="M24 19C28 19 32 21 34 24C33 26 31 27 29 27C27 27 25 26 23 24C23 22 23.5 20.5 24 19Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 6. Kish Air / Generic stylish airline wings emblem
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label={airline}
    >
      <circle cx="24" cy="24" r="23" fill="#F0FDFA" stroke="#0D9488" strokeWidth="1.5" />
      <path
        d="M13 25C17 24 22 21 27 17C30 14.5 33.5 13.5 35.5 14.5C34.5 16.5 32 19.5 28 23C23.5 27 18 30 14 31.5C14.8 29.5 14.5 27 13 25Z"
        fill="#0D9488"
      />
      <circle cx="32" cy="18" r="1.5" fill="#14B8A6" />
    </svg>
  );
}
