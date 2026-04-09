import { useState, useEffect } from "react";

const COLORS = {
  bg: "#FAFAF7",
  card: "#FFFFFF",
  text: "#2D2A26",
  textLight: "#6B6560",
  accent: "#C66A32",
  accentLight: "#FDF0E8",
  navy: "#1B3A5C",
  navyLight: "#EDF2F7",
  urgent: "#B8392E",
  urgentBg: "#FEF2F1",
  green: "#2D7A4F",
  greenBg: "#EEFBF3",
  border: "#E8E4DF",
  sommaireBg: "#F5F3EF",
};

const fonts = {
  heading: "'Playfair Display', 'Georgia', serif",
  body: "'Source Sans 3', 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

// Progress bar component
function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: 3, zIndex: 100, background: COLORS.border }}>
      <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.navy})`, transition: "width 80ms ease-out" }} />
    </div>
  );
}

// Callout box
function Callout({ type = "info", icon, title, children }) {
  const styles = {
    info: { bg: COLORS.navyLight, border: COLORS.navy, color: COLORS.navy },
    warning: { bg: COLORS.urgentBg, border: COLORS.urgent, color: COLORS.urgent },
    tip: { bg: COLORS.greenBg, border: COLORS.green, color: COLORS.green },
    key: { bg: COLORS.accentLight, border: COLORS.accent, color: COLORS.accent },
  };
  const s = styles[type];
  return (
    <div style={{
      background: s.bg,
      borderLeft: `4px solid ${s.border}`,
      borderRadius: "0 12px 12px 0",
      padding: "20px 24px",
      margin: "32px 0",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: children ? 8 : 0 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 15, color: s.color, letterSpacing: "0.02em" }}>{title}</span>
      </div>
      {children && <div style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 1.65, color: COLORS.text, paddingLeft: 30 }}>{children}</div>}
    </div>
  );
}

// Stat highlight
function StatHighlight({ number, label }) {
  return (
    <div style={{
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "20px 28px",
      background: "linear-gradient(135deg, #1B3A5C 0%, #2A5580 100%)",
      borderRadius: 16,
      minWidth: 130,
    }}>
      <span style={{ fontFamily: fonts.heading, fontSize: 32, fontWeight: 700, color: "#fff" }}>{number}</span>
      <span style={{ fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4, textAlign: "center" }}>{label}</span>
    </div>
  );
}

// Section divider
function SectionDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "56px 0 48px" }}>
      <div style={{ flex: 1, height: 1, background: COLORS.border }} />
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="4" fill={COLORS.accent} opacity="0.3" />
        <circle cx="10" cy="10" r="2" fill={COLORS.accent} />
      </svg>
      <div style={{ flex: 1, height: 1, background: COLORS.border }} />
    </div>
  );
}

// TOC
function TableOfContents({ items, activeSection }) {
  return (
    <nav style={{
      background: COLORS.sommaireBg,
      borderRadius: 16,
      padding: "28px 32px",
      margin: "36px 0",
    }}>
      <h3 style={{
        fontFamily: fonts.heading,
        fontSize: 22,
        fontWeight: 700,
        color: COLORS.navy,
        margin: "0 0 20px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="3" width="16" height="2" rx="1" fill={COLORS.accent} />
          <rect x="2" y="9" width="12" height="2" rx="1" fill={COLORS.accent} opacity="0.6" />
          <rect x="2" y="15" width="14" height="2" rx="1" fill={COLORS.accent} opacity="0.4" />
        </svg>
        Sommaire
      </h3>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item, i) => (
          <li key={i}>
            <a href={`#section-${i}`} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 10,
              textDecoration: "none",
              fontFamily: fonts.body,
              fontSize: 15,
              color: activeSection === i ? COLORS.accent : COLORS.text,
              fontWeight: activeSection === i ? 600 : 400,
              background: activeSection === i ? COLORS.accentLight : "transparent",
              transition: "all 0.2s ease",
            }}>
              <span style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                background: activeSection === i ? COLORS.accent : "rgba(0,0,0,0.06)",
                color: activeSection === i ? "#fff" : COLORS.textLight,
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}>{i + 1}</span>
              {item}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Author badge
