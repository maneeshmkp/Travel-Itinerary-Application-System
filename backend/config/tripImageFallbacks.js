/**
 * Curated cover images when Unsplash Search API is unavailable.
 * Each destination has its own primary image plus alternates for deduplication.
 */

const u = (photoId) => `https://images.unsplash.com/${photoId}?w=1200&h=800&fit=crop&q=80&auto=format`

/** Stable Wikimedia Commons images for specific landmarks (CC-licensed). */
export const WIKIMEDIA = {
  mahakaleshwarUjjain:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Mahakaleshwar_Temple%2C_Ujjain.jpg/1280px-Mahakaleshwar_Temple%2C_Ujjain.jpg",
  meenakshiMadurai:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Meenakshi_Temple%2C_Madurai%2C_India.jpg/1280px-Meenakshi_Temple%2C_Madurai%2C_India.jpg",
  ramanathaswamyRameswaram:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Ramanathaswamy_Temple%2C_Rameswaram.jpg/1280px-Ramanathaswamy_Temple%2C_Rameswaram.jpg",
  varanasiGhat:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Dashashwamedh_Ghat%2C_Varanasi.jpg/1280px-Dashashwamedh_Ghat%2C_Varanasi.jpg",
  shimlaLandscape:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Landscape_of_Shimla_%2C_Himachal_Pradesh.jpg/1280px-Landscape_of_Shimla_%2C_Himachal_Pradesh.jpg",
  shimlaMallRoad:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Mall_Road_shimla.jpg/1280px-Mall_Road_shimla.jpg",
  hawaMahalJaipur:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Hawa_Mahal_in_Jaipur_03-2016_img3.jpg/1280px-Hawa_Mahal_in_Jaipur_03-2016_img3.jpg",
}

/** Verified working Unsplash photo IDs (invalid IDs return HTTP 404). */
export const VERIFIED_UNSPLASH = {
  tajMahal: u("photo-1564507592333-c60657eea523"),
  tajMahalDoorway: u("photo-1548013146-72479768bada"),
  beach: u("photo-1507525428034-b723cf961d3e"),
  goaBeach: u("photo-1512343879784-a960bf40e7f2"),
  mountains: u("photo-1506905925346-21bda4d32df4"),
  himalaya: u("photo-1464822759023-fed622ff2c3b"),
  shimlaHills: u("photo-1519681393784-d120267933ba"),
  manaliValley: u("photo-1469474968028-56623f02e42e"),
  rishikeshNature: u("photo-1470071459604-3b5ec3a7fe05"),
  lehLadakh: u("photo-1526772662000-3f88f10405ff"),
  darjeelingMist: u("photo-1552733407-5d5c46c3bb3b"),
  phuketResort: u("photo-1582719508461-905c673771fd"),
  phuketCoast: u("photo-1613395877344-13d4a8e0d49e"),
  krabiKarst: u("photo-1537953773345-d172ccf13cf1"),
  krabiBeach: u("photo-1596422846543-75c6fc197f07"),
  andamanBoats: u("photo-1552465011-b4e21bf6e79a"),
  bangkokCity: u("photo-1563492065599-3520f775eeed"),
  singaporeSkyline: u("photo-1540959733332-eab4deabeeaf"),
  thailandBeach: u("photo-1518548419970-58e3b4079ab2"),
  gatewayMumbai: u("photo-1570168007204-dfb528c6958f"),
  indiaGate: u("photo-1587474260584-136574528ed5"),
  lakePichola: u("photo-1599661046289-e31897846e41"),
  dalLake: u("photo-1476514525535-07fb3b4ae5f1"),
  valley: u("photo-1501785888041-af3ef285b470"),
  dubai: u("photo-1512453979798-5ea266f8880c"),
  travel: u("photo-1488646953014-85cb44e25828"),
  hinduTemple: u("photo-1558618666-fcd25c85cd64"),
  jaipurHeritage: u("photo-1626621341517-bbf3d9990a23"),
}

/** Previously used as a shared fallback — force refresh when assigned to specific destinations. */
export const GENERIC_SHARED_PHOTO_IDS = [
  "photo-1506905925346-21bda4d32df4",
  "photo-1507525428034-b723cf961d3e",
  "photo-1488646953014-85cb44e25828",
  "photo-1578662996442-48f60103fc96",
]

