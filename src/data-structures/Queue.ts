export class Queue<T> {
  queue: Array<T>;
  constructor() {
    this.queue = [];
  }
  push(item: any) {
    this.queue.push(item);
  }
  front() {
    return !this.isEmpty() ? this.queue[0] : undefined;
  }
  back() {
    return !this.isEmpty() ? this.queue[this.queue.length - 1] : undefined;
  }
  pop() {
    if (!this.isEmpty()) {
      this.queue.shift();
    }
  }
  isEmpty() {
    return this.queue.length === 0;
  }
}
