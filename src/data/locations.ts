export const locations = [
  {
    id: 'raffles-place', name: 'Raffles Place', subtitle: 'Between towers and the river', district: 'CITY CORE',
    description: 'Explore a low-poly business district of glass towers, shaded plazas and riverfront streets. An authored, compressed game world informed by street-level references.',
    lat: 1.2840, lng: 103.8510, heading: 0, color: '#879caa', block: 1,
    tags: ['City plaza', 'Riverfront streets'],
    viewpoints: [
      { label: 'Raffles Place plaza', lat: 1.2840, lng: 103.8510, heading: 0 },
      { label: 'Battery Road', lat: 1.2853, lng: 103.8520, heading: 180 },
      { label: 'Boat Quay', lat: 1.2863, lng: 103.8495, heading: 90 },
    ],
  },
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
    description: 'A walkable, driveable take on Queenstown: familiar estate blocks, sheltered paths and neighborhood stops. An authored low-poly region, not a surveyed map.',
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
    description: 'Palm-lined paths, a skyline you know, and more bay to explore. Walk or drive a growing, reference-informed low-poly Marina Bay.',
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
