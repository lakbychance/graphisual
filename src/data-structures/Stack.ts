export class Stack {
  stack: Array<any>;
  constructor() {
    this.stack = [];
  }
  push(item: any) {
    this.stack.push(item);
  }
  top() {
    return !this.isEmpty() ? this.stack[this.stack.length - 1] : -1;
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
