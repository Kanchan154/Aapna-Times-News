import { Helmet } from 'react-helmet-async';
import { SITE_URL, img } from '../lib/api';

const NAME = 'अपना टाइम्स न्यूज़';

export default function Seo({ title, description, image, path, type = 'website', jsonLd, noindex }) {
  const full = title ? `${title} | ${NAME}` : `${NAME} – ताज़ा खबरें, राजनीति, खेल, तकनीक, कारोबार और मौसम`;
  const desc = description || 'अपना टाइम्स न्यूज़: ब्रेकिंग न्यूज़ और रोज़ की बड़ी खबरें। राजनीति, खेल, तकनीक, कारोबार, शिक्षा, मनोरंजन और मौसम। सीधी बात, सही खबर।';
  const url = path ? SITE_URL + path : undefined;
  const image2 = image ? (img(image).startsWith('http') ? img(image) : SITE_URL + img(image)) : undefined;
  return (
    <Helmet>
      <title>{full}</title>
      <meta name="description" content={desc.slice(0, 160)} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {url && <link rel="canonical" href={url} />}
      <meta property="og:site_name" content={NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title || NAME} />
      <meta property="og:description" content={desc.slice(0, 200)} />
      {url && <meta property="og:url" content={url} />}
      {image2 && <meta property="og:image" content={image2} />}
      <meta name="twitter:card" content={image2 ? 'summary_large_image' : 'summary'} />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}
