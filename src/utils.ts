export const flattenObject = (
  ob: Record<string, any>,
  glue: string = "."
): Record<string, any> => {
  const toReturn: Record<string, any> = {};

  for (const i in ob) {
    if (!ob.hasOwnProperty(i)) continue;

    if (typeof ob[i] == "object" && ob[i] !== null) {
      const flatObject = flattenObject(ob[i], glue);
      for (const x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;

        toReturn[i + glue + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }

  return toReturn;
};

export const objectMap = (
  object: Record<string, any>,
  mapFn: (value: any, key: string) => Record<string, any>
): Record<string, any> => {
  return Object.keys(object).reduce<Record<string, any>>(function (
    result,
    key
  ) {
    const value = object[key];
    if (value instanceof Object) {
      result[key] = value;
    } else {
      result[key] = mapFn(object[key], key);
    }

    return result;
  },
  {});
};

export const filteredObject = (
  object: Record<string, any>,
  keys: string[]
): Record<string, any> => {
  return Object.keys(object)
    .filter((key) => keys.includes(key))
    .reduce<Record<string, any>>((obj, key) => {
      return {
        ...obj,
        [key]: object[key],
      };
    }, {});
};

/*
  Same behaviour as Array.filter() but for Objects
  usage:
  const filtered = filterObject(rawObject, n => n.somethingToCheck === true )
*/
export const filterObject = ( obj: Record<string, any>, predicate: Function) => {
  let result = {};

  for (const key in obj) {
      if (obj.hasOwnProperty(key) && predicate(obj[key])) {
          result[key] = obj[key];
      }
  }

  return result;
};