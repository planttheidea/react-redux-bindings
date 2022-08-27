import { Store } from 'redux';
import { getBatch } from '../batch';

interface Entry {
  n: Entry | null;
  p: Entry | null;
  s: Subscriber;
}

type Subscriber = () => void;

class Subscribers {
  fe: Entry | null = null;
  le: Entry | null = null;

  constructor() {
    this.notify = this.notify.bind(this);
  }

  get entries() {
    const entries: Entry[] = [];

    let entry = this.fe;

    while (entry) {
      entries.push(entry);
      entry = entry.n;
    }

    return entries;
  }

  clear() {
    this.fe = this.le = null;
  }

  notify() {
    let entry = this.fe;

    while (entry) {
      entry.s();
      entry = entry.n;
    }
  }

  subscribe(subscriber: Subscriber) {
    let subscribed = true;

    const entry: Entry = (this.le = {
      n: null,
      p: this.le,
      s: subscriber,
    });

    if (entry.p) {
      entry.p.n = entry;
    } else {
      this.fe = entry;
    }

    return () => {
      if (!subscribed || this.fe === null) {
        return;
      }

      subscribed = false;

      if (entry.n) {
        entry.n.p = entry.p;
      } else {
        this.le = entry.p;
      }

      if (entry.p) {
        entry.p.n = entry.n;
      } else {
        this.fe = entry.n;
      }
    };
  }
}

const EMPTY_LISTENERS = new Subscribers();
function emptyOnStateChange() {}
function emptyUnsubscribe() {}

export default class StoreSubscription {
  private _batch = getBatch();
  private _onStateChange: () => void = emptyOnStateChange;
  private _parent: StoreSubscription | null;
  private _store: Store<any>;
  private _subscribers: Subscribers = EMPTY_LISTENERS;

  unsubscribe: () => void = emptyUnsubscribe;

  constructor(store: Store<any>, parent: StoreSubscription | null) {
    this._parent = parent;
    this._store = store;

    this.addSubscriber = this.addSubscriber.bind(this);
  }

  get subscribers() {
    return this._subscribers;
  }

  private _notifySubscribers() {
    this._batch(this._subscribers.notify);
  }

  addSubscriber(subscriber: Subscriber) {
    this.startListening();

    return this._subscribers.subscribe(subscriber);
  }

  onStateUpdate() {
    this._onStateChange();
  }

  startListening() {
    if (this.unsubscribe === emptyUnsubscribe) {
      this._onStateChange = this._notifySubscribers.bind(this);
      this.onStateUpdate = this.onStateUpdate.bind(this);

      this.unsubscribe = this._parent
        ? this._parent.addSubscriber(this.onStateUpdate)
        : this._store.subscribe(this.onStateUpdate);

      this._subscribers = new Subscribers();
    }
  }

  stopListening() {
    this._onStateChange = emptyOnStateChange;

    this.unsubscribe();
    this._subscribers.clear();

    this.unsubscribe = emptyUnsubscribe;
    this._subscribers = EMPTY_LISTENERS;
  }
}
