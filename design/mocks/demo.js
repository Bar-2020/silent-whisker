/* Sample map data. Synthetic: invented spots around central Tel Aviv, not city data. */
window.MockDemo = {
  center: [32.0622, 34.7702],
  here: [32.0624, 34.7698],
  spots: [
    { id: 'red', lat: 32.0628, lng: 34.7691, level: 'red', kind: 'food' },
    { id: 'orange', lat: 32.061, lng: 34.7716, level: 'orange', kind: 'water' },
    { id: 'green', lat: 32.0641, lng: 34.7727, level: 'green', kind: 'both' },
    { id: 'none', lat: 32.0603, lng: 34.768, level: 'none', kind: 'food' },
    { id: 'red2', lat: 32.0652, lng: 34.7667, level: 'red', kind: 'both' },
    { id: 'quiet', lat: 32.0589, lng: 34.7704, level: 'green', kind: 'food', status: 'inactive' },
    { id: 'orange2', lat: 32.0617, lng: 34.7745, level: 'orange', kind: 'food' },
    { id: 'green2', lat: 32.0636, lng: 34.7694, level: 'green', kind: 'water' },
  ],
  pending: {
    id: 'pending',
    lat: 32.0634,
    lng: 34.7706,
    level: 'none',
    kind: 'food',
    status: 'pending',
  },
  alerts: [
    { id: 'danger', lat: 32.0647, lng: 34.7703, kind: 'danger' },
    { id: 'sick', lat: 32.0598, lng: 34.7727, kind: 'sick' },
  ],
};
