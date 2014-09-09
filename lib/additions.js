String.prototype.endsWith = function(suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.contains = function(string) {
  return (this.indexOf(string) != -1);
}

Array.prototype.contains = function(object) {
  return (this.indexOf(object) != -1);
}
