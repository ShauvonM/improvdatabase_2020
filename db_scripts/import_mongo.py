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

collections = database.list_collection_names()

cred = credentials.Certificate(os.getenv('FIREBASE_CERT', ''))
firebase_admin.initialize_app(cred)

fbdb = firestore.client()

# Handle collections in this order:
# collection_order = [
#     'users',
#     'tags',
#     'names',
#     'namevotes',
#     'gamemetadatas',
#     ''
# ]

collection_blacklist = [
    'system.indexes',
    'contacts',
    'dbinfos'
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
        r'[0-9]{4}\-[0-9]{2}\-[0-9]{2} [0-9]{2}\:[0-9]{2}\:[0-9]{2}\.[0-9]+')
    if date_match.match(str_val):
        return datetime.datetime.strptime(str_val, '%Y-%m-%d %H:%M:%S.%f')
    elif isnumber(val):
        return val
    elif isinstance(val, objectid.ObjectId):
        if "User" in key:
            key = 'users'
        return fbdb.document('{}/{}'.format(key, str_val))
    else:
        return str_val


print('Importing {} collections. This may take a while...'.format(len(collections)))

for collection in collections:
    if collection not in collection_blacklist:
        data = database[collection]
        cursor = data.find()
        docs = list(cursor)
        print('collection {} count: {}'.format(collection, len(docs)))

        fb_collection = fbdb.collection(collection)

        for doc in docs:
            if '_id' in doc:
                id = str(doc['_id'])
                vals = {}
                for key in doc.keys():
                    if '_' not in key:
                        if isinstance(doc[key], list):
                            newlist = []
                            for item in doc[key]:
                                newlist.append(clean_val(item, key))
                            vals[key] = newlist
                        else:
                            vals[key] = clean_val(doc[key], key)
                doc_ref = fb_collection.document(id)
                doc_ref.set(vals)
            else:
                print('no id? {} {}'.format(collection, doc))
