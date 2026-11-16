import type { BrowserGuideEntry } from '../browser-guides/BrowserGuides.types';
import { LocationBrowser } from './location-guide.types';

export const LOCATION_GUIDES: readonly BrowserGuideEntry[] = [
  {
    browser: LocationBrowser.Android,
    titleKey: 'profile.location.android',
    stepKeys: [
      'profile.location.android1',
      'profile.location.android2',
      'profile.location.android3',
    ],
  },
  {
    browser: LocationBrowser.Iphone,
    titleKey: 'profile.location.iphone',
    stepKeys: [
      'profile.location.iphone1',
      'profile.location.iphone2',
      'profile.location.iphone3',
      'profile.location.iphone4',
    ],
  },
  {
    browser: LocationBrowser.Chrome,
    titleKey: 'profile.location.chrome',
    stepKeys: ['profile.location.chrome1', 'profile.location.chrome2', 'profile.location.chrome3'],
  },
  {
    browser: LocationBrowser.Edge,
    titleKey: 'profile.location.edge',
    stepKeys: ['profile.location.edge1', 'profile.location.edge2', 'profile.location.edge3'],
  },
  {
    browser: LocationBrowser.Firefox,
    titleKey: 'profile.location.firefox',
    stepKeys: [
      'profile.location.firefox1',
      'profile.location.firefox2',
      'profile.location.firefox3',
    ],
  },
  {
    browser: LocationBrowser.Safari,
    titleKey: 'profile.location.safari',
    stepKeys: ['profile.location.safari1', 'profile.location.safari2'],
  },
];
