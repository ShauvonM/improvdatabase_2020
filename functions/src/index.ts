import algoliasearch from 'algoliasearch';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info('Hello logs!', {structuredData: true});
//   response.send('Hello from Firebase!');
// });

// App ID and API Key are stored in functions config variables
const ALGOLIA_ID = functions.config().algolia.app_id;
const ALGOLIA_ADMIN_KEY = functions.config().algolia.admin_key;
// const ALGOLIA_SEARCH_KEY = functions.config().algolia.search_key;

const ALGOLIA_INDEX_NAME = {
  GAMES: 'games',
  TAGS: 'tags'
};
const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);

admin.initializeApp();

const db = admin.firestore();

const SHOW_TAG_ID = '0wizLgDXA8mKXGUNJjBN';
const EXERCISE_TAG_ID = 'EF4pvtbYv4bqB5aubUc7';
const WARMUP_TAG_ID = '1IdCA3o2A9el5yZkGyza';

interface TagIndex {
  objectID: string;
  tagId: string;
  name: string;
}

interface GameIndex {
  objectID: string;
  gameId: string;
  gameSlug: string;
  name: string;
  nameId: string;
  keyTag: string;
}

/**
 * Extracts the key tag from a list of game's tags.
 * @param {{id: string}[]} tags A list of tags from firebase
 * @return {string} the tag name.
 */
function getKeyTag(tags: {id: string}[]): string {
  const tagIds: string[] = tags.map((tag: {id: string}) => tag.id);
  let keyTag = '';
  if (tagIds.includes(SHOW_TAG_ID)) {
    keyTag = 'Show';
  } else if (tagIds.includes(EXERCISE_TAG_ID)) {
    keyTag = 'Exercise';
  } else if (tagIds.includes(WARMUP_TAG_ID)) {
    keyTag = 'Warmup';
  }
  return keyTag;
}

/**
 * Rebuilds the entire search index from the list of games and tags.
 */
export const syncGameIndex = functions.https.onRequest((request, response) => {
  const gameIndex = client.initIndex(ALGOLIA_INDEX_NAME.GAMES);
  const tagIndex = client.initIndex(ALGOLIA_INDEX_NAME.TAGS);
  const gamesRef = db.collection('games');
  const tagsRef = db.collection('tags');

  Promise.all([gameIndex.clearObjects(), tagIndex.clearObjects()]).then(() => {
    tagsRef.where('isDeleted', '==', false).get().then(tags => {
      const tagObjects: TagIndex[] = [];
      tags.forEach(tag => {
        const name = tag.data().name;
        tagObjects.push({objectID: tag.id, tagId: tag.id, name});
      });

      gamesRef.where('isDeleted', '==', false).get().then((allGames) => {
        const indexObjects: GameIndex[] = [];

        const gameCount = allGames.size;
        console.log('All game count: ' + gameCount);

        let gameTracker = 0;
        allGames.forEach((gameDoc) => {
          const gameId = gameDoc.id;
          const gameSlug = gameDoc.data().slug;
          const namesRef = db.collection(`games/${gameId}/names`);

          const tags = gameDoc.data().tags;
          const keyTag = getKeyTag(tags);

          namesRef.where('isDeleted', '==', false).get().then((allNames) => {
            console.log(
                'Number of names for ' + gameDoc.data().name + ' - ' +
                allNames.size);

            allNames.forEach((nameDoc) => {
              indexObjects.push({
                objectID: nameDoc.id,
                gameId,
                gameSlug,
                name: nameDoc.data().name,
                nameId: nameDoc.id,
                keyTag
              });
            });
            gameTracker++;
            if (gameTracker === gameCount) {
              Promise
                  .all([
                    tagIndex.saveObjects(
                        tagObjects,
                        ),
                    gameIndex.saveObjects(indexObjects)
                  ])
                  .then((data: {objectIDs: string[]}[]) => {
                    const tags = data[0].objectIDs;
                    const games = data[1].objectIDs;
                    console.log(
                        'done! tags: ' + tags.length +
                        ' games: ' + games.length);
                    response.send(
                        'done! tags: ' + tags.length +
                        ' games: ' + games.length);
                  });
            }
          });
        });
      });
    });
  });
});

export const onTagCreated =
    functions.firestore.document('tags/{tagId}').onCreate((snap) => {
      const tagData = snap.data();
      const tagId = snap.id;
      const tagIndexObject:
          TagIndex = {objectID: tagId, tagId: tagId, name: tagData.name};
      console.log('adding to tag search index', tagIndexObject);
      const tagIndex = client.initIndex(ALGOLIA_INDEX_NAME.TAGS);
      return tagIndex.saveObject(tagIndexObject);
    });

export const onTagUpdated =
    functions.firestore.document('tags/{tagId}').onUpdate((snap) => {
      const tagBefore = snap.before;
      const tagAfter = snap.after;
      if (!tagBefore.data().isDeleted && tagAfter.data().isDeleted) {
        // Remove this item from the search index.
        const tagIndex = client.initIndex(ALGOLIA_INDEX_NAME.TAGS);
        tagIndex.deleteObject(tagAfter.id)
            .then(
                () =>
                    console.log('removed tag from search index', tagAfter.id));
      }
    });

export const onGameNameCreated =
    functions.firestore.document('games/{gameId}/names/{nameId}')
        .onCreate((snap, context) => {
          const nameData = snap.data();
          const gameId = context.params['gameId'];
          const nameId = context.params['nameId'];
          if (snap.ref.parent.parent) {
            return snap.ref.parent.parent.get()
                .then(gameRef => {
                  const gameData = gameRef.data();
                  if (gameData) {
                    const tags = gameData.tags;
                    const keyTag = getKeyTag(tags);
                    const gameIndexObject: GameIndex = {
                      objectID: nameId,
                      gameId,
                      gameSlug: gameData.slug,
                      keyTag,
                      name: nameData.name,
                      nameId,
                    };
                    console.log('Adding to game index', gameIndexObject);
                    const gameIndex =
                        client.initIndex(ALGOLIA_INDEX_NAME.GAMES);
                    return gameIndex.saveObject(gameIndexObject);
                  }
                  console.log('No game data for ', gameId);
                  return null;
                })
                .catch(error => {
                  console.log('error!!', error);
                });
          }
          console.log('No game found at parent.parent', snap);
          return null;
        });

export const onGameNameUpdated =
    functions.firestore.document('games/{gameId}/names/{nameId}')
        .onUpdate((snap) => {
          const nameDataAfter = snap.after.data();
          const nameDataBefore = snap.before.data();
          if (!nameDataBefore.isDeleted && nameDataAfter.isDeleted) {
            // Remove this name from the game search index.
            const nameId = snap.before.id;
            const gameIndex = client.initIndex(ALGOLIA_INDEX_NAME.GAMES);
            gameIndex.deleteObject(nameId)
                .then(
                    () => console.log(
                        'Deleted name from search index', nameId,
                        nameDataAfter.name))
                .catch(
                    error => console.error(
                        'Error deleting game search index', error));
          }
        });