/** Photo IDs removed from Unsplash — force backfill if still stored. */
export const BROKEN_UNSPLASH_PHOTO_IDS = [
  "photo-1609137144812-7b95390ba1f9",
  "photo-1588668219937-7b6379f859a8",
  "photo-1561361513-023abb0c4a8c",
  "photo-1602216050196-3b30cc0c1b12",
  "photo-1477587450883-47145ad94245",
  "photo-1552462531-cd324e0cbd51",
  "photo-1525625293386-3fa89ea39b19",
  "photo-1537996194471-f2976a1c4d6e",
  "photo-1506667697829-ff62c4d54fc9",
  "photo-1582510003659-df8cc67f7455",
  "photo-1605647540924-9fcfefdd4d39",
  "photo-1486870591958-9b539d56df7a",
  "photo-1524492412937-336c73fd7857",
]

/** Taj Mahal Unsplash IDs — invalid cover for non-Agra spiritual/temple trips. */
export const TAJ_MAHAL_PHOTO_IDS = ["photo-1548013146-72479768bada", "photo-1564507592333-c60657eea523"]

function cover(url, alt, query, extraUrls = []) {
  const source = String(url).includes("wikimedia.org") ? "wikimedia" : "curated"
  return {
    urls: [url, ...extraUrls].filter(Boolean),
    url,
    alt,
    source,
    query,
  }
}

/** Extra unique images when primary/alternates for a destination are already used elsewhere. */
export const UNIQUE_OVERFLOW_POOL = [
  VERIFIED_UNSPLASH.shimlaHills,
  VERIFIED_UNSPLASH.manaliValley,
  VERIFIED_UNSPLASH.rishikeshNature,
  VERIFIED_UNSPLASH.lehLadakh,
  VERIFIED_UNSPLASH.darjeelingMist,
  VERIFIED_UNSPLASH.phuketResort,
  VERIFIED_UNSPLASH.phuketCoast,
  VERIFIED_UNSPLASH.krabiKarst,
  VERIFIED_UNSPLASH.krabiBeach,
  VERIFIED_UNSPLASH.andamanBoats,
  VERIFIED_UNSPLASH.bangkokCity,
  VERIFIED_UNSPLASH.singaporeSkyline,
  VERIFIED_UNSPLASH.thailandBeach,
  VERIFIED_UNSPLASH.himalaya,
  VERIFIED_UNSPLASH.mountains,
  VERIFIED_UNSPLASH.beach,
  VERIFIED_UNSPLASH.goaBeach,
  VERIFIED_UNSPLASH.valley,
  VERIFIED_UNSPLASH.dalLake,
  VERIFIED_UNSPLASH.lakePichola,
  VERIFIED_UNSPLASH.gatewayMumbai,
  VERIFIED_UNSPLASH.indiaGate,
  VERIFIED_UNSPLASH.hinduTemple,
  VERIFIED_UNSPLASH.travel,
  VERIFIED_UNSPLASH.dubai,
]

