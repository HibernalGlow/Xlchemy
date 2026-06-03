interface SyncSubscription {
	resizerId: symbol;
	callback: (value: number) => void;
}

class ResizeSyncManager {
	private subscriptions: Map<string, SyncSubscription[]> = new Map();

	subscribe(
		key: string,
		resizerId: symbol,
		callback: (value: number) => void,
	): () => void {
		if (!this.subscriptions.has(key)) {
			this.subscriptions.set(key, []);
		}
		const subs = this.subscriptions.get(key)!;
		const sub: SyncSubscription = { resizerId, callback };
		subs.push(sub);

		return () => {
			const idx = subs.indexOf(sub);
			if (idx >= 0) subs.splice(idx, 1);
		};
	}

	emit(key: string, excludeId: symbol, value: number): void {
		const subs = this.subscriptions.get(key);
		if (!subs) return;
		for (const sub of subs) {
			if (sub.resizerId !== excludeId) {
				sub.callback(value);
			}
		}
	}
}

export const resizeSync = new ResizeSyncManager();
