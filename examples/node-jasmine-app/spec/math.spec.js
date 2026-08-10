const { add, subtract } = require('../src/math');

describe('math module', () => {
  it('should add two numbers correctly', () => {
    expect(add(1, 2)).toBe(3);
  });

  it('should subtract two numbers correctly', () => {
    expect(subtract(5, 2)).toBe(3);
  });
});
