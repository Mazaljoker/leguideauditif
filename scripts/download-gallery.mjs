/**
 * Télécharge les images galerie pour le top 20 des aides auditives
 * Convertit en WebP 600x600, ajoute watermark LGA, met à jour les JSON
 */
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const outDir = 'public/images/appareils';
const faviconPath = 'public/favicon.png';
const catalogueDir = 'src/content/catalogue-appareils';

const gallery = {
  'phonak-audeo-infinio': [
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/ph-packshot-audeo-i-r-p6-pair-with-easy-guard-infinio-ultra-square.avif?v=1769423101',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/phonak-horgerat-90-akku-samt-schwarz-phonak-audeo-infinio-49311458853128.png?v=1762419581',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/phonak-horgerat-90-akku-silbergrau-phonak-audeo-infinio-49311458787592.png?v=1762419581',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/phonak-horgerat-90-akku-champagner-phonak-audeo-infinio-49311458754824.png?v=1762419581',
  ],
  'oticon-intent': [
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/oticon-horgerat-oticon-intent-46927395422472.jpg?v=1756720639',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/oticon-horgerat-oticon-intent-46927395520776.jpg?v=1756720639',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/oticon-horgerat-oticon-intent-46927395488008.jpg?v=1756720639',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/oticon-horgerat-oticon-intent-46927395455240.jpg?v=1756720639',
  ],
  'signia-pure-chargeandgo-ix': [
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/signia-horgerat-signia-pure-ix-45200786456840.webp?v=1756720672',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/signia-horgerat-7-akku-silber-signia-pure-ix-47105206092040.png?v=1756720673',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/signia-horgerat-signia-pure-ix-45200786751752.webp?v=1756720673',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/signia-horgerat-signia-pure-ix-45200786653448.webp?v=1756720673',
  ],
  'oticon-real': [
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/products/oticon-horgerat-1-akku-quarzsand-oticon-real-43056376807688.png?v=1756720731',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/products/oticon-horgerat-1-akku-platin-oticon-real-43056376742152.png?v=1756720731',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/products/oticon-horgerat-1-akku-perl-schwarz-oticon-real-43056377528584.png?v=1756720732',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/oticon-horgerat-oticon-real-45457537138952.jpg?v=1756720731',
  ],
  'resound-nexia': [
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/resound-horgerat-resound-nexia-45387306729736.png?v=1756720667',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/resound-horgerat-resound-nexia-45766609436936.png?v=1756720668',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/resound-horgerat-resound-nexia-ric-47050518528264.jpg?v=1756720668',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/resound-horgerat-resound-nexia-45459121275144.png?v=1756720668',
  ],
  'phonak-audeo-lumity': [
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/products/phonak-horgerat-phonak-audeo-lumity-41647328329992.png?v=1756720760',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/products/phonak-horgerat-90-akku-silbergrau-phonak-audeo-lumity-41041010360584.png?v=1756720760',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/products/phonak-horgerat-90-akku-samt-schwarz-phonak-audeo-lumity-41041010589960.png?v=1756720760',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/phonak-horgerat-phonak-audeo-lumity-47007743738120.png?v=1756720761',
  ],
  'oticon-zeal': [
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/oticon-horgerat-akku-schwarz-oticon-zeal-1224676221.webp?v=1772464329',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/oticon-horgerat-akku-schwarz-oticon-zeal-1224676224.webp?v=1772464450',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/oticon-horgerat-akku-schwarz-oticon-zeal-1224676223.webp?v=1772464389',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/oticon-horgerat-akku-schwarz-oticon-zeal-1224676222.webp?v=1772463972',
  ],
  'signia-active-pro-ix': [
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/signia-horgerat-active-pro-akku-weiss-signia-active-ix-1201994956.webp?v=1762195260',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/signia-horgerat-active-pro-akku-schwarz-signia-active-ix-1201994957.webp?v=1762195254',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/signia-horgerat-active-pro-akku-rose-gold-signia-active-ix-1201994958.webp?v=1762195263',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/signia-horgerat-signia-active-ix-1201994955.webp?v=1762195258',
  ],
  'widex-allure': [
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/widex-horgerat-110-akku-tech-schwarz-widex-allure-ric-1222238216.png?v=1771944488',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/widex-horgerat-widex-allure-ric-1222238218.png?v=1771944431',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/widex-horgerat-110-akku-rose-gold-widex-allure-ric-1222238222.png?v=1771943890',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/widex-horgerat-110-akku-silbergrau-widex-allure-ric-1222238221.png?v=1771943830',
  ],
  'phonak-slim-lumity': [
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/products/phonak-horgerat-phonak-slim-33894080086177.png?v=1756720767',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/products/phonak-horgerat-90-akku-kupfer-schwarz-phonak-slim-33894080184481.png?v=1756720767',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/products/phonak-horgerat-90-akku-silber-schwarz-phonak-slim-33894080118945.png?v=1756720767',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/products/phonak-horgerat-90-akku-graphit-schwarz-phonak-slim-33894080151713.png?v=1756720767',
  ],
  'signia-styletto-ix': [
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/signia-horgerat-3-akku-schwarz-schwarz-glanzend-signia-styletto-ix-1201719105.webp?v=1762183984',
    'https://ht-prod.imgix.net/zrlwirhkix3movspu9k6a4r1b7xp?auto=format&fit=crop&crop=top,center&width=641&height=641',
  ],
  'signia-motion-ix': [
    'https://cdn.signia-pro.com/-/media/signia/global/images/products/signia-ix/motion-chargego-ix/motion-charge-go-ix_family_transparent_1000x1000.png',
    'https://ht-prod.imgix.net/8auapdd4etmg2dd3nx3tax0p9ct8?auto=format&fit=crop&crop=top,center&width=650&height=650',
    'https://ht-prod.imgix.net/4noli9tudhgzyf9xxupz10jau5k5?auto=format&fit=crop&crop=top,center&width=650&height=650',
  ],
  'signia-silk-ix': [
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/signia-horgerat-7-akku-schwarz-signia-silk-ix-45521488478472.png?v=1756720676',
  ],
  'phonak-virto-infinio-r': [
    'https://www.phonak.com/content/dam/celum/phonak/master-assets/en/products/infinio/virto-i-r/ph-packshot-virto-i-r-side-s06-063-0526-01/ph-packshot-virto-i-r-side-s06-063-0526-01-1920x1920.png',
    'https://www.phonak.com/content/dam/celum/phonak/master-assets/en/products/infinio/virto-i-r/ph-packshot-virto-i-r-side-s14-063-0526-01/ph-packshot-virto-i-r-side-s14-063-0526-01-1920x1920.png',
    'https://www.phonak.com/content/dam/celum/phonak/master-assets/en/products/infinio/virto-i-r/ph-packshot-virto-i-r-side-s22-063-0526-01/ph-packshot-virto-i-r-side-s22-063-0526-01-1920x1920.png',
    'https://www.phonak.com/content/dam/celum/phonak/master-assets/en/products/infinio/virto-r-i/ph-packshot-virto-i-r-front-06-063-0526-01-ne.png',
  ],
  'signia-insio-ix': [
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/signia-horgerat-signia-insio-ix-1223808001.webp?v=1772032571',
    'https://cdn.shopify.com/s/files/1/0266/3618/9740/files/signia-horgerat-signia-insio-charge-go-cic-ix-1226561884.png?v=1773052930',
  ],
  'starkey-genesis-ai': [
    'https://ht-prod.imgix.net/vju1mirn7723lvo5gex36r5qyozs?auto=format&fit=crop&crop=top,center&width=1500&height=1500',
    'https://ht-prod.imgix.net/xgfnj543tga2lk8z5iycs46ed2hu?auto=format&fit=crop&crop=top,center&width=680&height=680',
    'https://ht-prod.imgix.net/w85hsa37qncm8844nzdfd9g8x3dd?auto=format&fit=crop&crop=top,center&width=642&height=642',
    'https://ht-prod.imgix.net/lsdc6nquxcvema7fze2506vf3scy?auto=format&fit=crop&crop=top,center&width=642&height=642',
  ],
  'unitron-moxi-vivante': [
    'https://ht-prod.imgix.net/mcxsln4kiuiaqckdwlixh9o2fesk?auto=format&fit=crop&crop=top,center&width=587&height=587',
    'https://ht-prod.imgix.net/pyuocb15nihn1ph3vm7swte0ak57?auto=format&fit=crop&crop=top,center&width=800&height=800',
    'https://ht-prod.imgix.net/zzac943utgq1sz5n19w87pygibvl?auto=format&fit=crop&crop=top,center&width=800&height=800',
  ],
  'rexton-reach': [
    'https://cdn.rexton.com/-/media/rexton/global/images/products/reach/r-li/reach-r-li_r-li-t_1600x1067.jpg',
    'https://cdn.rexton.com/-/media/rexton/global/images/products/reach/r-plus/rexton_reach-r-plus_black_pair_1600x1067.jpg',
    'https://cdn.rexton.com/-/media/rexton/global/images/products/reach/r-li/reach-r-li_color-range_1600x400.jpg',
    'https://cdn.rexton.com/-/media/rexton/global/images/products/reach/r-plus/rexton_reach-r-plus_black_close-up_1600x1067.jpg',
  ],
  'bernafon-alpha': [
    'https://soundhearing.org/wp-content/uploads/2023/03/Bernafon-Alpha-XT-Pair.jpg',
    'https://soundhearing.org/wp-content/uploads/2023/03/Bernafon-Alpha-AX-MiniRite-R.png',
    'https://soundhearing.org/wp-content/uploads/2023/03/Bernafon-Alpha-MiniRite-312-T.png',
    'https://soundhearing.org/wp-content/uploads/2023/03/Bernafon-Alpha-XT-colours.png',
  ],
};

