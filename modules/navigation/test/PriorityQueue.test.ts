import test from 'node:test';import assert from 'node:assert/strict';import { PriorityQueue } from '../src/planner/PriorityQueue.js'
test('PriorityQueue pops lowest priorities',()=>{const q=new PriorityQueue<string>();q.push('c',3);q.push('a',1);q.push('b',2);assert.equal(q.pop(),'a');assert.equal(q.pop(),'b');assert.equal(q.pop(),'c');assert.equal(q.pop(),undefined)})
