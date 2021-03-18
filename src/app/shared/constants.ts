import {Timestamp} from './types';

export const COLLECTIONS = {
  GAMES: 'games',
  NAMES: 'names',
  METADATAS: 'gamemetadatas',
  HISTORY: 'histories',
  INVITES: 'invites',
  NOTES: 'notes',
  TAGS: 'tags',
  TEAMS: 'teams',
  USERS: 'users',
  NAME_VOTES: 'namevotes',
};

export const RANDOM = 'random';

export const SNACKBAR_DURATION_DEFAULT = 3000;

export const DEFAULT_PAGE_SIZE = 10;
export const NUM_SHARDS = 10;

const LOGIN_STRINGS = [
  'about',          'below',   'excepting',   'toward',
  'above',          'beneath', 'for',         'on',
  'across',         'beside',  'from',        'onto',
  'after',          'between', 'in',          'until',
  'against',        'beyond',  'in front of', 'up',
  'along',          'but',     'inside',      'upon',
  'among',          'by',      'in spite of', 'past',
  'up to',          'around',  'concerning',  'instead of',
  'regarding',      'with',    'at ',         'into',
  'since',          'within',  'because of',  'like',
  'through',        'during',  'near',        'throughout',
  'with regard to', 'of',      'to',          'with respect to',
];

const LOGOUT_STRINGS = [
  'out',
  'off',
  'outside',
  'underneath',
  'under',
  'without',
  'over',
  'despite',
  'down',
  'except',
  'behind',
  'before',
];

export function loginString() {
  return 'Log ' +
      LOGIN_STRINGS[Math.floor(Math.random() * LOGIN_STRINGS.length)];
}

export function logoutString() {
  return 'Log ' +
      LOGOUT_STRINGS[Math.floor(Math.random() * LOGOUT_STRINGS.length)];
}

export function timestampToDate(timestamp: Timestamp): Date {
  if (!timestamp) {
    return new Date();
  }
  const millis = (timestamp.seconds * 1000) + (timestamp.nanoseconds / 1000000);
  return new Date(millis);
}
