# Templates JSON-LD — nposts-seo-fixer

## Article

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{title}",
  "description": "{description}",
  "author": {
    "@type": "Person",
    "name": "Franck-Olivier Chabbat",
    "jobTitle": "Audioprothesiste DE",
    "url": "https://leguideauditif.fr/auteur/franck-olivier/",
    "sameAs": []
  },
  "publisher": {
    "@type": "Organization",
    "name": "LeGuideAuditif.fr",
    "url": "https://leguideauditif.fr"
  },
  "datePublished": "{pubDate}",
  "dateModified": "{updatedDate}",
  "mainEntityOfPage": "{url}",
  "image": "{image_url}"
}
```

## FAQPage

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{question}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{reponse}"
      }
    }
  ]
}
```

## Product (appareils auditifs)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{brand} {model}",
  "brand": {
    "@type": "Brand",
    "name": "{brand}"
  },
  "category": "Hearing Aid",
  "description": "{verdict}",
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "EUR",
    "lowPrice": "{price_low}",
    "highPrice": "{price_high}",
    "offerCount": "1"
  }
}
```

## Person (auteur)

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Franck-Olivier Chabbat",
  "jobTitle": "Audioprothesiste diplome d'Etat",
  "description": "Audioprothesiste DE avec 25+ ans d'experience, 3000+ patients adaptes",
  "url": "https://leguideauditif.fr/auteur/franck-olivier/",
  "knowsAbout": [
    "Appareils auditifs",
    "Perte auditive",
    "Acouphenes",
    "Audiologie",
    "Remboursement 100% Sante"
  ]
}
```

## MedicalWebPage (guides sante)

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  "name": "{title}",
  "description": "{description}",
  "url": "{url}",
  "datePublished": "{pubDate}",
  "dateModified": "{updatedDate}",
  "lastReviewed": "{updatedDate}",
  "reviewedBy": {
    "@type": "Person",
    "name": "Franck-Olivier Chabbat",
    "jobTitle": "Audioprothesiste DE"
  },
  "about": {
    "@type": "MedicalCondition",
    "name": "{condition}"
  },
  "specialty": "Audiology"
}
```
