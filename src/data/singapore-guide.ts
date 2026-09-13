/** Curated facts, reviewed 13 September 2026. Game stops are stylised counterparts, not surveyed sites. */
export const learningTopics = [
  { id: 'marina-bay', title: 'Marina Bay: a working waterfront', stops: ['waterfront', 'city-skyline', 'bay-crossing', 'waterfront-terraces', 'harbour-promenade'],
    facts: ['Marina Barrage keeps seawater out of the downtown reservoir. It became a freshwater reservoir in 2010.', 'At low tide, gates release excess stormwater; at high tide, pumps discharge it. The waterfront is water infrastructure as well as a recreation space.'],
    notice: 'Look across the bay: how could a city balance recreation, water storage and flood protection?',
    source: 'PUB — Marina Barrage', url: 'https://www.pub.gov.sg/Public/Places-of-Interest/Marina-Barrage' },
  { id: 'artscience-museum', title: 'ArtScience Museum: where subjects meet', stops: ['lotus-museum'],
    facts: ['The real ArtScience Museum has a lotus-inspired form beside Marina Bay.', 'Its exhibitions explore connections between art, culture and technology. The game’s Lotus museum is a stylised counterpart.'],
    notice: 'Look for the petal-like silhouette. What everyday shape would you turn into a building?',
    source: 'Singapore Tourism Board — Marina Bay Sands', url: 'https://www.visitsingapore.com/neighbourhood/featured-neighbourhood/marina-bay/marina-bay-sands/' },
  { id: 'marina-bay-sands', title: 'Marina Bay Sands: reading a skyline', stops: ['skypark'],
    facts: ['The Sands SkyPark Observation Deck offers panoramic views across Singapore.', 'The Marina Bay Sands precinct includes the lotus-inspired ArtScience Museum, connecting architecture with art, culture and technology.'],
    notice: 'Compare the high SkyPark silhouette with the low museum silhouette. How do they help you recognise this skyline?',
    source: 'Singapore Tourism Board — Marina Bay Sands', url: 'https://www.visitsingapore.com/neighbourhood/featured-neighbourhood/marina-bay/marina-bay-sands/' },
  { id: 'gardens-by-the-bay', title: 'Gardens by the Bay: design with a job', stops: ['bayfront-greenway', 'southern-gardens', 'garden-canopy-walk', 'conservatory-avenue'],
    facts: ['Some Supertrees collect solar energy for lighting; others help exhaust air from the conservatories.', 'Reed beds and aquatic plants in the lakes filter sediment and absorb nutrients, helping water quality.'],
    notice: 'Look at the garden forms in this stylised world. Which landscape features might do useful work as well as look attractive?',
    source: 'Gardens by the Bay — Sustainability', url: 'https://www.gardensbythebay.com.sg/en/about-us/our-gardens-story/sustainability-efforts.html' },
  { id: 'esplanade', title: 'Esplanade: architecture for the tropics', stops: ['esplanade-gardens', 'civic-arcade'],
    facts: ['Esplanade is Singapore’s national performing arts centre. Its twin domes have more than 7,000 triangular aluminium sunshades.', 'The shades reduce direct tropical sunlight while allowing natural light inside. The buildings are nicknamed the durians, although that was not the original design intention.'],
    notice: 'Think about shade where you live. How would you keep a glass building bright without making it too hot?',
    source: 'Esplanade — Explore and discover', url: 'https://www.esplanade.com/visit/explore-and-discover/esplanade-for-tourists' },
  { id: 'singapore-flyer', title: 'Singapore Flyer: a different perspective', stops: ['observation-wheel'],
    facts: ['The Singapore Flyer is a 165-metre observation wheel.', 'Its glass capsules provide panoramic views including Marina Bay, the Singapore River and Raffles Place.'],
    notice: 'Find the wheel in the game. How might a higher viewpoint change your understanding of a city’s layout?',
    source: 'Singapore Tourism Board — Singapore Flyer', url: 'https://www.visitsingapore.com/neighbourhood/featured-neighbourhood/marina-bay/singapore-flyer/' },
  { id: 'raffles-place', title: 'Raffles Place: commerce through time', stops: [],
    facts: ['Raffles Place was called Commercial Square before it was renamed in 1858.', 'A National Heritage Board photograph records its busy central car park in the 1950s, surrounded by banks, offices and shops. Today the central space includes MRT entrances.'],
    notice: 'Imagine replacing a central car park with access to trains. How would that change the way people use the district?',
    source: 'National Heritage Board — Raffles Place collection', url: 'https://www.roots.gov.sg/Collection-Landing/listing/1111377' },
  { id: 'queenstown', title: 'Queenstown: everyday Singapore matters', stops: [],
    facts: ['Queenstown was Singapore’s first satellite town, initiated in 1952.', 'Satellite towns were planned with everyday amenities such as schools, markets and shops outside the city centre. HDB took over Queenstown’s development from the Singapore Improvement Trust in 1960.'],
    notice: 'What would you need within walking distance to make a neighbourhood feel like a complete community?',
    source: 'National Heritage Board — Queenstown', url: 'https://www.roots.gov.sg/stories-landing/stories/queenstown-the-queen-of-housing-estates/story' },
] as const;

export type LearningTopic = typeof learningTopics[number];
export function learningTopic(id: unknown): LearningTopic | undefined {
  return learningTopics.find(topic => topic.id === id);
}
export function learningText(topic: LearningTopic) {
  return `${topic.title}. ${topic.facts.join(' ')} Something to think about: ${topic.notice} Your objective and stamps are unchanged. These facts describe the real place; the game is a stylised interpretation.`;
}
