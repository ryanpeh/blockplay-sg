import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SingaporeMap from './SingaporeMap';
import { locations } from '../data/locations';

it('keeps location selection in exploration and distinguishes route targets from the current expedition district', () => {
  const marina = locations.find(place => place.id === 'marina-bay')!;
  const explore = renderToStaticMarkup(<SingaporeMap selected={marina} onSelect={() => {}} />);
  expect(explore).toContain('Select Queenstown on Singapore map');
  expect(explore).not.toContain('data-map-link');
  const expedition = renderToStaticMarkup(<SingaporeMap selected={marina} onSelect={() => {}} expedition destination="queenstown" />);
  expect(expedition).toContain('data-map-active="marina-bay"');
  expect(expedition).toContain('data-map-location="queenstown" data-selected="false" data-destination="true"');
  expect(expedition).toContain('Marina Bay → Raffles Place → Queenstown');
  expect(expedition.match(/data-map-link=/g)).toHaveLength(2);
  expect(expedition).toContain('Press T within 4m');
  expect(expedition).toContain('Queenstown · low threat · Loot tier 1');
});

it('updates the route from the arrived district without offering remote travel', () => {
  const cbd = locations.find(place => place.id === 'raffles-place')!;
  const html = renderToStaticMarkup(<SingaporeMap selected={cbd} onSelect={() => {}} expedition destination="queenstown" />);
  expect(html).toContain('data-map-active="raffles-place"');
  expect(html).toContain('Raffles Place → Queenstown');
  expect(html).toContain('X -258, Z 45');
  expect(html).not.toContain('Marina Bay → Raffles Place → Queenstown');
});
