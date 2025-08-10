/**
 * Converts BigInt values to Numbers in an object or array
 * @param {*} obj - The object or array to convert
 * @returns {*} - The converted object or array
 */
const convertBigIntToNumber = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, convertBigIntToNumber(value)])
    );
  }
  return obj;
};

/**
 * Parses JSON strings in an object or array
 * @param {*} obj - The object or array to parse
 * @returns {*} - The parsed object or array
 */
const parseJsonFields = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    try {
      return JSON.parse(obj);
    } catch {
      return obj;
    }
  }
  if (Array.isArray(obj)) return obj.map(parseJsonFields);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, parseJsonFields(value)])
    );
  }
  return obj;
};

module.exports = {
  convertBigIntToNumber,
  parseJsonFields
};
