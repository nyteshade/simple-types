/** A symbol that might be defined on applyTo() and classFromFormat() objects */
export const PARAMS = Symbol.for('parameters')

/** A symbol that might be defined on applyTo() and classFromFormat() objects */
export const FORMAT = Symbol.for('format')

export const NAMEOF = Symbol.for('name of type')

export const MakeDescriptor = (
  properties, 
  defaults = {enumerable: true, configurable: true}
) => {
  return {...defaults, ...properties}
}

export class Type {
  /**
  * Creates an instance of the Type class.
  *
  * @param {string} typeName - The name of the type.
  * @param {Object} format - An object representing the format for the type.
  * @param {Function} constructor - The constructor function for the type.
  */
  constructor(typeName, format, constructor = null) {
    this.typeName = typeName
    this.format = format
    this.type = constructor || Type.classFromFormat(typeName, format)
  }
  
  /**
   * Creates a dynamic class based on a given format, with an optional base class.
   * This function dynamically generates a class that automatically assigns properties
   * to its instances based on the provided format. The format is an object where keys
   * are property names and values are expected data types or structures. The generated
   * class can optionally extend from a provided base class. It also dynamically assigns
   * a custom `toStringTag` and format information to the class for better introspection.
   * 
   * The constructor of the generated class can take either an object matching the format
   * or individual arguments corresponding to the format keys. It then assigns these values
   * to the instance.
   *
   * @param {string} typeName - The name to be assigned to the dynamically created class.
   * @param {Object} format - An object representing the structure/format for the class properties.
   * @param {Function} [baseClass=Object] - (Optional) The base class to extend from.
   * @returns {Function} A dynamically generated class based on the provided format and baseClass.
   */
  static classFromFormat(typeName, format, body = () => {}, baseClass = Object) {
    const type = class typeName extends baseClass {
      constructor(...args) {
        super();

        const keys = Object.keys(format)
        let values = typeof args?.[0] === 'object' ? args[0] : args

        if (Array.isArray(values)) {
          values = Object.fromEntries(keys.map((key,index) => [key, values[index]]))          
        }

        keys.reduce((kvp, key) => { 
          kvp[key] = values[key]; 
          return kvp 
        }, this)

        body()
      }
    };
    
    // Define toStringTag and name properties on the class prototype
    Object.defineProperties(type.prototype, {
      [Symbol.toStringTag]: MakeDescriptor({ value: typeName }, {enumerable: false, configurable: false}),
      [PARAMS]: MakeDescriptor({ value: Object.keys(format) }),
      [FORMAT]: MakeDescriptor({ value: {...format} }),
    });

    Object.defineProperty(type, 'name', MakeDescriptor({ 
      value: typeName, configurable: false, enumerable: false
    }))

    return type
  }
  
  /**
  * Applies type-specific properties to an object.
  *
  * @param {Object} object - The object to which type properties are applied.
  */
  applyTo(object) {
    if (object && typeof object === 'object') {
      const { typeName, type, format } = this 
      const hiddenProps = { enumerable: false, configurable: false }
      
      Object.defineProperties(object, {
        [Symbol.toStringTag]: MakeDescriptor({ value: typeName }, hiddenProps),        
        [PARAMS]: MakeDescriptor({ value: Object.keys(format) }),
        [FORMAT]: MakeDescriptor({ value: {...format} }),
      });

      if (type) {
        Object.defineProperties(object, {
          [Symbol.constructor]: MakeDescriptor({ value: type }),          
        })
      }              
    }

    return object
  }
  
  /**
  * Verifies if an object matches the specified type format.
  *
  * @param {Object} object - The object to be verified.
  * @param {Object|null} [useFormat=null] - Optional format to use for verification.
  * @param {boolean} [allowDuckTyping=true] - Whether to allow duck typing in verification.
  * @returns {boolean} True if the object matches the type format, false otherwise.
  */
  verify(object, useFormat = null, allowDuckTyping = true) {
    const format = useFormat || this.format;
    const isOpt = (type) => Type.from(type).name === Type.Optional.name;
    const optType = (type) => isOpt(type) ? type.type : type;
    
    // Check each format key in the object
    return Object.keys(format).every(key => {
      const fType = optType(format[key]);
      const fMeta = { name: fType.name, type: fType };
      
      // If the key is optional and not present, it's still valid
      if (isOpt(format[key]) && !Reflect.has(object, key)) {
        return true;
      }
      
      // If the key is not present, it's invalid
      if (!Reflect.has(object, key)) {
        console.warn(`Format requires ${key}, it is not optional and object doesn't have it`);
        return false;
      }
      
      const oMeta = Type.from(object[key]);
      
      // Recursive verification for objects/arrays
      if ((oMeta.name === Object.name || oMeta.name === Array.name) && typeof fType === 'object') {
        return this.verify(object[key], fType, allowDuckTyping);
      }
      
      // Type checking
      const typesMatch = fMeta.name === oMeta.name;
      if (!typesMatch) {
        console.warn(`${key}(${fMeta.name}) !== ${key}(${oMeta.name})`);
      }
      
      return typesMatch;
    });
  }
  
  /**
  * Static method to retrieve type information from an object.
  *
  * @param {Object} object - The object from which to extract type information.
  * @returns {Object} An object containing 'name' and 'type' properties.
  */
  static from(object) {
    const name = /t (\w+)]/.exec(Object.prototype.toString.call(object))
    const out = { name: null, type: null }
    
