import { NextResponse } from 'next/server';
import { safeAuth } from '@/auth';
import { TourDomainService } from '@/domains/tour/TourDomainService';
import type { CreateTourBookingCommand } from '@/domains/tour/types';

export async function POST(req: Request) {
  try {
    const session = await safeAuth();
    const actorId = session?.user?.id || 'guest_user';

    const body = await req.json();
    const cmd: CreateTourBookingCommand = {
      actorId,
      tourId: body.tourId,
      departureDateId: body.departureDateId,
      travelersCount: Number(body.travelersCount || 1),
      adultsCount: Number(body.adultsCount || 1),
      childrenCount: Number(body.childrenCount || 0),
      executionModel: body.executionModel || 'group',
      hotelTier: body.hotelTier || 'STD',
      roomType: body.roomType || 'Standard Room',
    };

    const booking = await TourDomainService.createTourDraft(cmd);

    return NextResponse.json({
      success: true,
      data: booking,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create tour booking' },
      { status: 400 }
    );
  }
}
