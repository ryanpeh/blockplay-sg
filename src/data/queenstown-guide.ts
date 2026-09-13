/** Reviewed 13 September 2026. Stop links are educational themes, not surveyed landmark locations. */
export const queenstownLearningTopics = [
  {
    id: 'queenstown', title: 'Queenstown: everyday Singapore matters',
    stops: ['queenstown-station', 'neighbourhood-gateway'],
    facts: [
      'Queenstown was initiated in 1952 as Singapore’s first satellite town: a housing estate outside the city centre with its own everyday amenities.',
      'HDB took over its development from the Singapore Improvement Trust in 1960. The game’s station and gateway introduce the wider town, rather than reproducing its historical layout.',
    ],
    notice: 'Which everyday destinations would you put near homes so residents do not need to travel into the city centre?',
    source: 'National Heritage Board — Queenstown',
    url: 'https://www.roots.gov.sg/stories-landing/stories/queenstown-the-queen-of-housing-estates/story',
  },
  {
    id: 'queenstown-community', title: 'Queenstown: spaces for a shared life',
    stops: ['void-deck', 'community-court'],
    facts: [
      'Queenstown’s neighbourhoods were planned with their own amenities, while larger facilities such as the library and sports complex served the whole town.',
      'Its heritage trail also draws on residents’, shopkeepers’ and librarians’ memories. The game’s communal spaces are prompts to explore that social history, not replicas of a particular historic court or void deck.',
    ],
    notice: 'Imagine people of different ages sharing the space. What would help them meet, play and rest without getting in one another’s way?',
    source: 'National Heritage Board — The Queen of Estates: Through Her Residents’ Stories',
    url: 'https://www.roots.gov.sg/stories-landing/stories/the-queen-of-estates-through-her-residents-stories/story',
  },
  {
    id: 'queenstown-library', title: 'Queenstown library: learning close to home',
    stops: ['library-garden'],
    facts: [
      'Queenstown Public Library opened on 30 April 1970 as Singapore’s first full-time branch library.',
      'Learning facilities were part of making Queenstown self-contained, alongside health and sports amenities. Library garden is the game’s stylised learning stop, not an exact model of the library grounds.',
    ],
    notice: 'Why might a library near people’s homes matter as much as a landmark in the city centre?',
    source: 'National Heritage Board — Queenstown',
    url: 'https://www.roots.gov.sg/stories-landing/stories/queenstown-the-queen-of-housing-estates/story',
  },
  {
    id: 'queenstown-green-corridor', title: 'Rail Corridor: nature and community together',
    stops: ['green-corridor'],
    facts: [
      'Along the real Rail Corridor, the Buona Vista community node combines play, fitness and gathering spaces with the former railway landscape.',
      'Its planted drainage channels recall earlier streams and marshes and provide habitat for dragonflies. The game’s Green corridor introduces this landscape idea; it does not reproduce the Buona Vista site or a real walking route.',
    ],
    notice: 'How could a planted strip support wildlife while also giving neighbours space to spend time outdoors?',
    source: 'NParks — Buona Vista community node along Rail Corridor',
    url: 'https://www.nparks.gov.sg/news/news-detail/new-buona-vista-community-node-along-rail-corridor-offers-inclusive-space-for-play--nature-recreation-and-bonding',
  },
  {
    id: 'queenstown-commonwealth', title: 'Commonwealth: a neighbourhood within a town',
    stops: ['commonwealth-gardens'],
    facts: [
      'Commonwealth was one of Queenstown’s five originally planned neighbourhoods. HDB later added Mei Ling and Buona Vista.',
      'Planning smaller neighbourhoods within a larger town let local amenities sit alongside town-wide facilities. Commonwealth gardens is an authored game stop, not the name of a documented heritage garden.',
    ],
    notice: 'What should every small neighbourhood have, and what could several neighbourhoods share?',
    source: 'National Heritage Board — The Queen of Estates: Through Her Residents’ Stories',
    url: 'https://www.roots.gov.sg/stories-landing/stories/the-queen-of-estates-through-her-residents-stories/story',
  },
  {
    id: 'queenstown-dawson', title: 'Dawson: taking shared gardens upstairs',
    stops: ['dawson-courtyard'],
    facts: [
      'At the real SkyVille @ Dawson, groups of 80 homes share a naturally ventilated community terrace and sky garden, arranged as vertically stacked Sky Villages.',
      'Architect WOHA describes community, variety and sustainability as its three design themes. Dawson courtyard is a stylised prompt about these ideas, not a replica of SkyVille.',
    ],
    notice: 'How would meeting neighbours in a shared sky garden differ from meeting them in a ground-level courtyard?',
    source: 'WOHA — SkyVille @ Dawson project',
    url: 'https://woha.net/project/skyville-dawson/',
  },
] as const;
