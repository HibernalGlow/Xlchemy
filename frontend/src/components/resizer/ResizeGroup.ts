export interface ResizerHandle {
	resizerId: symbol;
	getValue: () => number;
	setValue: (value: number) => void;
	minValue: number;
	position: number;
}

export class ResizeGroup {
	private resizers: ResizerHandle[] = [];

	register(resizer: ResizerHandle): void {
		this.resizers.push(resizer);
		this.resizers.sort((a, b) => a.position - b.position);
	}

	unregister(resizerId: symbol): void {
		this.resizers = this.resizers.filter((r) => r.resizerId !== resizerId);
	}

	resize(resizerId: symbol, newValue: number): number {
		const resizer = this.resizers.find((r) => r.resizerId === resizerId);
		if (!resizer) return 0;

		const index = this.resizers.indexOf(resizer);
		const min = resizer.minValue;

		if (newValue >= min) {
			resizer.setValue(newValue);
			return 0;
		}

		// Calculate overflow
		let overflow = min - newValue;
		resizer.setValue(min);

		// Borrow space from left neighbors
		let subtracted = 0;
		let j = 1;
		while (overflow > 0 && index - j >= 0) {
			const neighbor = this.resizers[index - j];
			const available = neighbor.getValue() - neighbor.minValue;
			const take = Math.min(available, overflow);
			if (take > 0) {
				neighbor.setValue(neighbor.getValue() - take);
				overflow -= take;
				subtracted += take;
			}
			j++;
		}

		return subtracted;
	}
}
