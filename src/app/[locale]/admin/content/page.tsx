import { ContentClientPage } from './ContentClientPage';
import { ContentDomainService } from '@/domains/content/ContentDomainService';
import type { TourAdminItem, ExperienceAdminItem, TravelogueAdminItem, GuideAdminItem } from './ContentClientPage';

export const dynamic = 'force-dynamic';

export default async function AdminContentPage() {
  const [tours, experiences, travelogues, guides] = await Promise.all([
    ContentDomainService.getTours().catch(() => []),
    ContentDomainService.getExperiences().catch(() => []),
    ContentDomainService.getTravelogues().catch(() => []),
    ContentDomainService.getGuides().catch(() => []),
  ]);

  return (
    <ContentClientPage
      initialTours={tours as unknown as TourAdminItem[]}
      initialExperiences={experiences as unknown as ExperienceAdminItem[]}
      initialTravelogues={travelogues as unknown as TravelogueAdminItem[]}
      initialGuides={guides as unknown as GuideAdminItem[]}
    />
  );
}
