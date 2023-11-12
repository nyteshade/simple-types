const { Type } = await import('./type.mjs')

describe('Type Class Tests', () => {

  it('should create a new type with specified format', () => {
    const format = { name: String, age: Number };
    const PersonType = new Type('Person', format);

    expect(PersonType.typeName).toBe('Person');
    expect(PersonType.format).toEqual(format);
  });

  it('should verify an object against the type format', () => {
    const format = { name: String, age: Number };
    const PersonType = new Type('Person', format);
    const validPerson = { name: 'John', age: 30 };

    expect(PersonType.verify(validPerson)).toBe(true);
  });

  it('should fail verification for incorrect type', () => {
    const format = { name: String, age: Number };
    const PersonType = new Type('Person', format);
    const invalidPerson = { name: 'John', age: '30' };

    expect(PersonType.verify(invalidPerson)).toBe(false);
  });

  it('should handle ArrayOf type for arrays of any length', () => {
    const format = { names: new Type.ArrayOf(String) };
    const NamesType = new Type('Names', format);
    const validNames = { names: ['Alice', 'Bob', 'Charlie'] };

    expect(NamesType.verify(validNames)).toBe(true);
  });

  it('should handle fixed-width arrays', () => {
    const format = { names: [String] };
    const NamesType = new Type('Names', format);
    const validNames = { names: ['Alice'] };
    const invalidNames = { names: ['Alice', 'Bob'] };

    expect(NamesType.verify(validNames)).toBe(true);
    expect(NamesType.verify(invalidNames)).toBe(false);
  });

  it('should handle ArrayOf type for arrays of objects', () => {
    const format = { people: new Type.ArrayOf({ name: String, age: Number }) };
    const PeopleType = new Type('People', format);
    const validPeople = { people: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }] };

    expect(PeopleType.verify(validPeople)).toBe(true);
  });
});