function AuthorBadge() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "16px 20px",
      background: COLORS.card,
      borderRadius: 14,
      border: `1px solid ${COLORS.border}`,
      margin: "24px 0 0",
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.accent})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontFamily: fonts.heading,
        fontSize: 20,
        fontWeight: 700,
        flexShrink: 0,
      }}>FO</div>
      <div>
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 15, color: COLORS.text }}>Franck-Olivier</div>
        <div style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textLight, lineHeight: 1.4 }}>
          Audioprothésiste DE — 28 ans d'expérience clinique
        </div>
      </div>
      <div style={{
        marginLeft: "auto",
        padding: "4px 10px",
        background: COLORS.greenBg,
        borderRadius: 6,
        fontFamily: fonts.body,
        fontSize: 11,
        fontWeight: 700,
        color: COLORS.green,
        letterSpacing: "0.04em",
        flexShrink: 0,
      }}>EXPERT VÉRIFIÉ</div>
    </div>
  );
}

// Health disclaimer
function HealthDisclaimer() {
  return (
    <div style={{
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      padding: "14px 18px",
      background: "#FFF9E6",
      borderRadius: 12,
      border: "1px solid #F0E4B8",
      margin: "20px 0 0",
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⚕️</span>
      <p style={{ margin: 0, fontFamily: fonts.body, fontSize: 13, lineHeight: 1.6, color: "#7A6B3A" }}>
        <strong>Information santé :</strong> Ce contenu est informatif et ne remplace pas une consultation avec un professionnel de santé.
      </p>
    </div>
  );
}

// Mini badge for reading time & date
function MetaBadges() {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
      {[
        { icon: "📅", text: "7 avril 2026" },
        { icon: "⏱️", text: "14 min de lecture" },
        { icon: "🔄", text: "Mis à jour le 7 avril 2026" },
      ].map((b, i) => (
        <span key={i} style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          background: COLORS.sommaireBg,
          borderRadius: 8,
          fontFamily: fonts.body,
          fontSize: 13,
          color: COLORS.textLight,
        }}>
          <span style={{ fontSize: 14 }}>{b.icon}</span>
          {b.text}
        </span>
      ))}
    </div>
  );
}

