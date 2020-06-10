export class Queue {
  queue: Array<any>;
  constructor() {
    this.queue = [];
  }
  push(item: any) {
    this.queue.push(item);
  }
  front() {
    return !this.isEmpty() ? this.queue[0] : -1;
  }
  back() {
    return !this.isEmpty() ? this.queue[this.queue.length - 1] : -1;
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