    // eslint-disable-next-line no-nested-ternary
    const main = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : null)
    
    if (name) {
      out.name = (name[1] === Function.name) ? object.name : name[1]
      
      // eslint-disable-next-line no-eval
      out.type = main?.[out.name] || eval(`(typeof ${out.name} !== 'undefined' && ${out.name})`) || null
    }
    return out
  }
  
  /** A meta class that represents the `null` primitive value. */
  static get Null() { return class Null {} }
  
  /** A meta class that represents the `undefined` primitive value. */
  static get Undefined() { return class Undefined {} }
  
  /** A meta class that represents a type or property that can be of any value. */
  static get Any() { return class Any {} }
  
  /** A meta class that represents a type or property that does not have a type. */
  static get None() { return class None {} }

  /** A meta class that represents an array of a given type */
  static get ArrayOf() {
    if (!this._array_of) {
      this._array_of = new Type('ArrayOf', { type: Function }).type
    }

    return this._array_of
  }
  
  /** 
   * A class that wraps a type and indicates that its value is optional 
   * when used within a format definition
   */
  static Optional = class Optional {
    constructor(type) {
      this.type = type
    }
    
    get [Symbol.toStringTag]() {
      return this.constructor.name
    }
  }
  
  /**
  * Creats an instance of Optional that wraps another type. In this
  * simple type system, types are largely declared as classes or 
  * custom functions designed to be used with the `new` keyword. 
  * 
  * @param {Function} optionalType 
  * @returns {Optional} a type wrapped in `Optional`
  */
  static optional(optionalType) {
    return new Type.Optional(optionalType)
  }
  
  /**
  * Generator function that walks the prototype chain of a given value.
  * @param {*} value - The initial value whose prototype chain will be traversed.
  * @yields {Function|Object|null} - The type of the prototype (Function, Object, or null).
  */
  static *walkChain(value) {
    const getInternal = f => ((f && 
      typeof f === 'object' && 
      /native code/.exec(f?.constructor?.toString?.()) && 
      f.constructor
    ) || (f === Function.prototype && Function) || f)
      
    let current = value;
    
    while (current !== null) {
      const prototype = Object.getPrototypeOf(current);
      const next = getInternal(prototype);
      if (next !== null) {
        yield next
      }
      current = prototype;
    }
  }
    
  /**
  * Retrieves the prototype chain of a given value as an array.
  * This method utilizes the walkChain generator function to accumulate
  * all prototypes in the chain of the provided value.
  *
  * @param {*} value - The value whose prototype chain is to be retrieved.
  * @returns {Array<Function|Object|null>} An array representing the prototype chain.
  */  
  static prototypeChain(value) {
    return (value && Array.from(Type.walkChain(value))) || []
  }
    
  /**
  * Parses a function definition string or a function object and extracts information such as
  * the function's name, arguments, and characteristics (e.g., async, generator, arrow function).
  * This method is useful for introspection or analysis of function definitions.
  * 
  * Note: Parsing function strings can be error-prone and should be used with caution.
  *
  * @param {string|Function} str - The function definition string or function object to parse.
  * @returns {Object} An object containing parsed details like name, arguments, and flags indicating function type.
  */
  static parseFunction(str) {
    let result = { 
      name: "anonymous", 
      arguments: [], 
      constructor: typeof str === 'function' && str || null,
      chain: str && Type.prototypeChain(str) || [],
      isClass: false, 
      isGenerator: false, 
      isAsync: false, 
      isArrowFn: false,
      isAnonymous: true,
    };
    
    const regularAsyncFuncRegex = /^(async\s+)?function(\s+\w+)?\s*\(([^)]*)\)/;
    const generatorFuncRegex = /^function\s*\*\s*(\w*)?\s*\(([^)]*)\)/;
    const arrowFuncRegex = /^(?:const|let|var)\s+(\w+)\s*=\s*(async\s+)?\s*(?:\(([^)]*)\)|(\w+))\s*=>/;
    const classConstructorRegex = /^class\s+(\w+)\s*{[^{]*?constructor\s*\(([^)]*)\)/;
    
    let match = (
      regularAsyncFuncRegex.exec(str) || 
      generatorFuncRegex.exec(str) || 
      arrowFuncRegex.exec(str) || 
      classConstructorRegex.exec(str)
    );
      
    if (match) {
      result.name = match[2]?.trim() || match[1]?.trim() || match[4]?.trim() || "anonymous";
      result.arguments = (match[3] || "").split(",").map(arg => arg.trim());
      result.isClass = classConstructorRegex.test(str);
      result.isGenerator = generatorFuncRegex.test(str);
      result.isAsync = /async/.test(match[0]);
      result.isArrowFn = arrowFuncRegex.test(str);
      result.isAnonymous = result.name !== 'anonymous'
    }

    return result;
  }   
      
  /**
  * Getter for accessing the type name of the instance.
  * This getter provides a convenient way to retrieve the name of the type,
  * making it easier to identify the type of an instance at runtime.
  * 
  * @returns {string} The name of the type.
  */
  get [Symbol.toStringTag]() { return this.constructor.name }

  #arrayOf = null
}