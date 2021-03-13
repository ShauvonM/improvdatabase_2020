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

export function timestampToDate(timestamp: Timestamp): Date {
  const millis = (timestamp.seconds * 1000) + (timestamp.nanoseconds / 1000000);
  return new Date(millis);
}
