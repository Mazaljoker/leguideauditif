import type { APIRoute } from 'astro';
import { ImageResponse } from '@vercel/og';

export const prerender = false;

/**
 * Generates an Open Graph image dynamically for silo pages.
 *
 * Usage: /api/og/silo?title=Audioprothésiste à Paris&subtitle=Paris (75)&type=ville
 *
 * Query params:
 * - title    : main title (max ~60 chars)
 * - subtitle : secondary line (département, région, etc.)
 * - type     : "hub" | "departement" | "ville" — changes accent colour
 *
 * Cached by Vercel's CDN — each unique query-string combo generates the image
 * once, then serves it from edge cache indefinitely.
 */
export const GET: APIRoute = async ({ url }) => {
  const params = url.searchParams;
  const title = (params.get('title') || 'LeGuideAuditif.fr').slice(0, 70);
  const subtitle = (params.get('subtitle') || '').slice(0, 80);
  const type = params.get('type') || 'default';

  const accent =
    type === 'ville' ? '#D97B3D' : type === 'departement' ? '#1B2E4A' : '#D97B3D';

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#F8F5F0',
          padding: '60px 80px',
          fontFamily: 'Inter, sans-serif',
          position: 'relative',
        },
        children: [
          // Accent bar top
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '12px',
                backgroundColor: accent,
              },
            },
          },
          // Brand header
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      width: '64px',
                      height: '64px',
                      borderRadius: '12px',
                      backgroundColor: '#1B2E4A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#D97B3D',
                      fontSize: '44px',
                      fontWeight: 800,
                    },
                    children: 'L',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '28px',
                            fontWeight: 800,
                            color: '#1B2E4A',
                            lineHeight: 1,
                          },
                          children: 'LeGuideAuditif.fr',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '16px',
                            color: '#5F5E56',
                            marginTop: '4px',
                          },
                          children: 'Le guide indépendant pour mieux entendre',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          // Main title block
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              },
              children: [
                subtitle
                  ? {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '28px',
                          color: accent,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '2px',
                        },
                        children: subtitle,
                      },
                    }
                  : null,
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: title.length > 40 ? '56px' : '72px',
                      fontWeight: 800,
                      color: '#1B2E4A',
                      lineHeight: 1.1,
                      maxWidth: '1050px',
                    },
                    children: title,
                  },
                },
              ].filter(Boolean),
            },
          },
          // Footer byline
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                borderTop: '2px solid #1B2E4A',
                paddingTop: '20px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '22px',
                            color: '#1B2E4A',
                            fontWeight: 600,
                          },
                          children: 'Par Franck-Olivier Chabbat',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '18px',
                            color: '#5F5E56',
                            marginTop: '4px',
                          },
                          children: "Audioprothésiste DE · 28 ans d'expérience · ADELI 692606494",
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '20px',
                      color: accent,
                      fontWeight: 700,
                    },
                    children: 'leguideauditif.fr',
                  },
                },
              ],
            },
          },
        ],
      },
    } as any,
    {
      width: 1200,
      height: 630,
      headers: {
        // Cache 1 year on CDN, 1 hour browser
        'Cache-Control': 'public, max-age=3600, s-maxage=31536000, immutable',
      },
    },
  );
};
