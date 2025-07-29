/*!
* ych SPA exchange
*
* Copyright Lynxline LLC, yshurik, 2019-2023,
* Common Clause license https://commonsclause.com/
*/

var jsonBNparse = function(key, value) {
  if (typeof value === 'string' && /^\-?\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }
  return value;
}

$( function() {

console.log("Init utils");




});