/** @type {Array<{ patterns: RegExp[], cover: object }>} */
export const TRIP_IMAGE_FALLBACKS = [
  {
    patterns: [/ujjain/i, /mahakal/i, /mahakaleshwar/i, /bhasma aarti/i, /ram ghat/i],
    cover: cover(
      WIKIMEDIA.mahakaleshwarUjjain,
      "Mahakaleshwar Temple, Ujjain, India",
      "Mahakaleshwar Temple Ujjain India",
      [VERIFIED_UNSPLASH.hinduTemple],
    ),
  },
  {
    patterns: [/meenakshi/i, /madurai/i, /south india temple/i, /tamil nadu temple/i, /temple pilgrimage/i],
    cover: cover(
      WIKIMEDIA.meenakshiMadurai,
      "Meenakshi Amman Temple, Madurai, India",
      "Meenakshi Amman Temple Madurai India",
      [VERIFIED_UNSPLASH.hinduTemple],
    ),
  },
  {
    patterns: [/rameswaram/i, /ramanathaswamy/i],
    cover: cover(
      WIKIMEDIA.ramanathaswamyRameswaram,
      "Ramanathaswamy Temple, Rameswaram, India",
      "Ramanathaswamy Temple Rameswaram India",
      [VERIFIED_UNSPLASH.hinduTemple],
    ),
  },
  {
    patterns: [/tirupati/i, /tirumala/i, /venkateswara/i, /balaji/i],
    cover: cover(
      VERIFIED_UNSPLASH.hinduTemple,
      "Tirumala Venkateswara Temple, Tirupati, India",
      "Tirumala Venkateswara Temple Tirupati India",
      [WIKIMEDIA.meenakshiMadurai],
    ),
  },
  {
    patterns: [/\bshimla\b/i, /mall road.*shimla/i],
    cover: cover(
      WIKIMEDIA.shimlaLandscape,
      "Shimla hill station, Himachal Pradesh, India",
      "Shimla Himachal Pradesh India",
      [WIKIMEDIA.shimlaMallRoad, VERIFIED_UNSPLASH.shimlaHills, VERIFIED_UNSPLASH.himalaya],
    ),
  },
  {
    patterns: [/\bmanali\b/i, /solang/i, /rohtang/i],
    cover: cover(
      VERIFIED_UNSPLASH.manaliValley,
      "Manali valley, Himachal Pradesh, India",
      "Manali Himachal Pradesh mountains India",
      [VERIFIED_UNSPLASH.shimlaHills, VERIFIED_UNSPLASH.himalaya],
    ),
  },
  {
    patterns: [/\brishikesh\b/i, /lakshman jhula/i, /ganga.*aarti/i],
    cover: cover(
      VERIFIED_UNSPLASH.rishikeshNature,
      "Rishikesh, Uttarakhand, India",
      "Rishikesh Ganges Uttarakhand India",
      [VERIFIED_UNSPLASH.hinduTemple, VERIFIED_UNSPLASH.himalaya, VERIFIED_UNSPLASH.manaliValley],
    ),
  },
  {
    patterns: [/\bleh\b/i, /\bladakh\b/i, /pangong/i, /nubra/i, /khardung/i],
    cover: cover(
      VERIFIED_UNSPLASH.lehLadakh,
      "Leh Ladakh, India",
      "Leh Ladakh mountains India",
      [VERIFIED_UNSPLASH.himalaya, VERIFIED_UNSPLASH.shimlaHills],
    ),
  },
  {
    patterns: [/darjeeling/i, /tiger hill/i, /kanchenjunga/i],
    cover: cover(
      VERIFIED_UNSPLASH.darjeelingMist,
      "Darjeeling tea hills, West Bengal, India",
      "Darjeeling Tiger Hill Kanchenjunga India",
      [VERIFIED_UNSPLASH.himalaya, VERIFIED_UNSPLASH.shimlaHills],
    ),
  },
  {
    patterns: [/agra/i, /taj mahal/i, /tajganj/i],
    cover: cover(
      VERIFIED_UNSPLASH.tajMahal,
      "Taj Mahal, Agra, India",
      "Taj Mahal Agra India",
      [VERIFIED_UNSPLASH.tajMahalDoorway],
    ),
  },
  {
    patterns: [/jaipur/i, /amber fort/i, /hawamahal/i, /hawa mahal/i],
    cover: cover(
      VERIFIED_UNSPLASH.jaipurHeritage,
      "Jaipur heritage architecture, India",
      "Hawa Mahal Jaipur India",
      [VERIFIED_UNSPLASH.lakePichola, VERIFIED_UNSPLASH.hinduTemple],
    ),
  },
  {
    patterns: [/udaipur/i, /lake pichola/i, /city palace.*udaipur/i],
    cover: cover(VERIFIED_UNSPLASH.lakePichola, "Lake Pichola, Udaipur, India", "Lake Pichola Udaipur India", [
      VERIFIED_UNSPLASH.valley,
    ]),
  },
  {
    patterns: [/mumbai/i, /gateway of india/i, /marine drive/i, /colaba/i],
    cover: cover(VERIFIED_UNSPLASH.gatewayMumbai, "Gateway of India, Mumbai", "Gateway of India Mumbai", [
      VERIFIED_UNSPLASH.indiaGate,
    ]),
  },
  {
    patterns: [/delhi/i, /india gate/i, /chandni chowk/i, /old delhi/i],
    cover: cover(VERIFIED_UNSPLASH.indiaGate, "India Gate, New Delhi", "India Gate Delhi India", [
      VERIFIED_UNSPLASH.gatewayMumbai,
    ]),
  },
  {
    patterns: [/goa/i, /calangute/i, /baga/i, /anjuna/i, /panjim/i, /panaji/i],
    cover: cover(VERIFIED_UNSPLASH.goaBeach, "Goa beach, India", "Goa beach India", [VERIFIED_UNSPLASH.beach]),
  },
  {
    patterns: [/corbett/i, /jim corbett/i, /nainital.*corbett/i],
    cover: cover(
      VERIFIED_UNSPLASH.rishikeshNature,
      "Jim Corbett National Park, Uttarakhand, India",
      "Jim Corbett National Park wildlife India",
      [VERIFIED_UNSPLASH.mountains, VERIFIED_UNSPLASH.himalaya],
    ),
  },
  {
    patterns: [/\bkrabi\b/i, /railay/i, /ao nang/i, /tiger cave/i],
    cover: cover(
      VERIFIED_UNSPLASH.krabiKarst,
      "Krabi limestone cliffs, Thailand",
      "Krabi Railay Beach Thailand",
      [VERIFIED_UNSPLASH.krabiBeach, VERIFIED_UNSPLASH.andamanBoats, VERIFIED_UNSPLASH.thailandBeach],
    ),
  },
  {
    patterns: [/\bphuket\b/i, /patong/i, /phi phi/i, /kata beach/i, /big buddha.*phuket/i],
    cover: cover(
      VERIFIED_UNSPLASH.phuketCoast,
      "Phuket coastline, Thailand",
      "Phuket beach Thailand",
      [VERIFIED_UNSPLASH.phuketResort, VERIFIED_UNSPLASH.thailandBeach, VERIFIED_UNSPLASH.beach],
    ),
  },
  {
    patterns: [/andaman/i, /havelock/i, /port blair/i, /radhanagar/i],
    cover: cover(
      VERIFIED_UNSPLASH.andamanBoats,
      "Andaman Islands, India",
      "Andaman Islands beach India",
      [VERIFIED_UNSPLASH.beach, VERIFIED_UNSPLASH.krabiBeach, VERIFIED_UNSPLASH.thailandBeach],
    ),
  },
  {
    patterns: [/vaishno devi/i, /katra/i, /jammu/i, /kashmir/i, /gulmarg/i, /pahalgam/i],
    cover: cover(
      VERIFIED_UNSPLASH.himalaya,
      "Kashmir mountains and valleys, India",
      "Kashmir mountains India",
      [VERIFIED_UNSPLASH.dalLake, VERIFIED_UNSPLASH.mountains, VERIFIED_UNSPLASH.shimlaHills],
    ),
  },
  {
    patterns: [/dal lake/i, /srinagar/i, /shikara/i, /shalimar/i],
    cover: cover(VERIFIED_UNSPLASH.dalLake, "Dal Lake, Srinagar, Kashmir", "Dal Lake Srinagar Kashmir", [
      VERIFIED_UNSPLASH.himalaya,
    ]),
  },
  {
    patterns: [/varanasi/i, /ghat/i, /ganga aarti/i],
    cover: cover(
      WIKIMEDIA.varanasiGhat,
      "Varanasi ghats on the Ganges, India",
      "Varanasi Ganges ghats India",
      [VERIFIED_UNSPLASH.hinduTemple],
    ),
  },
  {
    patterns: [/kerala/i, /alleppey/i, /backwater/i],
    cover: cover(
      VERIFIED_UNSPLASH.dalLake,
      "Kerala backwaters, India",
      "Kerala backwaters India",
      [VERIFIED_UNSPLASH.valley, VERIFIED_UNSPLASH.beach],
    ),
  },
  {
    patterns: [/bali/i, /ubud/i],
    cover: cover(VERIFIED_UNSPLASH.valley, "Bali rice terraces, Indonesia", "Bali Indonesia travel", [
      VERIFIED_UNSPLASH.thailandBeach,
    ]),
  },
  {
    patterns: [/\bbangkok\b/i, /wat arun/i, /wat phra/i, /grand palace.*bangkok/i],
    cover: cover(
      VERIFIED_UNSPLASH.bangkokCity,
      "Bangkok, Thailand",
      "Bangkok Wat Arun Thailand city",
      [VERIFIED_UNSPLASH.singaporeSkyline, VERIFIED_UNSPLASH.travel],
    ),
  },
  {
    patterns: [/\bsingapore\b/i, /marina bay/i, /sentosa/i],
    cover: cover(
      VERIFIED_UNSPLASH.singaporeSkyline,
      "Singapore skyline",
      "Singapore Marina Bay skyline",
      [VERIFIED_UNSPLASH.bangkokCity, VERIFIED_UNSPLASH.dubai],
    ),
  },
  {
    patterns: [/dubai/i, /burj khalifa/i],
    cover: cover(VERIFIED_UNSPLASH.dubai, "Dubai skyline", "Dubai Burj Khalifa", [VERIFIED_UNSPLASH.singaporeSkyline]),
  },
]