// Main component
export default function ArticleRedesign() {
  const [activeSection, setActiveSection] = useState(0);

  const tocItems = [
    "Qu'est-ce qu'un acouphène ?",
    "Les causes principales",
    "Quand consulter en urgence",
    "Le diagnostic : ORL et bilan auditif",
    "Les traitements qui fonctionnent en 2026",
    "L'appareil auditif contre les acouphènes",
    "Vivre au quotidien avec des acouphènes",
    "La recherche en cours",
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <ReadingProgress />
      <div style={{
        minHeight: "100vh",
        background: COLORS.bg,
        fontFamily: fonts.body,
      }}>
        {/* Header bar */}
        <header style={{
          position: "sticky",
          top: 3,
          zIndex: 50,
          background: "rgba(250,250,247,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${COLORS.border}`,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.accent})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ fontSize: 18 }}>👂</span>
            </div>
            <span style={{
              fontFamily: fonts.heading,
              fontWeight: 700,
              fontSize: 16,
              color: COLORS.navy,
            }}>LeGuideAuditif</span>
          </div>
          <button style={{
            background: "none",
            border: "none",
            padding: 8,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            <span style={{ width: 20, height: 2, background: COLORS.text, borderRadius: 2 }} />
            <span style={{ width: 16, height: 2, background: COLORS.text, borderRadius: 2 }} />
            <span style={{ width: 20, height: 2, background: COLORS.text, borderRadius: 2 }} />
          </button>
        </header>

        {/* Breadcrumbs */}
        <div style={{ padding: "16px 20px 0", maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textLight, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: COLORS.accent }}>Accueil</span>
            <span>/</span>
            <span style={{ color: COLORS.accent }}>Guides</span>
            <span>/</span>
            <span style={{ color: COLORS.accent }}>Acouphènes</span>
          </div>
        </div>

        {/* Article content */}
        <article style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 80px" }}>

          {/* Hero section */}
          <div style={{ marginTop: 28 }}>
            <div style={{
              display: "inline-block",
              padding: "4px 12px",
              background: COLORS.accentLight,
              borderRadius: 6,
              fontFamily: fonts.body,
              fontSize: 12,
              fontWeight: 700,
              color: COLORS.accent,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}>GUIDE COMPLET</div>

            <h1 style={{
              fontFamily: fonts.heading,
              fontSize: "clamp(28px, 7vw, 40px)",
              fontWeight: 800,
              lineHeight: 1.15,
              color: COLORS.navy,
              margin: "0 0 4px",
              letterSpacing: "-0.01em",
            }}>
              Acouphènes : comprendre, soulager et vivre avec en 2026
            </h1>

            <MetaBadges />
            <AuthorBadge />
            <HealthDisclaimer />
          </div>

          {/* Hero image */}
          <div style={{
            margin: "32px -20px",
            borderRadius: 0,
            overflow: "hidden",
            position: "relative",
            height: 240,
            background: `linear-gradient(135deg, ${COLORS.navy}22, ${COLORS.accent}22)`,
          }}>
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 8,
            }}>
              <span style={{ fontSize: 48, opacity: 0.5 }}>🎧</span>
              <span style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textLight }}>Image hero — consultation audioprothésiste</span>
            </div>
          </div>

          {/* Key takeaway */}
          <Callout type="key" icon="💡" title="L'essentiel à retenir">
            4 à 7 millions de Français vivent avec des acouphènes. On ne peut pas toujours les supprimer, mais des solutions concrètes existent pour en réduire considérablement l'impact au quotidien.
          </Callout>

          {/* Stats row */}
          <div style={{
            display: "flex",
            gap: 12,
            margin: "32px 0",
            overflowX: "auto",
            padding: "4px 0",
          }}>
            <StatHighlight number="4-7M" label="Français touchés" />
            <StatHighlight number="2ème" label="trouble auditif le plus fréquent" />
            <StatHighlight number="70%" label="amélioration avec traitement" />
          </div>

          {/* Intro paragraphs — with proper spacing */}
          <p style={{
            fontFamily: fonts.body,
            fontSize: 17,
            lineHeight: 1.75,
            color: COLORS.text,
            margin: "0 0 24px",
          }}>
            En France, entre 4 et 7 millions de personnes vivent avec des acouphènes, selon les données de l'INSERM. Ce chiffre place les acouphènes parmi les troubles auditifs les plus fréquents, juste derrière la presbyacousie.
          </p>

          <p style={{
            fontFamily: fonts.body,
            fontSize: 17,
            lineHeight: 1.75,
            color: COLORS.text,
            margin: "0 0 24px",
          }}>
            Pourtant, beaucoup de désinformation reste le premier obstacle. On entend encore trop souvent que "rien ne peut être fait". C'est faux. Si l'on ne peut pas toujours supprimer un acouphène, on dispose aujourd'hui de solutions concrètes pour en réduire considérablement l'impact sur votre vie quotidienne.
          </p>

          <p style={{
            fontFamily: fonts.body,
            fontSize: 17,
            lineHeight: 1.75,
            color: COLORS.text,
            margin: "0 0 8px",
            fontWeight: 500,
            fontStyle: "italic",
            color: COLORS.textLight,
            borderLeft: `3px solid ${COLORS.accent}`,
            paddingLeft: 20,
          }}>
            Ce guide fait le point sur ce que la science sait en 2026 : les causes, le diagnostic, les traitements validés et les stratégies pratiques au quotidien.
          </p>

          {/* Table of contents */}
          <TableOfContents items={tocItems} activeSection={activeSection} />

          <SectionDivider />

          {/* Section 1 */}
          <section id="section-0">
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: COLORS.accentLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}>🔊</div>
              <h2 style={{
                fontFamily: fonts.heading,
                fontSize: "clamp(22px, 5.5vw, 30px)",
                fontWeight: 700,
                color: COLORS.navy,
                margin: 0,
                lineHeight: 1.2,
              }}>
                Qu'est-ce qu'un acouphène ?
              </h2>
            </div>

            <p style={{
              fontFamily: fonts.body,
              fontSize: 17,
              lineHeight: 1.75,
              color: COLORS.text,
              margin: "0 0 24px",
            }}>
              Un acouphène est la perception d'un son en l'absence de toute source sonore extérieure. Il peut prendre la forme d'un sifflement, d'un bourdonnement, d'un grésillement ou d'un chuintement. Ce n'est pas une maladie en soi, mais le symptôme d'un dysfonctionnement dans la chaîne auditive ou dans le traitement cérébral du son.
            </p>

            {/* Sub-section with card style */}
            <div style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: "24px",
              margin: "28px 0",
            }}>
              <h3 style={{
                fontFamily: fonts.heading,
                fontSize: 19,
                fontWeight: 600,
                color: COLORS.text,
                margin: "0 0 16px",
              }}>Acouphènes subjectifs vs objectifs</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: COLORS.navyLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                    marginTop: 2,
                  }}>🧠</div>
                  <div>
                    <strong style={{ fontFamily: fonts.body, fontSize: 15, color: COLORS.navy }}>Subjectifs (95% des cas)</strong>
                    <p style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 1.65, color: COLORS.textLight, margin: "4px 0 0" }}>
                      Perçus uniquement par le patient. Le cerveau génère un signal sonore "fantôme" en réponse à une perte auditive ou un stress neurologique.
                    </p>
                  </div>
                </div>

                <div style={{ height: 1, background: COLORS.border }} />

                <div style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: COLORS.accentLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                    marginTop: 2,
                  }}>🩺</div>
                  <div>
                    <strong style={{ fontFamily: fonts.body, fontSize: 15, color: COLORS.navy }}>Objectifs (5% des cas)</strong>
                    <p style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 1.65, color: COLORS.textLight, margin: "4px 0 0" }}>
                      Le son a une source physique réelle (vasculaire, musculaire). Un médecin peut parfois les entendre au stéthoscope.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Callout type="warning" icon="🚨" title="Quand consulter en urgence">
              Un acouphène brutal et unilatéral, accompagné d'une perte auditive soudaine, nécessite une consultation ORL dans les 48 heures. C'est une urgence fonctionnelle.
            </Callout>
          </section>

          <SectionDivider />

          {/* Section 2 preview */}
          <section id="section-1">
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: COLORS.navyLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}>🔍</div>
              <h2 style={{
                fontFamily: fonts.heading,
                fontSize: "clamp(22px, 5.5vw, 30px)",
                fontWeight: 700,
                color: COLORS.navy,
                margin: 0,
                lineHeight: 1.2,
              }}>
                Les causes principales des acouphènes
              </h2>
            </div>

            <p style={{
              fontFamily: fonts.body,
              fontSize: 17,
              lineHeight: 1.75,
              color: COLORS.text,
              margin: "0 0 28px",
            }}>
              Les acouphènes ne sont pas une maladie mais le symptôme d'un dysfonctionnement sous-jacent. Identifier la cause est la première étape vers un traitement adapté.
            </p>

            {/* Causes list as cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: "🔊", title: "Exposition au bruit", desc: "Concerts, travail en usine, casque audio trop fort. La cause n°1 chez les moins de 50 ans.", pct: "40%" },
                { icon: "👴", title: "Presbyacousie", desc: "Le vieillissement naturel de l'oreille interne touche 1 personne sur 3 après 65 ans.", pct: "30%" },
                { icon: "💊", title: "Médicaments ototoxiques", desc: "Certains antibiotiques, anti-inflammatoires et chimiothérapies peuvent endommager la cochlée.", pct: "10%" },
                { icon: "😰", title: "Stress et fatigue", desc: "Pas une cause directe, mais un amplificateur majeur de la perception des acouphènes.", pct: "—" },
              ].map((cause, i) => (
                <div key={i} style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  padding: "18px 20px",
                  background: COLORS.card,
                  borderRadius: 14,
                  border: `1px solid ${COLORS.border}`,
                }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: COLORS.sommaireBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}>{cause.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 700, color: COLORS.text }}>{cause.title}</strong>
                      {cause.pct !== "—" && (
                        <span style={{
                          fontFamily: fonts.mono,
                          fontSize: 12,
                          fontWeight: 700,
                          color: COLORS.accent,
                          background: COLORS.accentLight,
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}>{cause.pct}</span>
                      )}
                    </div>
                    <p style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 1.6, color: COLORS.textLight, margin: "6px 0 0" }}>{cause.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Callout type="tip" icon="✅" title="Bon à savoir">
              Dans 90% des cas, l'acouphène est associé à une perte auditive, même légère. Un audiogramme complet est toujours recommandé.
            </Callout>
          </section>

          <SectionDivider />

          {/* CTA section */}
          <div style={{
            background: `linear-gradient(135deg, ${COLORS.navy} 0%, #2A5580 100%)`,
            borderRadius: 20,
            padding: "36px 28px",
            textAlign: "center",
            margin: "20px 0",
          }}>
            <span style={{ fontSize: 32, display: "block", marginBottom: 12 }}>👂</span>
            <h3 style={{
              fontFamily: fonts.heading,
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              margin: "0 0 10px",
            }}>Vous souffrez d'acouphènes ?</h3>
            <p style={{
              fontFamily: fonts.body,
              fontSize: 15,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.8)",
              margin: "0 0 24px",
            }}>
              Trouvez un audioprothésiste spécialisé près de chez vous
            </p>
            <button style={{
              background: COLORS.accent,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px 32px",
              fontFamily: fonts.body,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(198,106,50,0.3)",
            }}>
              Trouver mon audioprothésiste →
            </button>
          </div>

          {/* Footer note */}
          <p style={{
            fontFamily: fonts.body,
            fontSize: 13,
            color: COLORS.textLight,
            textAlign: "center",
            marginTop: 40,
            lineHeight: 1.6,
          }}>
            — Fin du mockup — Sections 3 à 8 suivent le même design system —
          </p>
        </article>
      </div>
    </>
  );
}
