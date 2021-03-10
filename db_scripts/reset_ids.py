import os

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

from dotenv import load_dotenv
load_dotenv()

cred = credentials.Certificate(os.getenv('FIREBASE_CERT', ''))
firebase_admin.initialize_app(cred)

fbdb = firestore.client()

collections = [
  'users'
]

for collection in collections:
  fbdb.
