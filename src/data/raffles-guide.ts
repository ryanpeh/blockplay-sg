/** Reviewed 13 September 2026. Stops link to district themes, not surveyed landmark coordinates. */
export const rafflesLearningTopics = [
  {
    id: 'raffles-place', title: 'Raffles Place: commerce through time',
    stops: ['raffles-square', 'mrt-entrance'],
    facts: [
      'Raffles Place was called Commercial Square before it was renamed in 1858.',
      'A National Heritage Board photograph shows its central car park in the 1950s, surrounded by banks, offices and shops. MRT entrances later occupied this central space.',
    ],
    notice: 'Compare the game’s square and MRT entrance. How might replacing parking with train access change a business district?',
    source: 'National Heritage Board — Raffles Place collection',
    url: 'https://www.roots.gov.sg/Collection-Landing/listing/1111377',
  },
  {
    id: 'raffles-boat-quay', title: 'Boat Quay: working river, living heritage',
    stops: ['boat-quay-lane', 'river-lookout'],
    facts: [
      'Boat Quay was a centre of trade along the Singapore River. Warehouses called godowns stored goods, while many shophouses combined ground-floor businesses with homes upstairs.',
      'Boat Quay became a conservation area in 1989. Its retained riverside buildings help tell the story of the port even as their uses change.',
    ],
    notice: 'Compare the low riverside buildings with the towers in this stylised world. What can older buildings reveal that a skyline alone cannot?',
    source: 'Urban Redevelopment Authority — Boat Quay Conservation Area',
    url: 'https://www.ura.gov.sg/conservation/find-a-building/conservation-portal/btqy/',
  },
  {
    id: 'raffles-collyer-quay', title: 'Collyer Quay: making a waterfront',
    stops: ['battery-promenade', 'collyer-boulevard'],
    facts: [
      'Collyer Quay was completed in 1864 and named after George Collyer, who designed the seafront reclamation scheme.',
      'New buildings followed along the quay by 1866. This is a reminder that even a familiar waterfront can be the result of deliberate land-making.',
    ],
    notice: 'These game promenade stops introduce the wider waterfront story; they are not exact historic sites. How could an old shoreline map differ from today’s?',
    source: 'National Heritage Board — Collyer Quay collection',
    url: 'https://www.roots.gov.sg/Collection-Landing/listing/1070220',
  },
  {
    id: 'raffles-lau-pa-sat', title: 'Lau Pa Sat: a market with many lives',
    stops: ['market-arcade', 'telok-market-garden'],
    facts: [
      'The Telok Ayer Market began beside the sea, where fishermen could bring in their catch. Its later cast-iron building, now known as Lau Pa Sat, was completed in 1894 on reclaimed land.',
      'The wet market was converted into a hawker centre and was gazetted as a National Monument in 1973.',
    ],
    notice: 'The game’s market stops evoke this district’s food heritage, not a measured copy of Lau Pa Sat. Why might a city keep a market building after its original job changes?',
    source: 'Lau Pa Sat — Our Heritage',
    url: 'https://www.laupasat.sg/heritage/',
  },
  {
    id: 'raffles-telok-ayer', title: 'Telok Ayer: a shoreline of communities',
    stops: ['cross-street-arcade'],
    facts: [
      'Telok Ayer Street once followed the shoreline and was a landing place for immigrants. Chinese and South Indian communities established places of worship in the area.',
      'The conserved Telok Ayer district includes several generations of shophouse design, from Early styles to Art Deco.',
    ],
    notice: 'Cross Street arcade is a stylised gateway to this neighbourhood story, not a replica of a particular temple. How can buildings preserve the memory of migration?',
    source: 'Urban Redevelopment Authority — Telok Ayer Conservation Area',
    url: 'https://www.ura.gov.sg/conservation/find-a-building/conservation-portal/tkay/',
  },
  {
    id: 'raffles-reclaimed-streets', title: 'Cecil Street and Robinson Road: streets where water was',
    stops: ['cecil-street', 'robinson-colonnade'],
    facts: [
      'Reclamation of Telok Ayer Bay in 1887 created land where Cecil Street and Robinson Road are now.',
      'Growing shipping trade created pressure on Singapore’s wharves and roads. Later reclamation of the Telok Ayer Basin also created the land for Shenton Way.',
    ],
    notice: 'The game compresses this street network. Imagine the water that once occupied part of the district: what clues could street names or old maps preserve?',
    source: 'Urban Redevelopment Authority — Telok Ayer Conservation Area',
    url: 'https://www.ura.gov.sg/conservation/find-a-building/conservation-portal/tkay/',
  },
] as const;
