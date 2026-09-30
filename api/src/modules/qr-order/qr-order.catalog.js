'use strict';

const IMAGE_BASE = 'https://frontend-taupe-beta-47.vercel.app/menu';

const variant = (id, name, price) => ({ id, name, price, available: true });
const item = (id, category, name, description, image, variants) => ({
  id,
  category,
  name,
  description,
  imageUrl: `${IMAGE_BASE}/${image}`,
  available: true,
  variants,
});

const categories = [
  {
    key: 'PIZZA_SAUCE_ROUGE',
    label: 'Pizza Sauce Rouge',
    items: [
      item('red-margherita', 'PIZZA_SAUCE_ROUGE', 'Margherita', 'Sauce tomate, mozzarella, basilic', 'margherita.webp', [variant('m', 'M', 10), variant('l', 'L', 15), variant('xl', 'XL', 22)]),
      item('red-tunno', 'PIZZA_SAUCE_ROUGE', 'Tunno', 'Mozzarella, thon, basilic, poivron, olive, oignons', 'tunno.webp', [variant('m', 'M', 15), variant('l', 'L', 19), variant('xl', 'XL', 29)]),
      item('red-four-cheese', 'PIZZA_SAUCE_ROUGE', '4 Fromage', 'Mozzarella, cheddar, fromage bleu, gruyere', '4-fromage.webp', [variant('m', 'M', 18), variant('l', 'L', 23), variant('xl', 'XL', 33)]),
      item('red-mexicana', 'PIZZA_SAUCE_ROUGE', 'Mexicana', 'Mozzarella, viande hachee, aubergine, poivron', 'mexicana.webp', [variant('m', 'M', 17), variant('l', 'L', 22), variant('xl', 'XL', 32)]),
      item('red-napolitana', 'PIZZA_SAUCE_ROUGE', 'Napolitana', 'Sauce tomate, mozzarella, anchois, capres, origan', 'napolitana.webp', [variant('m', 'M', 17), variant('l', 'L', 21), variant('xl', 'XL', 29)]),
      item('red-chicken-mushroom', 'PIZZA_SAUCE_ROUGE', 'Poulet Champignons', 'Mozzarella, poulet, champignons frais, oignons, poivron, sauce blanche en supplement', 'poulet-champignons-rouge.webp', [variant('m', 'M', 16), variant('l', 'L', 20), variant('xl', 'XL', 30)]),
      item('red-pepperoni-ham', 'PIZZA_SAUCE_ROUGE', 'Pepperoni & Jambon', 'Mozzarella, pepperoni, jambon fume, jambon de campagne', 'pepperoni-jambon.webp', [variant('m', 'M', 16), variant('l', 'L', 19), variant('xl', 'XL', 29)]),
    ],
  },
  {
    key: 'PIZZA_SAUCE_BLANCHE',
    label: 'Pizza Sauce Blanche',
    items: [
      item('white-bianca', 'PIZZA_SAUCE_BLANCHE', 'Bianca', 'Mozzarella, ricotta, roquette', 'bianca.webp', [variant('l', 'L', 20)]),
      item('white-salmon', 'PIZZA_SAUCE_BLANCHE', 'Saumon', 'Mozzarella, saumon fume', 'saumon.webp', [variant('l', 'L', 30)]),
      item('white-four-cheese', 'PIZZA_SAUCE_BLANCHE', '4 Fromage', 'Mozzarella, cheddar cube, fromage bleu, gruyere', '4-fromage-blanche.webp', [variant('m', 'M', 19), variant('l', 'L', 24), variant('xl', 'XL', 34)]),
      item('white-chicken-mushroom', 'PIZZA_SAUCE_BLANCHE', 'Poulet Champignons', 'Mozzarella, poulet, champignons frais, oignons, poivron', 'poulet-champignons-blanche.webp', [variant('m', 'M', 17), variant('l', 'L', 22), variant('xl', 'XL', 32)]),
      item('white-pepperoni-ham', 'PIZZA_SAUCE_BLANCHE', 'Pepperoni / 3 Jambon', 'Mozzarella, pepperoni, jambon fume, jambon de campagne', 'pepperoni-3-jambon-blanche.webp', [variant('m', 'M', 16), variant('l', 'L', 20), variant('xl', 'XL', 30)]),
      item('white-super-pronto', 'PIZZA_SAUCE_BLANCHE', 'Super Pronto', 'Mozzarella, poulet, viande hachee, jambon fume, pepperoni', 'super-pronto.webp?v=2', [variant('m', 'M', 20), variant('l', 'L', 27), variant('xl', 'XL', 37)]),
    ],
  },
  {
    key: 'PORTOFOLIO',
    label: 'Portofolio',
    items: [
      item('portfolio-escalope', 'PORTOFOLIO', 'Portofolio Escalope', 'Mozzarella, creme fraiche, cheddar, harissa, salade, escalope, frites', 'portofolio-escalope.webp', [variant('simple', 'Simple', 14)]),
      item('portfolio-pronto', 'PORTOFOLIO', 'Portofolio Pronto', 'Mozzarella, creme fraiche, cheddar, harissa, salade, poulet, viande hachee, jambon fume, frites', 'portofolio-pronto.webp', [variant('simple', 'Simple', 20)]),
      item('portfolio-breaded-escalope', 'PORTOFOLIO', 'Portfolio Escalope Panee', 'Mozzarella, creme fraiche, cheddar, harissa, salade, escalope panee, frites', 'portfolio-escalope-panee.webp', [variant('simple', 'Simple', 15)]),
      item('portfolio-cordon-bleu', 'PORTOFOLIO', 'Portfolio Cordon Bleu', 'Mozzarella, creme fraiche, cheddar, harissa, salade, cordon bleu, frites', 'portfolio-cordon-bleu.webp', [variant('simple', 'Simple', 16)]),
      item('portfolio-minced-meat', 'PORTOFOLIO', 'Portfolio Viande Hachee', 'Mozzarella, creme fraiche, cheddar, harissa, salade, viande hachee, frites', 'portfolio-viande-hachee.webp', [variant('simple', 'Simple', 15)]),
    ],
  },
  {
    key: 'BAGUETTE_FARCIE',
    label: 'Baguette Farcie',
    items: [
      item('baguette-escalope', 'BAGUETTE_FARCIE', 'Baguette Escalope', 'Mozzarella, creme fraiche, harissa, salade, escalope, frites', 'baguette-escalope.webp', [variant('simple', 'Simple', 12)]),
      item('baguette-breaded-escalope', 'BAGUETTE_FARCIE', 'Baguette Escalope Panee', 'Mozzarella, creme fraiche, harissa, salade, escalope panee, frites', 'baguette-escalope-panee.webp', [variant('simple', 'Simple', 14)]),
      item('baguette-cordon-bleu', 'BAGUETTE_FARCIE', 'Baguette Cordon Bleu', 'Mozzarella, creme fraiche, harissa, salade, cordon bleu, frites', 'baguette-cordon-bleu.webp', [variant('simple', 'Simple', 15)]),
      item('baguette-minced-meat', 'BAGUETTE_FARCIE', 'Baguette Viande Hachee', 'Mozzarella, creme fraiche, harissa, salade, viande hachee, frites', 'baguette-viande-hachee.webp', [variant('simple', 'Simple', 15)]),
      item('baguette-pronto', 'BAGUETTE_FARCIE', 'Baguette Pronto', 'Mozzarella, creme fraiche, harissa, salade, poulet, viande hachee, jambon fume, frites', 'baguette-pronto.webp', [variant('simple', 'Simple', 18)]),
    ],
  },
  {
    key: 'PANUZZO',
    label: 'Panuzzo',
    items: [
      item('panuzzo-escalope', 'PANUZZO', 'Panuzzo Escalope', 'Sauce fromage, legume grille, escalope', 'panuzzo-escalope.webp', [variant('simple', 'Simple', 14)]),
      item('panuzzo-minced-meat', 'PANUZZO', 'Panuzzo Viande Hachee', 'Sauce fromage, legume grille, viande hachee', 'panuzzo-viande-hachee.webp', [variant('simple', 'Simple', 15)]),
      item('panuzzo-pronto', 'PANUZZO', 'Panuzzo Pronto', 'Sauce fromage, legume grille, pronto', 'panuzzo-pronto.webp', [variant('simple', 'Simple', 20)]),
    ],
  },
  {
    key: 'MAKLOUB',
    label: 'Makloub',
    items: [
      item('makloub-escalope', 'MAKLOUB', 'Escalope', 'Mozzarella, harissa, salade, escalope, frites', 'makloub-escalope.webp', [variant('simple', 'Simple', 11)]),
      item('makloub-pronto', 'MAKLOUB', 'Pronto', 'Mozzarella, creme fraiche, harissa, salade, poulet, viande hachee, jambon fume, frites', 'makloub-pronto.webp', [variant('simple', 'Simple', 17)]),
    ],
  },
  {
    key: 'BOISSONS',
    label: 'Boissons',
    items: [
      item('drink-water', 'BOISSONS', 'Eau', 'Bouteille d eau', 'eau.webp', [variant('simple', 'Simple', 2)]),
      item('drink-soda', 'BOISSONS', 'Soda', 'Boisson gazeuse', 'soda.webp', [variant('simple', 'Simple', 2.5)]),
    ],
  },
];

const itemIndex = new Map();
for (const category of categories) {
  for (const product of category.items) {
    itemIndex.set(product.id, product);
  }
}

function getCatalog() {
  return { categories, extras: [] };
}

function resolveCatalogLine(menuItemId, variantId) {
  const product = itemIndex.get(String(menuItemId));
  const selectedVariant = product?.variants.find((candidate) => candidate.id === String(variantId));
  if (!product || !product.available || !selectedVariant || !selectedVariant.available) {
    return null;
  }
  return { product, variant: selectedVariant };
}

module.exports = { getCatalog, resolveCatalogLine };
