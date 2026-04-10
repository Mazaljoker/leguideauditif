import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { centreId } = await request.json();

    if (!centreId || typeof centreId !== 'string') {
      return new Response(null, { status: 400 });
    }

    const supabase = createServerClient();
    await supabase.from('centre_page_views').insert({ centre_id: centreId });

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 500 });
  }
};
