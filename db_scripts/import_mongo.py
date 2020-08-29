import pymongo
import os
import re
import datetime

from pymongo import MongoClient
from bson import objectid

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

from dotenv import load_dotenv
load_dotenv()

mongo_client = MongoClient(os.getenv('MONGO_HOST', ''),
                           int(os.getenv('MONGO_PORT', '0')))

database = mongo_client[os.getenv('MONGO_DB', '')]

database.authenticate(os.getenv('MONGO_USER', ''), os.getenv('MONGO_PASS', ''))

cred = credentials.Certificate(os.getenv('FIREBASE_CERT', ''))
firebase_admin.initialize_app(cred)

fbdb = firestore.client()

'''
histories could be broken up to be subcollections of games (or whatever they should be)

users might go somewhere else - need to know more about firebase auth

preferences / purchases / subscriptions should be subcollections of users
'''

collection_blacklist = [
    'system.indexes',
    'contacts',
    'dbinfos',

    # Too huge
    'histories'
]

key_blacklist = [
    'games',
    'preferences',
    'purchases',
    'names',
    'adminOfTeams',
    'memberOfTeams',
    'notes',
    'votes',
]


def isnumber(s):
    try:
        float(s)
        return True
    except (TypeError, ValueError):
        return False


def clean_val(val, key):
    str_val = str(val)
    date_match = re.compile(
        r'[0-9]{4}\-[0-9]{2}\-[0-9]{2} [0-9]{2}\:[0-9]{2}\:[0-9]{2}\.?[0-9]*')
    if date_match.match(str_val):
        try:
            return datetime.datetime.strptime(str_val, '%Y-%m-%d %H:%M:%S.%f')
        except ValueError:
            return datetime.datetime.strptime(str_val, '%Y-%m-%d %H:%M:%S')
    elif isnumber(val):
        return val
    elif isinstance(val, objectid.ObjectId):
        if "User" in key:
            key = 'users'
        elif key in ['playerCount', 'duration']:
            key = 'gamemetadatas'
        elif "tag" in key:
            key = 'tags'
        elif "game" in key:
            key = 'games'
        return fbdb.document('{}/{}'.format(key, str_val))
    else:
        return str_val


def get_vals(doc, addl_key_blacklist=[]):
    vals = {}
    for key in doc.keys():
        if '_' not in key and key not in key_blacklist and key not in addl_key_blacklist:
            if isinstance(doc[key], list):
                newlist = []
                for item in doc[key]:
                    newlist.append(clean_val(item, key))
                vals[key] = newlist
            else:
                vals[key] = clean_val(doc[key], key)
    if 'dateDeleted' in vals:
        vals['isDeleted'] = True
    else:
        vals['isDeleted'] = False
    return vals


def full_import(collections=None):
    if collections == None:
        collections = database.list_collection_names()

    print('Importing {} collections. This may take a while...'.format(len(collections)))

    names_paths = {}

    for collection in collections:
        if collection not in collection_blacklist:
            data = database[collection]
            cursor = data.find()
            docs = list(cursor)
            print('collection {} count: {}'.format(collection, len(docs)))

            if collection == "names":
                # Names are a subcollection of the game they roll up to.
                for doc in docs:
                    game = clean_val(doc['game'], 'games')
                    name_collection = game.collection('names')
                    id = str(doc['_id'])
                    doc_ref = name_collection.document(id)
                    doc_ref.set(get_vals(doc, ['game']))
                    names_paths[id] = doc_ref.path
            elif collection == "namevotes":
                # Name votes are a subcollection of the name they roll up to.
                for doc in docs:
                    name_path = names_paths[str(doc['name'])]
                    name = fbdb.document(name_path)
                    vote_collection = name.collection('votes')
                    id = str(doc['_id'])
                    doc_ref = vote_collection.document(id)
                    doc_ref.set(get_vals(doc, ['name']))
            elif collection == "notes":
                # Notes will be a subcollection of either the tag or game they relate to
                for doc in docs:
                    if 'tag' in doc:
                        parent = clean_val(doc['tag'], 'tags')
                    if 'game' in doc:
                        parent = clean_val(doc['game'], 'games')
                    note_collection = fbdb.collection('notes')
                    id = str(doc['_id'])
                    doc_ref = note_collection.document(id)
                    doc_ref.set(get_vals(doc, ['tag', 'game']))
                    doc_ref.update({'parent': parent})
            elif collection == "preferences":
                for doc in docs:
                    user = clean_val(doc['user'], 'users')
                    pref_collection = user.collection('preferences')
                    id = str(doc['_id'])
                    doc_ref = pref_collection.document(id)
                    doc_ref.set(get_vals(doc, ['user']))
            else:
                fb_collection = fbdb.collection(collection)
                for doc in docs:
                    if '_id' in doc:
                        id = str(doc['_id'])
                        doc_ref = fb_collection.document(id)
                        doc_ref.set(get_vals(doc))
                    else:
                        print('no id? {} {}'.format(collection, doc))


def set_names():
    games = fbdb.collection('games').stream()
    for game in games:
        gameref = game.reference
        first_name = gameref.collection('names').order_by(
            'weight', direction='DESCENDING').order_by('dateModified', 'DESCENDING').limit(1).get()
        if len(first_name) > 0:
            gameref.update({'name': first_name[0].get('name')})


def set_slugs():
    slug_re = re.compile(r"(&[a-z0-9]+;)|(#[a-z0-9]+;)|[^a-z0-9\-]")
    games = fbdb.collection('games').stream()
    for game in games:
        gameref = game.reference
        try:
          name = game.get('name')
          slug = name.replace(' ', '-').lower()
          slug = slug_re.sub("", slug)
          gameref.update({'slug': slug})
        except KeyError:
          print('A game is missing a name: {}'.format(gameref.path))


# full_import()
# set_names()
set_slugs()
