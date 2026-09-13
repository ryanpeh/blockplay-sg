export const locations = [
  {
    id: 'tampines', name: 'Tampines', subtitle: 'The heartland circuit', district: 'EAST SIDE',
    description: 'Pastel blocks, shady streets, and the long way home. A little everyday Singapore, ready to play.',
    lat: 1.3545, lng: 103.9453, heading: 90, color: '#dd997f', block: 218,
    tags: ['HDB estates', 'Neighborhood streets'],
    viewpoints: [
      { label: 'Estate streets', lat: 1.3545, lng: 103.9453, heading: 90 },
      { label: 'Around the block', lat: 1.3529, lng: 103.9444, heading: 0 },
      { label: 'A little further', lat: 1.3562, lng: 103.9436, heading: 180 },
    ],
  },
  {
    id: 'toa-payoh', name: 'Toa Payoh', subtitle: 'Old-school, new playground', district: 'CENTRAL',
    description: 'Take a spin through one of Singapore’s original heartlands. Familiar blocks. A fresh perspective.',
    lat: 1.3327, lng: 103.8493, heading: 180, color: '#d8bd70', block: 78,
    tags: ['Classic heartland', 'Everyday icons'],
    viewpoints: [
      { label: 'Estate streets', lat: 1.3327, lng: 103.8493, heading: 180 },
      { label: 'Around the block', lat: 1.3343, lng: 103.8504, heading: 90 },
      { label: 'A little further', lat: 1.3308, lng: 103.8508, heading: 0 },
    ],
  },
  {
    id: 'queenstown', name: 'Queenstown', subtitle: 'A different kind of royalty', district: 'SOUTHWEST',
    description: 'Slow down around the queen of estates. There’s a story around every corner, and room for yours.',
    lat: 1.2942, lng: 103.8060, heading: 60, color: '#8eaaa0', block: 53,
    tags: ['Heritage estate', 'Green corridors'],
    viewpoints: [
      { label: 'Estate streets', lat: 1.2942, lng: 103.8060, heading: 60 },
      { label: 'Around the block', lat: 1.2959, lng: 103.8046, heading: 180 },
      { label: 'A little further', lat: 1.2928, lng: 103.8075, heading: 0 },
    ],
  },
  {
    id: 'marina-bay', name: 'Marina Bay', subtitle: 'The postcard route', district: 'DOWNTOWN',
    description: 'A first step into image-derived 3D: explore a small waterfront scene built from four Street View photographs. February 2012 imagery, approximate depth.',
    lat: 1.2867, lng: 103.8545, heading: 110, color: '#9bb9cc', block: 18,
    tags: ['Waterfront', 'City skyline'],
    viewpoints: [
      { label: 'Bay streets', lat: 1.2867, lng: 103.8545, heading: 110 },
      { label: 'Another angle', lat: 1.2852, lng: 103.8530, heading: 45 },
      { label: 'Along the bay', lat: 1.2885, lng: 103.8550, heading: 135 },
    ],
  },
] as const;

export type Location = (typeof locations)[number];
export type Mode = 'drive' | 'training' | 'explore';
