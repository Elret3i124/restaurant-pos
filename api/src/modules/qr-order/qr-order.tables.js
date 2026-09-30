'use strict';

const crypto = require('node:crypto');

const tableSecrets = new Map([
  [1, '3a2712f3af3191cab581ca821d1f341ce244a4b6556b8828'],
  [2, 'affcc8c77ffadad87f274d2cc0fdb6c1529a4f05f3b8af82'],
  [3, '36ece33bb309d29f6690d62112f910f0fb7e5f5f2ef4c1c1'],
  [4, 'c4e5574f220a72fdb38e923b6662bf6f59f6976e263dce25'],
  [5, '2bc92134bab3349279903c6d53bba3f749677a8a4591316d'],
  [6, 'd11164d1d759c13b9b13897b2b7ab974b93fc827a0cebe8c'],
  [7, 'cb4dfc883572b633589509e3f7b8bd19971ac3e6981a3e66'],
  [8, 'cb49bc0d19667f8a030ff436c031972b58d31682b7c05aab'],
  [9, '1f42aeafd5b5c9720397ace61bc3fe01f7f30993c4a853ba'],
  [10, '709185c82a50a0e87fbf41b5b74536949a40305f5445c252'],
  [11, '0d2d5e09afbd731960ec5c111141f5402b2f50303e6f1ef5'],
  [12, 'c8508d2c59fe00f0c7e818ecf00d31972ce6632c6da7fb25'],
  [13, 'ef4ee9223d4518cb53f2dd2005f3874f87fca5c066164e15'],
  [14, '93ee110e6e309460dab38b3412c8dd5687cdcbfcdfd8faa6'],
  [15, '6b4b4846abddc88f0109bd785be5c1d80295b3677f41894a'],
  [16, '6d6d04a6a4ec0094462cd98927521a470cddec0c061f73a2'],
  [17, '107b9aeb8607aa5fbc743abbd579324224ba248450773792'],
  [18, '549ea5270cafaa873897b24f2d02ed5b670cb58c602f9596'],
  [19, '703637677188b1242133329c18ff06b04285e0d3cf516126'],
  [20, '7e78a214b0459958f5db06f041ecd8ed3d1f467ef7c0496f'],
]);

function isValidTableSecret(tableNumber, suppliedSecret) {
  const expected = tableSecrets.get(Number(tableNumber));
  if (!expected || typeof suppliedSecret !== 'string') return false;
  const actualBuffer = Buffer.from(suppliedSecret, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

module.exports = { isValidTableSecret, tableSecrets };
