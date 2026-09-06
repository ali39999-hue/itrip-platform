'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import { getTourById, getRelatedTours } from '@/services/tours-service';
import type { Tour, TourDepartureDate } from '@/lib/types';
import { Loader2 } from 'lucide-react';

// Components
import { TourHero } from '@/components/tours/detail/TourHero';
import { TourQuickBar } from '@/components/tours/detail/TourQuickBar';
import { TourSubnav } from '@/components/tours/detail/TourSubnav';
import { TourOverview } from '@/components/tours/detail/TourOverview';
import { TourItinerary } from '@/components/tours/detail/TourItinerary';
import { TourServices } from '@/components/tours/detail/TourServices';
import { TourAccommodation } from '@/components/tours/detail/TourAccommodation';
import { TourDepartureDates } from '@/components/tours/detail/TourDepartureDates';
import { TourReviews } from '@/components/tours/detail/TourReviews';
import { TourPolicies } from '@/components/tours/detail/TourPolicies';
import { TourBookingWidget } from '@/components/tours/detail/TourBookingWidget';
import { RelatedTours } from '@/components/tours/detail/RelatedTours';

export default function TourDetailPage() {
  const params = useParams<{ id: string }>();
  const tourId = params?.id;

  const staticTour = useMemo(() => {
    return tourId ? getTourById(tourId) : undefined;
  }, [tourId]);

  const [tour, setTour] = useState<Tour | undefined>(staticTour);
  const [loadingDynamic, setLoadingDynamic] = useState(!staticTour);

  useEffect(() => {
    if (!staticTour && tourId) {
      fetch(`/api/tours/${tourId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setTour(json.data);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingDynamic(false));
    }
  }, [staticTour, tourId]);

  const [activeSection, setActiveSection] = useState('overview');
  const [selectedDateId, setSelectedDateId] = useState<string>('');

  useEffect(() => {
    if (tour?.departureDates && tour.departureDates.length > 0 && !selectedDateId) {
      setSelectedDateId(tour.departureDates[0].id);
    }
  }, [tour, selectedDateId]);

  const relatedTours = useMemo(() => {
    return tour ? getRelatedTours(tour.id, 3) : [];
  }, [tour]);

  // IntersectionObserver to sync active subnav tab with scroll position
  useEffect(() => {
    const sectionIds = ['overview', 'itinerary', 'services', 'accommodation', 'dates', 'reviews', 'policies'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-130px 0px -60% 0px' }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  if (loadingDynamic) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 bg-paper p-10">
        <Loader2 size={36} className="animate-spin text-brand" />
        <span className="text-sm font-bold text-sub">در حال بارگذاری اطلاعات تور...</span>
      </div>
    );
  }

  if (!tour) {
    notFound();
  }

  function handleSectionClick(id: string) {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function handleSelectDate(d: TourDepartureDate) {
    setSelectedDateId(d.id);
  }

  return (
    <div className="bg-paper pb-36 sm:pb-32 lg:pb-24 min-h-screen">
      {/* 1. Hero with Breadcrumbs, Badges, Title & Photo Grid */}
      <TourHero tour={tour} />

      {/* 2. Quick Facts Bar */}
      <TourQuickBar tour={tour} />

      {/* 3. Sticky Subnavigation */}
      <div className="mt-6">
        <TourSubnav
          activeSection={activeSection}
          onSectionClick={handleSectionClick}
        />
      </div>

      {/* 4. Main Two-Column Layout */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 mt-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Main Sections */}
        <div className="flex flex-col gap-6 min-w-0">
          <TourOverview tour={tour} />
          <TourItinerary tour={tour} />
          <TourServices tour={tour} />
          <TourAccommodation tour={tour} />
          <TourDepartureDates
            tour={tour}
            selectedDateId={selectedDateId}
            onSelectDate={handleSelectDate}
          />
          <TourReviews tour={tour} />
          <TourPolicies tour={tour} />

          {/* Related Tours */}
          <RelatedTours tours={relatedTours} />
        </div>

        {/* Booking Widget (Sticky on Desktop, Bottom Bar on Mobile) */}
        <div className="lg:sticky lg:top-32">
          <TourBookingWidget
            tour={tour}
            selectedDateId={selectedDateId}
            onSelectDateId={setSelectedDateId}
          />
        </div>
      </div>
    </div>
  );
}
