export class Stack<T> {
  stack: Array<T>;
  constructor() {
    this.stack = [];
  }
  push(item: T) {
    this.stack.push(item);
  }
  top() {
    return !this.isEmpty() ? this.stack[this.stack.length - 1] : undefined;
  }
  pop() {
    if (!this.isEmpty()) {
      this.stack.pop();
    }
  }
  isEmpty() {
    return this.stack.length === 0;
  }
}