export const THEME_FALLBACKS = {
  spiritual: cover(
    VERIFIED_UNSPLASH.hinduTemple,
    "Indian temple pilgrimage",
    "India temple pilgrimage",
    [WIKIMEDIA.meenakshiMadurai, WIKIMEDIA.mahakaleshwarUjjain],
  ),
  temple: cover(
    WIKIMEDIA.meenakshiMadurai,
    "South Indian temple architecture",
    "South India temple pilgrimage",
    [VERIFIED_UNSPLASH.hinduTemple, WIKIMEDIA.mahakaleshwarUjjain],
  ),
  beach: cover(VERIFIED_UNSPLASH.beach, "Tropical beach destination", "tropical beach travel", [
    VERIFIED_UNSPLASH.goaBeach,
    VERIFIED_UNSPLASH.thailandBeach,
    VERIFIED_UNSPLASH.krabiBeach,
  ]),
  mountain: cover(VERIFIED_UNSPLASH.mountains, "Mountain travel destination", "mountain travel India", [
    VERIFIED_UNSPLASH.himalaya,
    VERIFIED_UNSPLASH.shimlaHills,
    VERIFIED_UNSPLASH.manaliValley,
  ]),
  snowfall: cover(VERIFIED_UNSPLASH.himalaya, "Snowy mountain landscape", "snow mountain travel", [
    VERIFIED_UNSPLASH.shimlaHills,
    VERIFIED_UNSPLASH.lehLadakh,
  ]),
  adventure: cover(VERIFIED_UNSPLASH.himalaya, "Adventure travel in nature", "adventure mountain travel", [
    VERIFIED_UNSPLASH.manaliValley,
    VERIFIED_UNSPLASH.lehLadakh,
  ]),
  cultural: cover(VERIFIED_UNSPLASH.jaipurHeritage, "Cultural heritage travel", "cultural heritage travel India", [
    VERIFIED_UNSPLASH.hinduTemple,
    VERIFIED_UNSPLASH.lakePichola,
  ]),
  city: cover(VERIFIED_UNSPLASH.travel, "City landmarks and culture", "city landmark travel", [
    VERIFIED_UNSPLASH.singaporeSkyline,
    VERIFIED_UNSPLASH.bangkokCity,
  ]),
  india: cover(VERIFIED_UNSPLASH.gatewayMumbai, "Travel in India", "India travel landmarks", [
    VERIFIED_UNSPLASH.indiaGate,
    VERIFIED_UNSPLASH.hinduTemple,
  ]),
  default: cover(VERIFIED_UNSPLASH.travel, "Travel destination", "travel destination landscape", [
    VERIFIED_UNSPLASH.valley,
    VERIFIED_UNSPLASH.dubai,
  ]),
}

export const UNRELATED_IMAGE_PATTERNS = [
  /picsum\.photos/i,
  /loremflickr/i,
  /placeholder/i,
  /default-travel\.svg/i,
  /\/fallbacks\//i,
  /source\.unsplash\.com\/random/i,
  /photo-1451187580459-43490279c0fa/i,
  /photo-1529156069898-49953e39b3ac/i,
  ...BROKEN_UNSPLASH_PHOTO_IDS.map((id) => new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))),
]
