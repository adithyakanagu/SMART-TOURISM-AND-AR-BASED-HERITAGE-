const publicAsset = (path) => `${process.env.PUBLIC_URL}${path}`;

export const defaultProductImages = {
  'Toda Embroidery Shawl': publicAsset('/shopping/toda-embroidery.webp'),
  'Nilgiri Wild Forest Honey': publicAsset('/shopping/nilgiri-honey.webp'),
  'Kota Handmade Pottery Set': publicAsset('/shopping/kota-pottery.webp'),
  'Nilgiri Tea Gift Box': publicAsset('/shopping/nilgiri-tea-estate.webp'),
  'Tea Powder Premium': publicAsset('/shopping/tea-powder.webp')
};

export const defaultHotelImages = {
  'Hill Crest Residency': publicAsset('/shopping/hill-crest-residency.webp'),
  'Tea Valley Stay': publicAsset('/shopping/tea-valley-stay.webp'),
  'Misty Ridge Lodge': publicAsset('/shopping/misty-ridge-lodge.avif')
};