function download(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
        download(loc).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  // Prepare watermark
  const favicon = await sharp(faviconPath)
    .resize(32, 32).ensureAlpha()
    .composite([{ input: Buffer.from([255, 255, 255, 64]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: 'dest-in' }])
    .png().toBuffer();

  let totalOk = 0, totalFail = 0;

  for (const [product, urls] of Object.entries(gallery)) {
    const galleryPaths = [];

    for (let i = 0; i < urls.length; i++) {
      const fileName = `aide-auditive-${product}-${i + 1}.webp`;
      const filePath = path.join(outDir, fileName);

      try {
        const buf = await download(urls[i]);
        const resized = await sharp(buf)
          .resize(600, 600, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png().toBuffer();

        const final = await sharp(resized)
          .composite([{ input: favicon, left: 560, top: 560, blend: 'over' }])
          .webp({ quality: 85 }).toBuffer();

        fs.writeFileSync(filePath, final);
        galleryPaths.push('/images/appareils/' + fileName);
        totalOk++;
        process.stdout.write('.');
      } catch (e) {
        console.error('\nFAIL:', product, i, e.message);
        totalFail++;
      }
    }

    // Update JSON: set image to first gallery image, add gallery array
    // Find all JSON files for this product (base + variants)
    const jsonFiles = fs.readdirSync(catalogueDir).filter(f => {
      const slug = f.replace('.json', '');
      return slug === product || slug.startsWith(product + '-');
    });

    for (const jsonFile of jsonFiles) {
      const fp = path.join(catalogueDir, jsonFile);
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (galleryPaths.length > 0) {
        data.image = galleryPaths[0];
        data.gallery = galleryPaths;
      }
      fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
    }

    console.log('\n' + product + ': ' + galleryPaths.length + ' images, ' + jsonFiles.length + ' JSON updated');
  }

  console.log('\n=== DONE: ' + totalOk + ' OK, ' + totalFail + ' FAIL ===');
}

main().catch(console.error);
