import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import firebase from 'firebase/app';
import {from, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {NUM_SHARDS} from '../shared/constants';

export const COUNTERS = {
  GAMES: 'games'
};

export interface Shard {
  count: number;
}

@Injectable({providedIn: 'root'})
export class CounterService {
  constructor(private readonly firestore: AngularFirestore) {}

  incrementCounter(counterId: string): Observable<void> {
    const shardId = Math.floor(Math.random() * NUM_SHARDS).toString();
    return from(
        this.firestore.doc(`/counters/${counterId}/shards/${shardId}`).update({
          count: firebase.firestore.FieldValue.increment(1)
        }));
  }

  decrementCounter(counterId: string): Observable<void> {
    const shardId = Math.floor(Math.random() * NUM_SHARDS).toString();
    return from(
        this.firestore.doc(`/counters/${counterId}/shards/${shardId}`).update({
          count: firebase.firestore.FieldValue.increment(-1)
        }));
  }

  fetchCount(counterId: string): Observable<number> {
    return this.firestore.collection<Shard>(`/counters/${counterId}/shards`)
        .valueChanges()
        .pipe(map(shards => {
          let cnt = 0;
          for (const shard of shards) {
            cnt += shard.count;
          }
          return cnt;
        }));
  }
}
