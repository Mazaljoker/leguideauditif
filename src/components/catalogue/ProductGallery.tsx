import { useState, type FC } from 'react';

interface ProductGalleryProps {
  images: string[];
  alt: string;
}

const ProductGallery: FC<ProductGalleryProps> = ({ images, alt }) => {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="bg-[var(--color-creme)]/30 rounded-xl h-72 md:h-96 flex items-center justify-center">
        <span className="text-8xl opacity-15" aria-hidden="true">?</span>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className="bg-[var(--color-creme)]/30 rounded-xl h-72 md:h-96 flex items-center justify-center">
        <img src={images[0]} alt={alt} className="w-full h-full object-contain p-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-[var(--color-creme)]/30 rounded-xl h-72 md:h-96 flex items-center justify-center">
        <img
          src={images[active]}
          alt={`${alt} — photo ${active + 1}`}
          className="w-full h-full object-contain p-6"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={`shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden cursor-pointer transition-colors ${
              i === active
                ? 'border-[var(--color-orange)]'
                : 'border-[var(--color-creme-dark)] hover:border-[var(--color-orange)]/50'
            }`}
            aria-label={`Photo ${i + 1}`}
          >
            <img src={img} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductGallery;
