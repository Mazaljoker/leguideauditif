import type { FC } from 'react';

interface Product {
  brand: string;
  model: string;
  type: 'contour' | 'intra' | 'RIC' | 'invisible';
  class: '1' | '2';
  priceRange: string;
  channels: number;
  bluetooth: boolean;
  rechargeable: boolean;
  warrantyYears: number;
  verdict: string;
  bestFor: string;
  affiliateUrl?: string | null;
}

interface ComparisonTableProps {
  products: Product[];
  title?: string;
}

const ComparisonTable: FC<ComparisonTableProps> = ({ products, title }) => {
  const Check = () => <span className="text-success font-bold">✓</span>;
  const Cross = () => <span className="text-error font-bold">✗</span>;

  return (
    <div className="my-8 overflow-x-auto">
      {title && <h2 className="font-serif text-2xl font-bold text-[var(--color-marine)] mb-4">{title}</h2>}
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--color-marine)] text-[var(--color-blanc)]">
            <th className="p-3 text-left">Appareil</th>
            <th className="p-3 text-left">Type</th>
            <th className="p-3 text-center">Classe</th>
            <th className="p-3 text-right">Prix</th>
            <th className="p-3 text-center">Canaux</th>
            <th className="p-3 text-center">Bluetooth</th>
            <th className="p-3 text-center">Rechargeable</th>
            <th className="p-3 text-center">Garantie</th>
            <th className="p-3 text-left">Idéal pour</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr
              key={`${product.brand}-${product.model}`}
              className={index % 2 === 0 ? 'bg-[var(--color-blanc)]' : 'bg-[var(--color-creme)]'}
            >
              <td className="p-3 font-medium">
                {product.affiliateUrl ? (
                  <a
                    href={product.affiliateUrl}
                    rel="sponsored noopener"
                    target="_blank"
                    className="text-[var(--color-orange)] hover:text-[var(--color-orange-dark)] underline"
                  >
                    {product.brand} {product.model}
                  </a>
                ) : (
                  <span>{product.brand} {product.model}</span>
                )}
              </td>
              <td className="p-3">{product.type}</td>
              <td className="p-3 text-center">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                  product.class === '1'
                    ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                    : 'bg-[var(--color-orange)]/10 text-[var(--color-orange)]'
                }`}>
                  Classe {product.class}
                </span>
              </td>
              <td className="p-3 text-right">{product.priceRange}</td>
              <td className="p-3 text-center">{product.channels}</td>
              <td className="p-3 text-center">{product.bluetooth ? <Check /> : <Cross />}</td>
              <td className="p-3 text-center">{product.rechargeable ? <Check /> : <Cross />}</td>
              <td className="p-3 text-center">{product.warrantyYears} ans</td>
              <td className="p-3 text-xs">{product.bestFor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonTable;