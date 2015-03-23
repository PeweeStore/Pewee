var AutoCleanRule = function(data) {
  this.rule = null;
  this.number = null;

  if (data) {
    this.rule = data.rule;
    this.number = data.number
  }

  this.verifyAndCorrectCleanRule();

}

AutoCleanRule.prototype.verifyAndCorrectCleanRule = function() {
  if (this.rule != "creation_date") {
    this.rule = null;
    this.number = null;
  }
}

module.exports = AutoCleanRule;
