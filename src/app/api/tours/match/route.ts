import { NextResponse } from 'next/server';
import { getAllTours } from '@/services/tours-service';
import { TourMatchingEngine } from '@/domains/tour/TourMatchingEngine';
import type { TourYarQuizAnswers } from '@/domains/tour/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const answers = body?.answers as TourYarQuizAnswers;

    if (!answers) {
      return NextResponse.json(
        { success: false, error: 'Missing answers in request body' },
        { status: 400 }
      );
    }

    const allTours = getAllTours();
    const matches = TourMatchingEngine.matchTours(allTours, answers);

    return NextResponse.json({
      success: true,
      data: {
        matches,
        count: matches.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error evaluating tour match' },
      { status: 500 }
    );
  }
}
